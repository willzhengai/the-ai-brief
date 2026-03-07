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
   - Update previous/next navigation links

3. **Update `index.html`**
   - Add a new `<li>` issue card at the top of the issue list
   - Include `data-search` keywords for search filtering

4. **Update `feed.xml`**
   - Add a new `<item>` entry at the top of the channel

5. **Commit and push**
   ```
   git add -A && git commit -m "Publish Issue #N" && git push
   ```

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
