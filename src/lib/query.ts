import type { Bookmark, Query } from './types.ts'
import { normalizeUrl } from './url.ts'
import { CONFIDENT, FALLBACK_CATEGORY } from './categorize.ts'

/** Searchable fields and their weight. Every query token must match at least one field. */
const FIELDS: Array<[keyof Bookmark | 'tags' | 'note', number]> = [
  ['title', 5],
  ['domain', 4],
  ['url', 2],
  ['path', 1],
  ['tags', 3],
  ['note', 1],
]

const NO_FIELDS: string[] = []

function fieldValues(b: Bookmark): Record<string, string> {
  return {
    title: b.title.toLowerCase(),
    domain: b.domain.toLowerCase(),
    url: b.url.toLowerCase(),
    path: b.path.toLowerCase(),
    tags: (b.meta.tags ?? []).join(' ').toLowerCase(),
    note: (b.meta.note ?? '').toLowerCase(),
  }
}

export function tokenize(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean)
}

/** 0 = no match. Higher is a better match. */
export function scoreSearch(b: Bookmark, tokens: string[]): number {
  if (tokens.length === 0) return 1
  const values = fieldValues(b)
  let total = 0
  for (const token of tokens) {
    let best = 0
    for (const [field, weight] of FIELDS) {
      const v = values[field as string] ?? NO_FIELDS.join('')
      if (v.includes(token)) best = Math.max(best, weight + (v.startsWith(token) ? 1 : 0))
    }
    if (best === 0) return 0
    total += best
  }
  return total
}

/** A bookmark SmartMark could neither categorize nor that the user has tagged. */
export function isUnorganized(b: Bookmark): boolean {
  if ((b.meta.tags?.length ?? 0) > 0) return false
  return b.category === FALLBACK_CATEGORY || b.confidence < CONFIDENT
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function applyQuery(items: Bookmark[], query: Query, folderPath: string | null = null): Bookmark[] {
  const tokens = tokenize(query.q)
  const out: Array<{ b: Bookmark; score: number }> = []

  for (const b of items) {
    if (query.folderId && folderPath !== null) {
      const inFolder = b.parentId === query.folderId || b.path === folderPath || b.path.startsWith(`${folderPath} / `)
      if (!inFolder) continue
    }
    if (query.category && b.category !== query.category) continue
    if (query.tag && !(b.meta.tags ?? []).includes(query.tag)) continue
    if (query.favoritesOnly && !b.meta.favorite) continue
    if (query.unorganizedOnly && !isUnorganized(b)) continue
    const score = scoreSearch(b, tokens)
    if (score === 0) continue
    out.push({ b, score })
  }

  const sorted = out.sort((x, y) => {
    if (tokens.length > 0 && y.score !== x.score) return y.score - x.score
    return compare(x.b, y.b, query.sort)
  })

  return sorted.map((s) => s.b)
}

function compare(a: Bookmark, b: Bookmark, sort: Query['sort']): number {
  switch (sort) {
    case 'title':
      return collator.compare(a.title || a.domain, b.title || b.domain)
    case 'domain':
      return collator.compare(a.domain, b.domain) || collator.compare(a.title, b.title)
    case 'recent':
      return (b.meta.lastOpened ?? 0) - (a.meta.lastOpened ?? 0)
    case 'dateAdded':
    default:
      return (b.dateAdded ?? 0) - (a.dateAdded ?? 0)
  }
}

export type DuplicateGroup = { key: string; items: Bookmark[] }

/** Exact duplicates by normalized URL. */
export function findDuplicates(items: Bookmark[]): DuplicateGroup[] {
  const groups = new Map<string, Bookmark[]>()
  for (const b of items) {
    const key = normalizeUrl(b.url)
    const list = groups.get(key)
    if (list) list.push(b)
    else groups.set(key, [b])
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, items: list.sort((a, b) => (a.dateAdded ?? 0) - (b.dateAdded ?? 0)) }))
    .sort((a, b) => b.items.length - a.items.length)
}

export type CategoryCount = { category: string; count: number; confident: number }

export function categoryCounts(items: Bookmark[]): CategoryCount[] {
  const map = new Map<string, CategoryCount>()
  for (const b of items) {
    const entry = map.get(b.category) ?? { category: b.category, count: 0, confident: 0 }
    entry.count += 1
    if (b.confidence >= CONFIDENT) entry.confident += 1
    map.set(b.category, entry)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || collator.compare(a.category, b.category))
}

export function tagVocabulary(items: Bookmark[]): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>()
  for (const b of items) for (const t of b.meta.tags ?? []) map.set(t, (map.get(t) ?? 0) + 1)
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || collator.compare(a.tag, b.tag))
}
