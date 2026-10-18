import { useEffect, useState } from 'react'
import type { Settings, SortKey, Theme } from '../lib/types.ts'
import type { Library, Toast } from '../lib/hooks.ts'
import { CATEGORIES } from '../lib/categorize.ts'
import { getStorageUsage } from '../lib/storage.ts'
import { Button, Card, Chip, Field, IconButton, Input, SectionTitle, Select, Switch, cx } from '../components/ui.tsx'
import { FolderSelect } from '../components/BookmarkDialogs.tsx'
import { Icon } from '../components/Icons.tsx'

export function SettingsView({
  settings,
  update,
  library,
  push,
  standalone = false,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
  library: Library
  push: (m: string, tone?: Toast['tone'], action?: Toast['action']) => number
  standalone?: boolean
}) {
  const [ruleCategory, setRuleCategory] = useState(CATEGORIES[0] as string)
  const [rulePattern, setRulePattern] = useState('')
  const [ruleMatch, setRuleMatch] = useState<'domain' | 'keyword'>('domain')
  const [commands, setCommands] = useState<chrome.commands.Command[]>([])
  const [usage, setUsage] = useState<number | null>(null)

  useEffect(() => {
    // Read-only diagnostics: Chrome's own shortcut list and our storage size.
    void chrome.commands.getAll().then(setCommands)
    void getStorageUsage().then(setUsage)
  }, [])

  const categoryNames = [...new Set([...CATEGORIES, ...settings.customRules.map((r) => r.category)])]

  return (
    <section className={cx('flex min-h-0 flex-1 flex-col', standalone && 'mx-auto w-full max-w-2xl')}>
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">Preferences live in chrome.storage.local on this device.</p>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-8">
        <div>
          <SectionTitle>Appearance</SectionTitle>
          <Card className="px-4 py-1">
            <Field label="Theme" hint="System follows your OS setting.">
              <div className="flex gap-1 rounded-xl border border-line p-0.5">
                {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => void update({ theme: t })}
                    aria-pressed={settings.theme === t}
                    className={cx(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] capitalize',
                      settings.theme === t ? 'bg-brand text-white' : 'text-muted hover:text-ink',
                    )}
                  >
                    <Icon name={t === 'dark' ? 'moon' : t === 'light' ? 'sun' : 'settings'} size={14} />
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Default layout" hint="List is denser, grid shows bigger favicons.">
              <div className="flex gap-1 rounded-xl border border-line p-0.5">
                {(['list', 'grid'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => void update({ density: d })}
                    aria-pressed={settings.density === d}
                    className={cx('rounded-lg px-3 py-1.5 text-[13px] capitalize', settings.density === d ? 'bg-brand text-white' : 'text-muted hover:text-ink')}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </Card>
        </div>

        <div>
          <SectionTitle>Saving & organizing</SectionTitle>
          <Card className="px-4 py-1">
            <div className="py-3.5">
              <p className="text-sm font-medium text-ink">Default folder for new saves</p>
              <p className="mt-0.5 mb-2 text-xs text-muted">Used by the toolbar button and the Ctrl+Shift+S shortcut.</p>
              <FolderSelect folders={library.folders} value={settings.defaultFolderId || '2'} onChange={(id) => void update({ defaultFolderId: id })} className="w-full" />
            </div>
            <Field label="Show category suggestions" hint="Turn off to base categories only on what you have confirmed.">
              <Switch checked={settings.autoCategorize} onChange={(v) => void update({ autoCategorize: v })} label="Show category suggestions" />
            </Field>
            <Field label="Confirm before deleting" hint="Deletes are undoable either way, from the toast.">
              <Switch checked={settings.confirmDestructive} onChange={(v) => void update({ confirmDestructive: v })} label="Confirm before deleting" />
            </Field>
            <Field label="Default sort">
              <Select value={settings.sort} onChange={(e) => void update({ sort: e.target.value as SortKey })}>
                <option value="dateAdded">Recently added</option>
                <option value="title">Title A–Z</option>
                <option value="domain">Site A–Z</option>
                <option value="recent">Recently opened</option>
              </Select>
            </Field>
          </Card>
        </div>

        <div>
          <SectionTitle hint="Your rules beat the built-in heuristics">Custom category rules</SectionTitle>
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[9rem] flex-1">
                <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Category</span>
                <Select value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} className="w-full">
                  {categoryNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="min-w-[9rem] flex-1">
                <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Match</span>
                <Select value={ruleMatch} onChange={(e) => setRuleMatch(e.target.value as 'domain' | 'keyword')} className="w-full">
                  <option value="domain">Domain contains</option>
                  <option value="keyword">Title/URL contains</option>
                </Select>
              </label>
              <label className="min-w-[9rem] flex-1">
                <span className="mb-1.5 block text-xs font-semibold text-muted uppercase">Pattern</span>
                <Input value={rulePattern} onChange={(e) => setRulePattern(e.target.value)} placeholder="linear.app" />
              </label>
              <Button
                variant="primary"
                disabled={!rulePattern.trim()}
                onClick={async () => {
                  await update({ customRules: [...settings.customRules, { category: ruleCategory, pattern: rulePattern.trim(), matchOn: ruleMatch }] })
                  setRulePattern('')
                  push('Rule added. Matching bookmarks update immediately.', 'success')
                }}
              >
                Add rule
              </Button>
            </div>
            {settings.customRules.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-line pt-3">
                {settings.customRules.map((rule, i) => (
                  <li key={`${rule.category}-${rule.pattern}-${i}`} className="flex items-center gap-2">
                    <Chip tone="sky">{rule.category}</Chip>
                    <span className="text-sm text-muted">
                      {rule.matchOn === 'domain' ? 'domain' : 'text'} contains <code className="rounded bg-surface2 px-1.5 py-0.5 text-xs text-ink">{rule.pattern}</code>
                    </span>
                    <IconButton
                      label="Remove rule"
                      icon="close"
                      className="ml-auto"
                      onClick={() => void update({ customRules: settings.customRules.filter((_, j) => j !== i) })}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>

        <div>
          <SectionTitle>Keyboard shortcuts</SectionTitle>
          <Card className="divide-y divide-line">
            {[
              { keys: ['Ctrl', 'Shift', 'S'], label: 'Save the current page to SmartMark' },
              { keys: ['Ctrl', 'Shift', 'D'], label: 'Open the SmartMark dashboard' },
              { keys: ['Ctrl', 'K'], label: 'Focus search (inside SmartMark)' },
              { keys: ['Esc'], label: 'Clear the current selection' },
              { keys: ['/'], label: 'Jump to search' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 text-sm text-ink">{row.label}</span>
                <span className="flex gap-1">
                  {row.keys.map((k) => (
                    <kbd key={k} className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 text-[11px] text-muted">
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
            {commands.length > 0 ? (
              <div className="px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-muted uppercase">Actual bindings</p>
                <ul className="space-y-1.5">
                  {commands.map((c) => (
                    <li key={c.name} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate text-muted">{c.description || c.name}</span>
                      <kbd className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 text-[11px] text-ink">{c.shortcut || 'unassigned'}</kbd>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  Change these at <code className="text-ink">chrome://extensions/shortcuts</code>.
                </p>
              </div>
            ) : null}
          </Card>
        </div>

        <div>
          <SectionTitle>Privacy & storage</SectionTitle>
          <Card className="space-y-3 p-4">
            <p className="flex items-start gap-2 text-sm text-muted">
              <Icon name="check" size={16} className="mt-0.5 shrink-0 text-sage-deep" />
              SmartMark has no server, no account and no analytics. Categorization runs entirely on this device and bookmark data is never transmitted.
            </p>
            <p className="flex items-start gap-2 text-sm text-muted">
              <Icon name="info" size={16} className="mt-0.5 shrink-0 text-sky" />
              Requested permissions: <code className="text-ink">bookmarks</code> (read/write your bookmarks),{' '}
              <code className="text-ink">storage</code> (preferences and metadata), <code className="text-ink">activeTab</code> (read the current page when you
              ask us to save it), <code className="text-ink">favicon</code> (show site icons from Chrome’s local cache).
            </p>
            <p className="text-sm text-muted">
              Local storage used: <strong className="text-ink">{usage === null ? '—' : `${(usage / 1024).toFixed(1)} KB`}</strong> · {library.bookmarks.length} bookmarks indexed
            </p>
          </Card>
        </div>
      </div>
    </section>
  )
}
