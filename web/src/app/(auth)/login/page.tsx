'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Informe a senha'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setError('')
    try {
      const res = await api.post('/auth/login', data)
      const { token, user } = res.data
      localStorage.setItem('token', token)
      setUser(user)
      router.push('/home')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao entrar.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-orange px-6">
      <div className="w-full max-w-sm">
        {/* Logo — mesma largura do card branco abaixo */}
        <div className="flex flex-col items-center mb-4">
          <Image
            src="/logo-transparent.png"
            alt="Manahau Va'A"
            width={384}
            height={384}
            priority
            className="w-full drop-shadow-xl"
          />
          <p className="text-orange-100 mt-1 text-sm tracking-wide">Canoa Havaiana — Itaipu</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Entrar</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-center text-sm">
            <Link href="/forgot-password" className="text-brand-orange hover:underline">
              Esqueci minha senha
            </Link>
            <span className="text-gray-400">—</span>
            <Link href="/register" className="text-gray-600 hover:text-brand-orange">
              Crie sua conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
