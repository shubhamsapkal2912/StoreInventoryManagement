import type { Movement } from '../types'
import { formatDate, movementLabel } from '../utils/format'
import { DataTable } from './ui/DataTable'

export function MovementsTable({ rows, loading, error, onRetry, showProduct = true }: { rows?: Movement[]; loading?: boolean; error?: string | null; onRetry?: () => void; showProduct?: boolean }) {
  return (
    <DataTable caption="Inventory movements" rows={rows} loading={loading} error={error} onRetry={onRetry} rowKey={(m) => m.id}
      emptyTitle="No movements recorded" emptyDescription="Stock changes will appear here as they happen."
      columns={[
        { header: 'When', cell: (m) => <span className="whitespace-nowrap">{formatDate(m.createdAt)}</span> },
        ...(showProduct ? [{ header: 'Product', cell: (m: Movement) => <div><p className="font-medium text-slate-900">{m.productName}</p><p className="text-xs text-slate-500">{m.sku}</p></div> }] : []),
        { header: 'Type', cell: (m) => movementLabel[m.type] },
        { header: 'Change', align: 'right', cell: (m) => <span className={m.quantityChange > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>{m.quantityChange > 0 ? '+' : ''}{m.quantityChange}</span> },
        { header: 'After', align: 'right', cell: (m) => m.quantityAfter },
        { header: 'Reason / reference', cell: (m) => <span className="text-slate-500">{[m.reason, m.reference].filter(Boolean).join(' · ') || '—'}</span> },
        { header: 'By', cell: (m) => m.createdBy ?? 'System' },
      ]} />
  )
}
