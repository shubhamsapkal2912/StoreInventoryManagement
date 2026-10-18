import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { cartApi, catalogApi } from '../../api/services'
import { StockBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { ErrorState, Spinner } from '../../components/ui/Feedback'
import { Card, PageHeader } from '../../components/ui/Layout'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { formatMoney } from '../../utils/format'

export default function CustomerProductPage() {
  const { id } = useParams()
  const toast = useToast()
  const { setCart } = useCart()
  const product = useAsync(() => catalogApi.get(id!), [id])
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const p = product.data

  if (product.error) return <ErrorState message={product.error} onRetry={product.reload} />
  if (product.loading || !p) return <Spinner />

  const add = async () => {
    setAdding(true)
    try {
      setCart(await cartApi.add(p.id, qty))
      toast.success(`${qty} × ${p.name} added to your cart`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <PageHeader title={p.name} description={p.categoryName} actions={<Link to="/shop/catalog" className="text-sm text-brand-600 hover:underline">← Back to catalogue</Link>} />
      <Card>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="grid min-h-48 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-slate-100 text-6xl font-bold text-brand-500/60" aria-hidden>{p.name.charAt(0)}</div>
          <div className="space-y-4">
            <p className="text-3xl font-bold text-slate-900">{formatMoney(p.price)}</p>
            <div className="flex items-center gap-3"><StockBadge status={p.stockStatus} /><span className="text-sm text-slate-500">{p.available ? `${p.availableQuantity} available` : 'Currently unavailable'}</span></div>
            <p className="text-sm leading-6 text-slate-600">{p.description || 'No description provided.'}</p>
            <p className="text-xs text-slate-400">SKU {p.sku}</p>
            {p.available && (
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-slate-300">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="p-2 hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
                  <span className="w-10 text-center text-sm font-medium" aria-live="polite" data-testid="qty">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(p.availableQuantity, q + 1))} aria-label="Increase quantity" className="p-2 hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
                </div>
                <Button onClick={add} loading={adding}><ShoppingCart className="h-4 w-4" aria-hidden />Add to cart</Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  )
}
