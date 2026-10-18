import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/client'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: string | null
  reload: () => void
}

/** Runs `fn` whenever `deps` change; ignores stale responses so fast filter changes cannot show old data. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const latest = useRef(0)

  useEffect(() => {
    const id = ++latest.current
    setLoading(true)
    setError(null)
    fn()
      .then((d) => {
        if (id === latest.current) setData(d)
      })
      .catch((e) => {
        if (id === latest.current) setError(errorMessage(e))
      })
      .finally(() => {
        if (id === latest.current) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload }
}
