import { Fragment, useMemo, useState } from 'react'
import { Sidebar, type NavCounts, type NavTarget } from '../components/Sidebar.tsx'
import { Toaster, Button, ErrorState, IconButton, cx } from '../components/ui.tsx'
import { Icon } from '../components/Icons.tsx'
import { useCollections, useHashRoute, useLibrary, useSettings, useToasts, useUndoToast } from '../lib/hooks.ts'
import { isUnorganized, categoryCounts, tagVocabulary, findDuplicates } from '../lib/query.ts'
import { Browser } from '../views/Library.tsx'
import { CategoriesView } from '../views/Categories.tsx'
import { DuplicatesView } from '../views/Duplicates.tsx'
import { CollectionsView } from '../views/Collections.tsx'
import { TagsView } from '../views/Tags.tsx'
import { ToolsView } from '../views/Tools.tsx'
import { SettingsView } from '../views/Settings.tsx'

export function parseRoute(hash: string): NavTarget {
  const [name, ...rest] = hash.split('/')
  const id = rest.join('/')
  return { name: name || 'library', id: id ? decodeURIComponent(id) : undefined }
}

export function Dashboard() {
  const { settings, update, ready } = useSettings()
  const library = useLibrary()
  const collections = useCollections()
  const { toasts, push, dismiss } = useToasts()
  const undoToast = useUndoToast(push)
  const [hash, navigate] = useHashRoute()
  const [navOpen, setNavOpen] = useState(false)

  const route = parseRoute(hash)
  /** Remount the routed view when the destination changes, so its form/filter state starts fresh. */
  const routeKey = `${route.name}:${route.id ?? ''}`

  const counts: NavCounts = useMemo(
    () => ({
      all: library.bookmarks.length,
      favorites: library.bookmarks.filter((b) => b.meta.favorite).length,
      unorganized: library.bookmarks.filter(isUnorganized).length,
      duplicates: findDuplicates(library.bookmarks).reduce((sum, g) => sum + g.items.length - 1, 0),
      categories: categoryCounts(library.bookmarks).length,
      tags: tagVocabulary(library.bookmarks).length,
    }),
    [library.bookmarks],
  )

  const go = (target: NavTarget) => {
    setNavOpen(false)
    navigate(target.id ? `${target.name}/${encodeURIComponent(target.id)}` : target.name)
  }

  const shared = { library, settings, updateSettings: update, push, undoToast }
  const activeCollection = route.name === 'collection' ? collections.collections.find((c) => c.id === route.id) : undefined

  const body = () => {
    switch (route.name) {
      case 'categories':
        return <CategoriesView {...shared} onNavigate={go} />
      case 'collections':
        return (
          <CollectionsView
            collections={collections.collections}
            library={library}
            onNavigate={go}
            onCreate={collections.create}
            onRename={collections.rename}
            onDelete={collections.destroy}
            push={push}
          />
        )
      case 'tags':
        return <TagsView library={library} push={push} onNavigate={go} />
      case 'duplicates':
        return <DuplicatesView library={library} undoToast={undoToast} />
      case 'tools':
        return <ToolsView library={library} push={push} />
      case 'settings':
        return <SettingsView settings={settings} update={update} library={library} push={push} />
      case 'category':
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title={route.id ?? 'Category'}
            subtitle="Heuristic grouping — correct any bookmark and your choice sticks."
            scope={{ category: route.id ?? null }}
            headerExtra={
              <Button size="sm" icon="layers" onClick={() => go({ name: 'categories' })}>
                All categories
              </Button>
            }
          />
        )
      case 'tag':
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title={`#${route.id ?? ''}`}
            scope={{ tag: route.id ?? null }}
            headerExtra={
              <Button size="sm" icon="tag" onClick={() => go({ name: 'tags' })}>
                All tags
              </Button>
            }
          />
        )
      case 'collection':
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title={activeCollection?.name ?? 'Collection'}
            scope={{ onlyIds: activeCollection?.ids ?? [] }}
            headerExtra={
              <Button size="sm" icon="collection" onClick={() => go({ name: 'collections' })}>
                All collections
              </Button>
            }
          />
        )
      case 'favorites':
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title="Favorites"
            scope={{ favoritesOnly: true, sortOverride: 'title' }}
          />
        )
      case 'added':
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title="Recently added"
            subtitle="Newest first, straight from Chrome’s bookmark tree."
            scope={{ sortOverride: 'dateAdded' }}
          />
        )
      case 'opened':
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title="Recently opened"
            subtitle="Tracked locally when you open a bookmark through SmartMark."
            scope={{ openedOnly: true, sortOverride: 'recent' }}
          />
        )
      case 'unorganized':
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title="Unorganized"
            subtitle="No category signal and no tags. These are the ones worth five minutes."
            scope={{ unorganizedOnly: true }}
          />
        )
      case 'library':
      default:
        return (
          <Browser
            {...shared}
            collections={collections.collections}
            setCollections={collections}
            title="All bookmarks"
            scope={{}}
          />
        )
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-bg">
      <div className={cx('fixed inset-y-0 left-0 z-40 transition-transform lg:static lg:translate-x-0', navOpen ? 'translate-x-0' : '-translate-x-full')}>
        <Sidebar
          route={route}
          counts={counts}
          collections={collections.collections}
          theme={settings.theme}
          onTheme={(t) => void update({ theme: t })}
          onNavigate={go}
          onNewCollection={() => go({ name: 'collections' })}
        />
      </div>
      {navOpen ? <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" /> : null}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-4 pt-4 lg:hidden">
          <IconButton label="Open navigation" icon="list" onClick={() => setNavOpen(true)} />
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon name="bookmark" size={16} /> SmartMark
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 pb-2 lg:px-8 lg:pt-8">
          {!ready ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">Loading SmartMark…</div>
          ) : library.error && library.bookmarks.length === 0 ? (
            <ErrorState message={library.error} onRetry={() => void library.reload()} />
          ) : (
            <Fragment key={routeKey}>{body()}</Fragment>
          )}
        </div>
      </main>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
