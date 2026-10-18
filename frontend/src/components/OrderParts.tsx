import type { Order } from '../types'
import { formatDate, formatMoney } from '../utils/format'
import { OrderStatusBadge } from './ui/Badges'
import { DataTable } from './ui/DataTable'

export function OrderLines({ order }: { order: Order }) {
  return (
    <>
      <DataTable caption={`Items in order ${order.id}`} rows={order.items} rowKey={(i) => i.productId}
        columns={[
          { header: 'Product', cell: (i) => <div><p className="font-medium text-slate-900">{i.productName}</p><p className="text-xs text-slate-500">{i.sku}</p></div> },
          { header: 'Unit price', align: 'right', cell: (i) => formatMoney(i.unitPrice) },
          { header: 'Qty', align: 'right', cell: (i) => i.quantity },
          { header: 'Line total', align: 'right', cell: (i) => formatMoney(i.lineTotal) },
        ]} />
      <div className="flex justify-end border-t border-slate-200 px-4 py-3 text-sm">
        <span className="mr-4 text-slate-500">Total</span><span className="font-semibold text-slate-900">{formatMoney(order.totalAmount)}</span>
      </div>
    </>
  )
}

export function OrderMeta({ order, showCustomer }: { order: Order; showCustomer?: boolean }) {
  return (
    <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
      <div><dt className="text-slate-500">Status</dt><dd className="mt-1"><OrderStatusBadge status={order.status} /></dd></div>
      <div><dt className="text-slate-500">Placed</dt><dd className="mt-1 text-slate-900">{formatDate(order.createdAt)}</dd></div>
      {showCustomer && <div><dt className="text-slate-500">Customer</dt><dd className="mt-1 text-slate-900">{order.customer.fullName} · {order.customer.email}</dd></div>}
      <div><dt className="text-slate-500">Ship to</dt><dd className="mt-1 whitespace-pre-line text-slate-900">{order.shippingAddress}</dd></div>
      {order.notes && <div><dt className="text-slate-500">Notes</dt><dd className="mt-1 text-slate-900">{order.notes}</dd></div>}
    </dl>
  )
}
