import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from './components/ui/Feedback'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { AppLayout } from './layouts/AppLayout'
import { ForbiddenPage, NotFoundPage } from './pages/StatusPages'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { HomeRedirect, ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'

const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ManagerDashboard = lazy(() => import('./pages/manager/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/manager/ProductsPage'))
const ProductFormPage = lazy(() => import('./pages/manager/ProductFormPage'))
const ProductDetailsPage = lazy(() => import('./pages/manager/ProductDetailsPage'))
const CategoriesPage = lazy(() => import('./pages/manager/CategoriesPage'))
const StockAdjustmentPage = lazy(() => import('./pages/manager/StockAdjustmentPage'))
const MovementsPage = lazy(() => import('./pages/manager/MovementsPage'))
const ReportsPage = lazy(() => import('./pages/manager/ReportsPage'))
const ManagerOrdersPage = lazy(() => import('./pages/manager/OrdersPage'))
const CustomerDashboard = lazy(() => import('./pages/customer/DashboardPage'))
const CatalogPage = lazy(() => import('./pages/customer/CatalogPage'))
const CustomerProductPage = lazy(() => import('./pages/customer/ProductPage'))
const CartPage = lazy(() => import('./pages/customer/CartPage'))
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'))
const CustomerOrdersPage = lazy(() => import('./pages/customer/OrdersPage'))
const OrderDetailsPage = lazy(() => import('./pages/customer/OrderDetailsPage'))

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute role="STORE_MANAGER" />}>
          <Route path="/manager" element={<AppLayout />}>
            <Route index element={<ManagerDashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductDetailsPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="stock" element={<StockAdjustmentPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="orders" element={<ManagerOrdersPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="CUSTOMER" />}>
          <Route path="/shop" element={<AppLayout />}>
            <Route index element={<CustomerDashboard />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="products/:id" element={<CustomerProductPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<CustomerOrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
