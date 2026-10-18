import { useMemo, useState } from 'react'
import type { Collection } from '../lib/types.ts'
import type { Library, Toast } from '../lib/hooks.ts'
import { Button, Card, ConfirmDialog, EmptyState, Input, Modal } from '../components/ui.tsx'
import { Icon } from '../components/Icons.tsx'
import type { NavTarget } from '../components/Sidebar.tsx'

export function CollectionsView({
  collections,
  library,
  onNavigate,
  onCreate,
  onRename,
  onDelete,
  push,
}: {
  collections: Collection[]
  library: Library
  onNavigate: (t: NavTarget) => void
  onCreate: (name: string, ids: string[]) => Promise<Collection>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  push: (m: string, tone?: Toast['tone'], action?: Toast['action']) => number
}) {
  const [renaming, setRenaming] = useState<Collection | null>(null)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<Collection | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const liveIds = useMemo(() => new Set(library.bookmarks.map((b) => b.id)), [library.bookmarks])

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Collections</h1>
          <p className="mt-0.5 text-sm text-muted">
            Cross-folder groupings that live in SmartMark storage. Your Chrome folders stay exactly as they are.
          </p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
          New collection
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {collections.length === 0 ? (
          <EmptyState
            icon="collection"
            title="No collections yet"
            body="Select bookmarks anywhere in the library, then choose Collect to group them under a name."
            action={<Button onClick={() => setCreating(true)}>New collection</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((c) => {
              const alive = c.ids.filter((id) => liveIds.has(id))
              return (
                <Card key={c.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sage/55 text-[#295f59] dark:bg-sage/15 dark:text-sage">
                      <Icon name="collection" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                      <p className="text-xs text-muted">
                        {alive.length} bookmark{alive.length === 1 ? '' : 's'}
                        {alive.length !== c.ids.length ? ` · ${c.ids.length - alive.length} removed` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => onNavigate({ name: 'collection', id: c.id })}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setRenaming(c)
                        setName(c.name)
                      }}
                    >
                      Rename
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-red-600" onClick={() => setDeleting(c)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={creating}
        title="New collection"
        onClose={() => setCreating(false)}
        width={420}
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!newName.trim()}
              onClick={async () => {
                const c = await onCreate(newName.trim(), [])
                setNewName('')
                setCreating(false)
                push(`Created “${c.name}”. Select bookmarks to fill it.`, 'success')
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Weekend reading" autoFocus />
      </Modal>

      <Modal
        open={!!renaming}
        title="Rename collection"
        onClose={() => setRenaming(null)}
        width={420}
        footer={
          <>
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              onClick={async () => {
                if (renaming) await onRename(renaming.id, name.trim())
                setRenaming(null)
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        body="Only the collection is removed. The bookmarks themselves stay in Chrome."
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting
          setDeleting(null)
          if (target) void onDelete(target.id)
        }}
      />
    </section>
  )
}
