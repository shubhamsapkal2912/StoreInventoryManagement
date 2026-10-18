import { Pencil, SlidersHorizontal } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { inventoryApi, productApi } from '../../api/services'
import { MovementsTable } from '../../components/MovementsTable'
import { ActiveBadge, StockBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { ErrorState, Spinner } from '../../components/ui/Feedback'
import { Card, PageHeader } from '../../components/ui/Layout'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatMoney } from '../../utils/format'

export default function ProductDetailsPage() {
  const { id } = useParams()
  const product = useAsync(() => productApi.get(id!), [id])
  const movements = useAsync(() => inventoryApi.movements({ productId: id, size: 10 }), [id])
  const p = product.data

  if (product.error) return <ErrorState message={product.error} onRetry={product.reload} />
  if (product.loading || !p) return <Spinner />

  const fields: [string, React.ReactNode][] = [
    ['SKU', p.sku], ['Barcode', p.barcode ?? '—'], ['Category', p.categoryName ?? 'Uncategorised'],
    ['Selling price', formatMoney(p.price)], ['Cost price', formatMoney(p.costPrice)],
    ['Margin', formatMoney(p.price - p.costPrice)], ['Reorder threshold', p.reorderThreshold],
    ['Created', formatDate(p.createdAt)], ['Last updated', formatDate(p.updatedAt)],
  ]

  return (
    <>
      <PageHeader title={p.name} description={p.description}
        actions={<>
          <Link to={`/manager/stock?productId=${p.id}`}><Button variant="secondary"><SlidersHorizontal className="h-4 w-4" aria-hidden />Adjust stock</Button></Link>
          <Link to={`/manager/products/${p.id}/edit`}><Button><Pencil className="h-4 w-4" aria-hidden />Edit</Button></Link>
        </>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1" title="Stock">
          <div className="space-y-3 p-4">
            <p className="text-4xl font-bold text-slate-900">{p.quantity}<span className="ml-2 text-sm font-normal text-slate-500">units</span></p>
            <div className="flex gap-2"><StockBadge status={p.stockStatus} /><ActiveBadge active={p.active} /></div>
          </div>
        </Card>
        <Card className="lg:col-span-2" title="Details">
          <dl className="grid gap-4 p-4 text-sm sm:grid-cols-3">
            {fields.map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="mt-0.5 font-medium text-slate-900">{v}</dd></div>)}
          </dl>
        </Card>
      </div>
      <Card className="mt-6" title="Recent movements"><MovementsTable rows={movements.data?.content} loading={movements.loading} error={movements.error} onRetry={movements.reload} showProduct={false} /></Card>
    </>
  )
}
