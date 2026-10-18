import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { errorMessage } from '../../api/client'
import { inventoryApi, productApi } from '../../api/services'
import { MovementsTable } from '../../components/MovementsTable'
import { StockBadge } from '../../components/ui/Badges'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Feedback'
import { SelectField, TextField } from '../../components/ui/FormField'
import { Card, PageHeader } from '../../components/ui/Layout'
import { SearchInput } from '../../components/ui/SearchInput'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { useDebounce } from '../../hooks/useDebounce'
import type { Product } from '../../types'

const schema = z.object({
  operation: z.enum(['IN', 'OUT', 'SET']),
  quantity: z.number({ error: 'Enter a whole number' }).int('Enter a whole number'),
  reason: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
}).superRefine((v, ctx) => {
  if (v.operation === 'SET' ? v.quantity < 0 : v.quantity < 1) {
    ctx.addIssue({ code: 'custom', path: ['quantity'], message: v.operation === 'SET' ? 'Cannot be negative' : 'Must be at least 1' })
  }
  if (v.operation === 'SET' && !v.reason?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['reason'], message: 'A reason is required for adjustments' })
  }
})
type Form = z.infer<typeof schema>

export default function StockAdjustmentPage() {
  const toast = useToast()
  const [params] = useSearchParams()
  const preselected = params.get('productId')
  const [search, setSearch] = useState('')
  const query = useDebounce(search)
  const [selectedId, setSelectedId] = useState<string>(preselected ?? '')
  const [serverError, setServerError] = useState<string | null>(null)

  const results = useAsync(() => productApi.list({ q: query, active: true, size: 25, sortBy: 'name', direction: 'asc' }), [query])
  const selected = useAsync<Product | undefined>(() => (selectedId ? productApi.get(selectedId) : Promise.resolve(undefined)), [selectedId])
  const history = useAsync(() => (selectedId ? inventoryApi.movements({ productId: selectedId, size: 8 }) : Promise.resolve(undefined)), [selectedId])

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { operation: 'IN', quantity: 1, reason: '', reference: '' },
  })
  const operation = watch('operation')
  useEffect(() => setServerError(null), [selectedId, operation])

  const onSubmit = handleSubmit(async (v) => {
    if (!selectedId) { setServerError('Choose a product first'); return }
    setServerError(null)
    const productId = Number(selectedId)
    const common = { reason: v.reason?.trim() || undefined, reference: v.reference?.trim() || undefined }
    try {
      if (v.operation === 'IN') await inventoryApi.stockIn({ productId, quantity: v.quantity, ...common })
      else if (v.operation === 'OUT') await inventoryApi.stockOut({ productId, quantity: v.quantity, ...common })
      else await inventoryApi.adjust({ productId, newQuantity: v.quantity, reason: v.reason!.trim(), reference: common.reference })
      toast.success('Stock updated')
      reset({ operation: v.operation, quantity: v.operation === 'SET' ? v.quantity : 1, reason: '', reference: '' })
      selected.reload()
      history.reload()
    } catch (e) {
      setServerError(errorMessage(e))
    }
  })

  const p = selected.data
  return (
    <>
      <PageHeader title="Stock adjustment" description="Every change is recorded in the inventory movement history." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="1. Choose a product">
          <div className="space-y-3 p-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, SKU or barcode" label="Find product" />
            <SelectField label="Product" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Select a product…</option>
              {results.data?.content.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.sku}) — {r.quantity} in stock</option>)}
              {p && !results.data?.content.some((r) => r.id === p.id) && <option value={p.id}>{p.name} ({p.sku})</option>}
            </SelectField>
            {p && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{p.name}</p>
                <p className="mt-1 flex items-center gap-2 text-slate-600">Current stock: <strong data-testid="current-stock">{p.quantity}</strong> <StockBadge status={p.stockStatus} /></p>
                <p className="mt-1 text-xs text-slate-500">Reorder at {p.reorderThreshold}</p>
              </div>
            )}
          </div>
        </Card>
        <Card className="lg:col-span-3" title="2. Record the change">
          <form onSubmit={onSubmit} noValidate className="space-y-4 p-4" aria-label="Stock change">
            {serverError && <Alert>{serverError}</Alert>}
            <SelectField label="Operation" {...register('operation')}>
              <option value="IN">Stock in (receive goods)</option>
              <option value="OUT">Stock out (remove stock)</option>
              <option value="SET">Adjustment (set counted quantity)</option>
            </SelectField>
            <TextField label={operation === 'SET' ? 'Counted quantity' : 'Quantity'} type="number" step="1" error={errors.quantity?.message} {...register('quantity', { valueAsNumber: true })} />
            <TextField label={operation === 'SET' ? 'Reason (required)' : 'Reason (optional)'} error={errors.reason?.message} {...register('reason')} />
            <TextField label="Reference (optional)" hint="Purchase order, delivery note, stock-take id…" error={errors.reference?.message} {...register('reference')} />
            <div className="flex justify-end"><Button type="submit" loading={isSubmitting} disabled={!selectedId}>Apply change</Button></div>
          </form>
        </Card>
      </div>
      {selectedId && <Card className="mt-6" title="Recent movements for this product"><MovementsTable rows={history.data?.content} loading={history.loading} error={history.error} onRetry={history.reload} showProduct={false} /></Card>}
    </>
  )
}
