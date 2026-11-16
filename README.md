# The AI Brief

A curated weekly digest of the most important developments in artificial intelligence. Static site hosted on GitHub Pages.

## Weekly Workflow

To publish a new issue:

1. **Copy the template**
   ```
   cp issues/TEMPLATE.html issues/YYYY-MM-DD.html
   ```

2. **Edit the new issue file**
   - Update the issue number, date, and title
   - Write the editorial section (2–4 paragraphs)
   - Add curated links with source badges and category tags
   - Give every piece (each story, Org briefing, tool callout) a topic tag: `id="short-slug" data-topic="TOPIC"` (see below)
   - Update previous/next navigation links

3. **Update `index.html`**
   - Add a new `<li>` issue card at the top of the issue list
   - Include `data-search` keywords for search filtering

4. **Update `feed.xml`**
   - Add a new `<item>` entry at the top of the channel

5. **Rebuild the generated pages** (optional locally; Vercel runs this on every deploy)
   ```
   npm run build
   ```
   Keep the issue's `<title>` to about 60 characters (search engines cut it off there); the full headline belongs in the `<h1>`.

6. **Commit and push**
   ```
   git add -A && git commit -m "Publish Issue #N" && git push
   ```

## Browse by Topic

Besides the by-date issue list, Insights has four topic views generated from the issues themselves: `topics/ai-news.html`, `topics/change-management.html`, `topics/workplace-trends.html`, `topics/misc-tools.html`.

`scripts/build-topics.js` scans `issues/YYYY-MM-DD.html` for elements with `data-topic` and lists each one, newest issue first, linking back to `issues/<date>.html#<id>`. Nothing is copied or rewritten. The issue pages stay the source of truth, and the generated `topics/*.html` files should not be edited by hand.

| `data-topic` | Topic page |
|---|---|
| `ai-news` | AI News |
| `change-management` | AI Change Management |
| `workplace-trends` | AI Trends in the Workplace |
| `misc-tools` | Misc. & AI Tools |

Title comes from the first `<h3>`/`<h4>` in the piece (or the tag itself if it's a heading); summary is the first `<p>` after the title. Override either with `data-title="..."` / `data-summary="..."`.

## Search and AI-engine plumbing

`scripts/build-seo.js` runs after the topic build and needs no per-issue work:

- **Standalone articles.** Every tagged piece of 150 words or more gets its own page at `articles/<id>.html`, with a byline, breadcrumb, and links to related pieces. Shorter link blurbs stay inside their issue. The `id` is the URL, so do not change an `id` after publishing.
- **Head tags.** A canonical URL (always `https://purplepai.com/insights/...`), Open Graph and Twitter tags, and JSON-LD are written into every page between `<!-- seo:start -->` and `<!-- seo:end -->`.
- **Issue pages** get a list of their standalone articles above the issue nav, between `<!-- seo:toc:start -->` and `<!-- seo:toc:end -->`.
- **`sitemap.xml`** lists every indexable page. `robots.txt` lives in the PurplePAI-Website repo, since it has to sit at the domain root, and points here.

Do not edit inside the `seo:` markers or in `articles/`; both are rewritten on every build. The author and publisher details are constants at the top of `scripts/build-seo.js`.

## Category Tags

Available category classes for curated links:

| Class | Label |
|-------|-------|
| `research` | Research |
| `industry` | Industry |
| `policy` | Policy |
| `open-source` | Open Source |
| `opinion` | Opinion |
| `tutorial` | Tutorial |

## Local Preview

Open `index.html` in a browser. No build step required.

## License

Content © 2026 The AI Brief. All rights reserved.
