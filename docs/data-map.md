---
title: Data Map
---

# Data map

What SmartMark touches, where it lives, and what would have to change before it could
honestly claim anything else. This is the internal counterpart to the
[Privacy Policy](privacy.html) — keep them in sync, and update
`docs/store-listing.md` too, because the Chrome Web Store data-usage form must match
reality.

## Data the extension handles

| Data | Storage | Purpose | Retention | Leaves the device? |
| --- | --- | --- | --- | --- |
| Bookmark title, URL, folder path, dates | Chrome's own bookmark store (`chrome.bookmarks`) | The product: reading, organising, editing bookmarks | Until you delete it, as in Chrome | No |
| Active tab title and URL | Read in memory at save time (`activeTab`) | Creating a bookmark for the page you chose | Never stored beyond the bookmark itself | No |
| Tags, notes, favourites, collections, custom categories and rules | `chrome.storage.local`, key `sm:meta`, `sm:collections` | Metadata Chrome has nowhere to keep | Until you delete it or clear SmartMark data | No |
| Preferences (theme, density, sort, confirmations, category rules) | `chrome.storage.local`, key `sm:settings` | Remembering how you like the UI | Same as above | No |
| Last-opened timestamps | `chrome.storage.local`, key `sm:meta` | The "Recently opened" list, without needing the `history` permission | Same as above | No |
| Site icons | Chrome's local favicon cache (`favicon`) | Recognisable rows | Chrome's own cache policy | No |
| Undo stack | In memory only | Reversing the last destructive action | Until the page or service worker closes | No |
| Support email | Developer's mailbox, if you write in | Answering you | Deleted within 24 months of the last reply, or on request | Yes — you chose to send it |

## What is deliberately absent

No accounts, no device identifiers, no installed-extension ID beacon, no usage counters,
no crash reports, no error beacons, no advertising identifiers, no IP address logging, no
"anonymous" telemetry. There is also no code that could make a request: `npm run guard`
scans every source file for `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`,
`EventSource`, `eval` and `new Function`, and fails the build if one appears, and it
verifies that the built pages reference nothing remote.

## Chrome Web Store data-usage form

The answers that match this build:

- **Does this item collect user data?** No. Select nothing in the category list; there is
  no collection of personally identifiable information, health, financial, authentication,
  personal communications, location, web history, user activity or website content.
- **Does it use remote code?** No.
- **Certifications:** the standard ones — the developer does not sell or transfer user
  data, does not use or transfer data for purposes unrelated to the item's single purpose,
  and does not use or transfer data to determine creditworthiness or for lending.

The Limited Use policy is worth stating plainly, because it is the rule that survives any
future feature: bookmark data may be used only to provide SmartMark's single purpose
(organising your bookmarks locally). Never for advertising, never for creditworthiness or
lending, never sold.

## If a licence server is ever added (not planned yet)

Adding one would be a real change, not a formality. The minimum honest version:

1. Data: email address, IP address (in server logs), a licence key, and a payment
   reference. Purpose: issuing and validating a licence and meeting tax law.
2. Role: the payment provider is the merchant of record, so VAT/GST and invoicing sit with
   them; we hold no card data at any point.
3. Lawful basis and duties: contract performance for licence issuance (GDPR/UK GDPR), and
   notice plus consent where DPDP Act 2023 requires it; a processor agreement with the
   provider; deletion on request within 30 days.
4. Retention: licence records for the period tax law requires (typically 8 years in India),
   then deleted. Server logs rotated within 30 days.
5. Engineering: validation must happen with a **locally verified signed licence** (for
   example an ECDSA P-256 token checked with WebCrypto), so the extension still works
   offline and never pings home on launch — which keeps the "no bookmark data leaves the
   device" promise intact.
6. Paperwork, in this order: privacy policy updated first → store data-usage form updated →
   listing text updated → changelog entry → release. Never the reverse.
