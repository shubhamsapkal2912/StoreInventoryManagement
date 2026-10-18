import { useState } from 'react'
import { inventoryApi, productApi } from '../../api/services'
import { MovementsTable } from '../../components/MovementsTable'
import { FilterSelect } from '../../components/ui/FormField'
import { Card, PageHeader } from '../../components/ui/Layout'
import { Pagination } from '../../components/ui/Pagination'
import { useAsync } from '../../hooks/useAsync'
import type { MovementType } from '../../types'
import { movementLabel } from '../../utils/format'

export default function MovementsPage() {
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<MovementType | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)

  const products = useAsync(() => productApi.list({ size: 100, sortBy: 'name', direction: 'asc' }), [])
  const movements = useAsync(() => inventoryApi.movements({ productId, type, from, to, page, size: 15 }), [productId, type, from, to, page])
  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0) }

  return (
    <>
      <PageHeader title="Movement history" description="Immutable audit trail of every stock change." />
      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Filter by product" value={productId} onChange={(e) => change(setProductId)(e.target.value)}>
            <option value="">All products</option>
            {products.data?.content.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Filter by type" value={type} onChange={(e) => change(setType)(e.target.value as MovementType | '')}>
            <option value="">All types</option>
            {(Object.keys(movementLabel) as MovementType[]).map((t) => <option key={t} value={t}>{movementLabel[t]}</option>)}
          </FilterSelect>
          <label className="block text-xs text-slate-500">From<input type="date" value={from} max={to || undefined} onChange={(e) => change(setFrom)(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /></label>
          <label className="block text-xs text-slate-500">To<input type="date" value={to} min={from || undefined} onChange={(e) => change(setTo)(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /></label>
        </div>
        <MovementsTable rows={movements.data?.content} loading={movements.loading} error={movements.error} onRetry={movements.reload} />
        {movements.data && <Pagination page={movements.data.page} totalPages={movements.data.totalPages} totalElements={movements.data.totalElements} onPage={setPage} />}
      </Card>
    </>
  )
}
