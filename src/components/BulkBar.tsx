import { Button, IconButton, cx } from './ui.tsx'
import { Icon } from './Icons.tsx'

export function BulkBar({
  count,
  onClear,
  onMove,
  onTag,
  onFavorite,
  onDelete,
  onCollection,
}: {
  count: number
  onClear: () => void
  onMove: () => void
  onTag: () => void
  onFavorite: () => void
  onDelete: () => void
  onCollection: () => void
}) {
  if (count === 0) return null
  return (
    <div
      className={cx(
        'sm-rise sticky bottom-4 z-30 mt-4 flex flex-wrap items-center gap-2 rounded-xl2 border border-brand/25 bg-surface px-3 py-2.5 shadow-pop',
      )}
      role="region"
      aria-label="Bulk actions"
    >
      <span className="flex items-center gap-2 pl-1 text-sm font-semibold text-ink">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-xs text-white">{count}</span>
        selected
      </span>
      <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
      <Button size="sm" icon="folder" onClick={onMove}>
        Move
      </Button>
      <Button size="sm" icon="tag" onClick={onTag}>
        Tags
      </Button>
      <Button size="sm" icon="star" onClick={onFavorite}>
        Favorite
      </Button>
      <Button size="sm" icon="collection" onClick={onCollection}>
        Collect
      </Button>
      <Button size="sm" variant="danger" icon="trash" onClick={onDelete} className="ml-auto sm:ml-0">
        Delete
      </Button>
      <IconButton label="Clear selection" icon="close" onClick={onClear} className="ml-auto" />
      <span className="hidden items-center gap-1.5 text-xs text-muted md:flex">
        <Icon name="info" size={13} />
        Tip: Esc clears the selection
      </span>
    </div>
  )
}
