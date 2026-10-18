import { useRef } from 'react'
import { Icon } from './Icons.tsx'
import { cx } from './ui.tsx'
import { useShortcut } from '../lib/hooks.ts'

export function SearchBar({
  value,
  onChange,
  resultCount,
  totalCount,
  placeholder = 'Search titles, URLs, tags and notes…',
  compact = false,
}: {
  value: string
  onChange: (v: string) => void
  resultCount: number
  totalCount: number
  placeholder?: string
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useShortcut('mod+k', () => inputRef.current?.select(), { allowInInput: true })

  return (
    <div className="relative">
      <span className={cx('pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted', value && 'text-sky')}>
        <Icon name="search" size={compact ? 17 : 19} />
      </span>
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search bookmarks"
        className={cx(
          'w-full rounded-xl2 border border-line bg-surface pr-24 pl-11 text-ink shadow-card transition-shadow placeholder:text-muted/70 focus:border-sky focus:shadow-pop focus:outline-none',
          compact ? 'h-11 text-sm' : 'h-13 text-[15px]',
        )}
      />
      <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="rounded-lg p-1 text-muted hover:bg-surface2 hover:text-ink"
          >
            <Icon name="close" size={15} />
          </button>
        ) : (
          <kbd className="hidden rounded-md border border-line bg-surface2 px-1.5 py-0.5 text-[11px] text-muted sm:block">⌘K</kbd>
        )}
        {value ? (
          <span className="text-xs whitespace-nowrap text-muted">
            {resultCount}/{totalCount}
          </span>
        ) : null}
      </span>
    </div>
  )
}
