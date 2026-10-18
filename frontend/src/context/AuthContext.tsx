import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { refreshSession, setSessionExpiredHandler, tokenStore } from '../api/client'
import { authApi } from '../api/services'
import type { AuthResponse, Role, User } from '../types'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  user: User | null
  status: Status
  login: (email: string, password: string) => Promise<User>
  register: (body: { fullName: string; email: string; password: string; phone?: string; address?: string }) => Promise<User>
  logout: () => Promise<void>
  updateUser: (user: User) => void
  hasRole: (role: Role) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken)
    setUser(res.user)
    setStatus('authenticated')
    return res.user
  }, [])

  const clear = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  // Restore the session from the HttpOnly refresh cookie. The user is unknown (and no protected UI renders)
  // until the backend answers; the refresh call is single-flight so StrictMode's double effect is harmless.
  useEffect(() => {
    let cancelled = false
    refreshSession()
      .then((res) => {
        if (!cancelled) accept(res)
      })
      .catch(() => {
        if (!cancelled) clear()
      })
    setSessionExpiredHandler(clear)
    return () => {
      cancelled = true
      setSessionExpiredHandler(null)
    }
  }, [accept, clear])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login: async (email, password) => accept(await authApi.login(email, password)),
      register: async (body) => accept(await authApi.register(body)),
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          clear()
        }
      },
      updateUser: setUser,
      hasRole: (role) => user?.role === role,
    }),
    [user, status, accept, clear],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export { AuthContext }
export type { AuthContextValue }
