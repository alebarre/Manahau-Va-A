'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useGlobalLoading } from '@/contexts/loading-context'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// Páginas raiz da nav — sem botão voltar
const ROOT_PAGES = ['/home', '/schedule', '/events', '/shop', '/gallery', '/profile', '/admin', '/remadas']

const PAGE_TITLES: Record<string, string> = {
  '/remadas':         'Remadas',
  '/schedule':        'Agendar remada',
  '/events':          'Eventos',
  '/shop':            'Shop',
  '/gallery':         'Galeria',
  '/profile':         'Meu perfil',
  '/admin':           'Painel admin',
  '/admin/lessons':   'Aulas',
  '/admin/oc1':       'Solicitações OC1',
  '/admin/users':     'Usuários',
  '/admin/photos':    'Fotos',
  '/admin/events':    'Eventos',
  '/admin/products':  'Produtos',
}

export function AppHeader() {
  const router   = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()
  const { isLoading } = useGlobalLoading()

  const isRoot = ROOT_PAGES.some((p) => pathname === p)

  function resolveTitle() {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
    if (pathname.startsWith('/events/'))   return 'Evento'
    if (pathname.startsWith('/shop/'))     return 'Produto'
    if (pathname.startsWith('/admin/'))    return 'Admin'
    return ''
  }
  const title = resolveTitle()

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      {/* Barra de loading global */}
      <div
        className={cn(
          'absolute top-0 left-0 h-0.5 bg-brand-orange transition-all duration-300',
          isLoading ? 'w-full animate-pulse' : 'w-0 opacity-0',
        )}
      />

      <div className="max-w-lg mx-auto flex items-center h-14 px-3 gap-2">
        {/* Botão voltar */}
        {isRoot ? (
          <div className="w-9" />
        ) : (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Centro: logo em home, título nas demais */}
        <div className="flex-1 flex items-center justify-center">
          {pathname === '/home' ? (
            <Image
              src="/logo-transparent.png"
              alt="Manahau Va'A"
              width={40}
              height={40}
              className="h-9 w-auto"
            />
          ) : (
            <span className="font-semibold text-gray-800 text-sm">{title}</span>
          )}
        </div>

        {/* Botão sair — sempre visível */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </header>
  )
}
