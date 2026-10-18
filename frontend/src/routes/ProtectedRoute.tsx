import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageSpinner } from '../components/ui/Feedback'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

export const homeFor = (role: Role) => (role === 'STORE_MANAGER' ? '/manager' : '/shop')

/**
 * Gate for authenticated areas. Nothing protected is rendered until the session has been resolved
 * by the backend, and the role check here is UX only - every API call is re-authorised server-side.
 */
export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (role && user.role !== role) return <Navigate to="/forbidden" replace />
  return <Outlet />
}

/** Login/register pages bounce already-authenticated users to their dashboard. */
export function PublicOnlyRoute() {
  const { user, status } = useAuth()
  if (status === 'loading') return <FullPageSpinner />
  if (user) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}

export function HomeRedirect() {
  const { user, status } = useAuth()
  if (status === 'loading') return <FullPageSpinner />
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}
