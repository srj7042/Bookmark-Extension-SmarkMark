import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Icon } from './Icons.tsx'
import type { Toast } from '../lib/hooks.ts'
import { accentFor } from '../lib/categorize.ts'
import { faviconUrl } from '../lib/bookmarks.ts'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/* ---------------------------------------------------------------- buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'sage'
  size?: 'sm' | 'md'
  icon?: string
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap'
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm' }
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
    secondary: 'bg-surface text-ink border border-line hover:bg-surface2',
    ghost: 'text-ink hover:bg-surface2',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    sage: 'bg-sage text-[#20494a] hover:brightness-97 font-semibold',
  }
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  icon,
  className,
  active,
  size = 18,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: string; active?: boolean; size?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-muted transition-colors hover:bg-surface2 hover:text-ink',
        active && 'border-line bg-surface text-brand',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

/* ------------------------------------------------------------------ cards */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-xl2 border border-line bg-surface shadow-card', className)} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">{children}</h2>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ chips */

export function Chip({
  children,
  tone = 'neutral',
  className,
  ...rest
}: { children: ReactNode; tone?: 'neutral' | 'sky' | 'sage' | 'brand' } & React.HTMLAttributes<HTMLSpanElement>) {
  const tones = {
    neutral: 'bg-surface2 text-muted border-line',
    sky: 'bg-sky/12 text-[#2f6a86] border-sky/35 dark:text-sky',
    sage: 'bg-sage/45 text-[#295f59] border-sage dark:bg-sage/15 dark:text-sage',
    brand: 'bg-brand/10 text-brand border-brand/25 dark:text-sky',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', tones[tone], className)} {...rest}>
      {children}
    </span>
  )
}

const ACCENT_DOT: Record<string, string> = {
  blue: 'bg-brand',
  sky: 'bg-sky',
  sage: 'bg-sage-deep',
}

export function AccentDot({ category }: { category: string }) {
  return <span className={cx('inline-block h-2 w-2 rounded-full', ACCENT_DOT[accentFor(category)])} aria-hidden="true" />
}

/* --------------------------------------------------------------- favicons */

export function Favicon({ url, size = 20, className }: { url: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const hasApi = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL
  if (failed || !hasApi) {
    return (
      <span
        className={cx('inline-flex items-center justify-center rounded-md bg-surface2 text-[11px] font-semibold text-muted', className)}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 1).toUpperCase() || '?'}
      </span>
    )
  }
  return (
    <img
      src={faviconUrl(url, size <= 20 ? 32 : 64)}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      className={cx('shrink-0 rounded-md', className)}
      onError={() => setFailed(true)}
    />
  )
}

/* ---------------------------------------------------------------- inputs */

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-sky focus:outline-none',
        className,
      )}
      {...rest}
    />
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx('w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink placeholder:text-muted focus:border-sky focus:outline-none', className)}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx('h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-sky focus:outline-none', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-brand' : 'bg-line')}
    >
      <span className={cx('absolute h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
    </button>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex items-start justify-between gap-6 py-3.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
      <span className="shrink-0 pt-0.5">{children}</span>
    </label>
  )
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input,textarea,button,select')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#101519]/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sm-rise relative w-full overflow-hidden rounded-xl2 border border-line bg-surface shadow-pop"
        style={{ maxWidth: width }}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <IconButton label="Close" icon="close" onClick={onClose} />
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-line bg-surface2 px-5 py-3.5">{footer}</footer> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      width={440}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{body}</p>
    </Modal>
  )
}

/* --------------------------------------------------------------- feedback */

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cx('inline-block animate-spin rounded-full border-2 border-sky/35 border-t-sky', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl2 border border-line bg-surface2" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'sparkle', title, body, action }: { icon?: string; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-line bg-surface2/60 px-6 py-14 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/45 text-[#295f59] dark:bg-sage/15 dark:text-sage">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl2 border border-red-300/60 bg-red-50/70 px-5 py-6 dark:border-red-500/30 dark:bg-red-500/10">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-red-600 dark:text-red-400">
          <Icon name="alert" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Something went wrong</h3>
          <p className="mt-1 text-sm break-words text-red-700/90 dark:text-red-200/85">{message}</p>
        </div>
        {onRetry ? (
          <Button size="sm" icon="refresh" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const tones = {
    info: 'bg-surface text-ink border-line',
    success: 'bg-[#f4fbf9] text-[#1f4f4a] border-sage dark:bg-[#16302e] dark:text-sage dark:border-sage/30',
    warn: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30',
    error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-500/30',
  }
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={cx('sm-rise pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl2 border px-4 py-3 shadow-pop', tones[t.tone])}>
          <span className="min-w-0 flex-1 text-sm">{t.message}</span>
          {t.action ? (
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold underline underline-offset-2 hover:no-underline"
              onClick={() => {
                onDismiss(t.id)
                void t.action?.run()
              }}
            >
              {t.action.label}
            </button>
          ) : null}
          <IconButton label="Dismiss" icon="close" size={15} className="h-7 w-7" onClick={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  )
}

/** Confidence pill + "apply or correct" controls — the promise that every suggestion is editable. */
export function SuggestionRow({
  category,
  confidence,
  reason,
  onKeep,
  onApply,
}: {
  category: string
  confidence: number
  reason: string
  onKeep: () => void
  onApply: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sage/60 bg-sage/25 px-3 py-2 dark:border-sage/25 dark:bg-sage/10">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#295f59] dark:text-sage">
        <Icon name="sparkle" size={15} />
        SmartMark suggests {category}
      </span>
      <span className="text-xs text-[#3d706a]/85 dark:text-sage/80">{Math.round(confidence * 100)}% · {reason}</span>
      <span className="ml-auto flex gap-1.5">
        <Button size="sm" variant="sage" onClick={onApply}>
          Apply
        </Button>
        <Button size="sm" onClick={onKeep}>
          Keep as is
        </Button>
      </span>
    </div>
  )
}
