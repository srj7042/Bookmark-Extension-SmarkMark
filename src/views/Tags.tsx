import { useMemo, useState } from 'react'
import { tagVocabulary } from '../lib/query.ts'
import type { Library, Toast } from '../lib/hooks.ts'
import { Button, Card, Chip, ConfirmDialog, EmptyState, Input, Modal, SectionTitle } from '../components/ui.tsx'
import { Icon } from '../components/Icons.tsx'
import type { NavTarget } from '../components/Sidebar.tsx'

export function TagsView({
  library,
  push,
  onNavigate,
}: {
  library: Library
  push: (m: string, tone?: Toast['tone'], action?: Toast['action']) => number
  onNavigate: (t: NavTarget) => void
}) {
  const { bookmarks, patchMeta } = library
  const vocabulary = useMemo(() => tagVocabulary(bookmarks), [bookmarks])
  const [renaming, setRenaming] = useState<{ tag: string; count: number } | null>(null)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<{ tag: string; count: number } | null>(null)

  const tagBookmarks = (tag: string) => bookmarks.filter((b) => (b.meta.tags ?? []).includes(tag))

  const rename = async (from: string, to: string) => {
    const targets = tagBookmarks(from)
    for (const b of targets) {
      const tags = [...new Set((b.meta.tags ?? []).filter((t) => t !== from).concat(to))]
      await patchMeta([b.id], { tags })
    }
    push(`Renamed #${from} to #${to} on ${targets.length} bookmark${targets.length === 1 ? '' : 's'}.`, 'success')
  }

  const remove = async (tag: string) => {
    const targets = tagBookmarks(tag)
    for (const b of targets) {
      await patchMeta([b.id], { tags: (b.meta.tags ?? []).filter((t) => t !== tag) })
    }
    push(`Removed #${tag} from ${targets.length} bookmark${targets.length === 1 ? '' : 's'}.`, 'success')
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Tags</h1>
        <p className="mt-0.5 text-sm text-muted">
          Tags are yours — SmartMark only reads them, never invents them.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {vocabulary.length === 0 ? (
          <EmptyState
            icon="tag"
            title="No tags yet"
            body="Open any bookmark and add tags, or select several and use the Tags bulk action."
            action={<Button onClick={() => onNavigate({ name: 'library' })}>Go to library</Button>}
          />
        ) : (
          <Card className="divide-y divide-line">
            {vocabulary.map(({ tag, count }) => (
              <div key={tag} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Chip tone="sage">#{tag}</Chip>
                <span className="text-sm text-muted">{count} bookmark{count === 1 ? '' : 's'}</span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" onClick={() => onNavigate({ name: 'tag', id: tag })}>
                    View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setRenaming({ tag, count })
                      setName(tag)
                    }}
                  >
                    Rename
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleting({ tag, count })}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}

        <div className="mt-6">
          <SectionTitle>How tags are used</SectionTitle>
          <ul className="space-y-2 text-sm text-muted">
            {[
              'Search matches tag text, so “#api” finds every tagged bookmark.',
              'Tags keep a bookmark out of the Unorganized list, even without a category.',
              'Renaming a tag updates every bookmark that carries it.',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Icon name="check" size={15} className="mt-0.5 shrink-0 text-sage-deep" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Modal
        open={!!renaming}
        title={`Rename #${renaming?.tag}`}
        onClose={() => setRenaming(null)}
        width={420}
        footer={
          <>
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              onClick={async () => {
                if (renaming) await rename(renaming.tag, name.trim().toLowerCase().replace(/\s+/g, '-'))
                setRenaming(null)
              }}
            >
              Rename
            </Button>
          </>
        }
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <p className="mt-2 text-xs text-muted">Applied to {renaming?.count} bookmark{renaming?.count === 1 ? '' : 's'}.</p>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Remove #${deleting?.tag}?`}
        body={`The tag is removed from ${deleting?.count} bookmark${deleting?.count === 1 ? '' : 's'}. The bookmarks stay.`}
        confirmLabel="Remove tag"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting
          setDeleting(null)
          if (target) void remove(target.tag)
        }}
      />
    </section>
  )
}
