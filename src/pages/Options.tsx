import { useState } from 'react'
import { useLibrary, useSettings, useToasts } from '../lib/hooks.ts'
import { SettingsView } from '../views/Settings.tsx'
import { ToolsView } from '../views/Tools.tsx'
import { Icon } from '../components/Icons.tsx'
import { Toaster, cx } from '../components/ui.tsx'

type Tab = 'preferences' | 'data'

export function Options() {
  const { settings, update, ready } = useSettings()
  const library = useLibrary()
  const { toasts, push, dismiss } = useToasts()
  const [tab, setTab] = useState<Tab>('preferences')

  return (
    <div className="min-h-full bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <Icon name="bookmark" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-semibold tracking-tight text-ink">SmartMark options</h1>
            <p className="text-xs text-muted">Everything is stored locally on this device.</p>
          </div>
          <nav className="flex gap-1 rounded-xl border border-line p-0.5" aria-label="Options sections">
            {(
              [
                { id: 'preferences', label: 'Preferences' },
                { id: 'data', label: 'Data' },
              ] as Array<{ id: Tab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={cx('rounded-lg px-3 py-1.5 text-[13px]', tab === t.id ? 'bg-brand text-white' : 'text-muted hover:text-ink')}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-6">
        {!ready ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : tab === 'preferences' ? (
          <SettingsView settings={settings} update={update} library={library} push={push} standalone />
        ) : (
          <ToolsView library={library} push={push} />
        )}
      </main>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
