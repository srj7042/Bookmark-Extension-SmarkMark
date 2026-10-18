import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Bookmark, Collection, Folder, Meta, MetaMap, Settings, Theme } from './types.ts'
import { DEFAULT_SETTINGS, getCollections, getMeta, getSettings, onSettingsChange, pruneMeta, saveCollections, saveMeta, saveSettings } from './storage.ts'
import { deleteBookmarks, loadLibrary, move, restoreNodes, update as updateNode } from './bookmarks.ts'

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function useSettings(): { settings: Settings; update: (patch: Partial<Settings>) => Promise<void>; ready: boolean } {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s)
      setReady(true)
    })
    return onSettingsChange(setSettings)
  }, [])

  useEffect(() => {
    if (ready) applyTheme(settings.theme)
  }, [ready, settings.theme])

  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings(await saveSettings(patch))
  }, [])

  return { settings, update, ready }
}

export type Undo = () => Promise<void>

/** Used when the "show category suggestions" preference is off: keep only user-confirmed categories. */
function stripSuggestions(items: Bookmark[]): Bookmark[] {
  return items.map((b) =>
    b.meta.category ? b : { ...b, category: 'Uncategorized', confidence: 0.15, reason: 'Suggestions are turned off' },
  )
}

export type Library = {
  bookmarks: Bookmark[]
  folders: Folder[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  refreshMeta: (mutate: (meta: MetaMap, liveIds: Set<string>) => MetaMap) => Promise<void>
  patchMeta: (ids: string[], patch: Partial<Meta>) => Promise<void>
  editBookmark: (id: string, changes: { title?: string; url?: string }) => Promise<void>
  renameBookmark: (id: string, title: string) => Promise<void>
  moveBookmarks: (ids: string[], parentId: string) => Promise<Undo>
  deleteBookmarks: (ids: string[]) => Promise<Undo>
  createBookmark: (input: { parentId: string; title: string; url?: string }) => Promise<string>
}

export function useLibrary(): Library {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      // First await before any state write keeps this hook safe to run from a mount effect
      // (no synchronous setState → no cascading render).
      const [meta, settings] = await Promise.all([getMeta(), getSettings()])
      if (!globalThis.chrome?.bookmarks) {
        throw new Error('Chrome bookmarks API unavailable. Load this page as an unpacked extension (see README).')
      }
      setError(null)
      const data = await loadLibrary(meta, settings.customRules)
      const pruned = await pruneMeta(meta, data.liveIds)
      setBookmarks(settings.autoCategorize ? data.bookmarks : stripSuggestions(data.bookmarks))
      setFolders(data.folders)
      return pruned
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read your bookmarks.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshMeta = useCallback(
    async (mutate: (meta: MetaMap, liveIds: Set<string>) => MetaMap) => {
      const meta = await getMeta()
      const live = new Set(bookmarks.map((b) => b.id))
      await saveMeta(mutate(meta, live))
      await reload()
    },
    [bookmarks, reload],
  )

  const patchMeta = useCallback(
    async (ids: string[], patch: Partial<Meta>) => {
      await refreshMeta((meta) => {
        const next = { ...meta }
        for (const id of ids) next[id] = { ...next[id], ...patch }
        return next
      })
    },
    [refreshMeta],
  )

  // First load. chrome.bookmarks is an external system, so a mount-time fetch is the
  // intended pattern here; every state write inside `reload` happens after its first await.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial read of chrome.bookmarks
    void reload()
  }, [reload])

  // Stay in sync when bookmarks change anywhere (Chrome's own manager, other tabs).
  useEffect(() => {
    const api = globalThis.chrome?.bookmarks
    if (!api?.onCreated) return
    // ponytail: coalesced full reload instead of incremental patching. Chrome's
    // bookmark tree is small enough (thousands at most) that O(n) reflatten is
    // cheaper than keeping a differential sync correct. Upgrade path: apply the
    // event's node delta to the in-memory tree.
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void reload(), 150)
    }
    const events = [api.onCreated, api.onRemoved, api.onChanged, api.onMoved, api.onChildrenReordered]
    for (const e of events) e.addListener(schedule)
    api.onImportEnded.addListener(schedule)

    // Settings changes (e.g. a new custom category rule) also change the derived view.
    const storageApi = globalThis.chrome?.storage
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes['sm:settings']) schedule()
    }
    storageApi?.onChanged?.addListener(onStorage)

    return () => {
      clearTimeout(timer)
      for (const e of events) e.removeListener(schedule)
      api.onImportEnded.removeListener(schedule)
      storageApi?.onChanged?.removeListener(onStorage)
    }
  }, [reload])

  const renameBookmark = useCallback(
    async (id: string, title: string) => {
      await updateNode(id, { title })
      await reload()
    },
    [reload],
  )

  const editBookmark = useCallback(
    async (id: string, changes: { title?: string; url?: string }) => {
      await updateNode(id, changes)
      await reload()
    },
    [reload],
  )

  const moveBookmarks = useCallback(
    async (ids: string[], parentId: string): Promise<Undo> => {
      const before = ids.map((id) => {
        const b = bookmarks.find((x) => x.id === id)
        return { id, parentId: b?.parentId ?? '2', index: b?.index }
      })
      for (const id of ids) await move(id, parentId)
      await reload()
      return async () => {
        for (const prev of before) await move(prev.id, prev.parentId, prev.index)
        await reload()
      }
    },
    [bookmarks, reload],
  )

  const deleteBookmarksAction = useCallback(
    async (ids: string[]): Promise<Undo> => {
      const captured = await deleteBookmarks(ids)
      await reload()
      return async () => {
        const parents = new Map(captured.map((n) => [n.id, n.parentId ?? '2']))
        for (const node of captured) await restoreNodes([node], parents.get(node.id) ?? '2')
        await reload()
      }
    },
    [reload],
  )

  const createBookmark = useCallback(
    async (input: { parentId: string; title: string; url?: string }): Promise<string> => {
      const node = await chrome.bookmarks.create(input)
      await reload()
      return node.id
    },
    [reload],
  )

  return {
    bookmarks,
    folders,
    loading,
    error,
    reload: async () => void (await reload()),
    refreshMeta,
    patchMeta,
    editBookmark,
    renameBookmark,
    moveBookmarks,
    deleteBookmarks: deleteBookmarksAction,
    createBookmark,
  }
}

export type Toast = {
  id: number
  message: string
  tone: 'info' | 'success' | 'warn' | 'error'
  action?: { label: string; run: () => void | Promise<void> }
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (message: string, tone: Toast['tone'] = 'info', action?: Toast['action']) => {
      const id = ++idRef.current
      setToasts((list) => [...list.slice(-3), { id, message, tone, action }])
      setTimeout(() => dismiss(id), action ? 8000 : 4000)
      return id
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}

/** Toast for a destructive action, with an Undo button wired to the closure the mutation returned. */
export function useUndoToast(push: (message: string, tone?: Toast['tone'], action?: Toast['action']) => number) {
  return useCallback(
    async (label: string, undo: Undo) => {
      push(label, 'success', {
        label: 'Undo',
        run: async () => {
          await undo()
          push('Restored.', 'info')
        },
      })
    },
    [push],
  )
}

/** Minimal hash router: `#/library`, `#/categories?q=react`. No dependency needed. */
export function useHashRoute(): [string, (path: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#\/?/, '') || 'library')
  useEffect(() => {
    const handler = () => setHash(window.location.hash.replace(/^#\/?/, '') || 'library')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  const navigate = useCallback((path: string) => {
    window.location.hash = `#/${path}`
  }, [])
  return [hash, navigate]
}

/** Runs `handler` on a keyboard shortcut, ignoring keypresses inside inputs. */
export function useShortcut(combo: string, handler: () => void, opts: { allowInInput?: boolean } = {}): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const parts = combo.toLowerCase().split('+')
      const key = parts[parts.length - 1]!
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (typing && !opts.allowInInput) return
      const want = (name: string) => parts.includes(name)
      if (want('mod') !== (e.metaKey || e.ctrlKey)) return
      if (want('shift') !== e.shiftKey) return
      if (want('alt') !== e.altKey) return
      if (e.key.toLowerCase() !== key) return
      e.preventDefault()
      ref.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [combo, opts.allowInInput])
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void getCollections().then((c) => {
      setCollections(c)
      setReady(true)
    })
  }, [])

  const persist = useCallback(async (next: Collection[]) => {
    setCollections(next)
    await saveCollections(next)
  }, [])

  const create = useCallback(
    async (name: string, ids: string[]) => {
      const collection: Collection = { id: `c${Date.now().toString(36)}`, name, ids: [...new Set(ids)] }
      await persist([...collections, collection])
      return collection
    },
    [collections, persist],
  )

  const addTo = useCallback(
    async (id: string, ids: string[]) => {
      await persist(collections.map((c) => (c.id === id ? { ...c, ids: [...new Set([...c.ids, ...ids])] } : c)))
    },
    [collections, persist],
  )

  const rename = useCallback(
    async (id: string, name: string) => {
      await persist(collections.map((c) => (c.id === id ? { ...c, name } : c)))
    },
    [collections, persist],
  )

  const destroy = useCallback(
    async (id: string) => {
      await persist(collections.filter((c) => c.id !== id))
    },
    [collections, persist],
  )

  return useMemo(() => ({ collections, ready, create, addTo, rename, destroy }), [collections, ready, create, addTo, rename, destroy])
}

export function useSelection() {  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const clear = useCallback(() => setSelected(new Set()), [])
  const set = useCallback((ids: string[]) => setSelected(new Set(ids)), [])
  return useMemo(() => ({ selected, toggle, clear, set, count: selected.size }), [selected, toggle, clear, set])
}
