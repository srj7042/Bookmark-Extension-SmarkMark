/**
 * Page probe — a headless render check that needs no Chrome profile.
 *
 * It stubs `chrome.*`, loads the *built* dashboard and popup bundles with their real
 * stylesheets, and asserts the behaviours that type checking cannot see:
 *
 *   1. the bookmark list is genuinely scrollable (its scroll box has a real client
 *      height and a taller scroll height) instead of being clipped by an ancestor;
 *   2. `#/category/<name>` lists only that category, and `#/tag/<tag>` only that tag;
 *   3. the popup's content fits inside its fixed 600px frame (nothing unreachable);
 *   4. accessibility basics: WCAG AA text contrast, accessible names on icon-only
 *      buttons/links, and label associations on every form control.
 *
 * Usage: npm run probe        (run `npm run build` first)
 *        CHROME_PATH=... npm run probe
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
].filter(Boolean)
const CHROME = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
if (!CHROME) {
  console.error(`No Chrome/Chromium binary found. Set CHROME_PATH to one.\nTried:\n  ${CHROME_CANDIDATES.join('\n  ')}`)
  process.exit(1)
}
const DIST = resolve('dist')
const PORT = 8793
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }

/**
 * Stubs enough of the extension API to render a fixed library: 3 Development
 * (github.com), 2 Design (figma.com) and 25 bookmarks no heuristic can classify.
 */
const MOCK = `
const THEME = '__THEME__';
const node = (id, parentId, title, url, index) => ({ id, parentId, title, url, index, dateAdded: 1700000000000 + Number(id) * 1000 });
const tree = [{ id: '0', title: '', children: [
  { id: '2', parentId: '0', title: 'Other bookmarks', children: [] },
  { id: '1', parentId: '0', title: 'Bookmarks bar', children: [
    { id: '10', parentId: '1', title: 'Work', index: 0, children: [
      node('100', '10', 'GH repo 1', 'https://github.com/a/b', 0),
      node('101', '10', 'GH repo 2', 'https://github.com/c/d', 1),
      node('102', '10', 'GH repo 3', 'https://github.com/e/f', 2),
    ]},
    node('103', '1', 'Figma file 1', 'https://figma.com/file/1', 1),
    node('104', '1', 'Figma file 2', 'https://figma.com/file/2', 2),
    ...Array.from({ length: 25 }, (_, i) => node(String(200 + i), '1', 'Page ' + (i + 1), 'https://zzq' + i + '.example/doc', 3 + i)),
  ]},
]}];

const listeners = { addListener() {}, removeListener() {}, hasListener: () => false };
const flat = (nodes) => nodes.flatMap(n => [n, ...flat(n.children || [])]);
window.chrome = {
  bookmarks: {
    getTree: async () => tree,
    getSubTree: async (id) => { const n = flat(tree).find(x => x.id === id); return n ? [n] : []; },
    getChildren: async (id) => (flat(tree).find(x => x.id === id)?.children) || [],
    search: async () => [],
    create: async (o) => ({ id: 'new', ...o }), update: async () => ({}), move: async () => ({}),
    remove: async () => {}, removeTree: async () => {},
    onCreated: listeners, onRemoved: listeners, onChanged: listeners, onMoved: listeners,
    onChildrenReordered: listeners, onImportBegan: listeners, onImportEnded: listeners,
  },
  storage: { local: { get: async (key) => (key === 'sm:settings' ? { 'sm:settings': { theme: THEME } } : {}), set: async () => {}, remove: async () => {}, getBytesInUse: async () => 2048 }, onChanged: listeners },
  runtime: { getURL: (p) => p, onInstalled: listeners, sendMessage: async () => {} },
  tabs: { query: async () => [{ id: 7, active: true, windowId: 1, title: 'GH repo 1', url: 'https://github.com/a/b' }], create: async () => ({}) },
  commands: { getAll: async () => [] },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
};
`

const HARNESS = `
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// A dependency-free accessibility audit: WCAG AA text contrast, accessible names on
// icon-only controls, and label associations. Deliberately conservative — it only
// reports what it can measure, so a clean run is meaningful.
const audit = () => {
  const parse = (value) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(value || '');
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.9) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const shown = (el) => {
    const box = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return box.width > 0 && box.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.5;
  };
  const lowContrast = [], unnamed = [], unlabelled = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!shown(el)) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (own.length > 1) {
      const s = getComputedStyle(el);
      const fg = parse(s.color);
      if (fg && fg.a > 0.5) {
        const size = parseFloat(s.fontSize);
        const large = size >= 24 || (Number(s.fontWeight) >= 700 && size >= 18.66);
        const need = large ? 3 : 4.5;
        const got = ratio(fg, bgOf(el));
        if (got < need - 0.05) {
          const chain = [];
          for (let n = el; n; n = n.parentElement) chain.push(n.tagName.toLowerCase() + '.' + String(n.className).slice(0, 26) + '|' + getComputedStyle(n).backgroundColor);
          lowContrast.push({ text: own.slice(0, 32), got: Math.round(got * 100) / 100, need, fg: s.color, bg: 'rgb(' + bgOf(el).r + ',' + bgOf(el).g + ',' + bgOf(el).b + ')', cls: String(el.className).slice(0, 34), tag: el.tagName.toLowerCase(), chain: chain.slice(0, 6) });
        }
      }
    }
    const tag = el.tagName.toLowerCase();
    const named = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent.trim() || el.querySelector('img[alt]:not([alt=""])');
    if ((tag === 'button' || tag === 'a') && !named) unnamed.push(tag + '.' + String(el.className).slice(0, 28));
    if (['input', 'select', 'textarea'].includes(tag)) {
      const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || (el.id && document.querySelector('label[for="' + el.id + '"]'));
      if (!labelled) unlabelled.push(tag + (el.type ? '[' + el.type + ']' : ''));
      const ph = el.getAttribute('placeholder');
      if (ph) {
        const pc = parse(getComputedStyle(el, '::placeholder').color);
        const s = getComputedStyle(el);
        if (pc && pc.a > 0.5) {
          const size = parseFloat(s.fontSize);
          const large = size >= 24 || (Number(s.fontWeight) >= 700 && size >= 18.66);
          const need = large ? 3 : 4.5;
          const got = ratio(pc, bgOf(el));
          if (got < need - 0.05) lowContrast.push({ text: 'placeholder: ' + ph.slice(0, 24), got: Math.round(got * 100) / 100, need, fg: pc ? 'rgb(' + pc.r + ',' + pc.g + ',' + pc.b + ')' : s.color, bg: 'rgb(' + bgOf(el).r + ',' + bgOf(el).g + ',' + bgOf(el).b + ')', cls: '::placeholder', tag });
        }
      }
    }
  }
  const unique = (list) => [...new Set(list)];
  return {
    lowContrast: lowContrast.filter((v, i) => lowContrast.findIndex(o => o.text === v.text && o.got === v.got) === i).slice(0, 12),
    unnamed: unique(unnamed).slice(0, 12),
    unlabelled: unique(unlabelled).slice(0, 12),
  };
};

// Focus visibility: WCAG asks for a visible indicator, and 1.4.11 asks for 3:1 against
// the surface behind it. Measured on the real focused elements, not asserted.
const focusProbe = () => {
  const parse = (value) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(value || '');
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const raw = getComputedStyle(n).backgroundColor;
      const c = parse(raw);
      if (c && c.a > 0.9) return { ...c, raw };
    }
    return { r: 255, g: 255, b: 255, a: 1, raw: 'none — fell back to white' };
  };
  const measure = (el) => {
    el.focus();
    const s = getComputedStyle(el);
    const colour = parse(s.outlineColor);
    if (!colour || s.outlineStyle === 'none' || parseFloat(s.outlineWidth) < 1) return { ok: false, why: 'no outline on focus' };
    const bg = bgOf(el.parentElement || el);
    const value = ratio(colour, bg);
    return {
      ok: true,
      ratio: Number.isFinite(value) ? Math.round(value * 100) / 100 : null,
      colour: s.outlineColor,
      bg: 'rgb(' + bg.r + ',' + bg.g + ',' + bg.b + ')',
      raw: bg.raw,
      width: s.outlineWidth,
    };
  };
  const out = {};
  const search = document.querySelector('input[placeholder]');
  if (search) out.search = measure(search);
  const navLink = document.querySelector('[data-surface="sidebar"] button, [data-surface="sidebar"] a');
  if (navLink) out.sidebar = measure(navLink);
  if (document.activeElement) document.activeElement.blur();
  return out;
};

const measure = () => {
  // Every box the app can scroll. The sidebar nav scrolls too, so tests must not
  // just count boxes — they pick the one that actually owns the bookmark rows.
  const boxes = [...document.querySelectorAll('div, section, main, nav, ul')]
    .filter(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
    .map(el => ({
      cls: String(el.className).slice(0, 40),
      client: el.clientHeight,
      scroll: el.scrollHeight,
      rows: el.querySelectorAll('input[type=checkbox]').length,
    }));
  const list = boxes.filter(b => b.rows > 0).sort((a, b) => b.client - a.client)[0];
  return {
    page: document.body.dataset.page,
    text: document.body.innerText,
    rows: Math.max(0, document.querySelectorAll('input[type=checkbox]').length - 1),
    boxes,
    list,
    listScrolls: !!list && list.client > 80 && list.scroll > list.client + 4,
    frameOverflow: document.documentElement.scrollHeight - window.innerHeight,
  };
};
const report = (result) => {
  const pre = document.createElement('pre');
  pre.id = 'probe-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
};

(async () => {
  const result = { viewport: window.innerHeight };
  await wait(2000);
  result.theme = {
    htmlClass: document.documentElement.className,
    prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    vars: ['--sm-bg', '--sm-surface', '--sm-text', '--sm-muted'].map(v => v + '=' + getComputedStyle(document.documentElement).getPropertyValue(v).trim()),
  };
  result.library = measure();
  result.library.a11y = audit();
  if (document.body.dataset.page !== 'popup') result.focus = focusProbe();
  if (document.body.dataset.page === 'popup') return report(result);

  // Route changes must re-filter, not fall back to the whole library.
  location.hash = '#/category/Development';
  await wait(900);
  result.category = measure();
  location.hash = '#/tag/work';
  await wait(900);
  result.afterTagRoute = measure();
  report(result);
})();
`

const PAGES = {
  dashboard: { html: 'dashboard.html', window: '1280,720', budget: 15000, theme: 'light', body: '<div id="root"></div>' },
  'dashboard-dark': { html: 'dashboard.html', window: '1280,720', budget: 15000, theme: 'dark', body: '<div id="root"></div>' },
  popup: { html: 'popup.html', window: '380,600', budget: 12000, theme: 'light', body: '<div id="root" style="height: 100%"></div>' },
  'popup-dark': { html: 'popup.html', window: '380,600', budget: 12000, theme: 'dark', body: '<div id="root" style="height: 100%"></div>' },
}

/** Reuses the real entry document so the probe is styled exactly like the shipped page. */
function probeHtml(page) {
  const entry = readFileSync(join(DIST, page.html), 'utf8')
  const links = [...entry.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).join('\n')
  if (!links.includes('stylesheet')) {
    console.error(`dist/${page.html} has no stylesheet link — the probe would render unstyled.`)
    process.exit(1)
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>probe</title>
${links}
<style>
  /* Probe only: virtual time does not advance CSS transitions, so any element with
     transition-colors would be measured at its pre-theme-switch colour. Freeze them. */
  *, *::before, *::after { transition: none !important; animation: none !important; }
</style>
</head>
<body data-page="${page.html.replace('.html', '')}" style="margin: 0">${page.body}
<script>${MOCK.replace('__THEME__', page.theme)}</script>
<script type="module" src="/${page.html.replace('.html', '.js')}"></script>
<script>${HARNESS}</script>
</body></html>`
}

for (const page of Object.values(PAGES)) {
  if (!existsSync(join(DIST, page.html.replace('.html', '.js')))) {
    console.error('dist is missing the built bundles — run `npm run build` first.')
    process.exit(1)
  }
}

const probes = Object.entries(PAGES).map(([name, page]) => {
  const file = join(DIST, `__probe-${name}.html`)
  writeFileSync(file, probeHtml(page))
  return { name, file, page }
})

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0])
  const file = join(DIST, path)
  if (!path.startsWith('/') || !file.startsWith(DIST) || !existsSync(file) || !extname(file)) {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(PORT, r))

async function run(probe) {
  const dom = await new Promise((done) => {
    const proc = spawn(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--hide-scrollbars',
        ...(process.env.CI ? ['--no-sandbox'] : []),
        `--window-size=${probe.page.window}`,
        `--user-data-dir=${probe.file}.profile`,
        `--virtual-time-budget=${probe.page.budget}`,
        '--dump-dom',
        `http://localhost:${PORT}/__probe-${probe.name}.html`,
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    )
    let out = ''
    proc.stdout.on('data', (d) => (out += d))
    proc.on('close', () => done(out))
  })
  rmSync(`${probe.file}.profile`, { recursive: true, force: true })
  const match = /<pre id="probe-result">([\s\S]*?)<\/pre>/.exec(dom)
  if (!match) return null
  return JSON.parse(match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
}

const results = {}
const only = process.argv[2]
for (const probe of probes) {
  if (only && only !== probe.name) {
    continue
  }
  results[probe.name] = await run(probe)
}
server.close()
for (const probe of probes) rmSync(probe.file, { force: true })

const checks = []
for (const [name, r] of Object.entries(results)) {
  if (r?.theme) {
    console.log(`  · ${name} theme: html="${r.theme.htmlClass}" prefersDark=${r.theme.prefersDark} ${r.theme.vars.join(' ')}\n`)
  }
}
const a11yChecks = (a11y, where) => {
  if (!a11y) {
    checks.push([`${where} accessibility audit ran`, false, 'no audit data'])
    return
  }
  checks.push([
    `${where}: every text colour meets WCAG AA contrast`,
    a11y.lowContrast.length === 0,
    a11y.lowContrast.map((v) => `"${v.text}" ${v.got}:1 (need ${v.need}:1) ${v.fg} on ${v.bg} <${v.tag}.${v.cls}>${v.chain?.[1] ? `\n        chain: ${v.chain.join(' < ')}` : ''}`).join('\n      '),
  ])
  checks.push([
    `${where}: icon-only buttons and links have accessible names`,
    a11y.unnamed.length === 0,
    a11y.unnamed.join(', '),
  ])
  checks.push([
    `${where}: every form control has a label`,
    a11y.unlabelled.length === 0,
    a11y.unlabelled.join(', '),
  ])
}

for (const [name, r] of Object.entries(results)) {
  const label = `${name.includes('popup') ? 'popup' : 'dashboard'} (${PAGES[name].theme})`
  if (!r) {
    checks.push([`${label} renders`, false, 'no result — blank page or a crash'])
    continue
  }
  if (name.includes('popup')) {
    checks.push([
      `${label}: content fits its 600px frame`,
      r.library.frameOverflow <= 4,
      `overflows by ${r.library.frameOverflow}px — content would be unreachable`,
    ])
    checks.push([`${label}: stays inside its width`, r.viewport <= 600, `viewport ${r.viewport}px`])
    a11yChecks(r.library.a11y, label)
    continue
  }
  // Layout and routing are theme-independent: assert them once, on the light dashboard.
  if (name === 'dashboard') {
    if (!r.library || !r.category || !r.afterTagRoute) {
      checks.push([`${label} renders`, false, 'a route never rendered'])
      continue
    }
    checks.push(['library lists every bookmark', r.library.rows === 30, `${r.library.rows} rows (want 30)`])
    checks.push([
      'the list has a scrollable container',
      r.library.listScrolls,
      `${r.library.boxes.map((b) => `${b.cls} client=${b.client} scroll=${b.scroll}`).join(' | ') || 'no overflow-auto box found'}; viewport=${r.viewport}px, content overflows frame by ${r.library.frameOverflow}px`,
    ])
    checks.push(['#/category/Development shows only Development', r.category.rows === 3, `${r.category.rows} rows (want 3)`])
    checks.push([
      'other categories are hidden there',
      !r.category.text.includes('Page 1') && !r.category.text.includes('Figma file'),
      'a non-Development title is visible',
    ])
    checks.push(['the Development rows are present', r.category.text.includes('GH repo 1'), 'GH repo 1 missing'])
    checks.push(['#/tag/work matches nothing, as expected', r.afterTagRoute.rows === 0, `${r.afterTagRoute.rows} rows (want 0)`])
  }
  for (const [where, ring] of Object.entries(r.focus ?? {})) {
    checks.push([`${label}: focus ring is drawn on ${where}`, !!ring.ok, ring.why ?? 'not measured'])
    if (ring.ok) {
      checks.push([
        `${label}: focus ring on ${where} has >= 3:1 contrast`,
        ring.ratio >= 3,
        `${ring.ratio}:1 (outline ${ring.colour} ${ring.width} on ${ring.raw}) — WCAG 1.4.11 wants 3:1`,
      ])
    }
  }
  a11yChecks(r.library.a11y, label)
}

let failed = false
for (const [label, ok, detail] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — ${detail}`}`)
  if (!ok) failed = true
}
console.log(failed ? '\nPROBE: FAIL' : '\nPROBE: PASS')
process.exit(failed ? 1 : 0)
