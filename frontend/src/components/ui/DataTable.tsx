import type { ReactNode } from 'react'
import { EmptyState, ErrorState, Spinner } from './Feedback'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
  align?: 'right'
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  caption: string
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, emptyTitle = 'Nothing here yet', emptyDescription, emptyAction, caption }: Props<T>) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (loading && !rows) return <Spinner />
  if (rows && rows.length === 0 && !loading) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  return (
    <div className={`overflow-x-auto ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows?.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-slate-50/60">
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-3 align-middle text-slate-700 ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
