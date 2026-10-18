import { useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryApi, reportApi } from '../../api/services'
import { StockBadge } from '../../components/ui/Badges'
import { DataTable } from '../../components/ui/DataTable'
import { FilterSelect } from '../../components/ui/FormField'
import { Card, PageHeader, StatCard } from '../../components/ui/Layout'
import { Pagination } from '../../components/ui/Pagination'
import { useAsync } from '../../hooks/useAsync'
import { formatMoney, orderStatusLabel } from '../../utils/format'
import { Boxes, DollarSign, Layers, Tag } from 'lucide-react'
import type { Product } from '../../types'

type Tab = 'inventory' | 'low' | 'out' | 'orders'
const tabs: { id: Tab; label: string }[] = [
  { id: 'inventory', label: 'Inventory & valuation' },
  { id: 'low', label: 'Low stock' },
  { id: 'out', label: 'Out of stock' },
  { id: 'orders', label: 'Order summary' },
]

function InventoryTab({ categoryId }: { categoryId: string }) {
  const [page, setPage] = useState(0)
  const report = useAsync(() => reportApi.inventory({ categoryId, page, size: 15, sortBy: 'name', direction: 'asc' }), [categoryId, page])
  const r = report.data
  return (
    <>
      <div className="grid gap-4 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={r?.totalProducts ?? '—'} icon={Boxes} />
        <StatCard label="Units on hand" value={r?.totalUnits ?? '—'} icon={Layers} tone="sky" />
        <StatCard label="Stock value (cost)" value={r ? formatMoney(r.totalCostValue) : '—'} icon={DollarSign} tone="emerald" hint="Quantity × current cost price" />
        <StatCard label="Stock value (retail)" value={r ? formatMoney(r.totalRetailValue) : '—'} icon={Tag} tone="amber" hint="Quantity × selling price" />
      </div>
      <DataTable caption="Inventory valuation" rows={r?.items.content} loading={report.loading} error={report.error} onRetry={report.reload} rowKey={(i) => i.productId}
        emptyTitle="No active products" columns={[
          { header: 'Product', cell: (i) => <div><p className="font-medium text-slate-900">{i.name}</p><p className="text-xs text-slate-500">{i.sku}{i.categoryName ? ` · ${i.categoryName}` : ''}</p></div> },
          { header: 'Qty', align: 'right', cell: (i) => i.quantity },
          { header: 'Level', cell: (i) => <StockBadge status={i.stockStatus} /> },
          { header: 'Cost', align: 'right', cell: (i) => formatMoney(i.costPrice) },
          { header: 'Cost value', align: 'right', cell: (i) => formatMoney(i.costValue) },
          { header: 'Retail value', align: 'right', cell: (i) => formatMoney(i.retailValue) },
        ]} />
      {r && <Pagination page={r.items.page} totalPages={r.items.totalPages} totalElements={r.items.totalElements} onPage={setPage} />}
    </>
  )
}

function StockTab({ kind, categoryId }: { kind: 'low' | 'out'; categoryId: string }) {
  const [page, setPage] = useState(0)
  const report = useAsync(() => (kind === 'low' ? reportApi.lowStock : reportApi.outOfStock)({ categoryId, page, size: 15 }), [kind, categoryId, page])
  return (
    <>
      <DataTable<Product> caption={kind === 'low' ? 'Low-stock products' : 'Out-of-stock products'} rows={report.data?.content} loading={report.loading} error={report.error} onRetry={report.reload}
        rowKey={(p) => p.id} emptyTitle={kind === 'low' ? 'No low-stock products' : 'Nothing is out of stock'} emptyDescription="Great – stock levels look healthy."
        columns={[
          { header: 'Product', cell: (p) => <div><Link to={`/manager/products/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700">{p.name}</Link><p className="text-xs text-slate-500">{p.sku}</p></div> },
          { header: 'Category', cell: (p) => p.categoryName ?? '—' },
          { header: 'On hand', align: 'right', cell: (p) => p.quantity },
          { header: 'Reorder at', align: 'right', cell: (p) => p.reorderThreshold },
          { header: 'Action', align: 'right', cell: (p) => <Link className="text-brand-600 hover:underline" to={`/manager/stock?productId=${p.id}`}>Restock</Link> },
        ]} />
      {report.data && <Pagination page={report.data.page} totalPages={report.data.totalPages} totalElements={report.data.totalElements} onPage={setPage} />}
    </>
  )
}

function OrdersTab() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const report = useAsync(() => reportApi.orders({ from, to }), [from, to])
  return (
    <>
      <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-4">
        <label className="block text-xs text-slate-500">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /></label>
        <label className="block text-xs text-slate-500">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /></label>
        <StatCard label="Orders" value={report.data?.totalOrders ?? '—'} icon={Boxes} />
        <StatCard label="Revenue (excl. cancelled)" value={report.data ? formatMoney(report.data.revenue) : '—'} icon={DollarSign} tone="emerald" />
      </div>
      <DataTable caption="Orders by status" rows={report.data?.byStatus} loading={report.loading} error={report.error} onRetry={report.reload} rowKey={(s) => s.status}
        columns={[
          { header: 'Status', cell: (s) => orderStatusLabel[s.status] },
          { header: 'Orders', align: 'right', cell: (s) => s.orders },
          { header: 'Value', align: 'right', cell: (s) => formatMoney(s.total) },
        ]} />
    </>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('inventory')
  const [categoryId, setCategoryId] = useState('')
  const categories = useAsync(() => categoryApi.list(), [])
  return (
    <>
      <PageHeader title="Reports" description="Valuation uses on-hand quantity × the product's current cost price (active products only)."
        actions={tab !== 'orders' ? (
          <FilterSelect label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
        ) : undefined} />
      <div role="tablist" aria-label="Reports" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
        ))}
      </div>
      <Card>
        {tab === 'inventory' && <InventoryTab categoryId={categoryId} />}
        {tab === 'low' && <StockTab kind="low" categoryId={categoryId} />}
        {tab === 'out' && <StockTab kind="out" categoryId={categoryId} />}
        {tab === 'orders' && <OrdersTab />}
      </Card>
      <p className="mt-4 text-sm text-slate-500">Looking for stock history? See <Link className="text-brand-600 hover:underline" to="/manager/movements">movement history</Link>.</p>
    </>
  )
}
