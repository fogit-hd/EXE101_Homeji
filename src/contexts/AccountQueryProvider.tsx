import { useEffect, useMemo, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiRequestError, getStoredSession } from '../api/client'
import { useAuth } from './AuthContext'
import { SAVED_POSTS_CHANGED, savedPostsKey } from '../lib/queryKeys'

export function AccountQueryProvider({ children }: { children: ReactNode }) {
  const { profile, isAuthenticated } = useAuth()
  const accountId = isAuthenticated ? profile?.id ?? getStoredSession()?.userId ?? null : null
  const accountScope = `${isAuthenticated}:${accountId}`
  // A new client isolates both cached values and in-flight requests on account changes.
  const client = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        meta: { accountScope },
        staleTime: 30_000,
        gcTime: 120_000,
        retry: (attempt, error) => attempt < 1 && !(error instanceof ApiRequestError && error.status < 500),
      },
      mutations: { retry: false },
    },
  }), [accountScope])

  useEffect(() => {
    const invalidateSaved = () => { void client.invalidateQueries({ queryKey: savedPostsKey(accountId) }) }
    window.addEventListener(SAVED_POSTS_CHANGED, invalidateSaved)
    return () => {
      window.removeEventListener(SAVED_POSTS_CHANGED, invalidateSaved)
      client.clear()
    }
  }, [client, accountId])

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
