import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { errorMessage } from '../api/client'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Feedback'
import { TextField } from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'
import { Brand } from '../layouts/AppLayout'
import { AuthShell } from '../layouts/AuthShell'
import { homeFor } from '../routes/ProtectedRoute'

const schema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters')
    .regex(/[A-Za-z]/, 'Include at least one letter').regex(/\d/, 'Include at least one digit'),
  confirm: z.string(),
  phone: z.string().max(30).optional(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: signUp } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ confirm: _confirm, ...values }) => {
    setServerError(null)
    try {
      const user = await signUp({ ...values, email: values.email.trim(), phone: values.phone || undefined })
      navigate(homeFor(user.role), { replace: true })
    } catch (e) {
      setServerError(errorMessage(e, 'Unable to create your account. Please try again.'))
    }
  })

  return (
    <AuthShell>
      <div className="mb-8 lg:hidden"><Brand /></div>
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Customer accounts only. Store managers are provisioned by an administrator.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4" aria-label="Create account">
        {serverError && <Alert>{serverError}</Alert>}
        <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <TextField label="Phone (optional)" type="tel" autoComplete="tel" error={errors.phone?.message} {...register('phone')} />
        <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a digit" error={errors.password?.message} {...register('password')} />
        <TextField label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        <Button type="submit" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link></p>
    </AuthShell>
  )
}
