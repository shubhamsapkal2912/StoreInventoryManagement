import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { ForbiddenPage } from '../pages/StatusPages'
import { fakeAuth, makeUser, renderApp } from '../test/utils'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'

const tree = (
  <Routes>
    <Route path="/login" element={<p>Login page</p>} />
    <Route path="/forbidden" element={<ForbiddenPage />} />
    <Route element={<PublicOnlyRoute />}><Route path="/public" element={<p>Public page</p>} /></Route>
    <Route element={<ProtectedRoute role="STORE_MANAGER" />}><Route path="/manager" element={<p>Secret manager data</p>} /></Route>
    <Route path="/shop" element={<p>Shop</p>} />
  </Routes>
)

describe('route guards', () => {
  it('redirects anonymous users to the login page', () => {
    renderApp(tree, { route: '/manager' })
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Secret manager data')).not.toBeInTheDocument()
  })

  it('renders nothing protected while the session is still being resolved', () => {
    renderApp(tree, { route: '/manager', auth: fakeAuth({ status: 'loading' }) })
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
    expect(screen.queryByText('Secret manager data')).not.toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('lets a store manager in', () => {
    renderApp(tree, { route: '/manager', auth: fakeAuth({ user: makeUser('STORE_MANAGER'), status: 'authenticated' }) })
    expect(screen.getByText('Secret manager data')).toBeInTheDocument()
  })

  it('shows access denied to a customer who navigates to a manager route', () => {
    renderApp(tree, { route: '/manager', auth: fakeAuth({ user: makeUser('CUSTOMER'), status: 'authenticated' }) })
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    expect(screen.queryByText('Secret manager data')).not.toBeInTheDocument()
  })

  it('bounces authenticated users away from public-only pages', () => {
    renderApp(tree, { route: '/public', auth: fakeAuth({ user: makeUser('CUSTOMER'), status: 'authenticated' }) })
    expect(screen.getByText('Shop')).toBeInTheDocument()
  })

  it('lets anonymous users see public-only pages', () => {
    renderApp(tree, { route: '/public' })
    expect(screen.getByText('Public page')).toBeInTheDocument()
  })
})
