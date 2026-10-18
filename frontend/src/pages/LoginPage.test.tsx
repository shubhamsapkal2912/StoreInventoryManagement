import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import { fakeAuth, makeUser, renderApp } from '../test/utils'

const renderLogin = (login = vi.fn()) =>
  renderApp(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/manager" element={<p>Manager home</p>} />
      <Route path="/shop" element={<p>Shop home</p>} />
    </Routes>,
    { route: '/login', auth: fakeAuth({ login }) },
  )

const axiosError = (status: number, data: unknown) =>
  new AxiosError('failed', String(status), undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as never })

describe('LoginPage', () => {
  it('shows client-side validation errors and does not call the API', async () => {
    const login = vi.fn()
    renderLogin(login)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('rejects a malformed email address', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('signs a manager in and lands on the manager dashboard', async () => {
    const login = vi.fn().mockResolvedValue(makeUser('STORE_MANAGER'))
    renderLogin(login)
    await userEvent.type(screen.getByLabelText('Email'), 'mia@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'S3cret-pass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(login).toHaveBeenCalledWith('mia@example.com', 'S3cret-pass'))
    expect(await screen.findByText('Manager home')).toBeInTheDocument()
  })

  it('sends customers to the shop', async () => {
    renderLogin(vi.fn().mockResolvedValue(makeUser('CUSTOMER')))
    await userEvent.type(screen.getByLabelText('Email'), 'c@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Shop home')).toBeInTheDocument()
  })

  it('shows the server error for invalid credentials', async () => {
    renderLogin(vi.fn().mockRejectedValue(axiosError(401, { message: 'Invalid email or password' })))
    await userEvent.type(screen.getByLabelText('Email'), 'c@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('shows a friendly message when the server is unreachable', async () => {
    renderLogin(vi.fn().mockRejectedValue(new AxiosError('Network Error')))
    await userEvent.type(screen.getByLabelText('Email'), 'c@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
  })

  it('disables the button and shows a loading state while signing in', async () => {
    let finish: (u: ReturnType<typeof makeUser>) => void = () => undefined
    renderLogin(vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve })))
    await userEvent.type(screen.getByLabelText('Email'), 'c@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    const busy = await screen.findByRole('button', { name: /signing in/i })
    expect(busy).toBeDisabled()
    finish(makeUser('CUSTOMER'))
    expect(await screen.findByText('Shop home')).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    renderLogin()
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('links to customer registration', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/register')
  })
})
