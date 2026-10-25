// Fetches every feed in feeds.json and writes posts.json.
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
    .replace(/&#8217;|&rsquo;/g, '\u2019')
    .replace(/\s+/g, ' ')
    .trim();

const toIso = (value, fallback) => {
  const d = new Date(value);
  return isNaN(d) ? fallback : d.toISOString();
};

const failed = [];

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
          summary: clean(item.contentSnippet || item.summary || item.content).slice(0, 220),
        }];
      });
    } catch (err) {
      failed.push(`${feed.name}: ${err.message}`);
      return [];
    }
  })
);

// Merge new posts over old ones so history survives between runs.
const merged = new Map(previous.map((p) => [p.link, p]));
for (const post of fetched.flat()) merged.set(post.link, post);

const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
const posts = [...merged.values()]
  .filter((p) => new Date(p.date).getTime() >= cutoff)
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, MAX_ITEMS);

await writeFile(
  'posts.json',
  JSON.stringify({ updated: new Date().toISOString(), failed, posts }, null, 1)
);

console.log(`${posts.length} posts from ${feeds.length - failed.length}/${feeds.length} feeds`);
if (failed.length) console.log('Failed feeds:\n' + failed.map((f) => '  - ' + f).join('\n'));
