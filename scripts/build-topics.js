#!/usr/bin/env node
// Builds topics/*.html — the "browse by topic" views of the newsletter.
//
// Source of truth is the issues themselves: any element in issues/YYYY-MM-DD.html
// carrying data-topic="<key>" is one piece (a story, a briefing, a tool callout).
// Its title is data-title, else its own text if it is a heading, else the first
// <h3>/<h4> inside it. Its summary is data-summary, else the first <p> after the
// title. Its id becomes the anchor the topic page links to.
//
// Runs on every Vercel deploy (npm run build), so tagging a new issue is enough.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ISSUES_DIR = path.join(ROOT, 'issues');
const OUT_DIR = path.join(ROOT, 'topics');

const TOPICS = [
  {
    key: 'ai-news',
    label: 'AI News',
    blurb: 'The developments that matter — model releases, product launches, deals, and policy, curated and explained.',
  },
  {
    key: 'change-management',
    label: 'AI Change Management',
    blurb: 'How organizations actually adopt AI — operating models, org design, stakeholder framing, and transformation playbooks.',
  },
  {
    key: 'workplace-trends',
    label: 'AI Trends in the Workplace',
    blurb: 'What the evidence says about AI at work — productivity, jobs, adoption data, and how roles are changing.',
  },
  {
    key: 'misc-tools',
    label: 'Misc. & AI Tools',
    blurb: 'Hands-on tool walkthroughs, AI explainers, and the occasional detour worth sharing.',
  },
];
const TOPIC_KEYS = new Set(TOPICS.map((t) => t.key));

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ne: '≠', mdash: '—', ndash: '–', middot: '·', rarr: '→', larr: '←', hellip: '…', times: '×', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function text(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function truncate(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—–-]$/, '') + '…';
}

function attr(attrs, name) {
  const m = attrs.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return m ? m[1] : null;
}

function parseIssue(file) {
  const html = fs.readFileSync(path.join(ISSUES_DIR, file), 'utf8');
  const meta = html.match(/<div class="issue-meta">\s*<span class="issue-number">([^<]*)<\/span>\s*<span>([^<]*)<\/span>/);
  const issue = {
    file,
    number: meta ? text(meta[1]) : file.replace('.html', ''),
    date: meta ? text(meta[2]) : file.replace('.html', ''),
  };

  const pieces = [];
  const tagRe = /<([a-z][a-z0-9]*)\b([^>]*\bdata-topic="([^"]+)"[^>]*)>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const [, tag, attrs, topic] = m;
    const after = m.index + m[0].length;

    if (!TOPIC_KEYS.has(topic)) {
      console.warn(`warn: ${file}: unknown data-topic "${topic}" — skipped`);
      continue;
    }

    let title = attr(attrs, 'data-title');
    let titleEnd = after;
    if (!title && /^h[1-6]$/i.test(tag)) {
      const close = html.indexOf(`</${tag}>`, after);
      title = html.slice(after, close);
      titleEnd = close;
    }
    if (!title) {
      const h = /<(h3|h4)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(html.slice(after));
      if (h) {
        title = h[2];
        titleEnd = after + h.index + h[0].length;
      }
    }

    let summary = attr(attrs, 'data-summary');
    if (!summary) {
      const p = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html.slice(titleEnd));
      summary = p ? p[1] : '';
    }

    const id = attr(attrs, 'id');
    if (!id) console.warn(`warn: ${file}: piece "${text(title || '')}" has no id — will link to top of issue`);

    pieces.push({
      topic,
      id,
      title: text(title || issue.number),
      summary: truncate(text(summary), 260),
    });
  }

  return { issue, pieces };
}

function page(topic, entries) {
  const tabs = [
    `<a href="../index.html">By Issue</a>`,
    ...TOPICS.map((t) => `<a href="${t.key}.html"${t.key === topic.key ? ' class="active" aria-current="page"' : ''}>${escape(t.label)}</a>`),
  ].join('\n        ');

  const items = entries
    .map(({ issue, piece }) => {
      const href = `../issues/${issue.file}${piece.id ? '#' + piece.id : ''}`;
      return `      <li>
        <a href="${href}" class="issue-card">
          <div class="issue-meta">
            <span class="issue-number">${escape(issue.number)}</span>
            <span>${escape(issue.date)}</span>
          </div>
          <h2>${escape(piece.title)}</h2>
          <p class="issue-summary">${escape(piece.summary)}</p>
        </a>
      </li>`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<!-- Generated by scripts/build-topics.js from the data-topic tags in issues/*.html. Do not edit by hand. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="../favicon.ico" sizes="32x32">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <title>${escape(topic.label)} — AI &amp; Org, Curated</title>
  <meta name="description" content="${escape(topic.blurb)}">
  <link rel="alternate" type="application/rss+xml" title="AI &amp; Org, Curated RSS" href="../feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>

  <!-- Header -->
  <header class="site-header">
    <div class="container">
      <a href="../index.html" class="site-logo">
        <svg viewBox="0 0 1320 1320" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4E2A84" fill-rule="evenodd" d="M1319.0,660.0 A659.5,659.5 0 1 1 0.0,660.0 A659.5,659.5 0 1 1 1319.0,660.0 Z M1137.2,404.9 A541.5,541.5 0 1 1 791.9,134.9 L659.5,660 Z"></path>
        </svg>
        AI &amp; Org, Curated
      </a>
      <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
      </button>
      <nav class="site-nav">
        <a href="/">&larr; PurplePAI</a>
        <a href="../index.html">Issues</a>
        <a href="../about.html">About</a>
        <a href="#subscribe">Subscribe</a>
      </nav>
    </div>
  </header>

  <main class="container">

    <section class="hero">
      <h1>${escape(topic.label)}</h1>
      <p class="tagline">${escape(topic.blurb)}</p>
    </section>

    <nav class="topic-tabs" aria-label="Browse insights">
        ${tabs}
    </nav>

    <div class="search-bar">
      <input type="text" id="search-input" class="search-input" placeholder="Search ${escape(topic.label)}…" aria-label="Search ${escape(topic.label)}">
    </div>

    <ul class="issue-list" id="issue-list">

${items}

    </ul>

    <p class="no-results" id="no-results">Nothing found matching your search.</p>

    <!-- Subscribe -->
    <section class="subscribe" id="subscribe">
      <h2>Get the newsletter in your inbox</h2>
      <p>A weekly, curated digest on AI and organizational design — where invention meets innovation meets real impact.</p>
      <script src="https://js-na2.hsforms.net/forms/embed/246682802.js" defer></script>
      <div class="hs-form-frame" data-region="na2" data-form-id="a72df4d3-02e5-4eac-b39b-ca549bb96a85" data-portal-id="246682802"></div>
    </section>

  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container">
      &copy; 2026 AI &amp; Org, Curated. All rights reserved. &middot; <a href="../privacy.html">Privacy</a>
    </div>
  </footer>

  <script src="../js/main.js"></script>
</body>
</html>
`;
}

function main() {
  const files = fs
    .readdirSync(ISSUES_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.html$/.test(f))
    .sort()
    .reverse();

  const byTopic = Object.fromEntries(TOPICS.map((t) => [t.key, []]));
  for (const file of files) {
    const { issue, pieces } = parseIssue(file);
    for (const piece of pieces) byTopic[piece.topic].push({ issue, piece });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const topic of TOPICS) {
    fs.writeFileSync(path.join(OUT_DIR, `${topic.key}.html`), page(topic, byTopic[topic.key]));
    console.log(`topics/${topic.key}.html — ${byTopic[topic.key].length} pieces`);
  }
}

main();
