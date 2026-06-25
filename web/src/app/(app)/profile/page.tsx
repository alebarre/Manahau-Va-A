'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Camera, Calendar, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  birthDate: z.string().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'text-green-700 bg-green-50 border-green-200' },
  pending:   { label: 'Pendente',   color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  cancelled: { label: 'Cancelado',  color: 'text-red-500 bg-red-50 border-red-200' },
}

function arriveTime(classTime: string) {
  const [h, m] = classTime.split(':').map(Number)
  const d = new Date(0, 0, 0, h, m - 30)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function AvatarButton({
  name,
  avatarUrl,
  onUpload,
  uploading,
}: {
  name: string
  avatarUrl?: string | null
  onUpload: (file: File) => void
  uploading: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onUpload(file)
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={uploading}
      className="relative w-20 h-20 rounded-full flex-shrink-0 group focus:outline-none"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-20 h-20 rounded-full object-cover"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-brand-orange flex items-center justify-center">
          <span className="text-white font-bold text-2xl">{initials}</span>
        </div>
      )}

      {/* Overlay */}
      <span className={cn(
        'absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-opacity',
        uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        {uploading ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Camera className="w-6 h-6 text-white" />
        )}
      </span>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'profile' | 'bookings' | 'oc1'>('profile')
  const [saved, setSaved] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelJust, setCancelJust] = useState('')
  const [cancelWordErr, setCancelWordErr] = useState('')

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then((r) => r.data),
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then((r) => r.data),
  })

  const { data: oc1Requests = [] } = useQuery({
    queryKey: ['my-oc1'],
    queryFn: () => api.get('/oc1/my').then((r) => r.data),
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

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setAvatarError('')
    },
    onError: (err: any) => {
      setAvatarError(err.response?.data?.message || 'Erro ao enviar foto.')
    },
  })

  function handleAvatarUpload(file: File) {
    setAvatarError('')
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setAvatarError('Formato inválido. Use JPG, PNG ou WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Imagem muito grande. Máximo 2MB.')
      return
    }
    avatarMutation.mutate(file)
  }

  const cancelBookingMutation = useMutation({
    mutationFn: ({ id, justification }: { id: string; justification: string }) =>
      api.patch(`/bookings/${id}/cancel`, { justification }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      setCancellingId(null)
      setCancelJust('')
    },
    onError: (err: any) => setCancelWordErr(err.response?.data?.message || 'Erro ao cancelar.'),
  })

  function handleCancelBooking(id: string) {
    const words = cancelJust.trim().split(/\s+/).filter(Boolean).length
    if (words < 5)  { setCancelWordErr('Mínimo de 5 palavras.'); return }
    if (words > 50) { setCancelWordErr('Máximo de 50 palavras.'); return }
    setCancelWordErr('')
    cancelBookingMutation.mutate({ id, justification: cancelJust })
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const upcomingOc6Count = (bookings as any[]).filter(
    (b) => b.status === 'confirmed' && new Date(b.lesson.date) >= today
  ).length

  const upcomingOc1Count = (oc1Requests as any[]).filter(
    (r) => r.status !== 'cancelled' && new Date(r.lesson.date) >= today
  ).length

  const tabs = [
    { key: 'profile',  label: 'Perfil',   badge: null },
    { key: 'bookings', label: 'Remadas',  badge: upcomingOc6Count || null },
    { key: 'oc1',      label: 'OC1',      badge: upcomingOc1Count || null },
  ] as const

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header com avatar */}
      <div className="flex items-center gap-4 mb-6">
        <AvatarButton
          name={profile?.name || user?.name || '?'}
          avatarUrl={profile?.avatarUrl}
          onUpload={handleAvatarUpload}
          uploading={avatarMutation.isPending}
        />
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          {avatarError && (
            <p className="text-xs text-red-500 mt-0.5">{avatarError}</p>
          )}
          {avatarMutation.isSuccess && (
            <p className="text-xs text-green-600 mt-0.5">Foto atualizada!</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Toque na foto para alterar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            )}
          >
            {t.label}
            {t.badge !== null && (
              <span className="bg-brand-orange text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                {t.badge}
              </span>
            )}
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

      {/* Tab: Remadas (OC6) */}
      {tab === 'bookings' && (() => {
        const sorted = [...(bookings as any[])].sort(
          (a, b) => a.lesson.date.localeCompare(b.lesson.date)
        )
        const upcoming = sorted.filter((b) => new Date(b.lesson.date) >= today && b.status !== 'cancelled')
        const past     = sorted.filter((b) => new Date(b.lesson.date) <  today || b.status === 'cancelled')

        if (sorted.length === 0) return (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-gray-500">Nenhuma remada OC6 ainda.</p>
            <p className="text-sm mt-1">Vá em "Agendar" para reservar.</p>
          </div>
        )

        function BookingCard({ b }: { b: any }) {
          const st = STATUS_LABELS[b.status]
          const date = new Date(b.lesson.date.slice(0, 10) + 'T12:00:00')
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-400 capitalize">
                    {format(date, 'EEEE', { locale: ptBR })}
                  </p>
                  <p className="font-bold text-gray-900">
                    {format(date, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0', st.color)}>
                  {st.label}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {b.lesson.classTime}
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Praia às {arriveTime(b.lesson.classTime)}
                </span>
              </div>
              {b.status === 'confirmed' && new Date(b.lesson.date) >= today && (
                cancellingId === b.id ? (
                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-medium text-gray-600">
                      Justificativa <span className="text-gray-400">(5 a 50 palavras)</span>
                    </label>
                    <textarea
                      value={cancelJust}
                      onChange={(e) => { setCancelJust(e.target.value); setCancelWordErr('') }}
                      rows={3}
                      placeholder="Explique o motivo do cancelamento..."
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs', cancelJust.trim().split(/\s+/).filter(Boolean).length < 5 ? 'text-red-400' : 'text-gray-400')}>
                        {cancelJust.trim().split(/\s+/).filter(Boolean).length} / 50 palavras
                      </span>
                      {cancelWordErr && <span className="text-xs text-red-500">{cancelWordErr}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setCancellingId(null); setCancelJust(''); setCancelWordErr('') }}
                        className="flex-1 text-sm text-gray-500 border border-gray-200 py-2 rounded-xl hover:bg-gray-50 transition"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={cancelBookingMutation.isPending}
                        className="flex-1 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition"
                      >
                        {cancelBookingMutation.isPending ? 'Enviando…' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCancellingId(b.id); setCancelJust(''); setCancelWordErr('') }}
                    className="mt-3 text-xs text-red-500 hover:text-red-600 hover:underline"
                  >
                    Cancelar agendamento
                  </button>
                )
              )}
            </div>
          )
        }

        return (
          <div className="space-y-5">
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Próximas</p>
                {upcoming.map((b: any) => <BookingCard key={b.id} b={b} />)}
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Histórico</p>
                {past.map((b: any) => (
                  <div key={b.id} className="opacity-60">
                    <BookingCard b={b} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Tab: OC1 */}
      {tab === 'oc1' && (() => {
        const sorted = [...(oc1Requests as any[])].sort(
          (a, b) => a.lesson.date.localeCompare(b.lesson.date)
        )
        const upcoming = sorted.filter((r) => new Date(r.lesson.date) >= today && r.status !== 'cancelled')
        const past     = sorted.filter((r) => new Date(r.lesson.date) <  today || r.status === 'cancelled')

        if (sorted.length === 0) return (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-gray-500">Nenhuma aula OC1 ainda.</p>
            <p className="text-sm mt-1">Solicite via "Remadas".</p>
          </div>
        )

        function Oc1Card({ r }: { r: any }) {
          const st = STATUS_LABELS[r.status]
          const date = new Date(r.lesson.date.slice(0, 10) + 'T12:00:00')
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-400 capitalize">
                    {format(date, 'EEEE', { locale: ptBR })}
                  </p>
                  <p className="font-bold text-gray-900">
                    {format(date, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0', st.color)}>
                  {st.label}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {r.lesson.classTime}
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Praia às {arriveTime(r.lesson.classTime)}
                </span>
              </div>
              {r.status === 'pending' && (
                <p className="mt-2 text-xs text-yellow-600 bg-yellow-50 rounded-lg px-2.5 py-1.5">
                  Aguardando confirmação do professor.
                </p>
              )}
              {r.status === 'confirmed' && new Date(r.lesson.date) >= today && (
                <p className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">
                  Aula confirmada! Prepare-se.
                </p>
              )}
            </div>
          )
        }

        return (
          <div className="space-y-5">
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Próximas</p>
                {upcoming.map((r: any) => <Oc1Card key={r.id} r={r} />)}
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Histórico</p>
                {past.map((r: any) => (
                  <div key={r.id} className="opacity-60">
                    <Oc1Card r={r} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
