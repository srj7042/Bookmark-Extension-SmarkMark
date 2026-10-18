import type { Collection, MetaMap, Settings } from './types.ts'

/** All SmartMark state lives in chrome.storage.local. Nothing ever leaves the machine. */
const KEYS = {
  settings: 'sm:settings',
  meta: 'sm:meta',
  collections: 'sm:collections',
} as const

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultFolderId: '',
  autoCategorize: true,
  confirmDestructive: true,
  sort: 'dateAdded',
  density: 'list',
  tags: [],
  customRules: [],
}

const available = (): boolean => typeof chrome !== 'undefined' && !!chrome.storage?.local

async function read<T>(key: string, fallback: T): Promise<T> {
  if (!available()) return fallback
  const result = await chrome.storage.local.get(key)
  const value = result[key] as T | undefined
  return value === undefined ? fallback : value
}

async function write(key: string, value: unknown): Promise<void> {
  if (!available()) return
  await chrome.storage.local.set({ [key]: value })
}

export function getSettings(): Promise<Settings> {
  return read<Settings>(KEYS.settings, DEFAULT_SETTINGS).then((s) => ({ ...DEFAULT_SETTINGS, ...s }))
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await write(KEYS.settings, next)
  return next
}

export function getMeta(): Promise<MetaMap> {
  return read<MetaMap>(KEYS.meta, {})
}

export async function saveMeta(meta: MetaMap): Promise<void> {
  await write(KEYS.meta, meta)
}

export function getCollections(): Promise<Collection[]> {
  return read<Collection[]>(KEYS.collections, [])
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  await write(KEYS.collections, collections)
}

/** Subscribe to SmartMark storage changes (used to keep popup + dashboard in sync). */
export function onSettingsChange(cb: (settings: Settings) => void): () => void {
  if (!available()) return () => {}
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (area !== 'local' || !changes[KEYS.settings]) return
    cb({ ...DEFAULT_SETTINGS, ...(changes[KEYS.settings].newValue as Settings) })
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

/** Bytes SmartMark occupies in chrome.storage.local (for the Settings readout). */
export async function getStorageUsage(): Promise<number> {
  if (!available()) return 0
  return chrome.storage.local.getBytesInUse()
}

/** Wipe tags, notes, favorites, categories and collections. Settings are kept. */
export async function clearUserData(): Promise<void> {
  if (!available()) return
  await chrome.storage.local.remove([KEYS.meta, KEYS.collections])
}

/** Housekeeping: drop metadata for bookmarks the user deleted outside SmartMark. */export async function pruneMeta(meta: MetaMap, liveIds: Set<string>): Promise<MetaMap> {
  const kept: MetaMap = {}
  let changed = false
  for (const [id, m] of Object.entries(meta)) {
    if (liveIds.has(id)) kept[id] = m
    else changed = true
  }
  if (changed) await saveMeta(kept)
  return changed ? kept : meta
}
