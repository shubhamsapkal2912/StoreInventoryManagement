import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cartApi } from '../api/services'
import type { Cart } from '../types'
import { useAuth } from './AuthContext'

interface CartContextValue {
  cart: Cart | null
  count: number
  loading: boolean
  refresh: () => Promise<void>
  setCart: (c: Cart) => void
}

export const CartContext = createContext<CartContextValue | undefined>(undefined)

/** Server-side cart state for customers; managers never fetch it. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)
  const isCustomer = status === 'authenticated' && user?.role === 'CUSTOMER'

  const refresh = useCallback(async () => {
    if (!isCustomer) return
    setLoading(true)
    try {
      setCart(await cartApi.get())
    } finally {
      setLoading(false)
    }
  }, [isCustomer])

  useEffect(() => {
    if (isCustomer) void refresh().catch(() => undefined)
    else setCart(null)
  }, [isCustomer, refresh])

  const value = useMemo(() => ({ cart, count: cart?.totalUnits ?? 0, loading, refresh, setCart }), [cart, loading, refresh])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
