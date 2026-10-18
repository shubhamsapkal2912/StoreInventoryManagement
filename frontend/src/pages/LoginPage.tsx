import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const user = await login(values.email.trim(), values.password)
      const from = (location.state as { from?: string } | null)?.from
      const allowed = from && (user.role === 'STORE_MANAGER' ? from.startsWith('/manager') : from.startsWith('/shop'))
      navigate(allowed ? from : homeFor(user.role), { replace: true })
    } catch (e) {
      setServerError(errorMessage(e, 'Unable to sign in. Please try again.'))
    }
  })

  return (
    <AuthShell>
      <div className="mb-8 lg:hidden"><Brand /></div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to manage inventory or place an order.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5" aria-label="Sign in">
        {serverError && <Alert>{serverError}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        <TextField label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" error={errors.password?.message}
          trailing={
            <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="rounded p-1 text-slate-400 hover:text-slate-600">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('password')} />
        <Button type="submit" className="w-full" loading={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New customer? <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">Create an account</Link>
      </p>
      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" aria-hidden />Sessions are protected with short-lived tokens</p>
    </AuthShell>
  )
}
