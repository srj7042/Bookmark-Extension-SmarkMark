---
title: Store Listing
---

# Chrome Web Store listing

Copy-paste-ready listing text, permission justifications and reviewer notes, written to
match what the code actually does. Every claim here is enforced by a check in
`scripts/guard.mjs` or `scripts/probe.mjs`.

## Identity

| Field | Value | Limit |
| --- | --- | --- |
| Name | `SmartMark — Bookmark Manager` | 45 characters (measured: 30) |
| Short description | see below | 132 characters |
| Category | Productivity | — |
| Language | English | — |
| Support URL | {{SUPPORT_URL}} | must be a live, public page |
| Privacy policy URL | {{PRIVACY_URL}} | must be live and match the data-usage form |

**Short description (draft, 129 characters):**

> Organize Chrome bookmarks with auto categories, tags, notes, duplicate cleanup and instant search. No account, no server, nothing leaves your device.

## Detailed description

> **SmartMark turns a bookmark bar into a library.**
>
> Chrome gives you folders. SmartMark gives you categories, tags, notes, collections and
> search that actually work — and it does all of it on your own machine.
>
> **Everything stays local.** No account, no sign-up, no server, no analytics, no
> advertising. SmartMark makes zero network requests, verifiable in DevTools, and its
> permission list is only four items long.
>
> **What you get**
> - **Automatic categories** — Development, Design, News, Shopping, Social, Work and so
>   on, guessed from the domain, folder path, title and URL. Every guess shows why it was
>   made, and can be overridden or pinned forever.
> - **Tags, notes and collections** — one bookmark can live in several collections at
>   once, unlike folders. Add private notes to remember why you saved it.
> - **Search that finds it** — title, URL, domain, folder path, tags and notes, with
>   weighted ranking. `Ctrl/Cmd+K` from anywhere in the dashboard.
> - **Duplicate cleanup** — duplicates detected on a normalised URL (protocol, `www.`,
>   trailing slash, query and hash ignored), with "select all but the oldest" in one click.
> - **Bulk actions** — select many, then move, tag, favourite, collect or delete.
> - **Undo** — every destructive action can be reversed, including a deleted folder and
>   its entire subtree.
> - **Import and export** — JSON and Netscape HTML, so your data is never held hostage and
>   can move to any other browser.
> - **Smart lists** — Favorites, Recently added, Recently opened, Unorganized, Duplicates.
> - **Light and dark** themes, list and grid density, and a keyboard shortcut to save the
>   page you are reading.
>
> **What SmartMark does not do.** It does not sync, it does not have a mobile app, and it
> does not use AI cloud services — categorisation is a local heuristic you can correct,
> never a black box you have to trust.
>
> **Permissions, in plain words.** `bookmarks` to read and organise your bookmarks,
> `storage` to keep your tags and notes, `activeTab` to read the page you explicitly save,
> `favicon` to show site icons from Chrome's own cache. No access to pages you visit, no
> browsing history, no host permissions.

## Permission justifications (the Chrome Web Store review questions)

**`bookmarks`** — The extension's single purpose is organising the user's Chrome
bookmarks. This permission is used to list, search, create, move, rename and delete
bookmarks and folders in the user's own bookmark tree, and to detect duplicates. No
bookmark data is transmitted anywhere: the extension contains no network code.

**`storage`** — Used to store the metadata SmartMark adds to bookmarks — tags, notes,
favourites, collections, chosen categories and UI preferences — locally with
`chrome.storage.local`. This data never leaves the device and is removed when the
extension is uninstalled.

**`activeTab`** — Used only when the user explicitly saves the current page, either with
the toolbar popup's Save button or the `Ctrl/Cmd+Shift+S` command. At that moment the
extension reads the active tab's title and URL to create a bookmark. It does not read
content, and it does not act on any tab the user has not asked about.

**`favicon`** — Used to display each bookmark's site icon from Chrome's local favicon
cache. No image is fetched from the network.

**Not requested, deliberately:** no `tabs`, no `history`, no `bookmarks` host permissions,
no `<all_urls>`, no content scripts, no `webRequest`, no `downloads`, no
`management`, no `identity`, no `alarms`, no `notifications`, no remote code, and no
`script-src` relaxation. The build fails if any of these change (`npm run guard`).

## Single purpose statement

> SmartMark has one purpose: to help the user organise and search the bookmarks already
> stored in their Chrome browser, entirely on their own device.

Every feature maps to that purpose. There is no secondary purpose, no advertising use, no
analytics use, and no sale or transfer of user data.

## Data usage (answers to the store's disclosure form)

- Collects user data: **No.**
- Uses remote code: **No.**
- Sold to third parties: **No.** Transferred for purposes unrelated to the single purpose:
  **No.** Used to determine creditworthiness or for lending: **No.**
- Data-usage form matches `docs/data-map.md`, which lists every field the extension
  touches and where it lives.

## Screenshot plan (1280×800, PNG, no marketing bloat)

1. **The dashboard, library view** — search bar populated, sidebar visible, a mixed list.
   Caption: *Your bookmarks, organised — locally.*
2. **Categories view** — cards with counts, one selected.
   Caption: *Automatic categories you can correct, with reasons.*
3. **A bookmark row, expanded** — category chip with reason, tags, note.
   Caption: *Tags, notes and a reason for every guess.*
4. **Duplicates view** — duplicate groups and "select all but the oldest".
   Caption: *Find and clean up duplicates in one pass.*
5. **Popup** — the save card and quick list.
   Caption: *Save the page you're reading in one shortcut.*
6. Optional: **dark theme** version of shot 1.

Promo tile (440×280): the SmartMark mark on ivory, wordmark, and one line —
*Bookmarks, organised locally.* Marquee (1400×560) if a featured placement is ever wanted.

## Reviewer notes (to paste into "Notes for the reviewer")

> SmartMark works entirely offline. To test: click the toolbar icon to save the current
> page, then "Open dashboard". Try Categories → any card, Tags, Duplicates, and
> bulk-selecting a few rows, then Tools → Export. Note that the extension makes **no
> network requests at all** — the DevTools Network tab stays empty — and installs with
> only four permissions, no host permissions and no content scripts. Any category
> suggestion can be overridden per bookmark, and everything destructive is undoable.

## Search-friendly wording (for the listing body, not keyword stuffing)

bookmark manager, bookmark organizer, bookmarks folder, duplicate bookmarks, bookmark
tags, bookmark search, offline bookmark manager, private bookmark manager, chrome
bookmarks cleaner, bookmark notes, import bookmarks html, export bookmarks json.

## Before you publish

- Replace `{{SUPPORT_URL}}` and `{{PRIVACY_URL}}` with live URLs (see
  `docs/launch-checklist.md` for hosting the policies on GitHub Pages).
- Take the screenshots from a build loaded unpacked from `dist/`, never from the plain dev
  server, so the icons and layout match the shipped extension.
- Re-read this file after any feature change: the store form must keep matching reality.
