import { useMemo, useState } from 'react'
import { findDuplicates } from '../lib/query.ts'
import type { Library } from '../lib/hooks.ts'
import { useSelection } from '../lib/hooks.ts'
import { Button, Chip, ConfirmDialog, EmptyState, Favicon, SkeletonRows } from '../components/ui.tsx'
import { Icon } from '../components/Icons.tsx'

export function DuplicatesView({
  library,
  undoToast,
}: {
  library: Library
  undoToast: (label: string, undo: () => Promise<void>) => Promise<void>
}) {
  const { bookmarks, loading, deleteBookmarks } = library
  const selection = useSelection()
  const [confirming, setConfirming] = useState(false)

  const groups = useMemo(() => findDuplicates(bookmarks), [bookmarks])
  const duplicateCount = groups.reduce((sum, g) => sum + g.items.length - 1, 0)

  /** Everything except the oldest copy in each group. */
  const redundantIds = useMemo(() => groups.flatMap((g) => g.items.slice(1).map((b) => b.id)), [groups])

  const remove = async () => {
    const ids = [...selection.selected]
    setConfirming(false)
    if (ids.length === 0) return
    const undo = await deleteBookmarks(ids)
    selection.clear()
    await undoToast(`Removed ${ids.length} duplicate${ids.length === 1 ? '' : 's'}`, undo)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Duplicates</h1>
          <p className="mt-0.5 text-sm text-muted">
            Matched on a normalized URL, so <code className="text-xs">www.</code>, trailing slashes, query strings and <code className="text-xs">http/https</code> are treated as the same page.
          </p>
        </div>
        {groups.length > 0 ? (
          <Button icon="check" onClick={() => selection.set(redundantIds)}>
            Select all but the oldest ({redundantIds.length})
          </Button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonRows rows={4} />
        ) : groups.length === 0 ? (
          <EmptyState icon="check" title="No duplicates" body="Every saved page has a unique normalized URL. Nothing to clean up." />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {groups.length} group{groups.length === 1 ? '' : 's'} · {duplicateCount} redundant cop{duplicateCount === 1 ? 'y' : 'ies'}
            </p>
            {groups.map((group) => (
              <div key={group.key} className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Chip tone="sky">{group.items.length} copies</Chip>
                  <span className="truncate font-mono text-xs text-muted">{group.key}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.items.map((b, i) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 hover:border-line">
                      <input
                        type="checkbox"
                        checked={selection.selected.has(b.id)}
                        onChange={() => selection.toggle(b.id)}
                        aria-label={`Select ${b.title}`}
                        className="h-4 w-4 shrink-0 accent-[#3368A0]"
                      />
                      <Favicon url={b.url} size={18} />
                      <a href={b.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-ink hover:text-brand">
                        {b.title}
                      </a>
                      {i === 0 ? <Chip tone="sage">oldest — keep</Chip> : null}
                      <span className="hidden max-w-[14rem] truncate text-xs text-muted sm:block" title={b.path}>
                        {b.path || 'Top level'}
                      </span>
                      {b.dateAdded ? (
                        <span className="hidden text-xs whitespace-nowrap text-muted md:block">
                          {new Date(b.dateAdded).toLocaleDateString()}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {selection.count > 0 ? (
        <div className="sm-rise mt-4 flex items-center gap-3 rounded-xl2 border border-brand/25 bg-surface px-4 py-3 shadow-pop">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs text-white">{selection.count}</span>
            selected
          </span>
          <Button size="sm" variant="danger" icon="trash" className="ml-auto" onClick={() => setConfirming(true)}>
            Delete selected
          </Button>
          <Button size="sm" onClick={selection.clear}>
            Clear
          </Button>
        </div>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        SmartMark only flags exact URL matches. Similar-but-different pages are left alone on purpose.
      </p>

      <ConfirmDialog
        open={confirming}
        title={`Remove ${selection.count} duplicate${selection.count === 1 ? '' : 's'}?`}
        body="The oldest copy in each group stays in Chrome Bookmarks. This is undoable from the toast."
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </section>
  )
}
