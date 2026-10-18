# SmartMark

**v1.0.0** — A production-quality, **local-first** Chrome bookmark manager (Manifest V3). SmartMark reads your real
Chrome bookmarks through `chrome.bookmarks`, adds tags, notes, favorites, collections and automatic
categorization on top, and never sends a byte of your data anywhere.

Built with React 19 + TypeScript + Vite + Tailwind CSS v4.

![palette](https://img.shields.io/badge/palette-%233368A0%20%2366A3BF%20%23C8DFDB%20%23F2EFE7-blue)

---

## What it does

| Area | Details |
| --- | --- |
| **Real bookmark CRUD** | Create, rename, re-URL, move, delete and re-create folders — all through `chrome.bookmarks`. SmartMark is a view over your actual Chrome bookmarks, not a second copy. |
| **Automatic categorization** | Local heuristics over domain, folder path, title and URL. User rules outrank heuristics, and a confirmed category outranks everything. |
| **Custom categories** | Create categories with an optional rule (`domain contains` / `title-URL contains`). |
| **Tags, notes, favorites, collections** | Stored in `chrome.storage.local`, keyed by bookmark id. Collections are cross-folder groupings. |
| **Global search** | One query across title, URL, domain, folder path, tags and notes, with weighted ranking. |
| **Duplicate detection** | Groups exact duplicates by normalized URL (protocol, `www.`, trailing slash, query and hash ignored). |
| **Bulk operations** | Multi-select, then move / tag / favorite / collect / delete. |
| **Smart lists** | Favorites, Recently added, Recently opened (visited via SmartMark), Unorganized, Duplicates. |
| **Import & export** | SmartMark JSON and Netscape HTML, both directions, with duplicate skipping. |
| **Undo** | Every delete and bulk move returns an inverse action; the toast offers **Undo**. |
| **Keyboard shortcuts** | `Ctrl/Cmd+Shift+S` save page, `Ctrl/Cmd+Shift+E` dashboard, `Ctrl/Cmd+K` search, `Esc` clear selection. |
| **Themes & states** | Light / dark / system, plus loading skeletons, empty states, error states and confirmations. |

---

## Install & build

```bash
cd "/Users/surajjaiswal/Extensions/Extensions Bookmark"
npm install
npm run build          # typecheck -> icons -> vite build  (outputs dist/)
```

Other scripts:

```bash
npm run dev        # Vite dev server (UI only; chrome.* APIs need the real extension)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm test           # logic self-check (node:test, no framework)
npm run verify     # typecheck + lint + test + build + probe
npm run probe      # headless layout/route check of the built pages (no Chrome profile needed)
npm run smoke      # automated end-to-end check (see TEST_PLAN.md for the Chrome caveat)
npm run pack       # build + smartmark.zip for the Chrome Web Store
```

Regenerating icons happens automatically in `npm run build` (`node scripts/gen-icons.mjs`, zero
dependencies — a hand-rolled PNG encoder over `node:zlib`).

---

## Load the unpacked extension (exact steps)

1. Run `npm run build`. Confirm `dist/` contains `manifest.json`, `background.js`, `popup.html`,
   `dashboard.html`, `options.html` and `icons/`.
2. Open Chrome and go to **`chrome://extensions`**.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the **`dist`** folder — i.e. `/Users/surajjaiswal/Extensions/Extensions Bookmark/dist`
   (not the repository root, which has no `manifest.json`).
6. SmartMark appears in the list and the dashboard opens automatically on first install.
7. Pin it: click the puzzle-piece icon in the toolbar → the pin next to **SmartMark**.

After a rebuild, press the **reload** (↻) button on the SmartMark card in `chrome://extensions` to
pick up changes. If the toolbar popup seems stale, close and reopen it.

**Shortcuts:** click **Keyboard shortcuts** on the SmartMark card in `chrome://extensions`, or go to
`chrome://extensions/shortcuts`, to rebind them.

### Load errors?

| Symptom | Fix |
| --- | --- |
| "Manifest file is missing or unreadable" | You selected the project root. Select `dist/`. |
| Dashboard shows "*Chrome bookmarks API unavailable*" | You opened `dashboard.html` from disk or as a `file://` page. Open it from the extension (toolbar → Dashboard). |
| Popup is blank | Check the extension card for an error, then reload the extension. |
| Shortcut does nothing | Another extension owns it — rebind at `chrome://extensions/shortcuts`. |

---

## Permissions (and why each one)

| Permission | Why |
| --- | --- |
| `bookmarks` | The whole point: read and modify your bookmarks and folders. |
| `storage` | Preferences, tags, notes, favorites, categories, collections, undo metadata. |
| `activeTab` | Read the current tab's title/URL **only** when you click Save or press the shortcut. Avoids the broad `tabs` permission and its browsing-history warning. |
| `favicon` | Site icons from Chrome's local favicon cache. No network request, no third-party favicon service. |

No `host_permissions`, no content scripts, no remote code, no analytics, no network calls of any kind.
The MV3 CSP is locked to `script-src 'self'; object-src 'self'`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the module map and [TEST_PLAN.md](./TEST_PLAN.md) for how
each claim above is verified.

---

## Design system

| Token | Value | Use |
| --- | --- | --- |
| `--color-ivory` | `#F2EFE7` | Page background (light) |
| `--color-brand` | `#3368A0` | Sidebar, primary buttons, focus |
| `--color-sky` | `#66A3BF` | Accents, active filters, links |
| `--color-sage` | `#C8DFDB` | Category cards, suggestion pills |
| `--color-surface` | `#FFFFFF` / `#191F26` | Cards |
| `--color-muted` | `#59656f` | Secondary text |

Spacing follows a 4 px rhythm, radii are `0.875rem` (`rounded-xl2`), and shadows are the two tokens
`--shadow-card` and `--shadow-pop`. All colors are defined once in `src/index.css`; components never
hard-code hex values.

---

## Privacy

SmartMark has no backend. Categorization runs in the page, metadata lives in `chrome.storage.local`,
and imports/exports are read and written by your browser locally. Uninstalling removes all SmartMark
data (`chrome://extensions` → SmartMark → Remove).

## License

SmartMark is proprietary software — free to install and use, but not open source:
see `LICENSE` for the end-user licence and `THIRD_PARTY.md` for the React notices
(which keep their own MIT licence). A later release may ship under a different
licence; the licence shipped with a release governs that release.

## Policies, security & launch docs

Published from `docs/` (hosted on GitHub Pages):

- [Privacy Policy](docs/privacy.html) — no network requests; what SmartMark touches
  and what never leaves your device.
- [Terms of Use](docs/terms.html) — licence, support, governing law, grievance
  officer.
- [Security Policy](docs/security.html) — how to report a vulnerability, what is
  in scope, and what is already enforced (`npm run guard`).
- [Accessibility](docs/accessibility.html) — WCAG 2.2 AA target and what is verified.
- [Data map](docs/data-map.md) — every field the extension touches, and the
  Chrome Web Store data-usage answers that match this build.
- [Store listing](docs/store-listing.md) — paste-ready listing text and reviewer
  notes.
- [Launch checklist](docs/launch-checklist.md) — phases 0–4, placeholders to fill,
  and the promises you must not break.
- [Brand](docs/brand.md) — trademark search findings and name advice.

The privacy claims above are machine-checked, not just written down:

- `npm run guard` — rejects network APIs, dynamic code, extra permissions, remote
  assets, mismatched contrast token pairs, stale manifest fields, and unfilled policy
  placeholders.
- `npm run probe` — renders the built extension pages headlessly and asserts WCAG AA
  contrast (light and dark), accessible names, form labels, focus-ring visibility,
  layout scrolling, category/tag routing and popup fit.
