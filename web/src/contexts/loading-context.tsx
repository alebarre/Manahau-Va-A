'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type LoadingCtx = { isLoading: boolean }
const LoadingContext = createContext<LoadingCtx>({ isLoading: false })

// Handlers acessíveis fora do React (usados pelo axios interceptor)
let _inc: (() => void) | null = null
let _dec: (() => void) | null = null
export function _setLoadingHandlers(inc: () => void, dec: () => void) {
  _inc = inc
  _dec = dec
}
export function apiLoadingStart() { _inc?.() }
export function apiLoadingEnd()   { _dec?.() }

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    _setLoadingHandlers(
      () => setCount((c) => c + 1),
      () => setCount((c) => Math.max(0, c - 1)),
    )
  }, [])

  return (
    <LoadingContext.Provider value={{ isLoading: count > 0 }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  return useContext(LoadingContext)
}
