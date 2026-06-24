'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role === 'aluno') {
      router.replace('/home')
    }
  }, [user, isLoading, router])

  if (isLoading) return null
  if (user?.role === 'aluno') return null

  return <>{children}</>
}
