import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { categoryApi, productApi } from '../../api/services'
import { renderApp } from '../../test/utils'
import ProductFormPage from './ProductFormPage'

vi.mock('../../api/services', () => ({
  productApi: { create: vi.fn(), update: vi.fn(), get: vi.fn() },
  categoryApi: { list: vi.fn() },
}))

const renderForm = () =>
  renderApp(
    <Routes>
      <Route path="/manager/products/new" element={<ProductFormPage />} />
      <Route path="/manager/products/:id" element={<p>Product details page</p>} />
    </Routes>,
    { route: '/manager/products/new' },
  )

beforeEach(() => {
  vi.mocked(categoryApi.list).mockResolvedValue([{ id: 3, name: 'Drinks', productCount: 0 }])
})

describe('Product form', () => {
  it('requires the mandatory fields', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('SKU is required')).toBeInTheDocument()
    expect(screen.getByText('Selling price is required')).toBeInTheDocument()
    expect(screen.getByText('Cost price is required')).toBeInTheDocument()
    expect(productApi.create).not.toHaveBeenCalled()
  })

  it('rejects negative prices, bad SKUs and fractional cents', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('Product name'), 'Cola')
    await userEvent.type(screen.getByLabelText('SKU'), 'bad sku!')
    await userEvent.type(screen.getByLabelText('Selling price'), '-3')
    await userEvent.type(screen.getByLabelText(/Cost price/), '1.999')
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Selling price cannot be negative')).toBeInTheDocument()
    expect(screen.getByText(/Letters, digits/)).toBeInTheDocument()
    expect(screen.getByText('At most 2 decimal places')).toBeInTheDocument()
    expect(productApi.create).not.toHaveBeenCalled()
  })

  it('submits a valid product with numeric values', async () => {
    vi.mocked(productApi.create).mockResolvedValue({ id: 42 } as never)
    renderForm()
    await screen.findByRole('option', { name: 'Drinks' })
    await userEvent.type(screen.getByLabelText('Product name'), 'Cola 330ml')
    await userEvent.type(screen.getByLabelText('SKU'), 'COLA-330')
    await userEvent.selectOptions(screen.getByLabelText('Category'), '3')
    await userEvent.type(screen.getByLabelText('Selling price'), '1.99')
    await userEvent.type(screen.getByLabelText(/Cost price/), '0.80')
    await userEvent.clear(screen.getByLabelText('Opening stock'))
    await userEvent.type(screen.getByLabelText('Opening stock'), '24')
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))
    await waitFor(() => expect(productApi.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Cola 330ml', sku: 'COLA-330', categoryId: 3, price: 1.99, costPrice: 0.8, initialQuantity: 24, reorderThreshold: 5, active: true,
    })))
    expect(await screen.findByText('Product details page')).toBeInTheDocument()
  })
})
