// Shared parsing for the build scripts. The issues are the source of truth: any element in
// issues/YYYY-MM-DD.html carrying data-topic="<key>" is one piece (a story, a briefing, a tool callout).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ISSUES_DIR = path.join(ROOT, 'issues');

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
const STANDALONE_MIN_WORDS = 150;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ne: '≠', mdash: '—', ndash: '–', middot: '·', rarr: '→', larr: '←', hellip: '…', times: '×', minus: '−', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

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

// Index of the closing tag that matches an element whose opening tag ends at `after`.
function closeIndex(html, tag, after) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = after;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index;
  }
  return -1;
}

// Links inside a piece are written relative to issues/; make them work from a sibling directory.
function rebase(html, issueFile) {
  return html.replace(/\b(href|src)="([^"]*)"/g, (m, name, value) => {
    if (value.startsWith('#')) return `${name}="../issues/${issueFile}${value}"`;
    if (/^([a-z][a-z0-9+.-]*:|\/|\.\.\/)/i.test(value) || value === '') return m;
    return `${name}="../issues/${value}"`;
  });
}

function pieceBody(html, tag, attrs, after, titleSpan) {
  const cls = attr(attrs, 'class') || '';

  // A tagged heading: the piece runs until the next tagged heading or the end of its section.
  if (/^h[1-6]$/i.test(tag)) {
    const start = html.indexOf(`</${tag}>`, after) + tag.length + 3;
    const rest = html.slice(start);
    const next = rest.search(new RegExp(`<${tag}\\b[^>]*\\bdata-topic=`, 'i'));
    const sectionEnd = rest.indexOf('</section>');
    const end = Math.min(...[next, sectionEnd].filter((i) => i >= 0), rest.length);
    const open = html.slice(0, after).match(/<section\b[^>]*class="([^"]*)"[^>]*>(?![\s\S]*<section\b)/);
    return `<section class="${open ? open[1] : 'org-article'}">${rest.slice(0, end)}</section>`;
  }

  const close = closeIndex(html, tag, after);
  let inner = html.slice(after, close);
  if (titleSpan) inner = inner.slice(0, titleSpan[0] - after) + inner.slice(titleSpan[1] - after);

  const isIntro = /\b(org-editorial|editorial)\b/.test(cls);
  if (isIntro) inner = inner.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i, '');

  let body = `<${tag} class="${cls}">${inner}</${tag}>`;
  if (/\blink-item\b/.test(cls)) body = `<section class="curated-links">${body}</section>`;

  // Briefings keep their intro and their essay in two sibling sections.
  if (isIntro) {
    const afterClose = close + tag.length + 3;
    const sib = /^\s*(?:<!--[\s\S]*?-->\s*)*<section\b[^>]*class="(org-article|essay-section)"[^>]*>/.exec(html.slice(afterClose));
    if (sib) {
      const sibStart = afterClose + sib.index;
      const sibAfter = sibStart + sib[0].length;
      const sibClose = closeIndex(html, 'section', sibAfter);
      body += '\n' + html.slice(sibStart, sibClose + '</section>'.length).trim();
    }
  }
  return body;
}

function parseIssue(file) {
  const html = fs.readFileSync(path.join(ISSUES_DIR, file), 'utf8');
  const meta = html.match(/<div class="issue-meta">\s*<span class="issue-number">([^<]*)<\/span>\s*<span>([^<]*)<\/span>/);
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  const issue = {
    file,
    iso: file.replace('.html', ''),
    number: meta ? text(meta[1]) : file.replace('.html', ''),
    date: meta ? text(meta[2]) : file.replace('.html', ''),
    title: h1 ? text(h1[1]) : file,
    description: desc ? decode(desc[1]) : '',
    styles: (html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n'),
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
    let titleSpan = null;
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
        titleSpan = [after + h.index, titleEnd];
      }
    }

    let summary = attr(attrs, 'data-summary');
    if (!summary) {
      const p = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html.slice(titleEnd));
      summary = p ? p[1] : '';
    }

    const id = attr(attrs, 'id');
    if (!id) console.warn(`warn: ${file}: piece "${text(title || '')}" has no id — will link to top of issue`);

    const end = /^h[1-6]$/i.test(tag) ? -1 : closeIndex(html, tag, after);
    if (titleSpan && end >= 0 && titleSpan[0] > end) titleSpan = null;

    const body = rebase(pieceBody(html, tag, attrs, after, titleSpan), file);
    pieces.push({
      topic,
      id,
      title: text(title || issue.number).replace(/^\d+\s*·\s*/, ''),
      summary: truncate(text(summary), 260),
      body,
      // Short link blurbs stay inside their issue; a page of their own would be thin content.
      standalone: Boolean(id) && text(body).split(' ').length >= STANDALONE_MIN_WORDS,
    });
  }

  return { issue, pieces };
}

function issueFiles() {
  return fs
    .readdirSync(ISSUES_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.html$/.test(f))
    .sort()
    .reverse();
}

module.exports = { ROOT, ISSUES_DIR, TOPICS, decode, escape, text, truncate, parseIssue, issueFiles };
