import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { errorMessage } from '../../api/client'
import { categoryApi } from '../../api/services'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { Alert } from '../../components/ui/Feedback'
import { TextAreaField, TextField } from '../../components/ui/FormField'
import { Card, PageHeader } from '../../components/ui/Layout'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import type { Category } from '../../types'

const schema = z.object({ name: z.string().trim().min(1, 'Name is required').max(100), description: z.string().max(500).optional() })
type Form = z.infer<typeof schema>

function CategoryForm({ category, onDone, onClose }: { category: Category | null; onDone: () => void; onClose: () => void }) {
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { name: category?.name ?? '', description: category?.description ?? '' },
  })
  const submit = handleSubmit(async (v) => {
    setServerError(null)
    try {
      if (category) await categoryApi.update(category.id, v)
      else await categoryApi.create(v)
      toast.success(category ? 'Category updated' : 'Category created')
      onDone()
    } catch (e) {
      setServerError(errorMessage(e))
    }
  })
  return (
    <Modal title={category ? 'Edit category' : 'New category'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="category-form" loading={isSubmitting}>Save</Button></>}>
      <form id="category-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <TextField label="Name" error={errors.name?.message} {...register('name')} />
        <TextAreaField label="Description" error={errors.description?.message} {...register('description')} />
      </form>
    </Modal>
  )
}

export default function CategoriesPage() {
  const toast = useToast()
  const categories = useAsync(() => categoryApi.list(), [])
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await categoryApi.remove(deleting.id)
      toast.success('Category deleted')
      setDeleting(null)
      categories.reload()
    } catch (e) {
      toast.error(errorMessage(e))
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Categories" description="Group products so they are easier to find and report on."
        actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />New category</Button>} />
      <Card>
        <DataTable caption="Categories" rows={categories.data} loading={categories.loading} error={categories.error} onRetry={categories.reload}
          rowKey={(c) => c.id} emptyTitle="No categories yet" emptyDescription="Create your first category to organise products."
          columns={[
            { header: 'Name', cell: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
            { header: 'Description', cell: (c) => <span className="text-slate-500">{c.description || '—'}</span> },
            { header: 'Products', align: 'right', cell: (c) => c.productCount },
            { header: 'Actions', align: 'right', cell: (c) => (
              <div className="flex justify-end gap-1">
                <button onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`} className="rounded p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ) },
          ]} />
      </Card>
      {editing && <CategoryForm category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); categories.reload() }} />}
      {deleting && (
        <ConfirmDialog danger title="Delete category" confirmLabel="Delete" loading={busy} onConfirm={remove} onCancel={() => setDeleting(null)}
          message={deleting.productCount > 0 ? <>“{deleting.name}” is assigned to {deleting.productCount} product(s) and cannot be deleted until they are reassigned.</> : <>Delete “{deleting.name}”? This cannot be undone.</>} />
      )}
    </>
  )
}
