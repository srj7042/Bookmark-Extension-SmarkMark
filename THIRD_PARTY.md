# Third-party components

SmartMark bundles as little third-party code as possible, because every dependency is
something a user has to trust. This file lists what ships inside the extension, what is
only used to build it, and the notices that must be preserved.

## Shipped inside `dist/`

| Component | Version | Licence | Why it ships |
| --- | --- | --- | --- |
| `react` | 19.x | MIT | UI runtime for the popup, dashboard and options pages |
| `react-dom` | 19.x | MIT | renders the React tree into the extension pages |

Nothing else is bundled: no analytics SDK, no icon font, no CSS framework runtime
(Tailwind's output is compiled to plain CSS at build time), no HTTP client, no
third-party scripts. There are **no remote assets at all** — no Google Fonts, no CDN,
no remote images. Site icons come from Chrome's own local favicon cache via the
`favicon` permission.

## Build-time only (never shipped)

`vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `typescript`,
`eslint` and its plugins, `@types/*`. These run on a developer machine; none of them
ends up in the published package. `scripts/gen-icons.mjs` generates the PNG icons with
Node's own `zlib` — no image library is involved.

## Required notices

MIT Licence

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## How to verify

```bash
npm run build && grep -c "react" dist/*.js   # bundled runtime, as expected
npm run guard                                # no remote references in the built pages
```
