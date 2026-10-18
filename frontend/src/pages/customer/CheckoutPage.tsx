import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { errorMessage } from '../../api/client'
import { orderApi } from '../../api/services'
import { Button } from '../../components/ui/Button'
import { Alert, EmptyState, Spinner } from '../../components/ui/Feedback'
import { TextAreaField } from '../../components/ui/FormField'
import { Card, PageHeader } from '../../components/ui/Layout'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../utils/format'

const schema = z.object({
  shippingAddress: z.string().trim().min(5, 'Enter a delivery address').max(500),
  notes: z.string().max(1000).optional(),
})

export default function CheckoutPage() {
  const { user } = useAuth()
  const { cart, loading, refresh } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { shippingAddress: user?.address ?? '', notes: '' },
  })

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null)
    try {
      const order = await orderApi.place({ shippingAddress: v.shippingAddress, notes: v.notes || undefined })
      await refresh()
      toast.success(`Order #${order.id} placed`)
      navigate(`/shop/orders/${order.id}`, { replace: true })
    } catch (e) {
      setServerError(errorMessage(e))
      void refresh()
    }
  })

  if (!cart && loading) return <Spinner />
  if (!cart || cart.items.length === 0) {
    return <Card><EmptyState title="Nothing to check out" description="Add items to your cart first." action={<Link to="/shop/catalog"><Button>Browse catalogue</Button></Link>} /></Card>
  }

  return (
    <>
      <PageHeader title="Checkout" description="Review your order and confirm delivery details." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Delivery">
          <form onSubmit={onSubmit} noValidate className="space-y-4 p-4" aria-label="Checkout">
            {serverError && <Alert>{serverError}</Alert>}
            <TextAreaField label="Delivery address" error={errors.shippingAddress?.message} {...register('shippingAddress')} />
            <TextAreaField label="Order notes (optional)" error={errors.notes?.message} {...register('notes')} />
            <Alert kind="info">No payment is taken in this demo store. Placing an order reserves the stock and sends it to the store manager.</Alert>
            <div className="flex justify-end"><Button type="submit" loading={isSubmitting}>Place order · {formatMoney(cart.subtotal)}</Button></div>
          </form>
        </Card>
        <Card title="Summary" className="h-fit">
          <ul className="divide-y divide-slate-100 text-sm">
            {cart.items.map((i) => <li key={i.productId} className="flex justify-between gap-3 p-3"><span>{i.quantity} × {i.name}</span><span className="font-medium">{formatMoney(i.lineTotal)}</span></li>)}
          </ul>
          <div className="flex justify-between border-t border-slate-200 p-4 font-semibold"><span>Total</span><span>{formatMoney(cart.subtotal)}</span></div>
        </Card>
      </div>
    </>
  )
}
