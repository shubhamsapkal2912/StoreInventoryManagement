import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { cartApi } from '../../api/services'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Card, PageHeader } from '../../components/ui/Layout'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../utils/format'

export default function CartPage() {
  const { cart, loading, setCart, refresh } = useCart()
  const toast = useToast()
  const [busyId, setBusyId] = useState<number | null>(null)

  const run = async (productId: number, action: () => Promise<unknown>) => {
    setBusyId(productId)
    try {
      await action()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusyId(null)
    }
  }
  const setQty = (productId: number, quantity: number) => run(productId, async () => setCart(await cartApi.setQuantity(productId, quantity)))
  const remove = (productId: number) => run(productId, async () => setCart(await cartApi.remove(productId)))

  if (!cart && loading) return <Spinner />
  if (!cart) return <ErrorState message="We could not load your cart." onRetry={() => void refresh()} />

  const hasProblem = cart.items.some((i) => !i.available)

  return (
    <>
      <PageHeader title="Your cart" description="Prices and totals are confirmed by the store when you check out." />
      {cart.items.length === 0 ? (
        <Card><EmptyState title="Your cart is empty" description="Browse the catalogue and add something you like." action={<Link to="/shop/catalog"><Button>Browse catalogue</Button></Link>} /></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <ul className="divide-y divide-slate-100" aria-label="Cart items">
              {cart.items.map((i) => (
                <li key={i.productId} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{i.name}</p>
                    <p className="text-xs text-slate-500">{i.sku} · {formatMoney(i.unitPrice)} each</p>
                    {!i.available && <p role="alert" className="mt-1 text-xs font-medium text-red-600">Only {i.availableQuantity} available — reduce the quantity to continue.</p>}
                  </div>
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button disabled={busyId === i.productId || i.quantity <= 1} onClick={() => setQty(i.productId, i.quantity - 1)} aria-label={`Decrease quantity of ${i.name}`} className="p-2 hover:bg-slate-50 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                    <span className="w-10 text-center text-sm font-medium" aria-label={`Quantity of ${i.name}`}>{i.quantity}</span>
                    <button disabled={busyId === i.productId || i.quantity >= i.availableQuantity} onClick={() => setQty(i.productId, i.quantity + 1)} aria-label={`Increase quantity of ${i.name}`} className="p-2 hover:bg-slate-50 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                  </div>
                  <p className="w-24 text-right font-semibold text-slate-900">{formatMoney(i.lineTotal)}</p>
                  <button disabled={busyId === i.productId} onClick={() => remove(i.productId)} aria-label={`Remove ${i.name}`} className="rounded p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Order summary" className="h-fit">
            <dl className="space-y-3 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Items</dt><dd data-testid="cart-units">{cart.totalUnits}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold"><dt>Subtotal</dt><dd data-testid="cart-subtotal">{formatMoney(cart.subtotal)}</dd></div>
            </dl>
            <div className="p-4 pt-0">
              {hasProblem ? <Button className="w-full" disabled>Fix unavailable items</Button> : <Link to="/shop/checkout"><Button className="w-full">Proceed to checkout</Button></Link>}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
