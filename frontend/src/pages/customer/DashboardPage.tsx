import { ClipboardList, ShoppingCart, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { catalogApi, orderApi } from '../../api/services'
import { OrderStatusBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { Card, PageHeader, StatCard } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Feedback'
import { ProductCard } from '../../components/ProductCard'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatMoney } from '../../utils/format'

export default function CustomerDashboardPage() {
  const { user } = useAuth()
  const { cart } = useCart()
  const orders = useAsync(() => orderApi.mine({ size: 5 }), [])
  const fresh = useAsync(() => catalogApi.list({ size: 4, sortBy: 'createdAt', direction: 'desc' }), [])
  return (
    <>
      <PageHeader title={`Hello, ${user?.fullName.split(' ')[0] ?? 'there'}`} description="Browse the catalogue, track your orders and manage your details."
        actions={<Link to="/shop/catalog"><Button>Browse catalogue</Button></Link>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Items in cart" value={cart?.totalUnits ?? 0} icon={ShoppingCart} />
        <StatCard label="Cart subtotal" value={formatMoney(cart?.subtotal ?? 0)} icon={Sparkles} tone="emerald" />
        <StatCard label="Orders placed" value={orders.data?.totalElements ?? '—'} icon={ClipboardList} tone="sky" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Recent orders" actions={<Link to="/shop/orders" className="text-sm text-brand-600 hover:underline">View all</Link>}>
          <DataTable caption="Recent orders" rows={orders.data?.content} loading={orders.loading} error={orders.error} onRetry={orders.reload} rowKey={(o) => o.id}
            emptyTitle="No orders yet" emptyDescription="Your orders will show up here."
            columns={[
              { header: 'Order', cell: (o) => <Link className="font-medium text-brand-700 hover:underline" to={`/shop/orders/${o.id}`}>#{o.id}</Link> },
              { header: 'Placed', cell: (o) => formatDate(o.createdAt) },
              { header: 'Total', align: 'right', cell: (o) => formatMoney(o.totalAmount) },
              { header: 'Status', cell: (o) => <OrderStatusBadge status={o.status} /> },
            ]} />
        </Card>
        <Card title="New in store">
          {fresh.loading ? <Spinner /> : (
            <div className="grid gap-4 p-4 sm:grid-cols-2">{fresh.data?.content.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </Card>
      </div>
    </>
  )
}
