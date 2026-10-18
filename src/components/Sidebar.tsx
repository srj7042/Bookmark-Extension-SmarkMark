import type { Collection, Theme } from '../lib/types.ts'
import { Icon } from './Icons.tsx'
import { cx } from './ui.tsx'

export type NavTarget = { name: string; id?: string }

export type NavCounts = {
  all: number
  favorites: number
  unorganized: number
  duplicates: number
  categories: number
  tags: number
}

type Item = { label: string; icon: string; target: NavTarget; count?: number }

export function Sidebar({
  route,
  counts,
  collections,
  theme,
  onTheme,
  onNavigate,
  onNewCollection,
}: {
  route: NavTarget
  counts: NavCounts
  collections: Collection[]
  theme: Theme
  onTheme: (t: Theme) => void
  onNavigate: (target: NavTarget) => void
  onNewCollection: () => void
}) {
  const sections: Array<{ title: string; items: Item[] }> = [
    {
      title: 'Browse',
      items: [
        { label: 'All bookmarks', icon: 'bookmark', target: { name: 'library' }, count: counts.all },
        { label: 'Categories', icon: 'layers', target: { name: 'categories' }, count: counts.categories },
        { label: 'Collections', icon: 'collection', target: { name: 'collections' } },
        { label: 'Tags', icon: 'tag', target: { name: 'tags' }, count: counts.tags },
        { label: 'Duplicates', icon: 'copy', target: { name: 'duplicates' }, count: counts.duplicates },
      ],
    },
    {
      title: 'Smart lists',
      items: [
        { label: 'Favorites', icon: 'star', target: { name: 'favorites' }, count: counts.favorites },
        { label: 'Recently added', icon: 'clock', target: { name: 'added' } },
        { label: 'Recently opened', icon: 'external', target: { name: 'opened' } },
        { label: 'Unorganized', icon: 'inbox', target: { name: 'unorganized' }, count: counts.unorganized },
      ],
    },
  ]

  return (
    <nav data-surface="sidebar" className="flex h-full w-[248px] shrink-0 flex-col bg-sidebar text-sidebar-text" aria-label="Main">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sage text-[#1f4a48]">
          <Icon name="bookmark" size={19} />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight">SmartMark</span>
          <span className="block text-[11px] text-sidebar-muted">Local bookmark intelligence</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <NavRow key={item.label} item={item} active={route.name === item.target.name} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        ))}

        <div>
          <div className="flex items-center justify-between px-2 pb-1.5">
            <p className="text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase">My collections</p>
            <button
              type="button"
              onClick={onNewCollection}
              aria-label="New collection"
              className="rounded-md p-0.5 text-sidebar-muted hover:bg-white/10 hover:text-white"
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
          {collections.length === 0 ? (
            <p className="px-2 text-xs text-sidebar-muted/80">Group bookmarks across folders.</p>
          ) : (
            <ul className="space-y-0.5">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'collection', id: c.id })}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors',
                      route.name === 'collection' && route.id === c.id ? 'bg-white/14 font-medium text-white' : 'text-sidebar-text/90 hover:bg-white/10',
                    )}
                  >
                    <Icon name="collection" size={16} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-[11px] text-sidebar-muted">{c.ids.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-white/12 px-3 py-3">
        <ul className="mb-2 space-y-0.5">
          <NavRow
            item={{ label: 'Import & export', icon: 'download', target: { name: 'tools' } }}
            active={route.name === 'tools'}
            onNavigate={onNavigate}
          />
          <NavRow
            item={{ label: 'Settings', icon: 'settings', target: { name: 'settings' } }}
            active={route.name === 'settings'}
            onNavigate={onNavigate}
          />
        </ul>
        <div className="flex items-center gap-1 rounded-xl bg-white/8 p-1" role="group" aria-label="Theme">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTheme(t)}
              aria-pressed={theme === t}
              className={cx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] capitalize transition-colors',
                theme === t ? 'bg-white/18 font-semibold text-white' : 'text-sidebar-muted hover:text-white',
              )}
            >
              <Icon name={t === 'dark' ? 'moon' : t === 'light' ? 'sun' : 'settings'} size={13} />
              {t}
            </button>
          ))}
        </div>
        <p className="mt-2.5 px-1 text-[10.5px] leading-relaxed text-sidebar-muted">
          Bookmarks never leave your device. No accounts, no servers.
        </p>
      </div>
    </nav>
  )
}

function NavRow({ item, active, onNavigate }: { item: Item; active: boolean; onNavigate: (t: NavTarget) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate(item.target)}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors',
          active ? 'bg-white/16 font-medium text-white' : 'text-sidebar-text/90 hover:bg-white/10',
        )}
      >
        <Icon name={item.icon} size={16} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.count ? <span className="text-[11px] text-sidebar-muted">{item.count}</span> : null}
      </button>
    </li>
  )
}
