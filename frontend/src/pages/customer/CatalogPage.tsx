import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { cartApi, catalogApi, categoryApi } from '../../api/services'
import { ProductCard } from '../../components/ProductCard'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { FilterSelect } from '../../components/ui/FormField'
import { PageHeader } from '../../components/ui/Layout'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import type { CatalogProduct } from '../../types'

export default function CatalogPage() {
  const toast = useToast()
  const { setCart } = useCart()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState('name:asc')
  const [page, setPage] = useState(0)
  const [addingId, setAddingId] = useState<number | null>(null)
  const query = useDebounce(q)
  const [sortBy, direction] = sort.split(':') as [string, 'asc' | 'desc']

  const categories = useAsync(() => categoryApi.list(), [])
  const products = useAsync(() => catalogApi.list({ q: query, categoryId, page, size: 12, sortBy, direction }), [query, categoryId, sort, page])

  const add = async (p: CatalogProduct) => {
    setAddingId(p.id)
    try {
      setCart(await cartApi.add(p.id, 1))
      toast.success(`${p.name} added to your cart`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setAddingId(null)
    }
  }

  return (
    <>
      <PageHeader title="Catalogue" description="Everything currently available in the store." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Search products" label="Search products" />
        <div className="flex gap-3">
          <FilterSelect label="Filter by category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(0) }}>
            <option value="">All categories</option>
            {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Sort products" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0) }}>
            <option value="name:asc">Name A–Z</option>
            <option value="price:asc">Price low–high</option>
            <option value="price:desc">Price high–low</option>
            <option value="createdAt:desc">Newest</option>
          </FilterSelect>
        </div>
      </div>
      {products.error ? <ErrorState message={products.error} onRetry={products.reload} /> : products.loading && !products.data ? <Spinner /> : products.data && products.data.content.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search term or category." />
      ) : (
        <div className={products.loading ? 'opacity-60' : ''}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.data?.content.map((p) => <ProductCard key={p.id} product={p} onAdd={add} adding={addingId === p.id} />)}
          </div>
          {products.data && <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white"><Pagination page={products.data.page} totalPages={products.data.totalPages} totalElements={products.data.totalElements} onPage={setPage} /></div>}
        </div>
      )}
    </>
  )
}
