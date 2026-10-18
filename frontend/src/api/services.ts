import { api } from './client'
import type {
  AuthResponse, CatalogProduct, Cart, Category, Dashboard, InventoryReport, Movement, MovementType, Order,
  OrderStatus, OrderSummary, PageResponse, Product, ProductPayload, StockStatus, User,
} from '../types'

type Params = Record<string, string | number | boolean | undefined | null>

/** Drops empty values so they are not sent as `q=`. */
const clean = (p: Params = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''))

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const authApi = {
  login: (email: string, password: string) => data<AuthResponse>(api.post('/auth/login', { email, password })),
  register: (body: { fullName: string; email: string; password: string; phone?: string; address?: string }) =>
    data<AuthResponse>(api.post('/auth/register', body)),
  logout: () => api.post('/auth/logout', null, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
  me: () => data<User>(api.get('/auth/me')),
}

export const profileApi = {
  get: () => data<User>(api.get('/profile')),
  update: (body: { fullName: string; phone?: string; address?: string }) => data<User>(api.put('/profile', body)),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/profile/password', { currentPassword, newPassword }),
}

export interface ProductQuery extends Params {
  q?: string
  categoryId?: number | string
  stockStatus?: StockStatus | ''
  active?: boolean | ''
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export const productApi = {
  list: (params: ProductQuery) => data<PageResponse<Product>>(api.get('/products', { params: clean(params) })),
  get: (id: number | string) => data<Product>(api.get(`/products/${id}`)),
  create: (body: ProductPayload) => data<Product>(api.post('/products', body)),
  update: (id: number | string, body: ProductPayload) => data<Product>(api.put(`/products/${id}`, body)),
  deactivate: (id: number) => api.delete(`/products/${id}`),
}

export const catalogApi = {
  list: (params: ProductQuery) => data<PageResponse<CatalogProduct>>(api.get('/catalog', { params: clean(params) })),
  get: (id: number | string) => data<CatalogProduct>(api.get(`/catalog/${id}`)),
}

export const categoryApi = {
  list: () => data<Category[]>(api.get('/categories')),
  create: (body: { name: string; description?: string }) => data<Category>(api.post('/categories', body)),
  update: (id: number, body: { name: string; description?: string }) => data<Category>(api.put(`/categories/${id}`, body)),
  remove: (id: number) => api.delete(`/categories/${id}`),
}

export interface MovementQuery extends Params {
  productId?: number | string
  categoryId?: number | string
  type?: MovementType | ''
  from?: string
  to?: string
  page?: number
  size?: number
}

export const inventoryApi = {
  stockIn: (body: { productId: number; quantity: number; reason?: string; reference?: string }) =>
    data<Product>(api.post('/inventory/stock-in', body)),
  stockOut: (body: { productId: number; quantity: number; reason?: string; reference?: string }) =>
    data<Product>(api.post('/inventory/stock-out', body)),
  adjust: (body: { productId: number; newQuantity: number; reason: string; reference?: string }) =>
    data<Product>(api.post('/inventory/adjustments', body)),
  movements: (params: MovementQuery) => data<PageResponse<Movement>>(api.get('/inventory/movements', { params: clean(params) })),
}

export const reportApi = {
  dashboard: () => data<Dashboard>(api.get('/manager/dashboard')),
  inventory: (params: Params) => data<InventoryReport>(api.get('/reports/inventory', { params: clean(params) })),
  lowStock: (params: Params) => data<PageResponse<Product>>(api.get('/reports/low-stock', { params: clean(params) })),
  outOfStock: (params: Params) => data<PageResponse<Product>>(api.get('/reports/out-of-stock', { params: clean(params) })),
  orders: (params: Params) => data<OrderSummary>(api.get('/reports/orders', { params: clean(params) })),
}

export const cartApi = {
  get: () => data<Cart>(api.get('/cart')),
  add: (productId: number, quantity: number) => data<Cart>(api.post('/cart/items', { productId, quantity })),
  setQuantity: (productId: number, quantity: number) => data<Cart>(api.put(`/cart/items/${productId}`, { quantity })),
  remove: (productId: number) => data<Cart>(api.delete(`/cart/items/${productId}`)),
}

export const orderApi = {
  place: (body: { shippingAddress: string; notes?: string }) => data<Order>(api.post('/orders', body)),
  mine: (params: { page?: number; size?: number }) => data<PageResponse<Order>>(api.get('/orders/my-orders', { params })),
  get: (id: number | string) => data<Order>(api.get(`/orders/${id}`)),
  cancel: (id: number) => data<Order>(api.post(`/orders/${id}/cancel`)),
  managerList: (params: Params) => data<PageResponse<Order>>(api.get('/manager/orders', { params: clean(params) })),
  updateStatus: (id: number, status: OrderStatus) => data<Order>(api.patch(`/manager/orders/${id}/status`, { status })),
}
