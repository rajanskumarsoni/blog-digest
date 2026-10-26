// Fetches every feed in feeds.json and scrapes Anthropic pages, writing posts.json.
import Parser from 'rss-parser';
import { readFile, writeFile } from 'node:fs/promises';

const MAX_PER_FEED = 15;   // newest items taken from each feed per run
const MAX_AGE_DAYS = 60;   // older posts are dropped
const MAX_ITEMS = 1500;    // hard cap on posts.json size

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'BlogDigest/1.0 (GitHub Pages feed reader)' },
});

const feeds = JSON.parse(await readFile('feeds.json', 'utf8'));

let previous = [];
try { previous = JSON.parse(await readFile('posts.json', 'utf8')).posts; } catch {}
const known = new Map(previous.map((p) => [p.link, p]));

const clean = (s) =>
  (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, '\u2019')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const toIso = (value, fallback) => {
  const d = new Date(value);
  return isNaN(d) ? fallback : d.toISOString();
};

const failed = [];

// ==========================================
// 1. Fetch RSS Feeds
// ==========================================
const fetched = await Promise.all(
  feeds.map(async (feed) => {
    try {
      const result = await parser.parseURL(feed.url);
      return result.items.slice(0, MAX_PER_FEED).flatMap((item) => {
        const title = clean(item.title);
        const link = item.link;
        if (!title || !link) return [];
        // Keep the first-seen date when a post has no date of its own.
        const fallback = known.get(link)?.date ?? new Date().toISOString();
        return [{
          title,
          link,
          source: feed.name,
          category: feed.category || 'General',
          date: toIso(item.isoDate || item.pubDate, fallback),
          summary: clean(item.contentSnippet || item.summary || item.content).slice(0, 320),
        }];
      });
    } catch (err) {
      failed.push(`${feed.name}: ${err.message}`);
      return [];
    }
  })
);

// ==========================================
// 2. Scrape Anthropic (News, Engineering, Research)
// ==========================================
async function scrapeAnthropic() {
  const sections = [
    { url: 'https://www.anthropic.com/engineering', source: 'Anthropic Engineering', category: 'Software Engineering' },
    { url: 'https://www.anthropic.com/research', source: 'Anthropic Research', category: 'AI & ML' },
    { url: 'https://www.anthropic.com/news', source: 'Anthropic News', category: 'AI Agents' }
  ];

  const results = [];
  const seenLinks = new Set();
  const ignoredSlugs = new Set(['announcements', 'features', 'team', 'company', 'careers', 'product', 'policy', 'safeguards', 'security', 'partnerships']);

  for (const sec of sections) {
    try {
      const res = await fetch(sec.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (!res.ok) {
        failed.push(`${sec.source}: HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();

      // Pattern 1: <a href="path"><h2-5>Title</h2-5>
      const p1 = /<a[^>]*href=["'](\/(?:news|research)\/([a-zA-Z0-9_-]+))["'][^>]*>\s*<h[12345][^>]*>([\s\S]*?)<\/h[12345]>[\s\S]*?(?:<\/a>)?(?:\s*<p[^>]*>([\s\S]*?)<\/p>)?/gi;
      let m;
      while ((m = p1.exec(html)) !== null) {
        const path = m[1];
        const slug = m[2];
        const title = clean(m[3]);
        const summary = clean(m[4] || '');

        if (ignoredSlugs.has(slug)) continue;
        if (!title || title.length < 5 || title.toLowerCase().startsWith('view all')) continue;

        const fullLink = 'https://www.anthropic.com' + path;
        if (seenLinks.has(fullLink)) continue;
        seenLinks.add(fullLink);

        const before = html.slice(Math.max(0, m.index - 500), m.index);
        const timeMatches = [...before.matchAll(/<time[^>]*>([^<]+)<\/time>/gi)];
        let dateStr = known.get(fullLink)?.date ?? new Date().toISOString();
        if (timeMatches.length) {
          const d = new Date(timeMatches[timeMatches.length - 1][1]);
          if (!isNaN(d.getTime())) dateStr = d.toISOString();
        }

        results.push({
          title,
          link: fullLink,
          source: sec.source,
          category: sec.category,
          date: dateStr,
          summary: summary.slice(0, 320)
        });
      }

      // Pattern 2: <h2-5><a href="path">Title</a></h2-5>
      const p2 = /<h[12345][^>]*>\s*<a[^>]*href=["'](\/(?:news|research)\/([a-zA-Z0-9_-]+))["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[12345]>(?:\s*<p[^>]*>([\s\S]*?)<\/p>)?/gi;
      while ((m = p2.exec(html)) !== null) {
        const path = m[1];
        const slug = m[2];
        const title = clean(m[3]);
        const summary = clean(m[4] || '');

        if (ignoredSlugs.has(slug)) continue;
        if (!title || title.length < 5 || title.toLowerCase().startsWith('view all')) continue;

        const fullLink = 'https://www.anthropic.com' + path;
        if (seenLinks.has(fullLink)) continue;
        seenLinks.add(fullLink);

        const before = html.slice(Math.max(0, m.index - 500), m.index);
        const timeMatches = [...before.matchAll(/<time[^>]*>([^<]+)<\/time>/gi)];
        let dateStr = known.get(fullLink)?.date ?? new Date().toISOString();
        if (timeMatches.length) {
          const d = new Date(timeMatches[timeMatches.length - 1][1]);
          if (!isNaN(d.getTime())) dateStr = d.toISOString();
        }

        results.push({
          title,
          link: fullLink,
          source: sec.source,
          category: sec.category,
          date: dateStr,
          summary: summary.slice(0, 320)
        });
      }
    } catch (err) {
      failed.push(`${sec.source}: ${err.message}`);
    }
  }

  return results;
}

const anthropicPosts = await scrapeAnthropic();
console.log(`Scraped ${anthropicPosts.length} posts from Anthropic`);

// ==========================================
// 3. Merge & Deduplicate
// ==========================================
const merged = new Map(previous.map((p) => [p.link, p]));
for (const post of fetched.flat()) merged.set(post.link, post);
for (const post of anthropicPosts) merged.set(post.link, post);

const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
const posts = [...merged.values()]
  .filter((p) => new Date(p.date).getTime() >= cutoff)
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, MAX_ITEMS);

await writeFile(
  'posts.json',
  JSON.stringify({ updated: new Date().toISOString(), failed, posts }, null, 1)
);

console.log(`${posts.length} posts from ${feeds.length - failed.length}/${feeds.length} feeds + Anthropic Scraper`);
if (failed.length) console.log('Failed feeds:\n' + failed.map((f) => '  - ' + f).join('\n'));
