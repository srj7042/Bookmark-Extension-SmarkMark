/**
 * Logic self-check. No framework, no fixtures: `npm test` runs it with node:test.
 * Covers the parts that actually break silently — URL normalization, the
 * categorization ladder, search scoring, duplicate grouping, and the
 * import/export round-trips.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeUrl, domainOf } from './url.ts'
import { categorize, accentFor } from './categorize.ts'
import { applyQuery, findDuplicates, scoreSearch, tokenize, isUnorganized, categoryCounts } from './query.ts'
import { buildJsonExport, parseJsonExport, buildNetscapeHtml, parseNetscapeHtml } from './importexport.ts'
import type { Bookmark, Query } from './types.ts'

let seq = 0
function bm(partial: Partial<Bookmark> & { url: string }): Bookmark {
  const domain = domainOf(partial.url)
  return {
    id: partial.id ?? `id${++seq}`,
    parentId: partial.parentId ?? '10',
    title: partial.title ?? domain,
    index: partial.index ?? seq,
    path: partial.path ?? 'Bookmarks bar',
    folderName: partial.folderName ?? 'Bookmarks bar',
    domain,
    dateAdded: partial.dateAdded ?? 1_700_000_000_000 + seq,
    meta: partial.meta ?? {},
    category: partial.category ?? 'Other',
    confidence: partial.confidence ?? 0.15,
    reason: partial.reason ?? '',
    ...partial,
    url: partial.url,
  }
}

test('normalizeUrl collapses protocol, www, trailing slash, query and hash', () => {
  assert.equal(normalizeUrl('https://www.Example.com/a/b/?utm=1#frag'), normalizeUrl('http://example.com/a/b'))
  assert.equal(normalizeUrl('https://example.com/'), 'example.com')
  assert.notEqual(normalizeUrl('https://example.com/a'), normalizeUrl('https://example.com/b'))
})

test('normalizeUrl falls back safely on non-URL input', () => {
  assert.equal(normalizeUrl('Not A Url '), 'not a url')
})

test('categorize prefers known domains over keywords', () => {
  const s = categorize({ url: 'https://github.com/x/y', title: 'cooking recipes', domain: 'github.com' })
  assert.equal(s.category, 'Development')
  assert.ok(s.confidence >= 0.9)
})

test('categorize uses folder context before keywords', () => {
  const s = categorize({ url: 'https://random.example/x', title: 'untitled', domain: 'random.example', folderPath: 'Work / Investing' })
  assert.equal(s.category, 'Finance')
  assert.equal(s.confidence, 0.72)
})

test('categorize falls back when there is no signal, and never throws', () => {
  const s = categorize({ url: 'https://zzq.example/1', title: 'qqq', domain: 'zzq.example' })
  assert.equal(s.category, 'Other')
  assert.ok(s.confidence < 0.5)
  assert.equal(accentFor(s.category), accentFor('Other'))
  assert.equal(accentFor('nope'), accentFor('Other'))
})

test('search requires every token and ranks title hits highest', () => {
  const a = bm({ url: 'https://react.dev/learn', title: 'React docs' })
  const b = bm({ url: 'https://blog.example/react-hooks', title: 'Something else' })
  const tokens = tokenize('react docs')
  assert.ok(scoreSearch(a, tokens) > scoreSearch(b, tokens))
  assert.equal(scoreSearch(b, tokens), 0, 'missing the "docs" token must exclude it')
})

test('search matches tags and notes too', () => {
  const a = bm({ url: 'https://x.example/1', title: 'plain', meta: { tags: ['recipes'], note: 'grandma cake' } })
  assert.ok(scoreSearch(a, tokenize('recipes')) > 0)
  assert.ok(scoreSearch(a, tokenize('grandma')) > 0)
})

test('applyQuery filters by folder including descendants, then sorts', () => {
  const query: Query = { q: '', folderId: '10', category: null, tag: null, favoritesOnly: false, unorganizedOnly: false, sort: 'title' }
  const direct = bm({ url: 'https://a.example/', title: 'B direct', parentId: '10', path: 'Work' })
  const nested = bm({ url: 'https://b.example/', title: 'A nested', parentId: '11', path: 'Work / React' })
  const outside = bm({ url: 'https://c.example/', title: 'C outside', parentId: '99', path: 'Personal' })
  const out = applyQuery([direct, nested, outside], query, 'Work')
  assert.deepEqual(out.map((x) => x.title), ['A nested', 'B direct'])
})

test('unorganized means uncategorized and untagged', () => {
  assert.equal(isUnorganized(bm({ url: 'https://a.example/', category: 'Other', confidence: 0.15 })), true)
  assert.equal(isUnorganized(bm({ url: 'https://a.example/', category: 'Other', confidence: 0.15, meta: { tags: ['x'] } })), false)
  assert.equal(isUnorganized(bm({ url: 'https://a.example/', category: 'Development', confidence: 0.9 })), false)
})

test('findDuplicates groups by normalized URL and ignores singletons', () => {
  const one = bm({ url: 'https://www.example.com/post/' })
  const two = bm({ url: 'http://example.com/post?ref=news' })
  const other = bm({ url: 'https://example.com/other' })
  const groups = findDuplicates([one, two, other])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].items.length, 2)
})

test('categoryCounts counts confident items', () => {
  const items = [
    bm({ url: 'https://a.example/', category: 'Development', confidence: 0.9 }),
    bm({ url: 'https://b.example/', category: 'Development', confidence: 0.6 }),
    bm({ url: 'https://c.example/', category: 'Other', confidence: 0.15 }),
  ]
  const counts = categoryCounts(items)
  assert.deepEqual(counts[0], { category: 'Development', count: 2, confident: 2 })
})

test('JSON export round-trips folders, tags and notes', () => {
  const json = buildJsonExport(
    [{ title: 'Work', children: [], bookmarks: [{ title: 'Docs', url: 'https://docs.example/', tags: ['api'], note: 'hi' }] }],
    [{ title: 'Loose', url: 'https://loose.example/' }],
  )
  const parsed = parseJsonExport(json)
  assert.equal(parsed.folders.length, 1)
  assert.equal(parsed.folders[0].title, 'Work')
  assert.deepEqual(parsed.folders[0].bookmarks[0].tags, ['api'])
  assert.equal(parsed.folders[0].bookmarks[0].note, 'hi')
  assert.equal(parsed.loose.length, 1)
})

test('JSON import also accepts a raw chrome.bookmarks tree', () => {
  const tree = JSON.stringify([{ id: '0', title: '', children: [{ id: '1', title: 'Bar', children: [{ id: '2', title: 'Site', url: 'https://site.example/' }] }] }])
  const parsed = parseJsonExport(tree)
  assert.equal(parsed.folders.length, 1)
  assert.equal(parsed.folders[0].bookmarks[0].url, 'https://site.example/')
})

test('JSON import rejects junk instead of silently wiping data', () => {
  assert.throws(() => parseJsonExport('{ not json'), /valid JSON/)
  assert.throws(() => parseJsonExport('{"a":1}'), /Unrecognized/)
})

test('Netscape export/import round-trips titles, urls, tags and folders', () => {
  const html = buildNetscapeHtml(
    [{ title: 'Reading', children: [], bookmarks: [{ title: 'A & B', url: 'https://ex.example/?a=1&b=2', tags: ['news'] }] }],
    [{ title: 'Loose', url: 'https://loose.example/' }],
  )
  const parsed = parseNetscapeHtml(html)
  assert.equal(parsed.folders.length, 1)
  assert.equal(parsed.folders[0].title, 'Reading')
  assert.equal(parsed.folders[0].bookmarks[0].title, 'A & B')
  assert.equal(parsed.folders[0].bookmarks[0].url, 'https://ex.example/?a=1&b=2')
  assert.deepEqual(parsed.folders[0].bookmarks[0].tags, ['news'])
  assert.equal(parsed.loose[0].url, 'https://loose.example/')
})

test('Netscape import rejects a file with no bookmarks', () => {
  assert.throws(() => parseNetscapeHtml('<html><body>hello</body></html>'), /No bookmarks/)
})
