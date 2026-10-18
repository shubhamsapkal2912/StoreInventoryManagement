import type { OrderStatus, StockStatus } from '../../types'
import { orderStatusLabel, stockLabel } from '../../utils/format'

const stockCls: Record<StockStatus, string> = {
  IN_STOCK: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  LOW_STOCK: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  OUT_OF_STOCK: 'bg-red-50 text-red-700 ring-red-600/20',
}
const orderCls: Record<OrderStatus, string> = {
  PLACED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  CONFIRMED: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  PROCESSING: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  SHIPPED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}
const pill = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export const StockBadge = ({ status }: { status: StockStatus }) => <span className={`${pill} ${stockCls[status]}`}>{stockLabel[status]}</span>
export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => <span className={`${pill} ${orderCls[status]}`}>{orderStatusLabel[status]}</span>
export const ActiveBadge = ({ active }: { active: boolean }) => (
  <span className={`${pill} ${active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>{active ? 'Active' : 'Inactive'}</span>
)
