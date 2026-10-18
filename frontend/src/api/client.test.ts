import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { api, errorMessage, refreshSession, setAdapter, setSessionExpiredHandler, tokenStore } from './client'

const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown = {}) => {
  const response = { data, status, statusText: '', headers: {}, config }
  return status < 400 ? Promise.resolve(response) : Promise.reject(new AxiosError('failed', String(status), config, null, response))
}

let calls: { url: string; auth?: string }[]
let refreshOk: boolean

const adapter: AxiosAdapter = async (config) => {
  const auth = config.headers.get('Authorization') as string | undefined
  calls.push({ url: config.url ?? '', auth })
  if (config.url?.endsWith('/auth/refresh')) {
    await new Promise((r) => setTimeout(r, 20))
    return refreshOk ? respond(config, 200, { accessToken: 'fresh-token', user: { id: 1 } }) : respond(config, 401, { message: 'Session expired' })
  }
  if (config.url?.endsWith('/auth/login')) return respond(config, 401, { message: 'Invalid email or password' })
  return auth === 'Bearer fresh-token' ? respond(config, 200, { ok: true }) : respond(config, 401, { message: 'expired' })
}

beforeEach(() => {
  calls = []
  refreshOk = true
  tokenStore.set('stale-token')
  setAdapter(adapter)
})
afterEach(() => {
  setAdapter(undefined)
  setSessionExpiredHandler(null)
  tokenStore.set(null)
})

describe('api client', () => {
  it('attaches the in-memory access token as a Bearer header', async () => {
    tokenStore.set('fresh-token')
    await api.get('/things')
    expect(calls[0].auth).toBe('Bearer fresh-token')
  })

  it('shares ONE refresh between concurrent 401s and retries each request once', async () => {
    const [a, b, c] = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')])
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200])
    expect(calls.filter((x) => x.url.endsWith('/auth/refresh'))).toHaveLength(1)
    expect(calls.filter((x) => x.url === '/a')).toHaveLength(2) // original + a single retry
    expect(tokenStore.get()).toBe('fresh-token')
  })

  it('does not loop when the refresh itself fails: it clears the session and rejects', async () => {
    refreshOk = false
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    await expect(api.get('/a')).rejects.toMatchObject({ response: { status: 401 } })
    expect(calls.filter((x) => x.url.endsWith('/auth/refresh'))).toHaveLength(1)
    expect(calls.filter((x) => x.url === '/a')).toHaveLength(1)
    expect(expired).toHaveBeenCalledTimes(1)
    expect(tokenStore.get()).toBeNull()
  })

  it('never tries to refresh after a failed login', async () => {
    await expect(api.post('/auth/login', {})).rejects.toBeTruthy()
    expect(calls.some((x) => x.url.endsWith('/auth/refresh'))).toBe(false)
  })

  it('allows a new refresh after the previous one settled', async () => {
    await refreshSession()
    await refreshSession()
    expect(calls.filter((x) => x.url.endsWith('/auth/refresh'))).toHaveLength(2)
  })
})

describe('errorMessage', () => {
  it('prefers the backend message and falls back sensibly', () => {
    const withBody = new AxiosError('x', '409', undefined, null, { status: 409, data: { message: 'SKU already in use' }, statusText: '', headers: {}, config: {} as never })
    expect(errorMessage(withBody)).toBe('SKU already in use')
    expect(errorMessage(new AxiosError('Network Error'))).toMatch(/cannot reach the server/i)
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })
})
