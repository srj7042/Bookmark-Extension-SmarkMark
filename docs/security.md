---
title: Security Policy
---

# Security Policy

## Supported versions

**v1.0.0** (the current release) receives security fixes. Older builds are not supported
once Chrome's Manifest V3 requirements move on. Always run the version the Chrome Web
Store serves.

## Reporting a vulnerability

Email **learnhowme987@gmail.com** with:

- the SmartMark version (from `chrome://extensions`) and your Chrome version and OS;
- what you did, what you expected, and what happened;
- the impact as you understand it;
- a proof of concept if you have one (a bookmark title, an import file, a screenshot).

Please **do not include your own bookmark data** in a report. If your finding involves
sensitive details, say so in the first email without the detail, and ask for an encrypted
channel.

## What to expect

- Acknowledgement within **3 business days**.
- Triage and a severity assessment within **7 business days**.
- A fix in a release, or a written explanation of why we consider it out of scope.
- Credit in the changelog if you want it, or anonymity if you prefer.

There is **no bug bounty** — this is a free extension built by one person. Effort is
appreciated and acknowledged rather than paid for.

## In scope

Anything in the extension's own code or built bundle, in particular:

- Script or HTML injection through untrusted input: bookmark titles, URLs, folder names,
  tags, notes, and imported JSON or Netscape HTML files.
- Bypassing the declared permission set, or reaching data the extension should not see.
- Privilege problems in the service worker, or between pages and the service worker.
- Verifying or faking entitlement, once a paid tier exists.
- Supply-chain problems in anything that ships in `dist/`.

## Out of scope

- Anything requiring physical access, a compromised operating system, or a compromised
  Chrome profile.
- Bugs in Chrome itself — report those to Google.
- Third-party websites you bookmark.
- Social engineering, self-XSS, or "an attacker who already controls your browser".
- Missing hardening with no demonstrated impact, and outdated Chrome versions.

## Safe harbour

If you research in good faith — on your own profile, without accessing anyone else's data,
without destroying anything and without exfiltrating anything — we will not pursue legal
action, and we will say so in writing if you need that for your own reporting.

## Coordinated disclosure

Please give us **90 days** before publishing, or less if we agree on a date. We will tell
you when a fix ships.

## What SmartMark already does

- **No network APIs at all** — no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or
  `EventSource` in the source. Enforced by `npm run guard`.
- **No remote code** — the manifest CSP is `script-src 'self'`, and `eval`/`new Function`
  are rejected by the same check. Code cannot be swapped server-side.
- **Four permissions** (`bookmarks`, `storage`, `activeTab`, `favicon`), no host
  permissions, no content scripts, no messaging surface. Also enforced by `npm run guard`.
- **Locked dependency tree** — `package-lock.json` is committed and used in CI
  (`npm ci`), with Dependabot watching it weekly. Only two third-party libraries ship at
  all (see `THIRD_PARTY.md`).
- **No analytics, no crash reporting, no third-party SDKs.**
- **Imports are parsed locally** and validated before anything is written; a malformed file
  is rejected rather than partially applied.
- **Every destructive action is undoable**, and deleting a folder restores its subtree.

## Threat model, briefly

**Defended against:** a malicious bookmark or import file trying to run script inside the
extension's pages; remote code injection (we ship none, so an attacker would have to
compromise the published package); a dependency gaining a network capability (the guard
check fails the build); silent data collection (there is no code path that could do it).

**Not defended against:** someone with access to your unlocked computer or your Chrome
profile — your operating system's account protection and Chrome's own profile encryption
are the controls there; a malicious extension you install alongside SmartMark; and bugs in
Chrome itself.

## Verify the claims yourself

```bash
npm ci && npm run verify      # typecheck, lint, tests, guard, build, rendered probe
```

Then load `dist/` unpacked, open DevTools → Network, and use SmartMark normally —
categorise, search, import, export, delete. The request list stays empty.

## Contact

learnhowme987@gmail.com
