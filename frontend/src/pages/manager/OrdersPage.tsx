import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { orderApi } from '../../api/services'
import { OrderLines, OrderMeta } from '../../components/OrderParts'
import { OrderStatusBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { FilterSelect } from '../../components/ui/FormField'
import { Card, PageHeader } from '../../components/ui/Layout'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import type { Order, OrderStatus } from '../../types'
import { formatDate, formatMoney, nextStatuses, orderStatusLabel } from '../../utils/format'

export default function ManagerOrdersPage() {
  const toast = useToast()
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const query = useDebounce(q)
  const [viewing, setViewing] = useState<Order | null>(null)
  const [pending, setPending] = useState<{ order: Order; next: OrderStatus } | null>(null)
  const [busy, setBusy] = useState(false)

  const orders = useAsync(() => orderApi.managerList({ status, q: query, page, size: 10 }), [status, query, page])

  const apply = async (order: Order, next: OrderStatus) => {
    setBusy(true)
    try {
      await orderApi.updateStatus(order.id, next)
      toast.success(`Order #${order.id} marked ${orderStatusLabel[next].toLowerCase()}`)
      setPending(null)
      orders.reload()
    } catch (e) {
      toast.error(errorMessage(e))
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Orders" description="Review customer orders and move them through fulfilment." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0) }} placeholder="Search customer name or email" label="Search orders" />
          <FilterSelect label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(0) }}>
            <option value="">All statuses</option>
            {(Object.keys(orderStatusLabel) as OrderStatus[]).map((s) => <option key={s} value={s}>{orderStatusLabel[s]}</option>)}
          </FilterSelect>
        </div>
        <DataTable caption="Customer orders" rows={orders.data?.content} loading={orders.loading} error={orders.error} onRetry={orders.reload} rowKey={(o) => o.id}
          emptyTitle="No orders found" emptyDescription="Orders placed by customers appear here."
          columns={[
            { header: 'Order', cell: (o) => <button className="font-medium text-brand-700 hover:underline" onClick={() => setViewing(o)}>#{o.id}</button> },
            { header: 'Customer', cell: (o) => <div><p className="text-slate-900">{o.customer.fullName}</p><p className="text-xs text-slate-500">{o.customer.email}</p></div> },
            { header: 'Placed', cell: (o) => formatDate(o.createdAt) },
            { header: 'Total', align: 'right', cell: (o) => formatMoney(o.totalAmount) },
            { header: 'Status', cell: (o) => <OrderStatusBadge status={o.status} /> },
            { header: 'Update', align: 'right', cell: (o) => nextStatuses[o.status].length === 0 ? <span className="text-xs text-slate-400">Final</span> : (
              <div className="flex justify-end gap-1">
                {nextStatuses[o.status].map((n) => (
                  <Button key={n} size="sm" variant={n === 'CANCELLED' ? 'danger' : 'secondary'} onClick={() => setPending({ order: o, next: n })} aria-label={`Mark order ${o.id} as ${orderStatusLabel[n]}`}>{n === 'CANCELLED' ? 'Cancel' : orderStatusLabel[n]}</Button>
                ))}
              </div>
            ) },
          ]} />
        {orders.data && <Pagination page={orders.data.page} totalPages={orders.data.totalPages} totalElements={orders.data.totalElements} onPage={setPage} />}
      </Card>
      {viewing && <Modal title={`Order #${viewing.id}`} onClose={() => setViewing(null)}><OrderMeta order={viewing} showCustomer /><OrderLines order={viewing} /></Modal>}
      {pending && (
        <ConfirmDialog danger={pending.next === 'CANCELLED'} loading={busy} title={`Mark order #${pending.order.id} as ${orderStatusLabel[pending.next]}?`}
          confirmLabel={pending.next === 'CANCELLED' ? 'Cancel order' : 'Update status'} onCancel={() => setPending(null)} onConfirm={() => apply(pending.order, pending.next)}
          message={pending.next === 'CANCELLED' ? 'The reserved stock will be returned to inventory. This cannot be undone.' : 'The customer will see the new status in their order history.'} />
      )}
    </>
  )
}
