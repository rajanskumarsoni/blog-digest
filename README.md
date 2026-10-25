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

## Settings

At the top of `scripts/build.mjs`:

- `MAX_PER_FEED`: how many newest posts to take from each blog per run
- `MAX_AGE_DAYS`: how long posts are kept
- `MAX_ITEMS`: total posts stored

## Run it locally

    npm install
    npm run build
    npx serve .
