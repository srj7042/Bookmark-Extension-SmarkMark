import { useMemo, useRef, useState } from 'react'
import type { Meta } from '../lib/types.ts'
import type { Library, Toast } from '../lib/hooks.ts'
import type { ExportBookmark, ExportFolder } from '../lib/importexport.ts'
import { buildJsonExport, buildNetscapeHtml, download, parseJsonExport, parseNetscapeHtml } from '../lib/importexport.ts'
import { create, ensureFolderPath, openOptions, smartMarkRoot } from '../lib/bookmarks.ts'
import { clearUserData } from '../lib/storage.ts'
import { normalizeUrl, titleFromUrl } from '../lib/url.ts'
import { Button, Card, ConfirmDialog, Field, SectionTitle, Spinner, Switch } from '../components/ui.tsx'
import { FolderSelect } from '../components/BookmarkDialogs.tsx'
import { Icon } from '../components/Icons.tsx'

function toExport(b: { title: string; url: string; dateAdded?: number; meta: Meta }): ExportBookmark {
  return { title: b.title, url: b.url, dateAdded: b.dateAdded, tags: b.meta.tags, note: b.meta.note, favorite: b.meta.favorite, category: b.meta.category }
}

export function ToolsView({
  library,
  push,
}: {
  library: Library
  push: (m: string, tone?: Toast['tone'], action?: Toast['action']) => number
}) {
  const { bookmarks, folders, reload, refreshMeta } = library
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [targetFolder, setTargetFolder] = useState('2')
  const [report, setReport] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const { tree, loose } = useMemo(() => {
    const childrenOf = (parentId: string) => folders.filter((f) => f.parentId === parentId)
    const make = (folderId: string): ExportFolder => {
      const folder = folders.find((f) => f.id === folderId)!
      return {
        title: folder.title,
        children: childrenOf(folderId).map((c) => make(c.id)),
        bookmarks: bookmarks.filter((b) => b.parentId === folderId).map(toExport),
      }
    }
    const top = folders.filter((f) => f.depth === 0).map((f) => make(f.id))
    return { tree: top, loose: bookmarks.filter((b) => !folders.some((f) => f.id === b.parentId)).map(toExport) }
  }, [bookmarks, folders])

  const stamp = new Date().toISOString().slice(0, 10)

  const runImport = async (file: File) => {
    setImporting(true)
    setReport(null)
    try {
      const text = await file.text()
      const looksJson = /\.json$/i.test(file.name) || /^\s*[[{]/.test(text)
      const parsed = looksJson ? parseJsonExport(text) : parseNetscapeHtml(text)

      const seen = new Set(bookmarks.map((b) => normalizeUrl(b.url)))
      const metaPatch: Record<string, Meta> = {}
      let created = 0
      let skipped = 0

      const addOne = async (item: ExportBookmark, parentId: string) => {
        const key = normalizeUrl(item.url)
        if (skipDuplicates && seen.has(key)) {
          skipped += 1
          return
        }
        const node = await create({ parentId, title: item.title || titleFromUrl(item.url), url: item.url })
        seen.add(key)
        created += 1
        if (item.tags?.length || item.note || item.favorite || item.category) {
          metaPatch[node.id] = { tags: item.tags, note: item.note, favorite: item.favorite, category: item.category }
        }
      }

      for (const folder of parsed.folders) {
        const folderId = await ensureFolderPath(folder.path, targetFolder)
        for (const item of folder.bookmarks) await addOne(item, folderId)
      }
      for (const item of parsed.loose) await addOne(item, targetFolder)

      if (Object.keys(metaPatch).length > 0) await refreshMeta((meta) => ({ ...meta, ...metaPatch }))
      await reload()

      const warnings = parsed.warnings.length ? ` ${parsed.warnings.length} entr${parsed.warnings.length === 1 ? 'y was' : 'ies were'} skipped.` : ''
      setReport(`Imported ${created} bookmark${created === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''}.${warnings}`)
      push(`Import finished: ${created} added.`, 'success')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed.'
      setReport(message)
      push(message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Import & export</h1>
        <p className="mt-0.5 text-sm text-muted">Everything happens locally — files are read and written in your browser only.</p>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
        <div>
          <SectionTitle hint="Nothing is uploaded">Export a backup</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="download" size={16} /> SmartMark JSON
              </div>
              <p className="text-xs text-muted">Full fidelity: folders, tags, notes, favorites and confirmed categories.</p>
              <Button
                variant="primary"
                className="mt-auto"
                onClick={() => {
                  download(`smartmark-${stamp}.json`, buildJsonExport(tree, loose), 'application/json')
                  push('JSON backup downloaded.', 'success')
                }}
              >
                Download JSON
              </Button>
            </Card>
            <Card className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="download" size={16} /> Netscape HTML
              </div>
              <p className="text-xs text-muted">The classic format Chrome, Firefox and Safari can all import directly.</p>
              <Button
                className="mt-auto"
                onClick={() => {
                  download(`smartmark-${stamp}.html`, buildNetscapeHtml(tree, loose), 'text/html')
                  push('HTML export downloaded.', 'success')
                }}
              >
                Download HTML
              </Button>
            </Card>
          </div>
        </div>

        <div>
          <SectionTitle>Import</SectionTitle>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon="upload" disabled={importing} onClick={() => fileRef.current?.click()}>
                {importing ? <Spinner size={15} /> : null}
                {importing ? 'Importing…' : 'Choose a file'}
              </Button>
              <span className="text-sm text-muted">Accepts SmartMark JSON, a Chrome bookmark tree, or Netscape HTML.</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.html,.htm,application/json,text/html"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void runImport(file)
              }}
            />
            <div className="mt-3 grid gap-3 border-t border-line pt-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block pt-2 text-xs font-semibold text-muted uppercase">Import into</span>
                <FolderSelect folders={folders} value={targetFolder} onChange={setTargetFolder} className="w-full" />
              </label>
              <div className="pt-2">
                <Field label="Skip duplicates" hint="Matches existing bookmarks by normalized URL.">
                  <Switch checked={skipDuplicates} onChange={setSkipDuplicates} label="Skip duplicates" />
                </Field>
              </div>
            </div>
            {report ? <p className="mt-2 rounded-xl bg-surface2 px-3 py-2 text-sm text-ink">{report}</p> : null}
          </Card>
        </div>

        <div>
          <SectionTitle>Folder management</SectionTitle>
          <Card className="divide-y divide-line">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">Create the SmartMark folder</p>
                <p className="text-xs text-muted">Adds a top-level “SmartMark” folder, used when SmartMark files categorized bookmarks.</p>
              </div>
              <Button
                onClick={async () => {
                  const id = await smartMarkRoot()
                  await reload()
                  push(`SmartMark folder ready (id ${id}).`, 'success')
                }}
              >
                Create folder
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">Startup & shortcuts</p>
                <p className="text-xs text-muted">Change the keyboard bindings Chrome has given SmartMark.</p>
              </div>
              <Button onClick={() => void openOptions()}>Open options page</Button>
            </div>
          </Card>
        </div>

        <div>
          <SectionTitle>Reset SmartMark data</SectionTitle>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">Clear tags, notes, favorites and categories</p>
              <p className="text-xs text-muted">Bookmarks themselves are never touched — only SmartMark’s own metadata.</p>
            </div>
            <Button variant="danger" icon="trash" onClick={() => setResetting(true)}>
              Reset metadata
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={resetting}
        title="Clear all SmartMark metadata?"
        body="Tags, notes, favorites, collections and confirmed categories are deleted. Your Chrome bookmarks stay exactly where they are. This cannot be undone."
        confirmLabel="Clear metadata"
        onCancel={() => setResetting(false)}
        onConfirm={async () => {
          setResetting(false)
          await clearUserData()
          await reload()
          push('SmartMark metadata cleared.', 'warn')
        }}
      />
    </section>
  )
}
