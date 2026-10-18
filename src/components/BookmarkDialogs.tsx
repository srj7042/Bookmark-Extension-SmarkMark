import { useMemo, useState } from 'react'
import type { Bookmark, Collection, Folder } from '../lib/types.ts'
import { Button, Chip, Field, Input, Modal, Select, Switch, Textarea } from './ui.tsx'
import { Icon } from './Icons.tsx'

/** Native select of folder paths — one control, no custom tree widget, works with keyboard. */
export function FolderSelect({
  folders,
  value,
  onChange,
  includeTopLevel = true,
  ariaLabel = 'Folder',
  className,
}: {
  folders: Folder[]
  value: string
  onChange: (id: string) => void
  includeTopLevel?: boolean
  ariaLabel?: string
  className?: string
}) {
  return (
    <Select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {includeTopLevel ? <option value="2">Other bookmarks (top level)</option> : <option value="">Choose a folder…</option>}
      {folders.map((f) => (
        <option key={f.id} value={f.id}>
          {'\u2003'.repeat(f.depth)}
          {f.title} ({f.count})
        </option>
      ))}
    </Select>
  )
}

function parseTags(raw: string): string[] {
  return [...new Set(raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
}

export function EditBookmarkModal({
  bookmark,
  folders,
  categories,
  vocabulary,
  onClose,
  onSave,
}: {
  bookmark: Bookmark | null
  folders: Folder[]
  categories: string[]
  vocabulary: Array<{ tag: string; count: number }>
  onClose: () => void
  onSave: (patch: {
    title: string
    url: string
    parentId: string
    tags: string[]
    note: string
    category: string
    favorite: boolean
  }) => Promise<void>
}) {
  if (!bookmark) return null
  // Remount per bookmark (`key`) so the form state initialises from props without a sync effect.
  return (
    <EditBookmarkForm
      key={bookmark.id}
      bookmark={bookmark}
      folders={folders}
      categories={categories}
      vocabulary={vocabulary}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

function EditBookmarkForm({
  bookmark,
  folders,
  categories,
  vocabulary,
  onClose,
  onSave,
}: {
  bookmark: Bookmark
  folders: Folder[]
  categories: string[]
  vocabulary: Array<{ tag: string; count: number }>
  onClose: () => void
  onSave: (patch: {
    title: string
    url: string
    parentId: string
    tags: string[]
    note: string
    category: string
    favorite: boolean
  }) => Promise<void>
}) {
  const [title, setTitle] = useState(bookmark.title)
  const [url, setUrl] = useState(bookmark.url)
  const [parentId, setParentId] = useState(bookmark.parentId)
  const [tags, setTags] = useState((bookmark.meta.tags ?? []).join(', '))
  const [note, setNote] = useState(bookmark.meta.note ?? '')
  const [category, setCategory] = useState(bookmark.meta.category ?? '')
  const [favorite, setFavorite] = useState(!!bookmark.meta.favorite)
  const [saving, setSaving] = useState(false)

  const suggestions = useMemo(() => vocabulary.slice(0, 12), [vocabulary])

  return (
    <Modal
      open
      title="Edit bookmark"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving || !title.trim()}
            onClick={async () => {
              setSaving(true)
              await onSave({ title: title.trim(), url, parentId, tags: parseTags(tags), note: note.trim(), category, favorite })
              setSaving(false)
              onClose()
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">URL</span>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Folder</span>
            <FolderSelect folders={folders} value={parentId} onChange={setParentId} includeTopLevel={false} className="w-full" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Category</span>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
              <option value="">Use SmartMark suggestion ({bookmark.category})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Tags</span>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" />
          {suggestions.length > 0 ? (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map(({ tag }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags((prev) => [...new Set([...parseTags(prev), tag])].join(', '))}
                  className="rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:border-sky hover:text-ink"
                >
                  + {tag}
                </button>
              ))}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Note</span>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why did you save this?" />
        </label>
        <div className="border-t border-line pt-1">
          <Field label="Favorite" hint="Pin it to the Favorites smart list.">
            <Switch checked={favorite} onChange={setFavorite} label="Favorite" />
          </Field>
        </div>
        <p className="text-xs text-muted">
          Suggestion source: {bookmark.reason || '—'} · {Math.round(bookmark.confidence * 100)}% confidence
        </p>
      </div>
    </Modal>
  )
}

export function MoveModal({
  open,
  count,
  folders,
  onClose,
  onMove,
}: {
  open: boolean
  count: number
  folders: Folder[]
  onClose: () => void
  onMove: (parentId: string) => Promise<void>
}) {
  const [target, setTarget] = useState('2')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      title={count > 1 ? `Move ${count} bookmarks` : 'Move bookmark'}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onMove(target)
              setBusy(false)
              onClose()
            }}
          >
            {busy ? 'Moving…' : 'Move here'}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">Pick the destination folder. Moving is undoable from the toast.</p>
      <FolderSelect folders={folders} value={target} onChange={setTarget} className="w-full" />
    </Modal>
  )
}

export function TagModal({
  open,
  count,
  vocabulary,
  onClose,
  onApply,
}: {
  open: boolean
  count: number
  vocabulary: Array<{ tag: string; count: number }>
  onClose: () => void
  onApply: (add: string[], remove: string[]) => Promise<void>
}) {
  const [add, setAdd] = useState('')
  const [remove, setRemove] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      title={count > 1 ? `Tag ${count} bookmarks` : 'Tag bookmark'}
      onClose={onClose}
      width={500}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy || (!add.trim() && !remove.trim())}
            onClick={async () => {
              setBusy(true)
              await onApply(parseTags(add), parseTags(remove))
              setBusy(false)
              setAdd('')
              setRemove('')
              onClose()
            }}
          >
            Apply
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Add tags</span>
          <Input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="reading, research" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Remove tags</span>
          <Input value={remove} onChange={(e) => setRemove(e.target.value)} placeholder="old, stale" />
        </label>
        {vocabulary.length > 0 ? (
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Your tags</span>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {vocabulary.map(({ tag, count: n }) => (
                <button key={tag} type="button" onClick={() => setAdd((prev) => [...new Set([...parseTags(prev), tag])].join(', '))}>
                  <Chip tone="sage" className="hover:border-sky">
                    #{tag} <span className="text-[10px] opacity-70">{n}</span>
                  </Chip>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

export function CollectionModal({
  open,
  bookmarkCount,
  collections,
  onClose,
  onSave,
}: {
  open: boolean
  bookmarkCount: number
  collections: Collection[]
  onClose: () => void
  onSave: (name: string, existingId?: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  return (
    <Modal
      open={open}
      title={`Add ${bookmarkCount} bookmark${bookmarkCount === 1 ? '' : 's'} to a collection`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!name.trim() && !target}
            onClick={async () => {
              await onSave(name.trim() || collections.find((c) => c.id === target)?.name || 'Collection', target || undefined)
              setName('')
              setTarget('')
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {collections.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Add to existing</span>
            <Select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full">
              <option value="">— pick a collection —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.ids.length})
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Or create new</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design inspiration" />
        </label>
        <p className="flex items-start gap-2 text-xs text-muted">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          Collections are SmartMark-only groupings. Your Chrome folder structure is left untouched.
        </p>
      </div>
    </Modal>
  )
}
