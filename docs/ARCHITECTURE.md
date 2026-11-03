# Architecture

## Shape of the system

```
                       ┌──────────────────────────── chrome.bookmarks (source of truth)
                       │
  ┌────────────────────┴─────────────────────┐
  │  lib/bookmarks.ts   promise wrapper +    │
  │  flatten: tree -> Bookmark[] + Folder[]  │
  └────────────────────┬─────────────────────┘
                       │  (pure, no chrome.*)
  ┌────────────────────┴─────────────────────┐
  │ url.ts · categorize.ts · query.ts        │  normalize, classify, filter/rank/dedupe
  └────────────────────┬─────────────────────┘
                       │
  ┌────────────────────┴─────────────────────┐
  │ lib/hooks.ts  useLibrary / useSettings /  │  state, live resync, undo closures, toasts
  │               useCollections / useShortcut│
  └────────────────────┬─────────────────────┘
                       │
   ┌───────────────────┼────────────────────┐
   │                   │                    │
 popup.html      dashboard.html        options.html        background.js
 (pages/Popup)   (pages/Dashboard)     (pages/Options)     (service worker)
```

Three HTML entry points plus one service worker, built by a single Vite config
(`vite.config.ts` → `rollupOptions.input`). The extension has **no content scripts and no messaging
protocol**: extension pages have full access to `chrome.bookmarks` and `chrome.storage`, so the popup,
dashboard and options talk to the APIs directly.

## Why each boundary exists

| Boundary | Reason |
| --- | --- |
| `lib/url.ts`, `lib/categorize.ts`, `lib/query.ts`, `lib/importexport.ts` are **pure** (no `chrome.*`, explicit `.ts` specifiers) | They are the parts that can be wrong silently, so they are unit-checked with Node's built-in runner (`npm test`) without a browser, a bundler or a test framework. |
| `lib/bookmarks.ts` is the only module importing `chrome.bookmarks` mutations | Undo, export and import all reuse the same primitives, so there is exactly one place to fix a bookkeeping bug. |
| `lib/storage.ts` is the only module touching `chrome.storage` | The only other `chrome.*` reads in the app are read-only diagnostics — the shortcut list in Settings and the badge in the service worker. Nothing else reaches past these two modules, so `chrome.*` failures have a single catch site. |
| `lib/hooks.ts` owns all React state | `useLibrary` performs one coalesced reload on any bookmark change event, which keeps Chrome's own bookmark manager, other tabs and SmartMark consistent without a differential sync. |
| `src/background.ts` is tiny on purpose | A service worker is only needed for `chrome.commands` and toolbar badge feedback. Everything else runs in a page that is already open, so the worker stays idle and off the critical path. |

## Data model

Chrome owns bookmarks and folders. SmartMark owns everything Chrome has no concept of, in
`chrome.storage.local`:

| Key | Shape | Notes |
| --- | --- | --- |
| `sm:settings` | `Settings` | theme, density, default folder, sort, confirmations, tag vocabulary, custom category rules |
| `sm:meta` | `Record<bookmarkId, Meta>` | `tags`, `note`, `favorite`, `category` (user-confirmed), `lastOpened` |
| `sm:collections` | `Collection[]` | `{ id, name, ids[] }` — cross-folder groupings |

`pruneMeta` runs on every load and drops metadata for bookmarks the user deleted outside SmartMark, so
`sm:meta` cannot grow without bound.

## Categorization ladder

Evaluated in order; the first hit wins, and **the user always outranks the machine**:

| Priority | Source | Confidence |
| --- | --- | --- |
| 0 | `meta.category` (user confirmed, or applied from a suggestion) | `1.0` |
| 1 | User rule from Settings (`domain contains` / `text contains`) | `0.95` |
| 2 | Built-in domain table (~40 well-known sites) | `0.90` |
| 3 | Folder-path keywords (a bookmark inside "Work / Investing") | `0.72` |
| 4 | Title + URL keywords (suffixed stems, e.g. `learn(ing\|er)?`) | `0.60` |
| 5 | TLD hint (`.edu`, `.gov`, `.dev`) | `0.55` |
| 6 | Fallback → `Other`, shown in the **Unorganized** smart list | `0.15` |

Every suggestion is presented as a chip with an **Apply** and a **Correct** affordance, and "Correct"
can also remember a domain rule. Nothing is moved or renamed without an explicit click; the optional
**File into folders** button is the only bulk move and it is undoable.

## Search & duplicates

- Search tokenizes on whitespace, requires **every** token to match at least one field, and scores
  fields by weight (title 5, domain 4, tags 3, url 2, path/note 1) with a prefix bonus. Zero score
  excludes the row; results sort by score, then by the chosen sort key.
- Duplicates key on `normalizeUrl()`: host without `www.`, path without a trailing slash, ignoring
  protocol, query string and hash.

Both are deliberately scoped in code with `ponytail:` comments naming the ceiling and the upgrade path.

## Routing & view scope

`Dashboard.tsx` parses `location.hash` into a `route` plus a `scope` object and remounts `Browser` with a
`key`, so a route change is a fresh mount rather than a state sync. Two rules keep the filtering honest:

- **The route's own filter lives in `Browser`'s `base` memo** (`scope.category`, `scope.tag`,
  `scope.onlyIds`, `scope.favoritesOnly`, …). It is *not* a query argument — dropping it there silently
  renders the whole library behind a category title.
- **Toolbar dropdowns are additive only.** Where the route already fixes a value (`#/category/Design`,
  `#/tag/work`) the corresponding dropdown is `disabled` and shows that value, so no control can appear
  to do something it does not do.

`npm run probe` navigates these routes in a real browser and asserts the row counts, because both
mistakes above type-check perfectly.

## Undo

Destructive operations capture their inverse before acting:

- **Delete** → `captureSubtrees()` keeps the full node subtree; undo re-creates it under the original
  parent (folders included).
- **Move** → the previous `{ parentId, index }` per id; undo replays them in reverse.
- **Category apply** → the previous `meta.category` value.

The closure is handed to the toast, which renders an **Undo** action. The undo stack is in-memory and
page-scoped: closing the dashboard forgets it. That is the honest limit — Chrome renders no UI for us
to keep it open, and a persistent stack would need to survive ids changing under it.

## Live resync

`useLibrary` subscribes to `onCreated`, `onRemoved`, `onChanged`, `onMoved`, `onChildrenReordered`
and `onImportEnded`, plus `chrome.storage.onChanged` for settings, and coalesces them into one full
re-flatten 150 ms after the last event. A full re-flatten is O(n) over a tree that is realistically in
the hundreds or low thousands; incremental patching would be more code and more ways to drift.

## Security posture

- Manifest V3, `script-src 'self'`, no remote code, no `eval`.
- Minimal permissions (`bookmarks`, `storage`, `activeTab`, `favicon`); no host permissions.
- No network calls at all: no fetch/XHR, no third-party favicons, no analytics, no telemetry.
- All user-supplied text (tags, notes, collection names, bookmark titles) is rendered through React,
  which escapes it. Imported HTML is parsed with a regex tokenizer — it is never injected into the
  DOM, so a malicious bookmark file cannot become script.

## Known ceilings (marked in code with `ponytail:`)

| Ceiling | Where | Upgrade path |
| --- | --- | --- |
| Duplicate key ignores query strings | `url.ts` | per-site allowlist of meaningful params |
| Netscape folder nesting is flattened to one level on import | `importexport.ts` | real tokenizer that tracks `<DL>` depth |
| Full re-flatten on every change event | `hooks.ts` | apply the event's node delta in place |
| Undo stack is page-scoped and in memory | `hooks.ts` | persist to `chrome.storage.session` |
