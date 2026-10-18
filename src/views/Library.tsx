import { useCallback, useMemo, useState } from 'react'
import type { Bookmark, Collection, Density, Settings, SortKey } from '../lib/types.ts'
import { applyQuery, categoryCounts, isUnorganized, tagVocabulary } from '../lib/query.ts'
import type { Library, Toast } from '../lib/hooks.ts'
import { useSelection } from '../lib/hooks.ts'
import { openUrl } from '../lib/bookmarks.ts'
import { CATEGORIES } from '../lib/categorize.ts'
import { SearchBar } from '../components/SearchBar.tsx'
import { BookmarkItem } from '../components/BookmarkItem.tsx'
import { BulkBar } from '../components/BulkBar.tsx'
import { CollectionModal, EditBookmarkModal, MoveModal, TagModal } from '../components/BookmarkDialogs.tsx'
import { Button, ConfirmDialog, EmptyState, ErrorState, IconButton, SkeletonRows, Select, Chip, cx } from '../components/ui.tsx'

export type Scope = {
  onlyIds?: string[]
  folderId?: string | null
  folderPath?: string | null
  tag?: string | null
  category?: string | null
  favoritesOnly?: boolean
  unorganizedOnly?: boolean
  openedOnly?: boolean
  sortOverride?: SortKey
}

export type BrowserProps = {
  library: Library
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  collections: Collection[]
  setCollections: {
    addTo: (id: string, ids: string[]) => Promise<void>
    create: (name: string, ids: string[]) => Promise<Collection>
  }
  push: (message: string, tone?: Toast['tone'], action?: Toast['action']) => number
  undoToast: (label: string, undo: () => Promise<void>) => Promise<void>
  title: string
  subtitle?: string
  scope?: Scope
  headerExtra?: React.ReactNode
}

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'dateAdded', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'domain', label: 'Site A–Z' },
  { value: 'recent', label: 'Recently opened' },
]

export function Browser({
  library,
  settings,
  updateSettings,
  collections,
  setCollections,
  push,
  undoToast,
  title,
  subtitle,
  scope = {},
  headerExtra,
}: BrowserProps) {
  const { bookmarks, folders, loading, error, reload, patchMeta, editBookmark, moveBookmarks, deleteBookmarks } = library

  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>(scope.sortOverride ?? settings.sort)
  const [category, setCategory] = useState<string | null>(scope.category ?? null)
  const [tag, setTag] = useState<string | null>(scope.tag ?? null)
  const selection = useSelection()

  const [editing, setEditing] = useState<Bookmark | null>(null)
  const [moveTarget, setMoveTarget] = useState<Bookmark[] | null>(null)
  const [tagTarget, setTagTarget] = useState<Bookmark[] | null>(null)
  const [collectTarget, setCollectTarget] = useState<Bookmark[] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Bookmark[] | null>(null)

  // The dashboard remounts this view per route (`key`), so scope changes arrive as fresh state.

  const density: Density = settings.density

  const base = useMemo(() => {
    let list = bookmarks
    if (scope.onlyIds) {
      const allow = new Set(scope.onlyIds)
      list = list.filter((b) => allow.has(b.id))
    }
    if (scope.favoritesOnly) list = list.filter((b) => b.meta.favorite)
    if (scope.unorganizedOnly) list = list.filter(isUnorganized)
    if (scope.openedOnly) list = list.filter((b) => !!b.meta.lastOpened)
    // The route's own filter (e.g. #/category/Design) is applied here, not in the
    // query below, so the toolbar dropdowns stay purely additive controls.
    if (scope.category) list = list.filter((b) => b.category === scope.category)
    if (scope.tag) list = list.filter((b) => (b.meta.tags ?? []).includes(scope.tag!))
    return list
  }, [bookmarks, scope.onlyIds, scope.favoritesOnly, scope.unorganizedOnly, scope.openedOnly, scope.category, scope.tag])

  const folderPath = useMemo(() => {
    if (!scope.folderId) return null
    return folders.find((f) => f.id === scope.folderId)?.path ?? scope.folderPath ?? null
  }, [folders, scope.folderId, scope.folderPath])

  const visible = useMemo(
    () =>
      applyQuery(
        base,
        {
          q,
          folderId: scope.folderId ?? null,
          category: scope.category ? null : category,
          tag: scope.tag ? null : tag,
          favoritesOnly: false,
          unorganizedOnly: false,
          sort,
        },
        folderPath,
      ),
    [base, q, scope.folderId, scope.category, scope.tag, category, tag, sort, folderPath],
  )

  const categoryOptions = useMemo(() => categoryCounts(base), [base])
  const vocabulary = useMemo(() => tagVocabulary(bookmarks), [bookmarks])

  const openBookmark = useCallback(
    (b: Bookmark) => {
      void openUrl(b.url)
      void patchMeta([b.id], { lastOpened: Date.now() })
    },
    [patchMeta],
  )

  const toggleFavorite = useCallback(
    (b: Bookmark) => {
      const next = !b.meta.favorite
      void patchMeta([b.id], { favorite: next })
      push(next ? 'Added to favorites.' : 'Removed from favorites.', 'info')
    },
    [patchMeta, push],
  )

  const doMove = useCallback(
    async (ids: string[], parentId: string) => {
      const undo = await moveBookmarks(ids, parentId)
      const name = folders.find((f) => f.id === parentId)?.path ?? 'folder'
      await undoToast(`Moved ${ids.length} bookmark${ids.length === 1 ? '' : 's'} to ${name}`, undo)
    },
    [moveBookmarks, folders, undoToast],
  )

  const doDelete = useCallback(
    async (ids: string[]) => {
      const undo = await deleteBookmarks(ids)
      selection.clear()
      await undoToast(`Deleted ${ids.length} bookmark${ids.length === 1 ? '' : 's'}`, undo)
    },
    [deleteBookmarks, selection, undoToast],
  )

  const doTag = useCallback(
    async (ids: string[], add: string[], remove: string[]) => {
      const drop = new Set(remove)
      for (const id of ids) {
        const current = bookmarks.find((b) => b.id === id)?.meta.tags ?? []
        const next = [...new Set([...current.filter((t) => !drop.has(t)), ...add])]
        await patchMeta([id], { tags: next })
      }
      if (add.length) await updateSettings({ tags: [...new Set([...settings.tags, ...add])] })
      push(`Updated tags on ${ids.length} bookmark${ids.length === 1 ? '' : 's'}.`, 'success')
    },
    [bookmarks, patchMeta, push, settings.tags, updateSettings],
  )

  const doCollect = useCallback(
    async (ids: string[], name: string, existingId?: string) => {
      if (existingId) await setCollections.addTo(existingId, ids)
      else await setCollections.create(name, ids)
      push(`Added ${ids.length} bookmark${ids.length === 1 ? '' : 's'} to “${name}”.`, 'success')
      selection.clear()
    },
    [push, selection, setCollections],
  )

  const bulkFavorite = useCallback(async () => {
    await patchMeta([...selection.selected], { favorite: true })
    push(`${selection.count} bookmark${selection.count === 1 ? '' : 's'} favorited.`, 'success')
    selection.clear()
  }, [patchMeta, push, selection])

  const requestedDelete = (items: Bookmark[]) => {
    if (settings.confirmDestructive) setDeleteTarget(items)
    else void doDelete(items.map((b) => b.id))
  }

  const actions = {
    onOpen: openBookmark,
    onToggleSelect: selection.toggle,
    onToggleFavorite: toggleFavorite,
    onEdit: setEditing,
    onMove: (b: Bookmark) => setMoveTarget([b]),
    onDelete: (b: Bookmark) => requestedDelete([b]),
  }

  const activeFilters = (category && !scope.category ? [{ label: category, clear: () => setCategory(null) }] : []).concat(
    tag && !scope.tag ? [{ label: `#${tag}`, clear: () => setTag(null) }] : [],
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {subtitle ?? `${bookmarks.length} bookmarks in your library`}
          </p>
        </div>
        {headerExtra}
      </header>

      <SearchBar value={q} onChange={setQ} resultCount={visible.length} totalCount={base.length} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by category"
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value || null)}
          disabled={!!scope.category}
          title={scope.category ? 'Set by this page' : undefined}
          className="h-9 text-[13px]"
        >
          <option value="">All categories</option>
          {[...new Set([...(scope.category ? [scope.category] : []), ...CATEGORIES, ...categoryOptions.map((c) => c.category)])].map((c) => (
            <option key={c} value={c}>
              {c}
              {categoryOptions.find((o) => o.category === c) ? ` (${categoryOptions.find((o) => o.category === c)?.count})` : ''}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by tag"
          value={tag ?? ''}
          onChange={(e) => setTag(e.target.value || null)}
          disabled={!!scope.tag}
          title={scope.tag ? 'Set by this page' : undefined}
          className="h-9 text-[13px]"
        >
          <option value="">All tags</option>
          {[...new Set([...(scope.tag ? [scope.tag] : []), ...vocabulary.map((t) => t.tag)])].map((t) => (
            <option key={t} value={t}>
              #{t}
              {vocabulary.find((o) => o.tag === t) ? ` (${vocabulary.find((o) => o.tag === t)?.count})` : ''}
            </option>
          ))}
        </Select>

        <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 text-[13px]">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex items-center gap-1 rounded-xl border border-line bg-surface p-0.5">
          <IconButton label="List view" icon="list" size={16} active={density === 'list'} onClick={() => void updateSettings({ density: 'list' })} />
          <IconButton label="Grid view" icon="grid" size={16} active={density === 'grid'} onClick={() => void updateSettings({ density: 'grid' })} />
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <Chip key={f.label} tone="sky">
              {f.label}
              <button type="button" onClick={f.clear} aria-label={`Clear ${f.label} filter`} className="ml-0.5">
                ×
              </button>
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-3 mb-2 flex items-center gap-3 text-xs text-muted">
        {visible.length > 0 ? (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-line accent-[#3368A0]"
              checked={selection.count > 0 && selection.count === visible.length}
              onChange={() => (selection.count === visible.length ? selection.clear() : selection.set(visible.map((b) => b.id)))}
            />
            Select all
          </label>
        ) : null}
        <span>
          Showing {visible.length} of {base.length}
        </span>
        {folderPath ? <span className="truncate">· in {folderPath}</span> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {loading ? (
          <SkeletonRows rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void reload()} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={q ? 'search' : 'bookmark'}
            title={q ? 'No matches' : 'Nothing here yet'}
            body={
              q
                ? `No bookmark matches “${q}”. Try a shorter query, or search your tags and notes.`
                : scope.unorganizedOnly
                  ? 'Every bookmark has a category or a tag. Nicely organized.'
                  : 'Save a page with the SmartMark toolbar button, or the Ctrl+Shift+S shortcut.'
            }
            action={
              activeFilters.length > 0 ? (
                <Button
                  onClick={() => {
                    setCategory(null)
                    setTag(null)
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : density === 'grid' ? (
          <div className={cx('grid gap-3', 'sm:grid-cols-2 xl:grid-cols-3')}>
            {visible.map((b) => (
              <BookmarkItem key={b.id} bookmark={b} selected={selection.selected.has(b.id)} density="grid" actions={actions} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((b) => (
              <BookmarkItem key={b.id} bookmark={b} selected={selection.selected.has(b.id)} density="list" actions={actions} />
            ))}
          </div>
        )}
      </div>

      <BulkBar
        count={selection.count}
        onClear={selection.clear}
        onMove={() => setMoveTarget(bookmarks.filter((b) => selection.selected.has(b.id)))}
        onTag={() => setTagTarget(bookmarks.filter((b) => selection.selected.has(b.id)))}
        onFavorite={() => void bulkFavorite()}
        onCollection={() => setCollectTarget(bookmarks.filter((b) => selection.selected.has(b.id)))}
        onDelete={() => requestedDelete(bookmarks.filter((b) => selection.selected.has(b.id)))}
      />

      <EditBookmarkModal
        bookmark={editing}
        folders={folders}
        categories={[...new Set([...CATEGORIES, ...settings.customRules.map((r) => r.category)])]}
        vocabulary={vocabulary}
        onClose={() => setEditing(null)}
        onSave={async ({ title: t, url, parentId, tags, note, category: cat, favorite }) => {
          if (!editing) return
          const b = editing
          if (t !== b.title || url !== b.url) await editBookmark(b.id, { title: t, url })
          if (parentId !== b.parentId) await doMove([b.id], parentId)
          await patchMeta([b.id], { tags, note, favorite, category: cat || undefined })
          if (tags.length) await updateSettings({ tags: [...new Set([...settings.tags, ...tags])] })
          selection.clear()
          push('Bookmark updated.', 'success')
        }}
      />

      <MoveModal
        open={!!moveTarget}
        count={moveTarget?.length ?? 0}
        folders={folders}
        onClose={() => setMoveTarget(null)}
        onMove={async (parentId) => {
          const ids = moveTarget?.map((b) => b.id) ?? []
          if (ids.length) await doMove(ids, parentId)
          selection.clear()
        }}
      />

      <TagModal
        open={!!tagTarget}
        count={tagTarget?.length ?? 0}
        vocabulary={vocabulary}
        onClose={() => setTagTarget(null)}
        onApply={async (add, remove) => {
          const ids = tagTarget?.map((b) => b.id) ?? []
          if (ids.length) await doTag(ids, add, remove)
          selection.clear()
        }}
      />

      <CollectionModal
        open={!!collectTarget}
        bookmarkCount={collectTarget?.length ?? 0}
        collections={collections}
        onClose={() => setCollectTarget(null)}
        onSave={async (name, existingId) => {
          const ids = collectTarget?.map((b) => b.id) ?? []
          if (ids.length) await doCollect(ids, name, existingId)
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.length ?? 0} bookmark${(deleteTarget?.length ?? 0) === 1 ? '' : 's'}?`}
        body="They move out of Chrome Bookmarks. You can undo this right after from the toast."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const ids = deleteTarget?.map((b) => b.id) ?? []
          setDeleteTarget(null)
          void doDelete(ids)
        }}
      />
    </section>
  )
}
