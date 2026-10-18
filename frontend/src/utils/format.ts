import type { MovementType, OrderStatus, StockStatus } from '../types'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const formatMoney = (v: number | undefined | null) => currency.format(v ?? 0)

export const formatDate = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—'

export const stockLabel: Record<StockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
}

export const movementLabel: Record<MovementType, string> = {
  INITIAL: 'Initial stock',
  STOCK_IN: 'Stock in',
  STOCK_OUT: 'Stock out',
  ADJUSTMENT: 'Adjustment',
  ORDER_PLACED: 'Order placed',
  ORDER_CANCELLED: 'Order cancelled',
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

/** Forward transitions a manager may apply (mirrors the backend state machine; the server enforces it). */
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}
