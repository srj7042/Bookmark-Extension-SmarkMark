import type { Bookmark, CustomRule, Folder, MetaMap } from './types.ts'
import { categorize } from './categorize.ts'
import { domainOf } from './url.ts'

/**
 * Thin, promise-based wrapper over chrome.bookmarks. Everything else in the app
 * goes through these functions so undo/export have exactly one place to hook into.
 */

export type Node = chrome.bookmarks.BookmarkTreeNode

const ROOT_NAMES: Record<string, string> = {
  '1': 'Bookmarks bar',
  '2': 'Other bookmarks',
  '3': 'Mobile bookmarks',
}

function titleOf(node: Node): string {
  return node.title || ROOT_NAMES[node.id] || 'Untitled'
}

export async function getTree(): Promise<Node[]> {
  return chrome.bookmarks.getTree()
}

export type LoadedLibrary = { bookmarks: Bookmark[]; folders: Folder[]; meta: MetaMap; liveIds: Set<string> }

/** Flatten the Chrome tree into bookmarks (with folder path) and folders (with counts). */
export function flatten(tree: Node[], meta: MetaMap, rules: CustomRule[] = []): Omit<LoadedLibrary, 'meta'> {
  const bookmarks: Bookmark[] = []
  const folders: Folder[] = []
  const liveIds = new Set<string>()

  const countIn = (node: Node): number =>
    (node.children ?? []).reduce((sum, child) => sum + (child.url ? 1 : countIn(child)), 0)

  const walk = (nodes: Node[], parentPath: string, depth: number): void => {
    for (const node of nodes) {
      liveIds.add(node.id)
      if (node.url) {
        const m = meta[node.id] ?? {}
        const suggestion = categorize(
          { url: node.url, title: node.title, domain: domainOf(node.url), folderPath: parentPath },
          rules,
        )
        const userCategory = m.category
        const segments = parentPath ? parentPath.split(' / ') : []
        bookmarks.push({
          id: node.id,
          parentId: node.parentId ?? '',
          title: node.title || node.url,
          url: node.url,
          index: node.index ?? 0,
          path: parentPath,
          folderName: segments[segments.length - 1] ?? '',
          domain: domainOf(node.url),
          dateAdded: node.dateAdded,
          meta: m,
          category: userCategory ?? suggestion.category,
          confidence: userCategory ? 1 : suggestion.confidence,
          reason: userCategory ? 'Set by you' : suggestion.reason,
        })
      } else {
        const title = titleOf(node)
        const path = parentPath ? `${parentPath} / ${title}` : title
        folders.push({ id: node.id, parentId: node.parentId ?? '', title, path, depth, count: countIn(node) })
        walk(node.children ?? [], path, depth + 1)
      }
    }
  }

  walk(tree, '', 0)
  return { bookmarks, folders, liveIds }
}

export async function loadLibrary(meta: MetaMap, rules: CustomRule[] = []): Promise<Omit<LoadedLibrary, 'meta'>> {
  return flatten(await getTree(), meta, rules)
}

export function create(node: { parentId?: string; title: string; url?: string; index?: number }): Promise<Node> {
  return chrome.bookmarks.create(node)
}

export function update(id: string, changes: { title?: string; url?: string }): Promise<Node> {
  return chrome.bookmarks.update(id, changes)
}

export function move(id: string, parentId: string, index?: number): Promise<Node> {
  return chrome.bookmarks.move(id, index === undefined ? { parentId } : { parentId, index })
}

export function remove(id: string): Promise<void> {
  return chrome.bookmarks.remove(id)
}

export function removeTree(id: string): Promise<void> {
  return chrome.bookmarks.removeTree(id)
}

/** Capture subtrees before deleting so the delete can be undone. */
export async function captureSubtrees(ids: string[]): Promise<Node[]> {
  // getSubTree takes one id at a time; fan out and flatten.
  const subtrees = await Promise.all(ids.map((id) => chrome.bookmarks.getSubTree(id)))
  return subtrees.flat()
}

export async function deleteBookmarks(ids: string[]): Promise<Node[]> {
  const captured = await captureSubtrees(ids)
  for (const id of ids) {
    const node = captured.find((n) => n.id === id)
    if (node?.url) await remove(id)
    else await removeTree(id)
  }
  return captured
}

/** Re-create a previously captured subtree under `parentId`. */
export async function restoreNodes(nodes: Node[], parentId: string): Promise<number> {
  let count = 0
  for (const node of nodes) {
    if (node.url) {
      await create({ parentId, title: node.title, url: node.url })
      count += 1
    } else {
      const folder = await create({ parentId, title: node.title })
      count += await restoreNodes(node.children ?? [], folder.id)
    }
  }
  return count
}

/** Find or create a folder at `path` under `rootId`. Returns the leaf folder id. */
export async function ensureFolderPath(path: string[], rootId: string): Promise<string> {
  let parentId = rootId
  for (const title of path) {
    const children = await chrome.bookmarks.getChildren(parentId)
    const existing = children.find((c) => !c.url && titleOf(c).toLowerCase() === title.toLowerCase())
    parentId = existing ? existing.id : (await create({ parentId, title })).id
  }
  return parentId
}

/** SmartMark's own root folder — created lazily so we never touch the user's structure otherwise. */
export async function smartMarkRoot(): Promise<string> {
  const tree = await getTree()
  const roots = tree[0]?.children ?? []
  const existing = roots.find((n) => !n.url && n.title === 'SmartMark')
  if (existing) return existing.id
  const other = roots.find((n) => n.id === '2') ?? roots[0]
  return (await create({ parentId: other?.id, title: 'SmartMark' })).id
}

export type TabInfo = { title: string; url: string }

/**
 * Active tab. Uses the `activeTab` permission, which Chrome grants for an
 * extension action click or a keyboard shortcut — no broad `tabs` permission.
 */
export async function getActiveTab(): Promise<TabInfo | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url || !/^https?:/.test(tab.url)) return null
    return { title: tab.title || tab.url, url: tab.url }
  } catch {
    return null
  }
}

export async function openUrl(url: string): Promise<void> {
  await chrome.tabs.create({ url })
}

export function openDashboard(hash = ''): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${hash}`) })
}

export function openOptions(): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
}

/** Renders the local Chrome favicon cache. Requires the `favicon` permission; no network calls. */
export function faviconUrl(pageUrl: string, size = 32): string {
  return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`)
}
