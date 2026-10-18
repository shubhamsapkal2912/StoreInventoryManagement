import { useState } from 'react'
import { Link } from 'react-router-dom'
import { orderApi } from '../../api/services'
import { OrderStatusBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { Card, PageHeader } from '../../components/ui/Layout'
import { Pagination } from '../../components/ui/Pagination'
import { useAsync } from '../../hooks/useAsync'
import { formatDate, formatMoney } from '../../utils/format'

export default function CustomerOrdersPage() {
  const [page, setPage] = useState(0)
  const orders = useAsync(() => orderApi.mine({ page, size: 10 }), [page])
  return (
    <>
      <PageHeader title="My orders" description="Everything you have ordered, newest first." />
      <Card>
        <DataTable caption="My orders" rows={orders.data?.content} loading={orders.loading} error={orders.error} onRetry={orders.reload} rowKey={(o) => o.id}
          emptyTitle="You have not placed any orders" emptyDescription="When you do, they will appear here." emptyAction={<Link to="/shop/catalog"><Button>Browse catalogue</Button></Link>}
          columns={[
            { header: 'Order', cell: (o) => <Link className="font-medium text-brand-700 hover:underline" to={`/shop/orders/${o.id}`}>#{o.id}</Link> },
            { header: 'Placed', cell: (o) => formatDate(o.createdAt) },
            { header: 'Items', align: 'right', cell: (o) => o.items.reduce((n, i) => n + i.quantity, 0) },
            { header: 'Total', align: 'right', cell: (o) => formatMoney(o.totalAmount) },
            { header: 'Status', cell: (o) => <OrderStatusBadge status={o.status} /> },
          ]} />
        {orders.data && <Pagination page={orders.data.page} totalPages={orders.data.totalPages} totalElements={orders.data.totalElements} onPage={setPage} />}
      </Card>
    </>
  )
}
