import { AlertTriangle, Boxes, DollarSign, Layers, PackageX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { reportApi } from '../../api/services'
import { MovementsTable } from '../../components/MovementsTable'
import { OrderStatusBadge } from '../../components/ui/Badges'
import { DataTable } from '../../components/ui/DataTable'
import { ErrorState, Spinner } from '../../components/ui/Feedback'
import { Card, PageHeader, StatCard } from '../../components/ui/Layout'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatMoney } from '../../utils/format'

export default function ManagerDashboardPage() {
  const { data, loading, error, reload } = useAsync(() => reportApi.dashboard(), [])
  return (
    <>
      <PageHeader title="Dashboard" description="Stock health and recent activity at a glance." />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading || !data ? <Spinner /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total products" value={data.totalProducts} icon={Boxes} />
            <StatCard label="Units in stock" value={data.totalUnits} icon={Layers} tone="sky" />
            <StatCard label="Low stock" value={data.lowStockCount} icon={AlertTriangle} tone="amber" hint="At or below reorder level" />
            <StatCard label="Out of stock" value={data.outOfStockCount} icon={PackageX} tone="red" />
            <StatCard label="Inventory value" value={formatMoney(data.inventoryValue)} icon={DollarSign} tone="emerald" hint="Quantity × current cost price" />
          </div>
          {(data.lowStockCount > 0 || data.outOfStockCount > 0) && (
            <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span><strong>{data.lowStockCount}</strong> low-stock and <strong>{data.outOfStockCount}</strong> out-of-stock products need attention.</span>
              <Link to="/manager/reports" className="font-medium underline">View reports</Link>
            </div>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Recent inventory changes" actions={<Link to="/manager/movements" className="text-sm text-brand-600 hover:underline">View all</Link>}>
              <MovementsTable rows={data.recentMovements} />
            </Card>
            <Card title="Recent customer orders" actions={<Link to="/manager/orders" className="text-sm text-brand-600 hover:underline">Manage</Link>}>
              <DataTable caption="Recent orders" rows={data.recentOrders} rowKey={(o) => o.id} emptyTitle="No orders yet"
                columns={[
                  { header: 'Order', cell: (o) => `#${o.id}` },
                  { header: 'Customer', cell: (o) => o.customer.fullName },
                  { header: 'Placed', cell: (o) => formatDate(o.createdAt) },
                  { header: 'Total', align: 'right', cell: (o) => formatMoney(o.totalAmount) },
                  { header: 'Status', cell: (o) => <OrderStatusBadge status={o.status} /> },
                ]} />
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
