import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Bookmark } from '../lib/types.ts'
import { useLibrary, useSettings, useToasts } from '../lib/hooks.ts'
import { getActiveTab, ensureFolderPath, openDashboard, openOptions, openUrl, smartMarkRoot, type TabInfo } from '../lib/bookmarks.ts'
import { normalizeUrl } from '../lib/url.ts'
import { applyQuery, isUnorganized } from '../lib/query.ts'
import { SearchBar } from '../components/SearchBar.tsx'
import { BookmarkItem } from '../components/BookmarkItem.tsx'
import { Button, EmptyState, ErrorState, Favicon, IconButton, Select, SkeletonRows, Spinner, Toaster, cx } from '../components/ui.tsx'
import { Icon } from '../components/Icons.tsx'

type QuickTab = 'favorites' | 'added' | 'unorganized'

export function Popup() {
  const { settings, update, ready } = useSettings()
  const library = useLibrary()
  const { toasts, push, dismiss } = useToasts()

  const [tab, setTab] = useState<TabInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [quick, setQuick] = useState<QuickTab>('favorites')

  useEffect(() => {
    void getActiveTab().then(setTab)
  }, [])

  const alreadySaved = useMemo(
    () => (tab ? library.bookmarks.some((b) => normalizeUrl(b.url) === normalizeUrl(tab.url)) : false),
    [library.bookmarks, tab],
  )

  const save = useCallback(async () => {
    if (!tab) return
    setSaving(true)
    try {
      const parentId = settings.defaultFolderId || (await ensureFolderPath(['Inbox'], await smartMarkRoot()))
      await library.createBookmark({ parentId, title: tab.title, url: tab.url })
      push('Saved to SmartMark.', 'success', {
        label: 'Open dashboard',
        run: () => void openDashboard('#/added'),
      })
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save this page.', 'error')
    } finally {
      setSaving(false)
    }
  }, [library, push, settings.defaultFolderId, tab])

  const visible = useMemo(() => {
    const base = library.bookmarks
    const list = applyQuery(base, { q, folderId: null, category: null, tag: null, favoritesOnly: false, unorganizedOnly: false, sort: q ? 'dateAdded' : quick === 'favorites' ? 'title' : 'dateAdded' })
    const narrowed = q
      ? list
      : quick === 'favorites'
        ? list.filter((b) => b.meta.favorite)
        : quick === 'unorganized'
          ? list.filter(isUnorganized)
          : list
    return narrowed.slice(0, 8)
  }, [library.bookmarks, q, quick])

  const openBookmark = useCallback(
    (b: Bookmark) => {
      void openUrl(b.url)
      void library.patchMeta([b.id], { lastOpened: Date.now() })
      window.close()
    },
    [library],
  )

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
          <Icon name="bookmark" size={17} />
        </span>
        <h1 className="text-[15px] font-semibold tracking-tight text-ink">SmartMark</h1>
        <span className="ml-auto flex items-center gap-0.5">
          <IconButton
            label={settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            icon={settings.theme === 'dark' ? 'sun' : 'moon'}
            size={16}
            onClick={() => void update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          />
          <IconButton label="Open options" icon="settings" size={16} onClick={() => void openOptions()} />
          <IconButton label="Open dashboard" icon="grid" size={16} onClick={() => void openDashboard()} />
        </span>
      </header>

      <div className="px-4">
        <div className="rounded-xl2 border border-line bg-surface p-3 shadow-card">
          {tab ? (
            <>
              <div className="flex items-center gap-2.5">
                <Favicon url={tab.url} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{tab.title}</p>
                  <p className="truncate text-[11px] text-muted">{tab.url}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button variant={alreadySaved ? 'sage' : 'primary'} size="sm" icon={alreadySaved ? 'check' : 'plus'} disabled={saving || alreadySaved} onClick={() => void save()}>
                  {saving ? <Spinner size={14} /> : null}
                  {alreadySaved ? 'Already saved' : 'Save this page'}
                </Button>
                <Select
                  aria-label="Save to folder"
                  className="h-8 flex-1 text-[12px]"
                  value={settings.defaultFolderId || '2'}
                  onChange={(e) => void update({ defaultFolderId: e.target.value })}
                >
                  <option value="2">Other bookmarks</option>
                  {library.folders.slice(0, 60).map((f) => (
                    <option key={f.id} value={f.id}>
                      {'\u2003'.repeat(f.depth)}
                      {f.title}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted">No page to save here (chrome:// pages can’t be bookmarked).</p>
          )}
        </div>
      </div>

      <div className="px-4 pt-3">
        <SearchBar value={q} onChange={setQ} resultCount={visible.length} totalCount={library.bookmarks.length} placeholder="Search all bookmarks…" compact />
      </div>

      {!q ? (
        <div className="flex gap-1 px-4 pt-3">
          {(
            [
              { id: 'favorites', label: 'Favorites' },
              { id: 'added', label: 'Recent' },
              { id: 'unorganized', label: 'Unorganized' },
            ] as Array<{ id: QuickTab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setQuick(t.id)}
              aria-pressed={quick === t.id}
              className={cx(
                'rounded-full px-3 py-1 text-[12px] transition-colors',
                quick === t.id ? 'bg-brand text-white' : 'text-muted hover:bg-surface2 hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {!ready || library.loading ? (
          <SkeletonRows rows={3} />
        ) : library.error ? (
          <ErrorState message={library.error} onRetry={() => void library.reload()} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={q ? 'search' : 'star'}
            title={q ? 'No matches' : quick === 'favorites' ? 'No favorites yet' : 'Nothing to show'}
            body={q ? 'Try another word — SmartMark searches titles, URLs, tags and notes.' : 'Star a bookmark in the dashboard and it shows up here.'}
          />
        ) : (
          <div className="space-y-2">
            {visible.map((b) => (
              <BookmarkItem
                key={b.id}
                bookmark={b}
                selected={false}
                density="list"
                showActions={false}
                actions={{
                  onOpen: openBookmark,
                  onToggleSelect: () => {},
                  onToggleFavorite: (x) => void library.patchMeta([x.id], { favorite: !x.meta.favorite }),
                  onEdit: () => void openDashboard('#/library'),
                  onMove: () => void openDashboard('#/library'),
                  onDelete: () => void openDashboard('#/library'),
                }}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-line bg-surface px-4 py-3">
        <Button size="sm" variant="ghost" icon="grid" onClick={() => void openDashboard()}>
          Dashboard
        </Button>
        <span className="text-[11px] text-muted">{library.bookmarks.length} bookmarks · 100% local</span>
      </footer>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
