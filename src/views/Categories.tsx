import { useMemo, useState } from 'react'
import type { Bookmark, Settings } from '../lib/types.ts'
import { CATEGORIES, accentFor } from '../lib/categorize.ts'
import { categoryCounts } from '../lib/query.ts'
import type { Library, Toast } from '../lib/hooks.ts'
import { ensureFolderPath, smartMarkRoot } from '../lib/bookmarks.ts'
import { Button, Card, Chip, EmptyState, IconButton, Input, Modal, Select, SectionTitle, Spinner, cx } from '../components/ui.tsx'
import { Icon } from '../components/Icons.tsx'
import type { NavTarget } from '../components/Sidebar.tsx'

const CARD_TINT: Record<string, string> = {
  blue: 'from-brand/12 to-transparent',
  sky: 'from-sky/18 to-transparent',
  sage: 'from-sage/60 to-transparent dark:from-sage/20',
}

export function CategoriesView({
  library,
  settings,
  updateSettings,
  onNavigate,
  push,
  undoToast,
}: {
  library: Library
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  onNavigate: (t: NavTarget) => void
  push: (m: string, tone?: Toast['tone'], action?: Toast['action']) => number
  undoToast: (label: string, undo: () => Promise<void>) => Promise<void>
}) {
  const { bookmarks, patchMeta, moveBookmarks, reload, loading, error } = library
  const [correcting, setCorrecting] = useState<Bookmark | null>(null)
  const [newCategory, setNewCategory] = useState(false)
  const [filing, setFiling] = useState(false)

  const counts = useMemo(() => categoryCounts(bookmarks), [bookmarks])

  /** Anything SmartMark is not sure about and the user has not confirmed. */
  const toReview = useMemo(
    () =>
      bookmarks
        .filter((b) => !b.meta.category && b.confidence < 0.9)
        .sort((a, b) => a.confidence - b.confidence)
        .slice(0, 40),
    [bookmarks],
  )

  const applySuggestion = async (b: Bookmark) => {
    await patchMeta([b.id], { category: b.category })
    push(`Filed under ${b.category}.`, 'success', { label: 'Undo', run: () => patchMeta([b.id], { category: undefined }) })
  }

  const applyAllConfident = async () => {
    const confident = toReview.filter((b) => b.confidence >= 0.5)
    for (const b of confident) await patchMeta([b.id], { category: b.category })
    push(`Accepted ${confident.length} suggestion${confident.length === 1 ? '' : 's'}.`, 'success')
  }

  /** Move every categorized bookmark into SmartMark/<Category> folders. */
  const fileIntoFolders = async () => {
    setFiling(true)
    const root = await smartMarkRoot()
    const byCategory = new Map<string, Bookmark[]>()
    for (const b of bookmarks) {
      if (!b.category || b.category === 'Other') continue
      byCategory.set(b.category, [...(byCategory.get(b.category) ?? []), b])
    }
    const undos: Array<() => Promise<void>> = []
    let moved = 0
    for (const [category, items] of byCategory) {
      const folderId = await ensureFolderPath([category], root)
      const pending = items.filter((b) => b.parentId !== folderId)
      if (pending.length === 0) continue
      undos.push(await moveBookmarks(pending.map((b) => b.id), folderId))
      moved += pending.length
    }
    await reload()
    setFiling(false)
    if (moved === 0) {
      push('Everything already sits in its SmartMark folder.', 'info')
      return
    }
    await undoToast(`Filed ${moved} bookmark${moved === 1 ? '' : 's'} into SmartMark folders`, async () => {
      for (const undo of undos.reverse()) await undo()
    })
  }

  const unusedCategories = CATEGORIES.filter((c) => !counts.some((x) => x.category === c))

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Categories</h1>
          <p className="mt-0.5 text-sm text-muted">
            Rules run on your device. Every category can be corrected, and your choice always wins.
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon="plus" onClick={() => setNewCategory(true)}>
            New category
          </Button>
          <Button variant="primary" icon="folder" disabled={filing} onClick={() => void fileIntoFolders()}>
            {filing ? <Spinner size={15} /> : null}
            File into folders
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl2 border border-line bg-surface2" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {counts.map(({ category, count, confident }) => (
                <button key={category} type="button" onClick={() => onNavigate({ name: 'category', id: category })} className="text-left">
                  <Card
                    className={cx(
                      'group relative h-full overflow-hidden bg-linear-to-br p-4 transition-shadow hover:shadow-pop',
                      CARD_TINT[accentFor(category)],
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">{category}</span>
                      <Icon name="chevronRight" size={16} className="mt-0.5 text-muted transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{count}</p>
                    <p className="mt-1 text-xs text-muted">
                      {confident} auto-classified · {count - confident} to review
                    </p>
                  </Card>
                </button>
              ))}
              {counts.length === 0 ? (
                <div className="sm:col-span-2 xl:col-span-3">
                  <EmptyState
                    icon="layers"
                    title="No categories yet"
                    body="Add a bookmark and SmartMark will start grouping it by domain, title and folder."
                  />
                </div>
              ) : null}
            </div>

            {unusedCategories.length > 0 ? (
              <p className="mt-4 text-xs text-muted">
                Unused: {unusedCategories.join(' · ')}
              </p>
            ) : null}

            <div className="mt-8">
              <SectionTitle hint={`${toReview.length} suggestion${toReview.length === 1 ? '' : 's'} to review`}>
                SmartMark suggestions
              </SectionTitle>
              {toReview.length === 0 ? (
                <EmptyState icon="check" title="All caught up" body="Every bookmark is either confirmed, well-known, or tagged by you." />
              ) : (
                <div className="space-y-2">
                  {toReview.slice(0, 12).map((b) => (
                    <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl2 border border-line bg-surface px-4 py-3 shadow-card">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{b.title}</p>
                        <p className="truncate text-xs text-muted">
                          {b.domain} · {b.reason}
                        </p>
                      </div>
                      <Chip tone="sage">
                        <Icon name={b.confidence >= 0.5 ? 'sparkle' : 'info'} size={12} />
                        {b.category}
                        <span className="opacity-70">{Math.round(b.confidence * 100)}%</span>
                      </Chip>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="sage" onClick={() => void applySuggestion(b)}>
                          Apply
                        </Button>
                        <Button size="sm" onClick={() => setCorrecting(b)}>
                          Correct
                        </Button>
                      </div>
                    </div>
                  ))}
                  {toReview.length > 1 ? (
                    <Button className="mt-1" icon="check" onClick={() => void applyAllConfident()}>
                      Accept all confident suggestions
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-8">
              <SectionTitle hint={`${settings.customRules.length} rule${settings.customRules.length === 1 ? '' : 's'}`}>
                Your rules
              </SectionTitle>
              {settings.customRules.length === 0 ? (
                <p className="rounded-xl2 border border-dashed border-line bg-surface2/60 px-4 py-6 text-sm text-muted">
                  No custom rules yet. Add one to make a category stick — for example “any domain containing <em>linear.app</em> is Work”.
                </p>
              ) : (
                <ul className="space-y-2">
                  {settings.customRules.map((rule, i) => (
                    <li key={`${rule.category}-${rule.pattern}-${i}`} className="flex items-center gap-3 rounded-xl2 border border-line bg-surface px-4 py-2.5">
                      <Chip tone="sky">{rule.category}</Chip>
                      <span className="text-sm text-muted">
                        {rule.matchOn === 'domain' ? 'domain contains' : 'title/URL contains'} <code className="rounded bg-surface2 px-1.5 py-0.5 text-xs text-ink">{rule.pattern}</code>
                      </span>
                      <IconButton
                        label="Remove rule"
                        icon="close"
                        className="ml-auto"
                        onClick={() => void updateSettings({ customRules: settings.customRules.filter((_, j) => j !== i) })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <CorrectModal
        bookmark={correcting}
        categories={[...new Set([...CATEGORIES, ...settings.customRules.map((r) => r.category)])]}
        onClose={() => setCorrecting(null)}
        onSave={async (category, remember) => {
          if (!correcting) return
          await patchMeta([correcting.id], { category })
          if (remember) {
            await updateSettings({
              customRules: [...settings.customRules, { category, pattern: correcting.domain, matchOn: 'domain' }],
            })
          }
          push(`Category set to ${category}.`, 'success')
          setCorrecting(null)
        }}
      />

      <NewCategoryModal
        open={newCategory}
        existing={[...new Set([...CATEGORIES, ...settings.customRules.map((r) => r.category)])]}
        onClose={() => setNewCategory(false)}
        onCreate={async (category, pattern, matchOn) => {
          const rules = pattern ? [...settings.customRules, { category, pattern, matchOn }] : settings.customRules
          await updateSettings({ customRules: rules })
          setNewCategory(false)
          push(pattern ? `New category “${category}” with a rule.` : `New category “${category}”.`, 'success')
        }}
      />
    </section>
  )
}

function CorrectModal({
  bookmark,
  categories,
  onClose,
  onSave,
}: {
  bookmark: Bookmark | null
  categories: string[]
  onClose: () => void
  onSave: (category: string, remember: boolean) => Promise<void>
}) {
  const [category, setCategory] = useState('')
  const [remember, setRemember] = useState(false)
  return (
    <Modal
      open={!!bookmark}
      title="Correct this category"
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!category} onClick={() => void onSave(category, remember)}>
            Save
          </Button>
        </>
      }
    >
      <p className="mb-3 truncate text-sm text-muted">{bookmark?.title}</p>
      <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
        <option value="">Pick a category…</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#3368A0]" />
        Remember this for <strong className="text-ink">{bookmark?.domain}</strong>
      </label>
    </Modal>
  )
}

function NewCategoryModal({
  open,
  existing,
  onClose,
  onCreate,
}: {
  open: boolean
  existing: string[]
  onClose: () => void
  onCreate: (category: string, pattern: string, matchOn: 'domain' | 'keyword') => Promise<void>
}) {
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('')
  const [matchOn, setMatchOn] = useState<'domain' | 'keyword'>('domain')
  const duplicate = existing.some((c) => c.toLowerCase() === name.trim().toLowerCase())

  return (
    <Modal
      open={open}
      title="New category"
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim() || duplicate} onClick={() => void onCreate(name.trim(), pattern.trim(), matchOn)}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Client work" autoFocus />
          {duplicate ? <span className="mt-1 block text-xs text-amber-600">That category already exists.</span> : null}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Rule (optional)</span>
          <div className="flex gap-2">
            <Select value={matchOn} onChange={(e) => setMatchOn(e.target.value as 'domain' | 'keyword')}>
              <option value="domain">Domain contains</option>
              <option value="keyword">Title/URL contains</option>
            </Select>
            <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="linear.app" />
          </div>
          <span className="mt-1.5 block text-xs text-muted">Leave empty to create a category you assign by hand.</span>
        </label>
      </div>
    </Modal>
  )
}
