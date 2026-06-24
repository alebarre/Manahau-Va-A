'use client'

import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ShoppingBag, Image as ImageIcon, Trophy, User, Waves } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const { user } = useAuth()

  const { data: photos } = useQuery({
    queryKey: ['photos', 'featured'],
    queryFn: () => api.get('/photos?featured=true&limit=6').then((r) => r.data),
  })

  const { data: openLessons } = useQuery({
    queryKey: ['remadas-count'],
    queryFn: () => api.get('/lessons').then((r) => r.data as any[]),
  })

  const openCount = openLessons?.length ?? 0

  const appCards = [
    { label: 'Remadas', icon: Waves, href: '/remadas', color: 'bg-teal-500', badge: openCount > 0 ? openCount : null },
    { label: 'Agendar', icon: Calendar, href: '/schedule', color: 'bg-brand-orange', badge: null },
    { label: 'Eventos', icon: Trophy, href: '/events', color: 'bg-brand-dark', badge: null },
    { label: 'Shop', icon: ShoppingBag, href: '/shop', color: 'bg-emerald-500', badge: null },
    { label: 'Galeria', icon: ImageIcon, href: '/gallery', color: 'bg-purple-500', badge: null },
    { label: 'Meu perfil', icon: User, href: '/profile', color: 'bg-gray-500', badge: null },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Saudação */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Bem-vindo,</p>
        <h1 className="text-2xl font-bold text-gray-900">{user?.name?.split(' ')[0]} 🌊</h1>
      </div>

      {/* Fotos em destaque */}
      {photos && photos.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700">Últimas remadas</h2>
            <Link href="/gallery" className="text-xs text-brand-orange font-medium">Ver tudo</Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo: any) => (
              <Link key={photo.id} href="/gallery" className="aspect-square relative rounded-xl overflow-hidden block">
                <Image
                  src={photo.url}
                  alt={photo.caption || 'Foto da remada'}
                  fill
                  className="object-cover hover:scale-105 transition"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cards de navegação */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">O que você quer fazer?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {appCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="relative flex flex-col items-center justify-center gap-2 rounded-2xl bg-white shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
            >
              {card.badge !== null && (
                <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {card.badge}
                </span>
              )}
              <div className={cn(card.color, 'p-3 rounded-xl')}>
                <card.icon className="text-white w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">{card.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
