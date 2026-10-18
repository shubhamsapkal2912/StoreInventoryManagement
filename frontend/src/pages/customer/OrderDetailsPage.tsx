import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { orderApi } from '../../api/services'
import { OrderLines, OrderMeta } from '../../components/OrderParts'
import { Button } from '../../components/ui/Button'
import { ErrorState, Spinner } from '../../components/ui/Feedback'
import { Card, PageHeader } from '../../components/ui/Layout'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'

export default function OrderDetailsPage() {
  const { id } = useParams()
  const toast = useToast()
  const order = useAsync(() => orderApi.get(id!), [id])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const o = order.data

  if (order.error) return <ErrorState message={order.error} onRetry={order.reload} />
  if (order.loading || !o) return <Spinner />

  const cancel = async () => {
    setBusy(true)
    try {
      await orderApi.cancel(o.id)
      toast.success('Order cancelled')
      order.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <>
      <PageHeader title={`Order #${o.id}`} actions={<>
        <Link to="/shop/orders"><Button variant="secondary">All orders</Button></Link>
        {o.status === 'PLACED' && <Button variant="danger" onClick={() => setConfirming(true)}>Cancel order</Button>}
      </>} />
      <Card><OrderMeta order={o} /></Card>
      <Card className="mt-6" title="Items"><OrderLines order={o} /></Card>
      {confirming && <ConfirmDialog danger title="Cancel this order?" confirmLabel="Cancel order" loading={busy} onConfirm={cancel} onCancel={() => setConfirming(false)} message="The items will be returned to stock. You can only cancel before the store confirms the order." />}
    </>
  )
}
