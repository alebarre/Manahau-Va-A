'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  birthDate: z.string().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'text-green-600 bg-green-50' },
  pending: { label: 'Pendente', color: 'text-yellow-600 bg-yellow-50' },
  cancelled: { label: 'Cancelado', color: 'text-red-500 bg-red-50' },
}


export default function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'profile' | 'bookings' | 'oc1'>('profile')
  const [saved, setSaved] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then((r) => r.data),
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then((r) => r.data),
    enabled: tab === 'bookings',
  })

  const { data: oc1Requests = [] } = useQuery({
    queryKey: ['my-oc1'],
    queryFn: () => api.get('/oc1/my').then((r) => r.data),
    enabled: tab === 'oc1',
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      name: profile?.name || '',
      birthDate: profile?.birthDate ? format(new Date(profile.birthDate), 'yyyy-MM-dd') : '',
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.patch('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const cancelBookingMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/bookings/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
  })

  const tabs = [
    { key: 'profile', label: 'Perfil' },
    { key: 'bookings', label: 'Remadas' },
    { key: 'oc1', label: 'OC1' },
  ] as const

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-brand-orange flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Perfil */}
      {tab === 'profile' && (
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              {...register('name')}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={profile?.email || ''}
              disabled
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
            <input
              {...register('birthDate')}
              type="date"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>

          {saved && (
            <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              Perfil atualizado!
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      )}

      {/* Tab: Remadas */}
      {tab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum agendamento ainda.</p>
            </div>
          ) : (
            bookings.map((b: any) => {
              const st = STATUS_LABELS[b.status]
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900">
                      {format(new Date(b.lesson.date), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', st.color)}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {b.lesson.classTime} — OC6
                  </div>
                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => cancelBookingMutation.mutate(b.id)}
                      className="mt-3 text-xs text-red-500 hover:underline"
                    >
                      Cancelar agendamento
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: OC1 */}
      {tab === 'oc1' && (
        <div className="space-y-3">
          {oc1Requests.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma solicitação OC1.</p>
            </div>
          ) : (
            oc1Requests.map((r: any) => {
              const st = STATUS_LABELS[r.status]
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900">
                      {format(new Date(r.lesson.date), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', st.color)}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {r.lesson.classTime} — OC1 individual
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
