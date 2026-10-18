import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import type { Role, User } from '../types'

export const makeUser = (role: Role = 'CUSTOMER', over: Partial<User> = {}): User => ({
  id: 1, email: `${role.toLowerCase()}@example.com`, fullName: role === 'STORE_MANAGER' ? 'Mia Manager' : 'Carl Customer',
  role, createdAt: '2026-01-01T00:00:00Z', ...over,
})

export function fakeAuth(over: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null, status: 'anonymous',
    login: vi.fn(), register: vi.fn(), logout: vi.fn().mockResolvedValue(undefined), updateUser: vi.fn(),
    hasRole: (r) => over.user?.role === r,
    ...over,
  }
}

export function renderApp(ui: ReactElement, { route = '/', auth = fakeAuth() }: { route?: string; auth?: AuthContextValue } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>
      </ToastProvider>
    </MemoryRouter>,
  )
}
