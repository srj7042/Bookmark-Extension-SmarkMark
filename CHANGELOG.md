# Changelog

All notable changes to SmartMark are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Added
- `docs/` — privacy policy, terms, security policy, accessibility statement, data map,
  store listing copy, launch checklist and brand notes.
- `scripts/guard.mjs` — fails the build if a network API, dynamic code, an extra
  permission, a remote asset or a broken contrast token pair appears (`npm run guard`).
- Accessibility checks in `scripts/probe.mjs`: WCAG AA contrast in light and dark,
  accessible names, form labels, placeholder contrast, and focus-ring visibility.

### Changed
- `--sm-muted` darkened and `--sm-sidebar-muted` lightened (light theme) to meet WCAG AA:
  muted text measured 3.8:1 on ivory before. Dark theme values already passed.
- Focus ring is now `--sm-focus` instead of the sky accent, and switches to white inside
  the blue sidebar: the previous ring measured 2.8:1 on white, below the 3:1 minimum for
  a focus indicator (WCAG 1.4.11).

### Fixed
- Clicking a category card (or a tag) listed the **whole library** instead of that
  category: the route's own filter was dropped and never applied to the list.
- The dashboard list could not be scrolled: a `flex-1` child sat inside a non-flex
  parent, so the list grew past the viewport and was clipped by `overflow-hidden`.
- The probe now forces a theme per run; results previously depended on the machine's
  light/dark appearance.

## [1.0.0] — 2026-10-18

First release.

### Added
- Read, create, rename, re-URL, move and delete real Chrome bookmarks and folders
  through `chrome.bookmarks` — SmartMark is a view over your bookmarks, not a copy.
- Automatic local categorization from domain, folder path, title and URL, with
  confidence and a human-readable reason. User rules outrank heuristics; a confirmed
  category outranks everything.
- Custom categories with optional matching rules (`domain contains`,
  `title/URL contains`).
- Tags, notes, favorites and cross-folder collections, stored in `chrome.storage.local`.
- Global search across title, URL, domain, folder path, tags and notes, with weighted
  ranking and an "every token must match" rule.
- Duplicate detection by normalized URL (protocol, `www.`, trailing slash, query and
  hash ignored) with "select all but the oldest".
- Bulk operations: multi-select, then move, tag, favorite, collect or delete.
- Smart lists: Favorites, Recently added, Recently opened, Unorganized, Duplicates.
- Undo for every destructive action (deletes restore folders and subtrees).
- JSON and Netscape HTML import/export, with duplicate skipping and validation that
  refuses malformed files instead of partially importing them.
- Toolbar popup, full-page dashboard and options page; light, dark and system themes;
  loading, empty, error and confirmation states throughout.
- Keyboard shortcuts: `Ctrl/Cmd+Shift+S` save page, `Ctrl/Cmd+Shift+E` dashboard,
  `Ctrl/Cmd+K` or `/` focus search, `Esc` clear selection.
- Test suites: `src/lib/logic.test.ts` (16 cases) and `scripts/probe.mjs` (rendered
  layout, routing and accessibility checks).

### Security
- No network requests, no remote code, no analytics, no accounts. Permissions limited to
  `bookmarks`, `storage`, `activeTab` and `favicon`; no host permissions and no content
  scripts. Enforced by `npm run guard`.
