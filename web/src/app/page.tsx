'use client'

import { useEffect, useState } from 'react'
import { SplashScreen } from '@/components/splash-screen'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const [showSplash, setShowSplash] = useState(true)
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!showSplash && !isLoading) {
      if (user) {
        router.replace('/home')
      } else {
        router.replace('/login')
      }
    }
  }, [showSplash, isLoading, user, router])

  return <SplashScreen />
}
