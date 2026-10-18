/** URL helpers. Pure, no imports — kept separate so the logic self-check can run them. */

export function parseUrl(raw: string): URL | null {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'ftp:' ? u : null
  } catch {
    return null
  }
}

/** Registrable-ish domain: strips `www.` and returns the host. */
export function domainOf(raw: string): string {
  const u = parseUrl(raw)
  if (!u) return ''
  return u.hostname.replace(/^www\./, '')
}

/**
 * Duplicate-detection key. Ignores protocol, `www.`, trailing slash, query string,
 * hash and the noisy tracking params some sites keep in the path.
 * ponytail: path-based key only. Sites that put identity in the query string
 * (e.g. `?id=42`) will look like duplicates of each other — acceptable for a
 * bookmark de-duper, upgrade path is a per-site allowlist of significant params.
 */
export function normalizeUrl(raw: string): string {
  const u = parseUrl(raw)
  if (!u) return raw.trim().toLowerCase()
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  const path = u.pathname.replace(/\/+$/, '').toLowerCase()
  return `${host}${path}`
}

/** `news.ycombinator.com` -> `Ycombinator` — a decent fallback title. */
export function titleFromUrl(raw: string): string {
  const d = domainOf(raw)
  if (!d) return raw
  const label = d.split('.').filter((p) => !['com', 'org', 'net', 'io', 'co', 'dev', 'app', 'ai', 'gov', 'edu'].includes(p)).pop()
  if (!label) return d
  return label.charAt(0).toUpperCase() + label.slice(1)
}
