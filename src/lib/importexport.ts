/**
 * Import/export. Pure text<->data functions so they can be unit-checked and so the
 * chrome.bookmarks writes stay in the caller.
 */

export type ExportBookmark = { title: string; url: string; dateAdded?: number; tags?: string[]; note?: string; favorite?: boolean; category?: string }
export type ExportFolder = { title: string; children: ExportFolder[]; bookmarks: ExportBookmark[] }
export type SmartMarkExport = {
  format: 'smartmark'
  version: 1
  exportedAt: string
  folders: ExportFolder[]
  loose: ExportBookmark[]
}

export function buildJsonExport(folders: ExportFolder[], loose: ExportBookmark[]): string {
  const payload: SmartMarkExport = {
    format: 'smartmark',
    version: 1,
    exportedAt: new Date().toISOString(),
    folders,
    loose,
  }
  return JSON.stringify(payload, null, 2)
}

export type ParseResult = { folders: ParsedFolder[]; loose: ExportBookmark[]; warnings: string[] }
export type ParsedFolder = { title: string; path: string[]; bookmarks: ExportBookmark[] }

/** Accepts SmartMark JSON, chrome.bookmarks.getTree() JSON, or a plain bookmark array. */
export function parseJsonExport(text: string): ParseResult {
  const warnings: string[] = []
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const folders: ParsedFolder[] = []
  const loose: ExportBookmark[] = []

  const visit = (nodes: unknown, path: string[]): void => {
    if (!Array.isArray(nodes)) {
      warnings.push('Ignored a section that was not an array of bookmarks.')
      return
    }
    const bucket: ExportBookmark[] = []
    for (const raw of nodes) {
      const node = raw as Record<string, unknown>
      const url = typeof node.url === 'string' ? node.url : ''
      const title = typeof node.title === 'string' ? node.title : ''
      if (url) {
        bucket.push({
          title,
          url,
          dateAdded: typeof node.dateAdded === 'number' ? node.dateAdded : undefined,
          tags: Array.isArray(node.tags) ? (node.tags as string[]) : undefined,
          note: typeof node.note === 'string' ? node.note : undefined,
          favorite: node.favorite === true,
          category: typeof node.category === 'string' ? node.category : undefined,
        })
      } else if (Array.isArray(node.children)) {
        if (bucket.length) {
          folders.push({ title: path[path.length - 1] ?? 'Imported', path: [...path], bookmarks: bucket.splice(0) })
        }
        visit(node.children, [...path, title || 'Untitled folder'])
      }
    }
    if (bucket.length) {
      if (path.length === 0) loose.push(...bucket)
      else folders.push({ title: path[path.length - 1] ?? 'Imported', path: [...path], bookmarks: bucket })
    }
  }

  const obj = data as Record<string, unknown>
  if (Array.isArray(obj.folders) || Array.isArray(obj.loose)) {
    // SmartMark export shape: flatten each folder into (path, bookmarks) pairs.
    const collect = (f: ExportFolder, parentPath: string[]): void => {
      const p = [...parentPath, f.title || 'Untitled folder']
      if (f.bookmarks?.length) folders.push({ title: p[p.length - 1]!, path: p, bookmarks: f.bookmarks })
      for (const child of f.children ?? []) collect(child, p)
    }
    visit(Array.isArray(obj.loose) ? obj.loose : [], [])
    for (const folder of (obj.folders ?? []) as ExportFolder[]) collect(folder, [])
  } else if (Array.isArray(data)) {
    visit(data, [])
  } else {
    throw new Error('Unrecognized JSON structure. Expected a SmartMark export or a bookmark tree.')
  }

  return { folders, loose, warnings }
}

/** Minimal Netscape bookmark file, the format Chrome/Firefox/Safari all export. */
export function buildNetscapeHtml(folders: ExportFolder[], loose: ExportBookmark[]): string {
  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. It will be read and overwritten. DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const writeBookmarks = (items: ExportBookmark[], indent: number) => {
    const pad = '    '.repeat(indent)
    for (const b of items) {
      const add = b.dateAdded ? ` ADD_DATE="${Math.floor(b.dateAdded / 1000)}"` : ''
      const tags = b.tags?.length ? ` TAGS="${esc(b.tags.join(','))}"` : ''
      lines.push(`${pad}<DT><A HREF="${esc(b.url)}"${add}${tags}>${esc(b.title || b.url)}</A>`)
      if (b.note) lines.push(`${pad}<DD>${esc(b.note)}`)
    }
  }

  const writeFolder = (folder: ExportFolder, indent: number) => {
    const pad = '    '.repeat(indent)
    lines.push(`${pad}<DT><H3>${esc(folder.title)}</H3>`)
    lines.push(`${pad}<DL><p>`)
    writeBookmarks(folder.bookmarks ?? [], indent + 1)
    for (const child of folder.children ?? []) writeFolder(child, indent + 1)
    lines.push(`${pad}</DL><p>`)
  }

  // Loose bookmarks are written before any folder so they stay at the top level
  // of the file (same as Chrome's own exporter does).
  writeBookmarks(loose, 1)
  for (const folder of folders) writeFolder(folder, 1)

  lines.push('</DL><p>')
  return lines.join('\n')
}

/**
 * Tolerant Netscape parser: regex-based on purpose (no DOM in a service worker,
 * no dependency needed). Unknown tags are skipped with a warning count.
 */
export function parseNetscapeHtml(html: string): ParseResult {
  const warnings: string[] = []
  const folders: ParsedFolder[] = []
  const loose: ExportBookmark[] = []
  // ponytail: flat folder list; Chrome/Firefox export nesting depth is reproduced
  // by the caller re-creating folders by path. Upgrade path is a real tokenizer
  // if we ever need to preserve arbitrary nesting depth.
  let current: ExportBookmark[] = loose
  let currentTitle: string | null = null

  const trimmed = html.replace(/\r/g, '')
  if (!/<DL|<DT/i.test(trimmed)) throw new Error('No bookmarks found in that HTML file.')

  const tagRe = /<DT><H3[^>]*>([\s\S]*?)<\/H3>|<DT><A\s([^>]*)>([\s\S]*?)<\/A>|<DD>([\s\S]*?)(?=<DT|<\/DL|$)/gi
  const attr = (raw: string, name: string): string | undefined => {
    const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(raw)
    return m ? decodeEntities(m[1]) : undefined
  }

  let m: RegExpExecArray | null
  while ((m = tagRe.exec(trimmed)) !== null) {
    if (m[1] !== undefined) {
      currentTitle = decodeEntities(m[1]).trim() || 'Untitled folder'
      current = []
      folders.push({ title: currentTitle, path: [currentTitle], bookmarks: current })
      continue
    }
    if (m[2] !== undefined) {
      const href = attr(m[2], 'HREF')
      if (!href) {
        warnings.push('Skipped a bookmark without a URL.')
        continue
      }
      const tags = attr(m[2], 'TAGS')
      const addDate = attr(m[2], 'ADD_DATE')
      current.push({
        title: decodeEntities(m[3]).trim(),
        url: href,
        dateAdded: addDate && /^\d+$/.test(addDate) ? Number(addDate) * 1000 : undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      })
      continue
    }
    if (m[4] !== undefined && current.length) {
      const note = decodeEntities(m[4]).replace(/<[^>]*>/g, '').trim()
      if (note) current[current.length - 1]!.note = note
    }
  }

  return { folders: folders.filter((f) => f.bookmarks.length > 0), loose, warnings }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

export function download(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
