'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Home, ShoppingBag, Trophy, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [
    { href: '/home', icon: Home, label: 'Início' },
    { href: '/schedule', icon: Calendar, label: 'Agendar' },
    { href: '/events', icon: Trophy, label: 'Eventos' },
    { href: '/shop', icon: ShoppingBag, label: 'Shop' },
    ...(user?.role !== 'aluno'
      ? [{ href: '/admin', icon: Settings, label: 'Admin' }]
      : [{ href: '/profile', icon: User, label: 'Perfil' }]),
    ...(user?.role !== 'aluno'
      ? [{ href: '/profile', icon: User, label: 'Perfil' }]
      : []),
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-lg z-40">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition',
                active ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
