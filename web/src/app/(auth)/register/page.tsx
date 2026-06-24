'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api'

const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
  birthDate: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não coincidem',
})
type RegisterForm = z.infer<typeof registerSchema>

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = value.padEnd(5, '').split('')

  function handleChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const char = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1)
    const next = [...chars]
    next[idx] = char
    onChange(next.join(''))
    if (char && idx < 4) refs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      const next = [...chars]
      next[idx - 1] = ''
      onChange(next.join(''))
      refs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    onChange(pasted.padEnd(5, ''))
    refs.current[Math.min(pasted.length, 4)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4].map((idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={chars[idx] || ''}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold uppercase border-2 border-gray-300 rounded-xl focus:border-brand-orange focus:outline-none transition-colors text-brand-dark"
        />
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit({ confirmPassword, ...data }: RegisterForm) {
    setError('')
    try {
      await api.post('/auth/register', data)
      setEmail(data.email)
      setStep('verify')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar conta.')
    }
  }

  async function onVerify() {
    if (code.replace(/\s/g, '').length < 5) {
      setError('Digite os 5 caracteres do código.')
      return
    }
    setError('')
    setVerifying(true)
    try {
      await api.post('/auth/verify-email', { email, code: code.trim() })
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido. Tente novamente.')
    } finally {
      setVerifying(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-orange px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Email confirmado!</h2>
          <p className="text-gray-500 text-sm mb-6">Sua conta está ativa. Você já pode entrar no app.</p>
          <Link
            href="/login"
            className="block w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition text-center"
          >
            Entrar
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-orange px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📩</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Verifique seu email</h2>
            <p className="text-gray-500 text-sm">
              Enviamos um código de 5 caracteres para<br />
              <span className="font-medium text-gray-700">{email}</span>
            </p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 text-center mb-4">Digite o código recebido:</p>
            <CodeInput value={code} onChange={setCode} />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">
              {error}
            </p>
          )}

          <button
            onClick={onVerify}
            disabled={verifying}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            {verifying ? 'Verificando...' : 'Confirmar email'}
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Não recebeu?{' '}
            <button
              onClick={() => api.post('/auth/register', {}).catch(() => {})}
              className="text-brand-orange hover:underline"
            >
              Verifique sua caixa de spam.
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-orange px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Image src="/logo-transparent.png" alt="Manahau Va'A" width={90} height={90} className="drop-shadow-md" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Crie sua conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {[
              { label: 'Nome completo', name: 'name' as const, type: 'text', placeholder: 'Seu nome' },
              { label: 'Email', name: 'email' as const, type: 'email', placeholder: 'seu@email.com' },
              { label: 'Data de nascimento', name: 'birthDate' as const, type: 'date', placeholder: '' },
              { label: 'Senha', name: 'password' as const, type: 'password', placeholder: '••••••••' },
              { label: 'Confirmar senha', name: 'confirmPassword' as const, type: 'password', placeholder: '••••••••' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  {...register(field.name)}
                  type={field.type}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                {errors[field.name] && (
                  <p className="text-red-500 text-xs mt-1">{errors[field.name]?.message}</p>
                )}
              </div>
            ))}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {isSubmitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-orange hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
