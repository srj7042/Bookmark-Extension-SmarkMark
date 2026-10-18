import type { Bookmark, Density } from '../lib/types.ts'
import { Icon } from './Icons.tsx'
import { AccentDot, Chip, Favicon, IconButton, cx } from './ui.tsx'

export type ItemActions = {
  onOpen: (b: Bookmark) => void
  onToggleSelect: (id: string) => void
  onToggleFavorite: (b: Bookmark) => void
  onEdit: (b: Bookmark) => void
  onMove: (b: Bookmark) => void
  onDelete: (b: Bookmark) => void
}

export function BookmarkItem({
  bookmark: b,
  selected,
  density,
  actions,
  showActions = true,
}: {
  bookmark: Bookmark
  selected: boolean
  density: Density
  actions: ItemActions
  showActions?: boolean
}) {
  const tags = b.meta.tags ?? []

  const meta = (
    <>
      <Chip tone="sky" className="max-w-[9rem] truncate">
        <AccentDot category={b.category} />
        <span className="truncate">{b.category}</span>
      </Chip>
      {tags.slice(0, 3).map((t) => (
        <Chip key={t} tone="sage">
          #{t}
        </Chip>
      ))}
      {tags.length > 3 ? <span className="text-xs text-muted">+{tags.length - 3}</span> : null}
      {b.meta.note ? (
        <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted">
          <Icon name="list" size={12} />
          <span className="truncate italic">{b.meta.note}</span>
        </span>
      ) : null}
    </>
  )

  const actionsRow = (
    <div className={cx('flex items-center gap-0.5 transition-opacity', showActions ? 'opacity-70 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-70')}>
      <IconButton
        label={b.meta.favorite ? 'Remove from favorites' : 'Add to favorites'}
        icon="star"
        size={16}
        onClick={() => actions.onToggleFavorite(b)}
        className={b.meta.favorite ? 'text-amber-500' : undefined}
      />
      <IconButton label="Open in new tab" icon="external" size={16} onClick={() => actions.onOpen(b)} />
      <IconButton label="Edit bookmark" icon="edit" size={16} onClick={() => actions.onEdit(b)} />
      <IconButton label="Move to folder" icon="folder" size={16} onClick={() => actions.onMove(b)} />
      <IconButton label="Delete bookmark" icon="trash" size={16} onClick={() => actions.onDelete(b)} className="hover:text-red-600" />
    </div>
  )

  const checkbox = (
    <input
      type="checkbox"
      checked={selected}
      onChange={() => actions.onToggleSelect(b.id)}
      aria-label={`Select ${b.title}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-[#3368A0]"
    />
  )

  if (density === 'grid') {
    return (
      <div
        className={cx(
          'group flex flex-col gap-3 rounded-xl2 border bg-surface p-4 shadow-card transition-colors',
          selected ? 'border-sky ring-1 ring-sky/40' : 'border-line hover:border-sky/45',
        )}
      >
        <div className="flex items-start gap-3">
          {checkbox}
          <Favicon url={b.url} size={28} className="mt-0.5" />
          <button type="button" onClick={() => actions.onOpen(b)} className="min-w-0 flex-1 text-left">
            <span className="line-clamp-2 block text-sm font-semibold text-ink">{b.title}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">{b.domain}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">{meta}</div>
        <div className="mt-auto flex items-center justify-between">
          <span className="truncate text-[11px] text-muted" title={b.path}>
            {b.path || 'Top level'}
          </span>
          {actionsRow}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cx(
        'group flex items-center gap-3 rounded-xl2 border bg-surface px-3.5 py-2.5 shadow-card transition-colors',
        selected ? 'border-sky ring-1 ring-sky/40' : 'border-line hover:border-sky/45',
      )}
    >
      {checkbox}
      <Favicon url={b.url} size={22} />
      <button type="button" onClick={() => actions.onOpen(b)} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{b.title}</span>
          {b.meta.favorite ? <Icon name="star" size={13} className="shrink-0 text-amber-500" /> : null}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span className="truncate">{b.domain}</span>
          <span className="hidden truncate sm:inline" title={b.path}>
            {b.path ? `· ${b.path}` : ''}
          </span>
        </span>
      </button>
      <div className="hidden max-w-[24rem] flex-wrap items-center justify-end gap-1.5 lg:flex">{meta}</div>
      {actionsRow}
    </div>
  )
}
