import { BarChart3, Boxes, ClipboardList, History, LayoutDashboard, Package, ShoppingBag, ShoppingCart, SlidersHorizontal, Tags, User as UserIcon, type LucideIcon } from 'lucide-react'
import type { Role } from '../types'

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

export const navFor: Record<Role, NavItem[]> = {
  STORE_MANAGER: [
    { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/manager/products', label: 'Products', icon: Package },
    { to: '/manager/categories', label: 'Categories', icon: Tags },
    { to: '/manager/stock', label: 'Stock adjustment', icon: SlidersHorizontal },
    { to: '/manager/movements', label: 'Movement history', icon: History },
    { to: '/manager/reports', label: 'Reports', icon: BarChart3 },
    { to: '/manager/orders', label: 'Orders', icon: ClipboardList },
    { to: '/manager/profile', label: 'Profile', icon: UserIcon },
  ],
  CUSTOMER: [
    { to: '/shop', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/shop/catalog', label: 'Catalogue', icon: Boxes },
    { to: '/shop/cart', label: 'Cart', icon: ShoppingCart },
    { to: '/shop/orders', label: 'My orders', icon: ShoppingBag },
    { to: '/shop/profile', label: 'Profile', icon: UserIcon },
  ],
}
