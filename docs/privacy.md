---
title: Privacy Policy
---

# SmartMark Privacy Policy

**Last updated:** 2026-10-18
**Applies to:** the SmartMark Chrome extension and this website.
**Who we are:** Suraj Jaiswal, {{SELLER_ADDRESS}} — learnhowme987@gmail.com

## The short version

SmartMark does not collect, transmit, sell or share your personal data. There is no
server, no account, no analytics, no advertising and no third-party SDK. Your bookmarks
are read and changed only on your own device, through Chrome's own bookmark storage.

## What SmartMark accesses, and why

| What | Where it lives | Why it is needed |
| --- | --- | --- |
| Your Chrome bookmarks: titles, URLs, folder structure, dates | Your Chrome profile, via the `bookmarks` permission | This is the thing you are managing. SmartMark reflects it; it does not copy it anywhere |
| The title and URL of the page you ask it to save | Read at the moment you press Save, via the `activeTab` permission | To create the bookmark. Only the tab you act on, only when you act |
| Tags, notes, favourites, collections, category choices, preferences | `chrome.storage.local` inside your Chrome profile | SmartMark's own metadata — the parts Chrome has nowhere to keep |
| Site icons | Chrome's local favicon cache, via the `favicon` permission | Showing a recognisable icon next to each bookmark |

SmartMark does not read page contents, form fields, passwords, browsing history,
keystrokes, cookies or any other browsing activity.

## What never leaves your device

Nothing. The extension makes **no network requests of any kind** — no telemetry, no crash
reports, no remote fonts or scripts, no advertising, no sync, no licence check.

That is not only a written promise. It is enforced by an automated check that fails the
build (`npm run guard`) if a network API, a remotely hosted script or an unexpected
permission appears in the source. You can confirm it yourself: open DevTools → Network
while using SmartMark and watch the request list stay empty.

## Storage, retention and deletion

- Everything SmartMark stores lives in your Chrome profile (`chrome.storage.local`) and
  in your own bookmarks. It is yours, on your machine.
- Retention is entirely under your control.
  **Settings → Clear SmartMark data** removes every tag, note, favourite, collection,
  category choice and preference. Deleting a bookmark deletes it, as in Chrome itself.
- Uninstalling the extension removes the extension's storage. Your Chrome bookmarks
  remain, because SmartMark never moved them anywhere.
- **Tools → Export** produces a JSON or Netscape HTML copy of everything SmartMark knows,
  at any time, with no limits.

## Permissions, and what each one is for

| Permission | Used for |
| --- | --- |
| `bookmarks` | Reading, creating, moving, editing and deleting your bookmarks and folders — the core of the product |
| `storage` | Keeping tags, notes, favourites, collections, categories and preferences on your device |
| `activeTab` | Reading the current tab's title and URL **only** when you explicitly save the page (toolbar button, or `Ctrl/Cmd+Shift+S`) |
| `favicon` | Showing each bookmark's icon from Chrome's local cache |

SmartMark requests **no host permissions** and injects **no content scripts** into any
page you visit.

## The one case where personal data reaches the developer

If you email support, the developer receives your email address, whatever you write, and
anything you attach. That is the only personal data SmartMark's developer can ever hold.

- **Purpose:** answering your request, and keeping a record of support history.
- **Lawful basis** (GDPR/UK GDPR): your consent when you write to us, or our legitimate
  interest in supporting the people who use the extension.
- **Retention:** deleted within 24 months of the last reply, or immediately if you ask.
- **Sharing:** never sold, never used for advertising, never used for credit or insurance
  decisions. Email is hosted by Gmail, acting as a processor.

## Your rights

Because SmartMark holds no data about you, most data-protection rights are satisfied by
design — see *Storage, retention and deletion* above.

- **GDPR / UK GDPR** (EEA, UK): access, rectification, erasure, restriction, portability,
  objection, and the right to complain to your supervisory authority.
- **India — Digital Personal Data Protection Act 2023:** access, correction, erasure and
  grievance redressal; consent and notice where consent applies.
- **CCPA / CPRA** (California): SmartMark does not sell or share personal information as
  defined by those laws, and holds no personal information to disclose or delete.

To exercise any right, or simply to ask a question about this policy, write to
learnhowme987@gmail.com. You will get an answer within 30 days.

## Children

SmartMark is a general-purpose productivity tool, not directed at children, and it
collects no data from anyone — including children under 13 (COPPA) or under the
applicable age of digital consent in your country as set by the GDPR and DPDP Act.

## Security

Because there is no server, there is no server-side data store to breach. Locally, your
bookmarks and SmartMark metadata are protected by your Chrome profile and your operating
system account. Found a security problem? See [Security](security.html).

## Changes to this policy

If SmartMark ever begins sending data anywhere — today it does not — this policy will be
updated **before** that version ships, the Chrome Web Store data-usage disclosure will be
changed to match, and the change will be listed in the changelog. This is a deliberate
order: the paperwork follows the code, never the other way round.

## Contact

Suraj Jaiswal, {{SELLER_ADDRESS}} — learnhowme987@gmail.com
