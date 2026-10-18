import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../routes/ProtectedRoute'

function Centered({ code, title, text }: { code: string; title: string; text: string }) {
  const { user } = useAuth()
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="text-5xl font-bold text-brand-600">{code}</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{text}</p>
        <Link to={user ? homeFor(user.role) : '/login'} className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">{user ? 'Back to dashboard' : 'Go to sign in'}</Link>
      </div>
    </div>
  )
}

export const ForbiddenPage = () => <Centered code="403" title="Access denied" text="Your account does not have permission to view this page." />
export const NotFoundPage = () => <Centered code="404" title="Page not found" text="The page you are looking for does not exist." />
