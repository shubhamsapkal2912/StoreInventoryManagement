import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function FullPageSpinner() {
  return <div className="flex h-full min-h-screen items-center justify-center"><Spinner label="Loading…" /></div>
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400"><Inbox className="h-6 w-6" aria-hidden /></div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-3 rounded-full bg-red-50 p-3 text-red-500"><AlertTriangle className="h-6 w-6" aria-hidden /></div>
      <p className="text-sm text-slate-700">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'info'; children: ReactNode }) {
  const cls = kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-sky-200 bg-sky-50 text-sky-800'
  return <div role={kind === 'error' ? 'alert' : 'note'} className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>
}
