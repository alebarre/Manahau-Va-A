'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { api } from '@/lib/api'

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

const emailSchema = z.object({ email: z.string().email('Email inválido') })
const passwordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas não coincidem',
})
type EmailForm = z.infer<typeof emailSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submittingCode, setSubmittingCode] = useState(false)

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) })
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  async function onEmailSubmit({ email: e }: EmailForm) {
    setError('')
    try {
      await api.post('/auth/forgot-password', { email: e })
      setEmail(e)
      setStep('code')
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    }
  }

  async function onCodeSubmit() {
    if (code.replace(/\s/g, '').length < 5) {
      setError('Digite os 5 caracteres do código.')
      return
    }
    setError('')
    setStep('password')
  }

  async function onPasswordSubmit({ password }: PasswordForm) {
    setError('')
    setSubmittingCode(true)
    try {
      await api.post('/auth/reset-password', { email, code: code.trim(), password })
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido ou expirado.')
      setStep('code')
      setCode('')
    } finally {
      setSubmittingCode(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-orange px-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-6">

          {step === 'email' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Esqueci minha senha</h2>
              <p className="text-gray-500 text-sm mb-5">
                Informe seu email e enviaremos um código para redefinir sua senha.
              </p>

              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    {...emailForm.register('email')}
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                {error && (
                  <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={emailForm.formState.isSubmitting}
                  className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
                >
                  {emailForm.formState.isSubmitting ? 'Enviando...' : 'Enviar código'}
                </button>
              </form>

              <Link href="/login" className="mt-4 block text-center text-sm text-gray-500 hover:text-brand-orange">
                Voltar ao login
              </Link>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📩</div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Código enviado!</h2>
                <p className="text-gray-500 text-sm">
                  Enviamos um código para<br />
                  <span className="font-medium text-gray-700">{email}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">O código expira em 15 minutos.</p>
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
                onClick={onCodeSubmit}
                className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition"
              >
                Continuar
              </button>

              <button
                onClick={() => { setStep('email'); setCode(''); setError('') }}
                className="mt-3 w-full text-sm text-gray-500 hover:text-brand-orange text-center"
              >
                Voltar
              </button>
            </>
          )}

          {step === 'password' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Nova senha</h2>
              <p className="text-gray-500 text-sm mb-5">Escolha uma nova senha para sua conta.</p>

              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                  <input
                    {...passwordForm.register('password')}
                    type="password"
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                  {passwordForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                  <input
                    {...passwordForm.register('confirmPassword')}
                    type="password"
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                {error && (
                  <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting || submittingCode}
                  className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
                >
                  {passwordForm.formState.isSubmitting || submittingCode ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Senha redefinida!</h2>
              <p className="text-gray-500 text-sm mb-6">Sua nova senha está ativa. Você já pode entrar no app.</p>
              <Link
                href="/login"
                className="block w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition text-center"
              >
                Entrar
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
