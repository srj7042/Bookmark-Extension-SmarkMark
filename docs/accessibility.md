---
title: Accessibility
---

# Accessibility

## What we aim for

SmartMark targets **WCAG 2.2 level AA** for its own interface — the toolbar popup, the
dashboard and the options page — in both light and dark themes, with the keyboard as a
first-class way to use it.

## Verified automatically

`npm run probe` renders the built extension pages in headless Chrome (light and dark) and
measures them. It fails the build if any of these regress:

| Check | How it is measured | Requirement |
| --- | --- | --- |
| Text contrast, light and dark | Computed `color` of every visible text node against its effective background | 4.5:1 normal text, 3:1 large text |
| Placeholder contrast | `::placeholder` colour against the field background | 4.5:1 |
| Accessible names | Every `<button>`/`<a>` with no text must have `aria-label`, `title` or labelled image content | — |
| Form labels | Every `input`/`select`/`textarea` must have `aria-label`, `aria-labelledby`, or an associated `<label>` | — |
| Focus indicator | The focused search field, and a focused sidebar link, must draw an outline of at least 1px | visible |
| Focus indicator contrast | Outline colour against the surface behind it | 3:1 (WCAG 1.4.11) |
| Layout | The bookmark list scrolls inside its pane; no content is clipped; popup content fits 380×600 | nothing unreachable |

`npm run guard` separately recomputes **20 documented colour pairs** (10 in each theme)
straight from the token values in `src/index.css` and fails if any drops below its
requirement. Current values include:

- muted text: **5.2:1** on ivory, 6.0:1 on white, 5.6:1 on the card surface
- body text: 13.2:1 on ivory, 15.2:1 on white
- sidebar text: 5.1:1, sidebar secondary text: **4.6:1**
- focus ring: 7.1:1 on white, 6.2:1 on ivory, 5.8:1 inside the sidebar

## Verified by hand

Covered by the manual checklist in `TEST_PLAN.md` (steps 39–46 and 49–53): tab order
through the popup and dashboard, `Esc` closing dialogs and clearing selection, the
keyboard shortcuts (`Ctrl/Cmd+K`, `/`, `Ctrl/Cmd+Shift+S`, `Ctrl/Cmd+Shift+E`),
confirmation dialogs being reachable and cancellable without a mouse, and both themes
being readable.

## Motion and user preferences

`prefers-reduced-motion: reduce` is honoured: animations and transitions are reduced to
effectively zero. There is no autoplaying media, no flashing content, and no
time-limited interaction.

## Known limitations

Listed honestly, because an accessibility statement that claims everything is perfect is
not useful:

- **No screen-reader pass yet.** NVDA, JAWS and VoiceOver with Chrome have not been run
  against SmartMark. The automated checks cover names, roles and contrast, not reading
  order or announcement quality. This is the next manual pass, and findings will be fixed
  and recorded here.
- **The bookmark list is a plain list of rows.** There is no arrow-key navigation between
  rows and no grid/tree widget: each row's checkbox and four action buttons are separate
  tab stops, so keyboarding through a very long list is verbose. A roving-tabindex model
  is a known improvement, not yet implemented.
- **No drag-and-drop anywhere.** That is deliberate: every operation has a button, a menu
  or a keyboard route, so nothing is pointer-only. Moving bookmarks uses the Move dialog.
- **Long lists are not virtualised.** Performance with tens of thousands of bookmarks is
  untested; marking one as a bookmark does not change the accessibility checks above, but
  it is an untested area.
- **Colour is never the only signal** — category chips carry the category name next to
  their accent dot, tags are prefixed with `#`, and favourites use an icon as well as
  colour — but the accent dots themselves are decorative and are not announced.
- **Zoom is untested above 200%** with the browser at a narrow width.

## Reporting an accessibility problem

Email learnhowme987@gmail.com with the page, what you used (keyboard, screen reader, zoom,
theme) and what happened. Accessibility bugs are treated as bugs, not as feature requests.

## Legal context (informational)

The European Accessibility Act applies to many digital services sold into the EU from
June 2025, with small-enterprise exemptions. This page is our best-effort disclosure of
conformance work — it is not a certification, and we are not a notified body.
