/**
 * Compliance guard.
 *
 * The promises in `docs/privacy.md` and the Chrome Web Store listing — "no network calls",
 * "no remote code", "exactly these four permissions" — are claims about this source tree,
 * not about anyone's intentions. This script checks them mechanically so they cannot
 * quietly become false in a later release.
 *
 * Run with `npm run guard` (also part of `npm run verify`).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const SRC = resolve('src')
const DIST = resolve('dist')
const MANIFEST = resolve('public/manifest.json')

const failures = []
const notes = []
const check = (label, ok, detail = '') => {
  if (!ok) failures.push(detail ? `${label} — ${detail}` : label)
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })

// 1. No network APIs and no dynamic code execution in the app source.
//    Everything the extension does must work offline, on the user's machine.
const BANNED = [
  [/\bfetch\s*\(/, 'fetch()'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\bWebSocket\b/, 'WebSocket'],
  [/\bsendBeacon\b/, 'sendBeacon'],
  [/\bEventSource\b/, 'EventSource'],
  [/\bnew\s+Function\s*\(/, 'new Function()'],
  [/\beval\s*\(/, 'eval()'],
]
const sources = walk(SRC).filter((file) => /\.(ts|tsx)$/.test(file))
const offenders = []
for (const file of sources) {
  const text = readFileSync(file, 'utf8')
  for (const [pattern, name] of BANNED) {
    if (pattern.test(text)) offenders.push(`${relative(process.cwd(), file)}: ${name}`)
  }
}
check('src/ makes no network calls and runs no dynamic code', offenders.length === 0, offenders.join(', '))
notes.push(`${sources.length} source files scanned for ${BANNED.length} banned patterns`)

// 2. The manifest declares exactly what the privacy policy and listing claim.
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const EXPECTED_PERMISSIONS = ['activeTab', 'bookmarks', 'favicon', 'storage']
const permissions = [...(manifest.permissions ?? [])].sort()
check(
  'manifest declares only the reviewed permissions',
  JSON.stringify(permissions) === JSON.stringify(EXPECTED_PERMISSIONS),
  `found [${permissions.join(', ') || 'none'}]`,
)
check('manifest requests no host permissions', !manifest.host_permissions && !manifest.optional_host_permissions)
check('manifest ships no content scripts and no messaging surface', !manifest.content_scripts && !manifest.externally_connectable)
check('manifest is MV3 with a module service worker', manifest.manifest_version === 3 && manifest.background?.type === 'module')
check("CSP allows only the extension's own scripts", /script-src 'self'/.test(manifest.content_security_policy?.extension_pages ?? ''))
check('permission justifications are documented for the store form', existsSync(resolve('docs/store-listing.md')))

// Chrome rejects a manifest whose description exceeds 132 characters, so this is a
// load-time failure, not a style preference. The name limit is 45.
const nameLength = (manifest.name ?? '').length
const descriptionLength = (manifest.description ?? '').length
check('manifest name fits the store limit (45)', nameLength > 0 && nameLength <= 45, `${nameLength} characters`)
check('manifest description fits the Chrome limit (132)', descriptionLength > 0 && descriptionLength <= 132, `${descriptionLength} characters`)
check('manifest version is semver', /^\d+\.\d+\.\d+$/.test(manifest.version ?? ''), `found "${manifest.version}"`)
notes.push(`manifest: name ${nameLength}/45 characters, description ${descriptionLength}/132 characters`)

// 3. Contrast: the ratios quoted in src/index.css and docs/accessibility.md are checked
//    against the actual token values, so a colour tweak cannot silently break WCAG AA.
const css = readFileSync(resolve('src/index.css'), 'utf8')
const tokensIn = (selectors) => {
  const block = new RegExp(`(?:${selectors})\\s*\\{([\\s\\S]*?)\\n\\}`, 'm').exec(css)
  const found = {}
  for (const [, name, value] of (block?.[1] ?? '').matchAll(/(--sm-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) found[name] = value
  return found
}
const light = tokensIn(':root')
const dark = tokensIn('\\.dark')
if (Object.keys(light).length < 8 || Object.keys(dark).length < 8) {
  check('theme tokens are parseable from src/index.css', false, `light=${Object.keys(light).length} dark=${Object.keys(dark).length}`)
} else {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const luminance = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const contrast = (fg, bg) => {
    const [l1, l2] = [luminance(rgb(fg)), luminance(rgb(bg))].sort((a, b) => b - a)
    return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100
  }
  // [foreground token, background token, minimum ratio]
  const PAIRS = [
    ['--sm-muted', '--sm-bg', 4.5],
    ['--sm-muted', '--sm-surface', 4.5],
    ['--sm-muted', '--sm-surface-2', 4.5],
    ['--sm-text', '--sm-bg', 4.5],
    ['--sm-text', '--sm-surface', 4.5],
    ['--sm-sidebar-text', '--sm-sidebar', 4.5],
    ['--sm-sidebar-muted', '--sm-sidebar', 4.5],
    ['--sm-focus', '--sm-surface', 3],
    ['--sm-focus', '--sm-bg', 3],
    ['--sm-focus-on-sidebar', '--sm-sidebar', 3],
  ]
  const failures = []
  const measured = []
  for (const [theme, tokens] of [['light', light], ['dark', dark]]) {
    for (const [fgName, bgName, min] of PAIRS) {
      const ratio = contrast(tokens[fgName], tokens[bgName])
      measured.push(`${fgName} on ${bgName} = ${ratio}:1`)
      if (ratio < min) failures.push(`${theme}: ${fgName} on ${bgName} is ${ratio}:1, needs ${min}:1`)
    }
  }
  check('every documented contrast pair still meets its requirement', failures.length === 0, failures.join('; '))
  notes.push(`contrast checked for ${PAIRS.length * 2} token pairs across light and dark`)
  notes.push(measured.slice(0, 4).join(', ') + ' …')
}

// 4. The built artifact loads nothing remote and references nothing missing.
if (!existsSync(DIST)) {
  check('dist/ exists (run npm run build first)', false, 'missing')
} else {
  const referenced = [
    manifest.action?.default_popup,
    manifest.options_page,
    manifest.background?.service_worker,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ].filter(Boolean)
  const missing = referenced.filter((ref) => !existsSync(join(DIST, ref)))
  check('every file the manifest references is present in dist/', missing.length === 0, missing.join(', '))

  const pages = walk(DIST).filter((file) => file.endsWith('.html'))
  const remote = pages.filter((file) => /(?:src|href)\s*=\s*["']https?:\/\//i.test(readFileSync(file, 'utf8')))
  check('built pages load nothing over the network', remote.length === 0, remote.map((f) => relative(process.cwd(), f)).join(', '))
  check('the built manifest matches public/manifest.json', readFileSync(join(DIST, 'manifest.json'), 'utf8') === readFileSync(MANIFEST, 'utf8'))
  notes.push(`${pages.length} built HTML entries checked for remote references`)
}

// 5. The policies users read must actually exist and be filled in.
const policies = ['docs/privacy.md', 'docs/terms.md', 'docs/security.md', 'docs/accessibility.md']
const missingPolicies = policies.filter((file) => !existsSync(resolve(file)))
check('every published policy exists', missingPolicies.length === 0, missingPolicies.join(', '))
const placeholders = policies
  .filter((file) => existsSync(resolve(file)))
  .flatMap((file) => {
    const hits = [...readFileSync(resolve(file), 'utf8').matchAll(/\{\{[A-Z_]+\}\}|\bTBD\b/g)].map((m) => m[0])
    return hits.length ? `${file} (${[...new Set(hits)].join(', ')})` : []
  })
notes.push(
  placeholders.length
    ? `unfilled placeholders (expected until you publish): ${placeholders.join('; ')}`
    : 'no unfilled placeholders in the policy docs',
)

console.log('GUARD')
for (const note of notes) console.log(`  · ${note}`)
console.log('')
for (const failure of failures) console.log(`  ✗ ${failure}`)
console.log(failures.length ? `\nGUARD: FAIL (${failures.length})` : '\nGUARD: PASS')
process.exit(failures.length ? 1 : 0)
