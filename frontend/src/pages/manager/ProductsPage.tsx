import { Eye, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { categoryApi, productApi } from '../../api/services'
import { ActiveBadge, StockBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { FilterSelect } from '../../components/ui/FormField'
import { Card, PageHeader } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import type { Product, StockStatus } from '../../types'
import { formatMoney } from '../../utils/format'

export default function ProductsPage() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stockStatus, setStockStatus] = useState<StockStatus | ''>('')
  const [active, setActive] = useState<'' | 'true' | 'false'>('')
  const [sort, setSort] = useState('name:asc')
  const [page, setPage] = useState(0)
  const [toDeactivate, setToDeactivate] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const query = useDebounce(q)

  const categories = useAsync(() => categoryApi.list(), [])
  const [sortBy, direction] = sort.split(':') as [string, 'asc' | 'desc']
  const products = useAsync(
    () => productApi.list({ q: query, categoryId, stockStatus, active: active === '' ? '' : active === 'true', page, size: 10, sortBy, direction }),
    [query, categoryId, stockStatus, active, sort, page],
  )

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0) }

  const confirmDeactivate = async () => {
    if (!toDeactivate) return
    setBusy(true)
    try {
      await productApi.deactivate(toDeactivate.id)
      toast.success(`"${toDeactivate.name}" was deactivated`)
      setToDeactivate(null)
      products.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Products" description="Create, edit and monitor your catalogue."
        actions={<Link to="/manager/products/new"><Button><Plus className="h-4 w-4" aria-hidden />Add product</Button></Link>} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={reset(setQ)} placeholder="Search name, SKU or barcode" label="Search products" />
          <div className="grid flex-1 grid-cols-2 gap-3 lg:flex lg:justify-end">
            <FilterSelect label="Filter by category" value={categoryId} onChange={(e) => reset(setCategoryId)(e.target.value)}>
              <option value="">All categories</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </FilterSelect>
            <FilterSelect label="Filter by stock status" value={stockStatus} onChange={(e) => reset(setStockStatus)(e.target.value as StockStatus | '')}>
              <option value="">Any stock level</option>
              <option value="IN_STOCK">In stock</option>
              <option value="LOW_STOCK">Low stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </FilterSelect>
            <FilterSelect label="Filter by status" value={active} onChange={(e) => reset(setActive)(e.target.value as '' | 'true' | 'false')}>
              <option value="">Active & inactive</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </FilterSelect>
            <FilterSelect label="Sort products" value={sort} onChange={(e) => reset(setSort)(e.target.value)}>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
              <option value="price:asc">Price low–high</option>
              <option value="price:desc">Price high–low</option>
              <option value="quantity:asc">Stock low–high</option>
              <option value="quantity:desc">Stock high–low</option>
              <option value="createdAt:desc">Newest</option>
            </FilterSelect>
          </div>
        </div>
        <DataTable caption="Products" rows={products.data?.content} loading={products.loading} error={products.error} onRetry={products.reload}
          rowKey={(p) => p.id} emptyTitle="No products found" emptyDescription="Try changing your search or filters, or add a new product."
          columns={[
            { header: 'Product', cell: (p) => <div><Link to={`/manager/products/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700">{p.name}</Link><p className="text-xs text-slate-500">{p.sku}{p.categoryName ? ` · ${p.categoryName}` : ''}</p></div> },
            { header: 'Price', align: 'right', cell: (p) => formatMoney(p.price) },
            { header: 'Cost', align: 'right', cell: (p) => formatMoney(p.costPrice) },
            { header: 'Stock', align: 'right', cell: (p) => <span className="font-medium">{p.quantity}</span> },
            { header: 'Level', cell: (p) => <StockBadge status={p.stockStatus} /> },
            { header: 'Status', cell: (p) => <ActiveBadge active={p.active} /> },
            { header: 'Actions', align: 'right', cell: (p) => (
              <div className="flex justify-end gap-1">
                <Link to={`/manager/products/${p.id}`} aria-label={`View ${p.name}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></Link>
                <Link to={`/manager/products/${p.id}/edit`} aria-label={`Edit ${p.name}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>
                <Link to={`/manager/stock?productId=${p.id}`} aria-label={`Adjust stock for ${p.name}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><SlidersHorizontal className="h-4 w-4" /></Link>
                {p.active && <button onClick={() => setToDeactivate(p)} aria-label={`Deactivate ${p.name}`} className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ) },
          ]} />
        {products.data && <Pagination page={products.data.page} totalPages={products.data.totalPages} totalElements={products.data.totalElements} onPage={setPage} />}
      </Card>
      {toDeactivate && (
        <ConfirmDialog danger title="Deactivate product" confirmLabel="Deactivate" loading={busy} onConfirm={confirmDeactivate} onCancel={() => setToDeactivate(null)}
          message={<>“{toDeactivate.name}” will be hidden from customers. Its order and stock history is kept, and you can reactivate it by editing the product.</>} />
      )}
    </>
  )
}
