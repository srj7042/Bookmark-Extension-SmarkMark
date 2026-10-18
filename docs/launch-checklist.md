---
title: Launch Checklist
---

# Launch checklist — SmartMark

A phase-by-phase todo list for taking the extension from "works on my machine" to a
published, maintained Chrome Web Store item. Items that only **you** can do are marked
○; everything else is already in the repo.

## Phase 0 — before anyone else sees it (today)

- [x] `git init` the repository (done by the launch kit commit).
- [x] `npm run verify` — typecheck, lint, tests, guard, build, rendered probe all pass.
- [ ] Fill in every `{{PLACEHOLDER}}` in `docs/` and `LICENSE`. The checker will complain
      if you ship them (guard covers the four policy docs; launch
      items here cover the rest):
  | File | Placeholder | What to put |
  | --- | --- | --- |
  | `docs/privacy.md`, `terms.md`, `security.md`, `accessibility.md` | `Suraj Jaiswal`, `{{SELLER_ADDRESS}}`, `learnhowme987@gmail.com`, `2026-10-18`, `{{JURISDICTION}}` | your name, an address (city is enough to start), the support email, today's date, your city/courts |
  | `docs/privacy.md` | `Gmail` | Gmail, Fastmail, your own domain… whoever hosts support@ |
  | `docs/terms.md` | `Suraj Jaiswal` | your name (grievance officer, required by Indian e-commerce rules) |
  | `docs/security.md` | `learnhowme987@gmail.com` | security contact (can be the same support email) |
  | `docs/store-listing.md` | `{{SUPPORT_URL}}`, `{{PRIVACY_URL}}` | live URLs once the policies are hosted |
- [ ] Decide where the policies live before you submit: GitHub Pages serves `docs/` in
      minutes for free — see Phase 2.
- [ ] Decide repo visibility: public repo invites contributions; private keeps the code
      yours. Either works for Chrome Web Store submission.

## Phase 1 — beta (10–20 real users)

- [ ] Ship testers the `dist/` folder: Developer mode → Load unpacked → select `dist/`
      (README has the exact steps).
- [ ] Run the manual checklist: `TEST_PLAN.md` §1–53, including the two reported
      regressions (category/tag route filtering and dashboard scrolling) and the
      accessibility steps 39–46.
- [ ] Log issues in GitHub Issues; fix, re-run `npm run verify`, freeze `v1.0.0`.
- [ ] Tag the release (`git tag v1.0.0`) and write the changelog entry — `CHANGELOG.md`
      follows Keep a Changelog already.

## Phase 2 — Chrome Web Store submission

- [ ] ○ Register a Chrome Web Store developer account (one-time registration fee, charged
      by Google; this is the only money Google ever charges you — payments for your
      extension, if any, come through your own processor later).
- [ ] ○ Turn on two-factor authentication on the Google account that owns the listing —
      abandoned or compromised store accounts get extensions delisted.
- [ ] Host the policies: `docs/` is Jekyll-ready (`docs/_config.yml` is included). Push to
      GitHub, enable Pages from the `/docs` folder, and you get
      `https://<user>.github.io/<repo>/privacy.html` for free. Replace
      `{{PRIVACY_URL}}` and `{{SUPPORT_URL}}` in `docs/store-listing.md` with those URLs,
      then commit the final versions.
- [ ] Take screenshots from a `dist/` load (never the dev server — the live extensions use
      real icons and CSP; screenshots from dev can show a different layout).
- [ ] Create the item, paste the listing from `docs/store-listing.md`, upload the four
      `dist/icons/*.png` sources plus the screenshots, submit.
- [ ] Respond to review questions. If the reviewer asks, the answers are in
      `docs/store-listing.md` ("Reviewer notes").
- [ ] Publish, then watch reviews and the policy-inbox weekly. Answer support email
      within the time you promised (30 days in the privacy policy; 48-hour acknowledgement
      in the terms).

## Phase 3 — distribution and maintenance

- [ ] Demo video + a one-page landing page (GitHub Pages is fine), then post to
      Product Hunt, Hacker News and the Chrome extensions communities — SmartMark's pitch
      is "nothing leaves your device", which travels well.
- [ ] Ship updates on a cadence you can keep (monthly is plenty). Abandoned extensions are
      the ones Google delists on policy drift.
- [ ] Keep Chrome MV3 current; the guard already pins the permission set and the CSP, so
      an accidental permission creep fails CI before it reaches the store.
- [ ] Keep the changelog current — it doubles as your changelog-for-users and as evidence
      that the product is maintained.

## Phase 4 — deferred: if you ever charge

Not implemented, not discussed in pricing terms anywhere in the repo. If you decide to:

- [ ] Choose a merchant of record (Paddle, Lemon Squeezy or Gumroad — they collect and
      remit VAT/GST; Gumroad pays Indian bank accounts).
- [ ] Implement offline licence validation: a locally verified signed token
      (ECDSA P-256 or Ed25519 via WebCrypto) — no runtime network, ever.
- [ ] Refund window: publish it before the first sale; EU/UK buyers keep their 14-day
      statutory withdrawal right regardless.
- [ ] India specifics to discuss with a CA before the first rupee: GST registration for
      digital services exported from India (18% with an LUT for zero-rated exports),
      FEMA/RBI-compliant receipt of foreign remittance, and FIRC records.
- [ ] Update `docs/privacy.md` and the store data-usage form **before** that version
      ships — email + IP become personal data you hold, and DPDP Act 2023 notice/consent
      apply.

## Ongoing: promises you must not break

The store listing and this checklist only stay true if you keep them true:

- [ ] No network calls, ever — `npm run guard` enforces it in CI.
- [ ] Exactly four permissions, no host permissions, no content scripts — enforced.
- [ ] Every categorisation suggestion correctable by the user — by design.
- [ ] Export always available, with no lock-in — by design.
- [ ] Privacy page live, and the store data-usage form matching it, at all times.
- [ ] No analytics, telemetry or crash reporting added without updating the privacy page,
      the data map and the store form first.
