import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '../types'

/**
 * Centralised Axios instance.
 *  - The short-lived access token lives only in memory (never localStorage) and is attached as a Bearer header.
 *  - The long-lived refresh token is an HttpOnly cookie the browser sends to /api/auth/* (withCredentials).
 *  - On a 401 the request is retried exactly once after a *single shared* refresh call, so concurrent
 *    failures cannot trigger several rotations (which the backend would treat as token reuse).
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
})

let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null
let refreshInFlight: Promise<AuthResponse> | null = null

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t
  },
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

/** Test seam: swap the transport without touching the interceptors. */
export function setAdapter(adapter: AxiosAdapter | undefined) {
  api.defaults.adapter = adapter
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
const isAuthCall = (url?: string) => AUTH_PATHS.some((p) => url?.endsWith(p))

/** Single-flight refresh: callers that arrive while a refresh is running share its promise. */
export function refreshSession(): Promise<AuthResponse> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        adapter: api.defaults.adapter,
      })
      .then((res) => {
        accessToken = res.data.accessToken
        return res.data
      })
      .catch((err) => {
        accessToken = null
        throw err
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall(original.url)) {
      original._retried = true
      try {
        const session = await refreshSession()
        original.headers.Authorization = `Bearer ${session.accessToken}`
        return api(original)
      } catch {
        tokenStore.set(null)
        onSessionExpired?.()
      }
    }
    return Promise.reject(error)
  },
)

/** Human-readable message from a backend error body (or a sensible fallback). */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Cannot reach the server. Check your connection and try again.'
    const data = err.response.data as { message?: string; fieldErrors?: Record<string, string> } | undefined
    if (data?.fieldErrors) {
      const first = Object.entries(data.fieldErrors)[0]
      if (first) return `${first[0]}: ${first[1]}`
    }
    if (data?.message) return data.message
    if (err.response.status >= 500) return 'The server had a problem. Please try again later.'
  }
  return fallback
}

export function fieldErrors(err: unknown): Record<string, string> {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { fieldErrors?: Record<string, string> } | undefined)?.fieldErrors ?? {}
  }
  return {}
}
