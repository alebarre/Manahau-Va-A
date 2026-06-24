'use client'

import Image from 'next/image'

export function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-brand-orange z-50">
      <div className="animate-splash-grow w-72 flex items-center justify-center">
        <Image
          src="/logo-transparent.png"
          alt="Manahau Va'A"
          width={500}
          height={500}
          priority
          className="w-full drop-shadow-2xl"
        />
      </div>
    </div>
  )
}
