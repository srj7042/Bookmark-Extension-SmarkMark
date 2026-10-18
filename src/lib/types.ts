/** Shared, dependency-free domain types for SmartMark. */

export type Theme = 'light' | 'dark' | 'system'
export type SortKey = 'dateAdded' | 'title' | 'domain' | 'recent'
export type Density = 'list' | 'grid'

/** Per-bookmark metadata SmartMark owns (Chrome itself has no tags/notes). */
export type Meta = {
  tags?: string[]
  note?: string
  favorite?: boolean
  /** User-confirmed category. Once set, the heuristic suggestion is no longer shown. */
  category?: string
  lastOpened?: number
}

export type MetaMap = Record<string, Meta>

export type Settings = {
  theme: Theme
  /** Where "Save current page" drops new bookmarks. Empty string = SmartMark Inbox. */
  defaultFolderId: string
  autoCategorize: boolean
  confirmDestructive: boolean
  sort: SortKey
  density: Density
  /** Known tag vocabulary (union of everything the user has typed). */
  tags: string[]
  /** User-defined categorization rules. Always outrank the built-in heuristics. */
  customRules: CustomRule[]
}

/** A rule the user wrote. `pattern` is matched against the domain or the title+URL. */
export type CustomRule = { category: string; pattern: string; matchOn: 'domain' | 'keyword' }

export type Collection = { id: string; name: string; ids: string[] }

/** A flattened bookmark (Chrome node + derived + SmartMark metadata). */
export type Bookmark = {
  id: string
  parentId: string
  title: string
  url: string
  index: number
  /** Human-readable folder path, e.g. "Bookmarks bar / Work". */
  path: string
  folderName: string
  domain: string
  dateAdded?: number
  meta: Meta
  /** Effective category: user-confirmed if present, otherwise the heuristic. */
  category: string
  /** Heuristic confidence in [0,1]; 1 when user-confirmed. */
  confidence: number
  reason: string
}

export type Folder = {
  id: string
  parentId: string
  title: string
  path: string
  depth: number
  count: number
}

export type Suggestion = { category: string; confidence: number; reason: string }

export type Query = {
  q: string
  folderId: string | null
  category: string | null
  tag: string | null
  favoritesOnly: boolean
  /** Show only bookmarks SmartMark could not confidently categorize. */
  unorganizedOnly: boolean
  sort: SortKey
}

export const EMPTY_QUERY: Query = {
  q: '',
  folderId: null,
  category: null,
  tag: null,
  favoritesOnly: false,
  unorganizedOnly: false,
  sort: 'dateAdded',
}
