'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Users, CheckCircle, AlertCircle, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type BookedUser = {
  id: string
  status?: string
  user?: { id: string; name: string; avatarUrl: string | null }
}

type Oc1Request = {
  id: string
  status: string
  user?: { id: string; name: string; avatarUrl: string | null }
}

type Lesson = {
  id: string
  date: string
  classTime: string
  classType: 'OC6' | 'OC1'
  maxSpots: number
  notes: string | null
  _count: { bookings: number }
  bookings: BookedUser[]
  oc1Requests: Oc1Request[]
}

function arriveTime(classTime: string) {
  const [h, m] = classTime.split(':').map(Number)
  const d = new Date(0, 0, 0, h, m - 30)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function RemadasPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isStaff = user?.role === 'professor' || user?.role === 'super_admin'

  const { data: lessons = [], isLoading, isError } = useQuery<Lesson[]>({
    queryKey: ['remadas-all'],
    queryFn: () => api.get('/lessons').then((r) => r.data),
    enabled: isStaff,
  })

  // Aluno: próprias remadas (OC6 + OC1)
  const { data: myBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/my').then((r) => r.data),
    enabled: !isStaff,
  })

  const { data: myOc1 = [], isLoading: loadingOc1 } = useQuery({
    queryKey: ['my-oc1'],
    queryFn: () => api.get('/oc1/my').then((r) => r.data),
    enabled: !isStaff,
  })

  const cancelBookingMutation = useMutation({
    mutationFn: ({ id, justification }: { id: string; justification: string }) =>
      api.patch(`/bookings/${id}/cancel`, { justification }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['remadas-count'] })
    },
  })

  const bookMutation = useMutation({
    mutationFn: (lessonId: string) => api.post('/bookings', { lessonId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['remadas-all'] }),
  })

  const oc1RequestMutation = useMutation({
    mutationFn: (lessonId: string) => api.post('/oc1/request', { lessonId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['remadas-all'] }),
  })

  const oc1ConfirmMutation = useMutation({
    mutationFn: (reqId: string) => api.patch(`/oc1/${reqId}/status`, { status: 'confirmed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['remadas-all'] }),
  })

  const oc1StaffCancelMutation = useMutation({
    mutationFn: (reqId: string) => api.patch(`/oc1/${reqId}/status`, { status: 'cancelled' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['remadas-all'] }),
  })

  const oc1AlunoCancelMutation = useMutation({
    mutationFn: ({ reqId, justification }: { reqId: string; justification: string }) =>
      api.patch(`/oc1/${reqId}/cancel`, { justification }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remadas-all'] })
      queryClient.invalidateQueries({ queryKey: ['my-oc1'] })
    },
  })

  const byDate = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    const key = lesson.date.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(lesson)
    return acc
  }, {})

  const dateSections = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))

  // ── Aluno: minhas remadas (OC6 + OC1 mesclados) ──────────────────────────────
  if (!isStaff) {
    const loading = loadingBookings || loadingOc1
    const today = new Date(); today.setHours(0, 0, 0, 0)

    type MyItem =
      | { kind: 'OC6'; id: string; status: string; lessonDate: string; classTime: string }
      | { kind: 'OC1'; id: string; status: string; lessonDate: string; classTime: string }

    const oc6Items: MyItem[] = (myBookings as any[])
      .filter((b) => new Date(b.lesson.date) >= today)
      .map((b) => ({ kind: 'OC6', id: b.id, status: b.status, lessonDate: b.lesson.date, classTime: b.lesson.classTime }))

    const oc1Items: MyItem[] = (myOc1 as any[])
      .filter((r) => new Date(r.lesson.date) >= today && r.status !== 'cancelled')
      .map((r) => ({ kind: 'OC1', id: r.id, status: r.status, lessonDate: r.lesson.date, classTime: r.lesson.classTime }))

    const allItems = [...oc6Items, ...oc1Items].sort((a, b) => a.lessonDate.localeCompare(b.lessonDate))

    return (
      <div className="max-w-lg mx-auto px-4 py-5">
        <p className="text-sm text-gray-500 mb-5">Suas remadas agendadas a partir de hoje.</p>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Spinner className="w-7 h-7 text-brand-orange" />
            <p className="text-sm">Carregando…</p>
          </div>
        )}

        {!loading && allItems.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🛶</p>
            <p className="font-medium text-gray-600">Nenhuma remada agendada.</p>
            <p className="text-sm mt-1">Vá em "Agendar" para reservar sua próxima remada.</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {allItems.map((item) => (
              <MyRemadaCard
                key={`${item.kind}-${item.id}`}
                item={item}
                onCancelOc6={(justification) => cancelBookingMutation.mutate({ id: item.id, justification })}
                onCancelOc1={(justification) => oc1AlunoCancelMutation.mutate({ reqId: item.id, justification })}
                cancelling={cancelBookingMutation.isPending || oc1AlunoCancelMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Staff: gerenciamento de aulas ─────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <p className="text-sm text-gray-500 mb-5">Todas as remadas abertas a partir de hoje.</p>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Spinner className="w-7 h-7 text-brand-orange" />
          <p className="text-sm">Carregando remadas…</p>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Não foi possível carregar as remadas. Verifique sua conexão.
        </div>
      )}

      {!isLoading && !isError && lessons.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛶</p>
          <p className="font-medium text-gray-600">Nenhuma remada aberta no momento.</p>
          <p className="text-sm mt-1">Crie aulas no painel admin.</p>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-8">
          {dateSections.map(([dateKey, dayLessons]) => {
            const dateObj = new Date(dateKey + 'T00:00:00')
            const oc6 = dayLessons.filter((l) => l.classType === 'OC6')
            const oc1 = dayLessons.filter((l) => l.classType === 'OC1')
            return (
              <section key={dateKey}>
                <h2 className="text-sm font-bold text-gray-800 mb-3 capitalize">
                  {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h2>
                <div className="space-y-3">
                  {oc6.map((lesson) => (
                    <Oc6Card
                      key={lesson.id}
                      lesson={lesson}
                      isStaff={isStaff}
                      onBook={() => bookMutation.mutate(lesson.id)}
                      booking={bookMutation}
                      lessonId={lesson.id}
                    />
                  ))}
                  {oc1.map((lesson) => (
                    <Oc1Card
                      key={lesson.id}
                      lesson={lesson}
                      isStaff={isStaff}
                      onRequest={() => oc1RequestMutation.mutate(lesson.id)}
                      onConfirm={(reqId) => oc1ConfirmMutation.mutate(reqId)}
                      onStaffCancel={(reqId) => oc1StaffCancelMutation.mutate(reqId)}
                      onAlunoCancel={(reqId, just) => oc1AlunoCancelMutation.mutate({ reqId, justification: just })}
                      requestLoading={oc1RequestMutation.isPending}
                      confirmLoading={oc1ConfirmMutation.isPending}
                      cancelLoading={oc1StaffCancelMutation.isPending || oc1AlunoCancelMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Aluno: card de remada agendada ──────────────────────────────────────────

type MyRemadaItem = {
  kind: 'OC6' | 'OC1'
  id: string
  status: string
  lessonDate: string
  classTime: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'text-green-600 bg-green-50 border-green-200' },
  pending:   { label: 'Pendente',   color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  cancelled: { label: 'Cancelado',  color: 'text-red-500 bg-red-50 border-red-200' },
}

function MyRemadaCard({
  item, onCancelOc6, onCancelOc1, cancelling,
}: {
  item: MyRemadaItem
  onCancelOc6: (justification: string) => void
  onCancelOc1: (justification: string) => void
  cancelling: boolean
}) {
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [justification, setJustification] = useState('')
  const [wordError, setWordError] = useState('')

  const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.confirmed
  const dateObj = new Date(item.lessonDate.slice(0, 10) + 'T12:00:00')

  const canCancel =
    (item.kind === 'OC6' && item.status === 'confirmed') ||
    (item.kind === 'OC1' && item.status !== 'cancelled')

  function handleCancel() {
    const words = justification.trim().split(/\s+/).filter(Boolean).length
    if (words < 5)  { setWordError('Mínimo de 5 palavras.'); return }
    if (words > 50) { setWordError('Máximo de 50 palavras.'); return }
    setWordError('')
    if (item.kind === 'OC6') onCancelOc6(justification)
    else onCancelOc1(justification)
    setShowCancelForm(false)
    setJustification('')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-gray-900">
          {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {item.kind}
          </span>
          <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', st.color)}>
            {st.label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
        <Clock className="w-3.5 h-3.5" />
        {item.classTime} — chegada {arriveTime(item.classTime)}
      </div>

      {canCancel && !showCancelForm && (
        <button
          onClick={() => setShowCancelForm(true)}
          className="text-xs text-red-500 hover:underline"
        >
          {item.kind === 'OC6' ? 'Cancelar agendamento' : 'Cancelar solicitação'}
        </button>
      )}

      {canCancel && showCancelForm && (
        <div className="space-y-2 mt-1">
          <label className="block text-xs font-medium text-gray-600">
            Justificativa <span className="text-gray-400">(5 a 50 palavras)</span>
          </label>
          <textarea
            value={justification}
            onChange={(e) => { setJustification(e.target.value); setWordError('') }}
            rows={3}
            placeholder="Explique o motivo do cancelamento..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className={cn('text-xs', justification.trim().split(/\s+/).filter(Boolean).length < 5 ? 'text-red-500' : 'text-gray-400')}>
              {justification.trim().split(/\s+/).filter(Boolean).length} / 50 palavras
            </span>
            {wordError && <span className="text-xs text-red-500">{wordError}</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCancelForm(false); setJustification(''); setWordError('') }}
              className="flex-1 text-sm text-gray-500 border border-gray-200 py-2 rounded-xl hover:bg-gray-50 transition"
            >
              Voltar
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition"
            >
              {cancelling ? 'Enviando…' : 'Confirmar cancelamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── OC6 Card ────────────────────────────────────────────────────────────────

function Oc6Card({
  lesson, isStaff, onBook, booking, lessonId,
}: {
  lesson: Lesson
  isStaff: boolean
  onBook: () => void
  booking: any
  lessonId: string
}) {
  const spots     = lesson.maxSpots - lesson._count.bookings
  const full      = spots <= 0
  const isBooked  = lesson.bookings.some((b) => !b.user)
  const isMutating = booking.isPending && booking.variables === lessonId

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <CardHeader lesson={lesson} badge="OC6" badgeColor="brand-orange">
        <span className={cn(
          'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
          full ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600',
        )}>
          <Users className="w-3 h-3" />
          {full ? 'Lotado' : `${spots} vaga${spots !== 1 ? 's' : ''}`}
        </span>
      </CardHeader>

      {lesson.notes && <CardNotes notes={lesson.notes} />}

      {/* Lista de alunos (staff) */}
      {isStaff && lesson.bookings.some((b) => b.user) && (
        <div className="mb-3 space-y-1.5">
          {lesson.bookings.filter((b) => b.user).map((b, i) => (
            <UserRow key={b.id} index={i + 1} user={b.user!} />
          ))}
        </div>
      )}

      {/* Status do próprio aluno */}
      {!isStaff && isBooked && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Você já está agendado nesta canoa.
        </div>
      )}

      {!isStaff && (
        <Button
          onClick={onBook}
          loading={isMutating}
          disabled={full || isBooked}
          variant={isBooked ? 'secondary' : 'primary'}
        >
          {isBooked ? '✓ Agendado' : full ? 'Sem vagas' : 'Agendar'}
        </Button>
      )}
    </div>
  )
}

// ─── OC1 Card ────────────────────────────────────────────────────────────────

function Oc1Card({
  lesson, isStaff,
  onRequest, onConfirm, onStaffCancel, onAlunoCancel,
  requestLoading, confirmLoading, cancelLoading,
}: {
  lesson: Lesson
  isStaff: boolean
  onRequest: () => void
  onConfirm: (reqId: string) => void
  onStaffCancel: (reqId: string) => void
  onAlunoCancel: (reqId: string, justification: string) => void
  requestLoading: boolean
  confirmLoading: boolean
  cancelLoading: boolean
}) {
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [justification, setJustification] = useState('')
  const [wordError, setWordError] = useState('')

  const myRequest  = lesson.oc1Requests.find((r) => !r.user) // aluno's own request
  const staffRequest = lesson.oc1Requests[0]                  // for staff view

  function handleAlunoCancel() {
    const words = countWords(justification)
    if (words < 5)  { setWordError('Mínimo de 5 palavras.'); return }
    if (words > 50) { setWordError('Máximo de 50 palavras.'); return }
    setWordError('')
    onAlunoCancel(myRequest!.id, justification)
    setShowCancelForm(false)
    setJustification('')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <CardHeader lesson={lesson} badge="OC1" badgeColor="brand-dark" />

      {lesson.notes && <CardNotes notes={lesson.notes} />}

      {/* ── Staff view ── */}
      {isStaff && (
        <>
          {staffRequest?.user ? (
            <div className="mb-3 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">Solicitante</p>
              <div className="flex items-center justify-between">
                <UserRow index={0} user={staffRequest.user} showIndex={false} />
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  staffRequest.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700',
                )}>
                  {staffRequest.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onConfirm(staffRequest.id)}
                  disabled={confirmLoading || staffRequest.status === 'confirmed'}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition"
                >
                  {staffRequest.status === 'confirmed' ? '✓ Confirmado' : 'Confirmar'}
                </button>
                <button
                  onClick={() => onStaffCancel(staffRequest.id)}
                  disabled={cancelLoading}
                  className="flex-1 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-600 text-sm font-semibold py-2 rounded-xl transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 mb-3 text-center">
              Nenhuma solicitação para esta aula.
            </p>
          )}
        </>
      )}

      {/* ── Aluno view ── */}
      {!isStaff && (
        <>
          {myRequest ? (
            <>
              <div className={cn(
                'flex items-center gap-2 text-sm rounded-xl px-3 py-2 mb-3',
                myRequest.status === 'confirmed'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-700',
              )}>
                <CheckCircle className="w-4 h-4 shrink-0" />
                {myRequest.status === 'confirmed'
                  ? 'Aula confirmada pelo professor!'
                  : 'Aguardando confirmação do professor.'}
              </div>

              {!showCancelForm ? (
                <button
                  onClick={() => setShowCancelForm(true)}
                  className="w-full text-sm text-red-500 hover:text-red-600 border border-red-200 hover:bg-red-50 py-2.5 rounded-xl transition font-medium"
                >
                  Cancelar solicitação
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Justificativa do cancelamento <span className="text-gray-400">(5 a 50 palavras)</span>
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => { setJustification(e.target.value); setWordError('') }}
                    rows={3}
                    placeholder="Explique o motivo do cancelamento..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs', countWords(justification) < 5 || countWords(justification) > 50 ? 'text-red-500' : 'text-gray-400')}>
                      {countWords(justification)} / 50 palavras
                    </span>
                    {wordError && <span className="text-xs text-red-500">{wordError}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCancelForm(false); setJustification(''); setWordError('') }}
                      className="flex-1 text-sm text-gray-500 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleAlunoCancel}
                      disabled={cancelLoading}
                      className="flex-1 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
                    >
                      {cancelLoading ? 'Enviando...' : 'Confirmar cancelamento'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-3">
                Aula individual com professor. Após solicitar, aguarde a confirmação.
              </p>
              <Button
                onClick={onRequest}
                loading={requestLoading}
                className="bg-brand-dark hover:bg-brand-dark-muted text-white"
              >
                Solicitar aula OC1
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function CardHeader({
  lesson, badge, badgeColor, children,
}: {
  lesson: Lesson
  badge: string
  badgeColor: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className={cn('p-2 rounded-xl', `bg-${badgeColor}/10`)}>
          <Clock className={cn('w-4 h-4', `text-${badgeColor}`)} />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg leading-none">{lesson.classTime}</p>
          <p className="text-xs text-gray-400 mt-0.5">Chegada: {arriveTime(lesson.classTime)}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', `bg-${badgeColor}/10 text-${badgeColor}`)}>
          {badge}
        </span>
        {children}
      </div>
    </div>
  )
}

function CardNotes({ notes }: { notes: string }) {
  return (
    <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3">{notes}</p>
  )
}

function UserRow({
  index, user, showIndex = true,
}: {
  index: number
  user: { id: string; name: string; avatarUrl: string | null }
  showIndex?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      {showIndex && (
        <span className="w-4 text-xs text-gray-400 text-right shrink-0">{index}</span>
      )}
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-brand-orange/20 text-brand-orange text-[10px] font-bold flex items-center justify-center shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="truncate">{user.name}</span>
    </div>
  )
}
