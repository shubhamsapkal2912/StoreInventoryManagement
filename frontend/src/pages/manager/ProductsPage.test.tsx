import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { productApi, categoryApi } from '../../api/services'
import { renderApp } from '../../test/utils'
import type { Product } from '../../types'
import ProductsPage from './ProductsPage'

vi.mock('../../api/services', () => ({
  productApi: { list: vi.fn(), deactivate: vi.fn() },
  categoryApi: { list: vi.fn() },
}))

const product = (over: Partial<Product>): Product => ({
  id: 1, name: 'Blue Pen', sku: 'PEN-1', price: 1.5, costPrice: 0.5, quantity: 40, reorderThreshold: 10, active: true,
  stockStatus: 'IN_STOCK', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...over,
})
const page = (content: Product[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 })

beforeEach(() => {
  vi.mocked(categoryApi.list).mockResolvedValue([{ id: 7, name: 'Stationery', productCount: 2 }])
})

describe('Manager products page', () => {
  it('lists products with price, cost and stock status', async () => {
    vi.mocked(productApi.list).mockResolvedValue(page([product({}), product({ id: 2, name: 'Red Pen', sku: 'PEN-2', quantity: 0, stockStatus: 'OUT_OF_STOCK' })]))
    renderApp(<ProductsPage />)
    const table = await screen.findByRole('table', { name: 'Products' })
    expect(within(table).getByText('Blue Pen')).toBeInTheDocument()
    expect(within(table).getAllByText('$1.50')).toHaveLength(2)
    expect(within(table).getAllByText('$0.50')).toHaveLength(2)
    expect(within(table).getByText('Out of stock')).toBeInTheDocument()
  })

  it('shows a loading indicator first', () => {
    vi.mocked(productApi.list).mockReturnValue(new Promise(() => undefined))
    renderApp(<ProductsPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('searches by text (debounced) and resets to the first page', async () => {
    vi.mocked(productApi.list).mockResolvedValue(page([product({})]))
    renderApp(<ProductsPage />)
    await screen.findByText('Blue Pen')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), 'PEN-2')
    await waitFor(() => expect(productApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'PEN-2', page: 0 })), { timeout: 2000 })
  })

  it('applies category and stock filters', async () => {
    vi.mocked(productApi.list).mockResolvedValue(page([product({})]))
    renderApp(<ProductsPage />)
    await screen.findByText('Blue Pen')
    await screen.findByRole('option', { name: 'Stationery' })
    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), '7')
    await userEvent.selectOptions(screen.getByLabelText('Filter by stock status'), 'LOW_STOCK')
    await waitFor(() => expect(productApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '7', stockStatus: 'LOW_STOCK' })))
  })

  it('shows an empty state when nothing matches', async () => {
    vi.mocked(productApi.list).mockResolvedValue(page([]))
    renderApp(<ProductsPage />)
    expect(await screen.findByText('No products found')).toBeInTheDocument()
  })

  it('shows an error state and can retry', async () => {
    vi.mocked(productApi.list).mockRejectedValueOnce(new AxiosError('Network Error')).mockResolvedValue(page([product({})]))
    renderApp(<ProductsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Blue Pen')).toBeInTheDocument()
  })

  it('asks for confirmation before deactivating a product', async () => {
    vi.mocked(productApi.list).mockResolvedValue(page([product({})]))
    vi.mocked(productApi.deactivate).mockResolvedValue({} as never)
    renderApp(<ProductsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Blue Pen' }))
    expect(productApi.deactivate).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(productApi.deactivate).toHaveBeenCalledWith(1))
  })
})
