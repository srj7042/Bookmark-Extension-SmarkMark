# Test plan

Three layers: automated logic checks that always run, an automated browser smoke test that is honest
about a Chrome limitation, and a manual checklist for the parts only a human in a real profile can
confirm.

---

## 1. Automated — run these first

```bash
cd "/Users/surajjaiswal/Extensions/Extensions Bookmark"
npm run verify     # typecheck + lint + test + build
```

| Command | What it proves |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit`, strict) | Types across pages, hooks, chrome API usage. |
| `npm run lint` (`eslint .`) | `@typescript-eslint` + `react-hooks` (incl. the React-Compiler rules: no prop→state sync effects, no ref writes during render, no impure calls in render scope). |
| `npm test` (`node --test src/lib/logic.test.ts`) | 16 assertions over the pure logic — the parts that fail silently. |
| `npm run build` | The extension actually bundles: 3 HTML entries + a module service worker + icons + manifest. |
| `npm run probe` | Renders the **built** dashboard and popup in headless Chrome with stubbed `chrome.*` APIs and checks list scrolling, category/tag routes and popup fit (see below). |

### What `npm test` covers

| # | Case | Why it matters |
| --- | --- | --- |
| 1–2 | `normalizeUrl` collapses protocol/`www.`/trailing slash/query/hash, and degrades safely on non-URLs | Duplicate detection and "already saved" checks both rest on this key. |
| 3 | Known domain beats a misleading title | Ladder priority 2 > 4. |
| 4 | Folder context beats keywords | Ladder priority 3 > 4 (this caught a real bug: `\binvest\b` missed "Investing"). |
| 5 | No signal → `Other`, never throws, accent lookup is total | Fallback path and unknown-category safety. |
| 6–7 | Every search token must match; title outranks URL; tags and notes are searched | Search correctness and ranking. |
| 8 | Folder filter includes descendants and sorts | Nested-folder UX. |
| 9 | Unorganized = uncategorized **and** untagged | The smart list definition. |
| 10 | Duplicates group by normalized URL, singletons ignored | Duplicate view correctness. |
| 11 | `categoryCounts` separates auto-classified from to-review | Category card numbers. |
| 12 | JSON export → import round-trips folders, tags and notes | Backup fidelity. |
| 13 | JSON import also accepts a raw `chrome.bookmarks.getTree()` dump | Real-world input tolerance. |
| 14 | Junk JSON is rejected with a clear error | **No silent data loss on a bad file.** |
| 15 | Netscape export → import round-trips folders, HTML entities, tags and loose bookmarks | Interop with Chrome/Firefox/Safari exports (this caught a real ordering bug). |
| 16 | An HTML file with no bookmarks is rejected | Same guard as 14. |

The failing-first value is real: cases 4 and 15 both failed on the first run and were fixed.

### What `npm run probe` covers

`scripts/probe.mjs` stubs `chrome.bookmarks`/`chrome.storage`/`chrome.tabs`, loads the built bundles with
their real stylesheets, and checks the things a type checker cannot see:

| # | Case | Why it matters |
| --- | --- | --- |
| 1 | The bookmark list's own scroll box has `clientHeight < scrollHeight` | Guards the "I can't scroll down" bug: a `flex-1` child inside a non-flex parent grows to content height and is then clipped by `overflow-hidden`, so nothing scrolls. |
| 2 | `#/category/<name>` renders only that category | Guards the "counts look right but clicking shows everything" bug — the route's filter has to be applied, not dropped. |
| 3 | `#/tag/<tag>` with no matching tag renders nothing | Same code path as 2, for tags. |
| 4 | The popup's content fits its fixed 600px frame | Guards the same clipping family in the popup. |

---

## 2. Automated browser smoke test

```bash
npm run smoke        # = node scripts/smoke.mjs dist --headed
```

It launches Chrome with the built extension, finds the extension's own service worker to learn its id,
opens `dashboard.html`, writes settings through `chrome.storage.local`, creates bookmarks through the
real `chrome.bookmarks` API, and then asserts the rendered DOM contains those bookmarks **with a
category** (i.e. the heuristic ran), that no error state is showing, and that delete-then-restore works.

**Current limitation:** Chrome 137+ ignores `--load-extension` for unpacked extensions unless
enterprise policy allows it, so on Chrome 155 the harness reports:

```
SMOKE TEST: FAIL — the extension never registered with this Chrome build.
  Chrome 137+ ignores --load-extension unless enterprise policy allows it, so automate on
  Chromium/Chrome <=136 or verify by hand: ...
```

That is a browser policy, not a code failure. On Chromium/Chrome ≤136 (or a policy-managed profile)
the same script runs the full check unattended.

### Fallback headless render check (works everywhere)

Serves `dist/` over HTTP and renders `dashboard.html` in headless Chrome without extension APIs. The
app must render its **error state** (`Chrome bookmarks API unavailable`) rather than a blank page —
that proves the bundle executes, React mounts and Tailwind styles apply.

```bash
cd dist && python3 -m http.server 8791 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --user-data-dir=/tmp/sm-chrome-test \
  --virtual-time-budget=6000 --dump-dom http://localhost:8791/dashboard.html
```

Expected substrings: `SmartMark`, `All bookmarks`, `Categories`, `Something went wrong`,
`Chrome bookmarks API unavailable.`.

---

## 3. Manual checklist

Load `dist/` unpacked (see [README](./README.md#load-the-unpacked-extension-exact-steps)), then walk
these. `⟳` means reload the extension card first if you just rebuilt.

### Install & surface
1. ⟳ Loading shows no errors on the extension card; the dashboard opens on first install.
2. Toolbar icon shows a readable 16 px bookmark glyph; popup opens at 380×600 with no scrollbars.
3. Popup → **Dashboard** opens `dashboard.html`; popup → **gear** opens `options.html`.

### Real bookmark CRUD (verify in Chrome's own manager, `chrome://bookmarks`)
4. Popup: **Save this page** on a normal `https://` page → toast appears, bookmark shows in
   **Recently added**, and the same page in `chrome://bookmarks`.
5. Save the same page again → button reads **Already saved** and no duplicate is created.
6. Edit a bookmark: change the title and URL → both update in `chrome://bookmarks`.
7. Move a bookmark to another folder (single and bulk) → the tree in `chrome://bookmarks` matches.
8. Delete a bookmark → it disappears; press **Undo** in the toast → it returns to its **original
   folder** with its tags.
9. Delete a *folder* that has children, then Undo → the folder and its subtree return.
10. Create a new bookmark in `chrome://bookmarks` while the dashboard is open → the dashboard updates
    by itself within ~1 second.

### Categorization
11. Save `https://github.com/...` → category **Development** (90% confidence, reason "Known site").
12. Add bookmarks inside a folder named `Investing` → category **Finance** (72%, folder reason).
13. A bookmark with a nonsense domain and generic title lands in **Other** and appears in
    **Unorganized**.
14. Categories → **Correct** on any suggestion, choose a category, tick *Remember this domain* →
    every bookmark from that domain switches, and the rule appears under **Your rules**.
15. Settings → add a rule (`domain contains` → some category) → matching rows re-badge immediately.
16. Settings → turn **Show category suggestions** off → unconfirmed rows become *Uncategorized*;
    confirmed ones keep their category.
17. Categories → **File into folders** → a `SmartMark/<Category>` tree appears in `chrome://bookmarks`;
    Undo restores previous parents.

### Search, filters, sorting
18. `⌘K` / `Ctrl+K` focuses search; `/` also focuses it.
19. Search `react docs` → both tokens must be present; results rank title matches first.
20. Search a tag → matches; search a word that only exists in a note → matches.
21. Combine a category filter + tag filter + a non-default sort → the active-filter chips show and
    clear individually.
22. Toggle list/grid → the preference survives reopening the dashboard (and opening the popup).
23. Search gibberish → **No matches** empty state with a working **Clear filters** action when filters
    are active.

### Bulk operations
24. Select all → the bulk bar reports the right count; **Esc** clears it.
25. Bulk **Favorite** → all selected appear in **Favorites**.
26. Bulk **Tags** → add two tags, remove one → verify per bookmark in the edit dialog.
27. Bulk **Move** → all land in the destination; one Undo reverts the whole batch.
28. Bulk **Delete** with *Confirm before deleting* on → confirmation dialog; off → immediate, with Undo.
29. Bulk **Collect** → a new collection appears in the sidebar with the right count.

### Tags, collections, duplicates
30. Tags → rename a tag → every affected bookmark reflects it; remove a tag → bookmarks stay.
31. Collections → rename and delete a collection → bookmarks stay in Chrome.
32. Delete a bookmarked page outside SmartMark → the collection count shows the reduced live count.
33. Save the same URL twice with different `www.`/query strings → both appear in **Duplicates**.
34. **Select all but the oldest** → confirm → the oldest copy survives, Undo restores the rest.

### Import & export
35. Export JSON → re-import into a clean profile → folders, tags, notes, favorites and categories
    round-trip.
36. Export Netscape HTML → import it back into Chrome via `chrome://bookmarks` → folders and titles
    survive.
37. Import a corrupt `.json` → a clear error toast, **and no bookmarks are created or removed**.
38. Import with **Skip duplicates** on → existing URLs are counted and skipped.

### Appearance, states, accessibility
39. Theme light / dark / system all apply instantly, in every surface; no white flashes on load.
40. Empty profile → "Nothing here yet" states everywhere, never a blank panel.
41. `chrome://extensions` → SmartMark → *Errors* stays empty while exercising the flows above.
42. Tab through the popup and dashboard: focus rings are visible, every icon-only button has an
    accessible name (screen-reader or DevTools accessibility tree), modals trap initial focus and
    close on `Esc`.
43. Zip the window to < 900 px: the dashboard sidebar collapses behind a menu button and the content
    stays usable.

### Shortcuts
44. `Ctrl/Cmd+Shift+S` on a normal page → badge flashes ✓ and the page is bookmarked.
45. `Ctrl/Cmd+Shift+E` → the dashboard opens focused.
46. Press both on a `chrome://` page → badge shows `!` and nothing is bookmarked (no crash).

### Privacy
47. DevTools → Network on the dashboard while searching, categorizing, importing and exporting →
    **zero requests**.
48. `chrome://extensions` → SmartMark → *Site access* / permissions show only bookmarks, storage,
    activeTab, favicon — no host permissions, no content scripts.

### Reported regressions (keep these passing)

49. With enough bookmarks to overflow the window (say 30+), Dashboard → **Library**: scroll with the
    wheel/trackpad **down to the last row** — the list scrolls inside its own pane, the header and
    search stay put, and the page itself does not bounce.
50. Same in **Categories**, **Duplicates**, **Tags**, **Collections** and **Settings** — each scrolls.
51. Categories → click any card (e.g. *Development*) → the list shows **only** that category (the
    breadcrumb says so, the category dropdown shows it greyed out, and no unrelated titles appear).
52. Tags → click a tag chip → the list shows only bookmarks carrying that tag.
53. Popup: at 380×600 nothing is cut off — the list scrolls internally and the footer stays visible.

---

## 4. Regression gates for future changes

- Any new heuristic rule → add a case to `logic.test.ts` (a wrong category is invisible otherwise).
- Any change to `normalizeUrl` → update cases 1–2 and re-check the Duplicates view.
- Any new import format → must reject malformed input before writing (cases 14/16 pattern).
- Any new `chrome.*` call → must be wrapped in `lib/bookmarks.ts` or `lib/storage.ts` so undo and
  export keep working.
- Any change to a scroll container or the dashboard shell → run `npm run probe`; a `flex-1`
  child inside a non-flex parent silently un-scrolls the list, and no compiler will say so.
- Any new sidebar route → add a probe case that navigates to it and asserts the row count.
