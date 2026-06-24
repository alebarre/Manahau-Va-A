'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Users, Calendar, CheckSquare, Image, Trophy, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const { user } = useAuth()

  const { data: pendingOc1 = [] } = useQuery({
    queryKey: ['oc1-pending'],
    queryFn: () => api.get('/oc1/pending').then((r) => r.data as any[]),
  })

  const pendingCount = pendingOc1.length

  const adminCards = [
    {
      label: 'Aulas',
      description: 'Criar e gerenciar aulas',
      icon: Calendar,
      href: '/admin/lessons',
      color: 'bg-brand-orange',
      badge: null,
      adminOnly: false,
    },
    {
      label: 'OC1 pendentes',
      description: 'Confirmar solicitações',
      icon: CheckSquare,
      href: '/admin/oc1',
      color: 'bg-brand-dark',
      badge: pendingCount > 0 ? pendingCount : null,
      adminOnly: false,
    },
    {
      label: 'Usuários',
      description: 'Alunos e professores',
      icon: Users,
      href: '/admin/users',
      color: 'bg-purple-500',
      badge: null,
      adminOnly: true,
    },
    {
      label: 'Eventos',
      description: 'Criar e editar eventos',
      icon: Trophy,
      href: '/admin/events',
      color: 'bg-emerald-500',
      badge: null,
      adminOnly: false,
    },
    {
      label: 'Fotos',
      description: 'Upload da galeria',
      icon: Image,
      href: '/admin/photos',
      color: 'bg-pink-500',
      badge: null,
      adminOnly: false,
    },
    {
      label: 'Produtos',
      description: 'Gerenciar o shop',
      icon: ShoppingBag,
      href: '/admin/products',
      color: 'bg-yellow-500',
      badge: null,
      adminOnly: true,
    },
  ]

  const cards = adminCards.filter((c) => !c.adminOnly || user?.role === 'super_admin')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Painel Admin</h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">{user?.role?.replace('_', ' ')}</p>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              {card.badge !== null && (
                <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {card.badge}
                </span>
              )}
              <div className={cn(card.color, 'w-10 h-10 rounded-xl flex items-center justify-center mb-3')}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{card.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
