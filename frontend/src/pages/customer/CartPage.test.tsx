import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cartApi } from '../../api/services'
import { CartContext } from '../../context/CartContext'
import { renderApp } from '../../test/utils'
import type { Cart } from '../../types'
import CartPage from './CartPage'

vi.mock('../../api/services', () => ({ cartApi: { setQuantity: vi.fn(), remove: vi.fn() } }))

const line = (over = {}) => ({ productId: 1, name: 'Notebook', sku: 'NB-1', unitPrice: 4.5, quantity: 2, lineTotal: 9, availableQuantity: 10, available: true, stockStatus: 'IN_STOCK' as const, ...over })
const cartOf = (items = [line(), line({ productId: 2, name: 'Pencil', sku: 'PC-1', unitPrice: 0.75, quantity: 4, lineTotal: 3 })]): Cart => ({
  items, totalUnits: items.reduce((n, i) => n + i.quantity, 0), subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
})

function renderCart(cart: Cart | null, setCart = vi.fn()) {
  return renderApp(
    <CartContext.Provider value={{ cart, count: cart?.totalUnits ?? 0, loading: false, refresh: vi.fn(), setCart }}><CartPage /></CartContext.Provider>,
  )
}

describe('Cart page', () => {
  it('shows each line, the unit count and the backend-calculated subtotal', () => {
    renderCart(cartOf())
    const list = screen.getByRole('list', { name: 'Cart items' })
    expect(within(list).getByText('Notebook')).toBeInTheDocument()
    expect(within(list).getByText('$9.00')).toBeInTheDocument()
    expect(within(list).getByText('$3.00')).toBeInTheDocument()
    expect(screen.getByTestId('cart-units')).toHaveTextContent('6')
    expect(screen.getByTestId('cart-subtotal')).toHaveTextContent('$12.00')
    expect(screen.getByRole('button', { name: 'Proceed to checkout' })).toBeEnabled()
  })

  it('updates a quantity through the API and shows the returned totals', async () => {
    const updated = cartOf([line({ quantity: 3, lineTotal: 13.5 })])
    vi.mocked(cartApi.setQuantity).mockResolvedValue(updated)
    const setCart = vi.fn()
    renderCart(cartOf([line()]), setCart)
    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity of Notebook' }))
    await waitFor(() => expect(cartApi.setQuantity).toHaveBeenCalledWith(1, 3))
    expect(setCart).toHaveBeenCalledWith(updated)
  })

  it('cannot increase beyond available stock', () => {
    renderCart(cartOf([line({ quantity: 10, availableQuantity: 10, lineTotal: 45 })]))
    expect(screen.getByRole('button', { name: 'Increase quantity of Notebook' })).toBeDisabled()
  })

  it('removes an item', async () => {
    vi.mocked(cartApi.remove).mockResolvedValue(cartOf([]))
    renderCart(cartOf([line()]))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Notebook' }))
    await waitFor(() => expect(cartApi.remove).toHaveBeenCalledWith(1))
  })

  it('blocks checkout when an item is no longer available in the requested quantity', () => {
    renderCart(cartOf([line({ available: false, availableQuantity: 1 })]))
    expect(screen.getByRole('alert')).toHaveTextContent('Only 1 available')
    expect(screen.getByRole('button', { name: 'Fix unavailable items' })).toBeDisabled()
  })

  it('renders an empty state for an empty cart', () => {
    renderCart(cartOf([]))
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse catalogue/i })).toHaveAttribute('href', '/shop/catalog')
  })
})
