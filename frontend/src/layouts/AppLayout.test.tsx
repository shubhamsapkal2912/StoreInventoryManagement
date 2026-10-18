import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { CartContext } from '../context/CartContext'
import { fakeAuth, makeUser, renderApp } from '../test/utils'
import { AppLayout } from './AppLayout'

const emptyCart = { cart: { items: [], totalUnits: 0, subtotal: 0 }, count: 0, loading: false, refresh: vi.fn(), setCart: vi.fn() }

const layout = (role: 'STORE_MANAGER' | 'CUSTOMER', auth = fakeAuth({ user: makeUser(role), status: 'authenticated' })) =>
  renderApp(
    <CartContext.Provider value={emptyCart}>
      <Routes><Route path="/*" element={<AppLayout />}><Route path="*" element={<p>content</p>} /></Route></Routes>
    </CartContext.Provider>,
    { route: role === 'STORE_MANAGER' ? '/manager' : '/shop', auth },
  )

describe('role-based navigation', () => {
  it('shows manager navigation and hides customer navigation', () => {
    layout('STORE_MANAGER')
    const nav = within(screen.getAllByRole('navigation', { name: 'Main navigation' })[0])
    ;['Dashboard', 'Products', 'Categories', 'Stock adjustment', 'Movement history', 'Reports', 'Orders'].forEach((l) => expect(nav.getByRole('link', { name: l })).toBeInTheDocument())
    expect(nav.queryByRole('link', { name: 'Catalogue' })).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: /^Cart/ })).not.toBeInTheDocument()
  })

  it('shows customer navigation and hides every manager-only link', () => {
    layout('CUSTOMER')
    const nav = within(screen.getAllByRole('navigation', { name: 'Main navigation' })[0])
    ;['Catalogue', 'My orders', 'Profile'].forEach((l) => expect(nav.getByRole('link', { name: l })).toBeInTheDocument())
    ;['Products', 'Categories', 'Stock adjustment', 'Reports', 'Movement history'].forEach((l) => expect(nav.queryByRole('link', { name: l })).not.toBeInTheDocument())
  })

  it('shows the cart badge for customers only', () => {
    const cart = { cart: { items: [], totalUnits: 3, subtotal: 30 }, count: 3, loading: false, refresh: vi.fn(), setCart: vi.fn() }
    renderApp(
      <CartContext.Provider value={cart}><Routes><Route path="/*" element={<AppLayout />} /></Routes></CartContext.Provider>,
      { route: '/shop', auth: fakeAuth({ user: makeUser('CUSTOMER'), status: 'authenticated' }) },
    )
    expect(screen.getByRole('link', { name: 'Cart, 3 items' })).toBeInTheDocument()
  })

  it('logs out from the profile menu', async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    layout('STORE_MANAGER', fakeAuth({ user: makeUser('STORE_MANAGER'), status: 'authenticated', logout }))
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /log out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
