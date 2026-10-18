export type Role = 'STORE_MANAGER' | 'CUSTOMER'
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type MovementType = 'INITIAL' | 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'ORDER_PLACED' | 'ORDER_CANCELLED'

export interface User {
  id: number
  email: string
  fullName: string
  phone?: string
  address?: string
  role: Role
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface Category {
  id: number
  name: string
  description?: string
  productCount: number
}

/** Manager view of a product (includes cost price). */
export interface Product {
  id: number
  name: string
  sku: string
  barcode?: string
  description?: string
  categoryId?: number
  categoryName?: string
  price: number
  costPrice: number
  quantity: number
  reorderThreshold: number
  active: boolean
  stockStatus: StockStatus
  createdAt: string
  updatedAt: string
}

/** Customer view of a product (no internal fields). */
export interface CatalogProduct {
  id: number
  name: string
  sku: string
  description?: string
  categoryId?: number
  categoryName?: string
  price: number
  availableQuantity: number
  stockStatus: StockStatus
  available: boolean
}

export interface ProductPayload {
  name: string
  sku: string
  barcode?: string
  description?: string
  categoryId?: number | null
  price: number
  costPrice: number
  initialQuantity?: number
  reorderThreshold: number
  active?: boolean
}

export interface Movement {
  id: number
  productId: number
  productName: string
  sku: string
  type: MovementType
  quantityChange: number
  quantityAfter: number
  reason?: string
  reference?: string
  createdBy?: string
  createdAt: string
}

export interface CartItem {
  productId: number
  name: string
  sku: string
  unitPrice: number
  quantity: number
  lineTotal: number
  availableQuantity: number
  available: boolean
  stockStatus: StockStatus
}

export interface Cart {
  items: CartItem[]
  totalUnits: number
  subtotal: number
}

export interface OrderItem {
  productId: number
  productName: string
  sku: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface Order {
  id: number
  status: OrderStatus
  totalAmount: number
  shippingAddress: string
  notes?: string
  createdAt: string
  updatedAt: string
  customer: { id: number; fullName: string; email: string }
  items: OrderItem[]
}

export interface Dashboard {
  totalProducts: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValue: number
  retailValue: number
  recentMovements: Movement[]
  recentOrders: Order[]
}

export interface InventoryRow {
  productId: number
  name: string
  sku: string
  categoryName?: string
  quantity: number
  reorderThreshold: number
  costPrice: number
  price: number
  stockStatus: StockStatus
  costValue: number
  retailValue: number
}

export interface InventoryReport {
  totalProducts: number
  totalUnits: number
  totalCostValue: number
  totalRetailValue: number
  lowStockCount: number
  outOfStockCount: number
  items: PageResponse<InventoryRow>
}

export interface OrderSummary {
  totalOrders: number
  revenue: number
  byStatus: { status: OrderStatus; orders: number; total: number }[]
}

export interface ApiErrorBody {
  status: number
  message: string
  fieldErrors?: Record<string, string>
}
