# Blog Digest

A static page on GitHub Pages that shows the latest posts from all the blogs
you follow in one place. A GitHub Actions workflow fetches every feed once a
day, saves the result to `posts.json`, and the page displays it. There is no
server and no database.

## Set up (about 5 minutes)

1. Create a new **public** repository on GitHub and upload all of these files
   (keep the folder structure, including `.github/workflows/`).
2. Go to **Settings > Pages**. Under "Build and deployment", choose
   **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
3. Go to **Settings > Actions > General > Workflow permissions** and select
   **Read and write permissions**. Save.
4. Open the **Actions** tab, choose **Update blog feed**, and click
   **Run workflow**. This creates the first `posts.json`.
5. Visit `https://<your-username>.github.io/<repo-name>/`.

After that the workflow runs by itself every day at 01:30 UTC (7:00 AM IST).
To change the time, edit the `cron` line in `.github/workflows/update.yml`.

## Add or remove blogs

Edit `feeds.json`. Each entry looks like this:

    { "name": "Blog name", "category": "Tech", "url": "https://example.com/feed/" }

Saving the file triggers a fresh build. Categories become the filter buttons on
the page.

If a blog has no obvious feed, try `/feed`, `/rss`, `/rss.xml` or `/atom.xml`
after its address. The page footer and the Actions log list any feed that
failed, so you can fix or remove a broken URL.

## Features

- **⚡ Daily Automated Crawl**: Powered by GitHub Actions fetching 54+ curated engineering, AI, and tech feeds daily.
- **🏷️ Category Filter Bar**: Filter across curated sections (`AI Agents`, `AI & ML`, `Software Engineering`, `Data Science`, `Tech`, `Ideas`, `Finance`, `Lifestyle`).
- **📖 In-App Quick Reader Modal**: Read clean summaries without leaving the site, complete with reading time estimation (`⏱️ 3m read`).
- **🔊 Web Speech Audio Reader (TTS)**: Listen to article summaries with native browser speech synthesis.
- **⏱️ Recency & Sort Controls**: Filter by `Today (< 24h)`, `Past 3 Days`, `This Week`, `This Month` and sort by `Newest`, `Oldest`, `Quick Reads`, `Deep Dives`.
- **🎨 4 Reader Themes**: Switch between `🌙 Dark`, `🖤 OLED Pure Black`, `📜 Sepia (Warm Paper)`, and `☀️ Clean Light`.
- **📲 Progressive Web App (PWA)**: Install directly to iOS or Android home screen with offline caching via service worker (`sw.js`).
- **📥 OPML Import & Export**: One-click download of all feeds as `blog-digest-feeds.opml` or import directly from Feedly / Inoreader.
- **💾 Backup & Restore**: Export and restore your read history and bookmarks across browsers and devices.
- **➕ Add Blog Helper**: Interactive modal supporting single feeds, bulk CSV/JSON lines, with URL hints and direct GitHub editor link.

## Run it locally

    npm install
    npm run build
    npx serve .

