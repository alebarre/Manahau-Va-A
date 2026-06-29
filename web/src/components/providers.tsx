'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/auth-context'
import { LoadingProvider } from '@/contexts/loading-context'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }))

  useEffect(() => {
    // Warm up the API + DB connection pool so the first user action is instant
    api.get('/health').catch(() => {})
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <AuthProvider>{children}</AuthProvider>
      </LoadingProvider>
    </QueryClientProvider>
  )
}
