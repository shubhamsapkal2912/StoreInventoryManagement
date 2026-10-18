import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { errorMessage, fieldErrors } from '../../api/client'
import { categoryApi, productApi } from '../../api/services'
import { Button } from '../../components/ui/Button'
import { Alert, ErrorState, Spinner } from '../../components/ui/Feedback'
import { SelectField, TextAreaField, TextField } from '../../components/ui/FormField'
import { Card, PageHeader } from '../../components/ui/Layout'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import type { Category, ProductPayload } from '../../types'

const money = (label: string) =>
  z.number({ error: `${label} is required` }).min(0, `${label} cannot be negative`)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'At most 2 decimal places')

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  sku: z.string().trim().min(1, 'SKU is required').max(64).regex(/^[A-Za-z0-9._-]+$/, 'Letters, digits, ".", "_" and "-" only'),
  barcode: z.string().max(64).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().optional(),
  price: money('Selling price'),
  costPrice: money('Cost price'),
  initialQuantity: z.number({ error: 'Enter a whole number' }).int('Enter a whole number').min(0, 'Cannot be negative').optional(),
  reorderThreshold: z.number({ error: 'Reorder threshold is required' }).int('Enter a whole number').min(0, 'Cannot be negative'),
  active: z.boolean(),
})
type FormValues = z.infer<typeof productSchema>

export default function ProductFormPage() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const categories = useAsync<Category[]>(() => categoryApi.list(), [])
  const existing = useAsync(() => (id ? productApi.get(id) : Promise.resolve(undefined)), [id])

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', sku: '', barcode: '', description: '', categoryId: '', initialQuantity: 0, reorderThreshold: 5, active: true },
  })

  useEffect(() => {
    const p = existing.data
    if (p) reset({ name: p.name, sku: p.sku, barcode: p.barcode ?? '', description: p.description ?? '', categoryId: p.categoryId ? String(p.categoryId) : '', price: p.price, costPrice: p.costPrice, reorderThreshold: p.reorderThreshold, active: p.active })
  }, [existing.data, reset])

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null)
    const payload: ProductPayload = {
      name: v.name.trim(), sku: v.sku.trim(), barcode: v.barcode?.trim() || undefined, description: v.description?.trim() || undefined,
      categoryId: v.categoryId ? Number(v.categoryId) : null, price: v.price, costPrice: v.costPrice,
      reorderThreshold: v.reorderThreshold, active: v.active,
      ...(editing ? {} : { initialQuantity: v.initialQuantity ?? 0 }),
    }
    try {
      const saved = editing ? await productApi.update(id!, payload) : await productApi.create(payload)
      toast.success(editing ? 'Product updated' : 'Product created')
      navigate(`/manager/products/${saved.id}`)
    } catch (e) {
      const fe = fieldErrors(e)
      Object.entries(fe).forEach(([field, message]) => setError(field as keyof FormValues, { message }))
      setServerError(errorMessage(e))
    }
  })

  if (editing && existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />
  if (editing && existing.loading) return <Spinner />

  return (
    <>
      <PageHeader title={editing ? 'Edit product' : 'Add product'} description={editing ? 'Stock quantity is changed through stock adjustments so every change is audited.' : 'Opening stock is recorded as the first inventory movement.'} />
      <Card>
        <form onSubmit={onSubmit} noValidate className="space-y-5 p-5" aria-label="Product form">
          {serverError && <Alert>{serverError}</Alert>}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Product name" error={errors.name?.message} {...register('name')} />
            <TextField label="SKU" error={errors.sku?.message} {...register('sku')} />
            <TextField label="Barcode (optional)" error={errors.barcode?.message} {...register('barcode')} />
            <SelectField label="Category" error={errors.categoryId?.message} {...register('categoryId')}>
              <option value="">Uncategorised</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <TextField label="Selling price" type="number" step="0.01" min="0" inputMode="decimal" error={errors.price?.message} {...register('price', { valueAsNumber: true })} />
            <TextField label="Cost price" type="number" step="0.01" min="0" inputMode="decimal" hint="Visible to managers only" error={errors.costPrice?.message} {...register('costPrice', { valueAsNumber: true })} />
            {!editing && <TextField label="Opening stock" type="number" min="0" step="1" error={errors.initialQuantity?.message} {...register('initialQuantity', { valueAsNumber: true })} />}
            <TextField label="Reorder threshold" type="number" min="0" step="1" hint="Low-stock alert when quantity falls to this level" error={errors.reorderThreshold?.message} {...register('reorderThreshold', { valueAsNumber: true })} />
          </div>
          <TextAreaField label="Description" error={errors.description?.message} {...register('description')} />
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('active')} />Active (visible to customers)</label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{editing ? 'Save changes' : 'Create product'}</Button>
          </div>
        </form>
      </Card>
    </>
  )
}
