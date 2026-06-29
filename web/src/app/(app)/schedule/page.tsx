'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format, addDays, startOfToday, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type Lesson = {
  id: string
  date: string
  classTime: string
  classType: 'OC6' | 'OC1'
  maxSpots: number
  notes: string | null
  _count: { bookings: number }
}

type LessonState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
}

function arriveTime(classTime: string) {
  const [h, m] = classTime.split(':').map(Number)
  const d = new Date(0, 0, 0, h, m - 30)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(startOfToday())
  // Estado por lessonId: { status, message }
  const [lessonStates, setLessonStates] = useState<Record<string, LessonState>>({})
  const queryClient = useQueryClient()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i))

  const { data: lessons = [], isLoading, isError } = useQuery<Lesson[]>({
    queryKey: ['lessons', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () =>
      api
        .get(`/lessons?from=${format(selectedDate, 'yyyy-MM-dd')}&to=${format(selectedDate, 'yyyy-MM-dd')}`)
        .then((r) => r.data),
  })

  function setLessonState(id: string, state: LessonState) {
    setLessonStates((prev) => ({ ...prev, [id]: state }))
  }

  const bookMutation = useMutation({
    mutationFn: (lessonId: string) => api.post('/bookings', { lessonId }),
    onMutate: (lessonId) => {
      setLessonState(lessonId, { status: 'loading' })
    },
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      setLessonState(lessonId, { status: 'success', message: 'Remada agendada com sucesso!' })
    },
    onError: (err: any, lessonId) => {
      setLessonState(lessonId, {
        status: 'error',
        message: err.response?.data?.message || 'Erro ao agendar. Tente novamente.',
      })
    },
  })

  const oc1Mutation = useMutation({
    mutationFn: (lessonId: string) => api.post('/oc1/request', { lessonId }),
    onMutate: (lessonId) => {
      setLessonState(lessonId, { status: 'loading' })
    },
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ['my-oc1'] })
      queryClient.invalidateQueries({ queryKey: ['my-oc1-home'] })
      setLessonState(lessonId, {
        status: 'success',
        message: 'Solicitação enviada! Aguarde a confirmação do professor.',
      })
    },
    onError: (err: any, lessonId) => {
      setLessonState(lessonId, {
        status: 'error',
        message: err.response?.data?.message || 'Erro ao solicitar. Tente novamente.',
      })
    },
  })

  const oc6Lessons = lessons.filter((l) => l.classType === 'OC6')
  const oc1Lessons = lessons.filter((l) => l.classType === 'OC1')

  return (
    <div className="max-w-lg mx-auto px-4 py-5">

      {/* Seletor de data — 7 dias */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {weekDays.map((day) => {
          const active = isSameDay(day, selectedDate)
          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                setSelectedDate(day)
                setLessonStates({})
              }}
              className={cn(
                'flex flex-col items-center min-w-[56px] py-2 px-1 rounded-2xl transition',
                active
                  ? 'bg-brand-orange text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-100 hover:border-brand-orange',
              )}
            >
              <span className="text-[10px] uppercase font-medium">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className="text-lg font-bold leading-tight">{format(day, 'd')}</span>
              <span className="text-[10px]">{format(day, 'MMM', { locale: ptBR })}</span>
            </button>
          )
        })}
      </div>

      {/* Estado de carregamento das aulas */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Spinner className="w-7 h-7 text-brand-orange" />
          <p className="text-sm">Buscando aulas disponíveis…</p>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Não foi possível carregar as aulas. Verifique sua conexão.
        </div>
      )}

      {!isLoading && !isError && lessons.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛶</p>
          <p className="font-medium text-gray-600">Nenhuma aula disponível neste dia.</p>
          <p className="text-sm mt-1">Selecione outro dia ou aguarde a programação.</p>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-5">
          {/* OC6 */}
          {oc6Lessons.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Canoa OC6 — 6 lugares
              </h2>
              <div className="space-y-3">
                {oc6Lessons.map((lesson) => (
                  <Oc6Card
                    key={lesson.id}
                    lesson={lesson}
                    state={lessonStates[lesson.id] ?? { status: 'idle' }}
                    onBook={() => bookMutation.mutate(lesson.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* OC1 */}
          {oc1Lessons.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-2">
                Aula individual OC1
              </h2>
              <div className="space-y-3">
                {oc1Lessons.map((lesson) => (
                  <Oc1Card
                    key={lesson.id}
                    lesson={lesson}
                    state={lessonStates[lesson.id] ?? { status: 'idle' }}
                    onRequest={() => oc1Mutation.mutate(lesson.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

// ─── OC6 Card ────────────────────────────────────────────────────────────────

function Oc6Card({
  lesson,
  state,
  onBook,
}: {
  lesson: Lesson
  state: LessonState
  onBook: () => void
}) {
  const spots = lesson.maxSpots - lesson._count.bookings
  const full  = spots <= 0
  const done  = state.status === 'success'
  const err   = state.status === 'error'
  const busy  = state.status === 'loading'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-4 transition',
      done ? 'border-green-200' : err ? 'border-red-200' : 'border-gray-100',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-orange/10 p-2 rounded-xl">
            <Clock className="w-4 h-4 text-brand-orange" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg leading-none">{lesson.classTime}</p>
            <p className="text-xs text-gray-400 mt-0.5">Chegada: {arriveTime(lesson.classTime)}</p>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full',
          full ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600',
        )}>
          <Users className="w-3.5 h-3.5" />
          {full ? 'Lotado' : `${spots} vaga${spots !== 1 ? 's' : ''}`}
        </div>
      </div>

      {lesson.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3">{lesson.notes}</p>
      )}

      {/* Feedback */}
      {done && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {state.message}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.message}
        </div>
      )}

      <Button
        onClick={onBook}
        loading={busy}
        disabled={full || done}
        variant={done ? 'secondary' : 'primary'}
      >
        {done ? '✓ Agendado' : full ? 'Sem vagas' : 'Agendar'}
      </Button>
    </div>
  )
}

// ─── OC1 Card ────────────────────────────────────────────────────────────────

function Oc1Card({
  lesson,
  state,
  onRequest,
}: {
  lesson: Lesson
  state: LessonState
  onRequest: () => void
}) {
  const done = state.status === 'success'
  const err  = state.status === 'error'
  const busy = state.status === 'loading'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-4 transition',
      done ? 'border-green-200' : err ? 'border-red-200' : 'border-gray-100',
    )}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="bg-brand-dark/10 p-2 rounded-xl">
          <Clock className="w-4 h-4 text-brand-dark" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg leading-none">{lesson.classTime}</p>
          <p className="text-xs text-gray-400 mt-0.5">Chegada: {arriveTime(lesson.classTime)}</p>
        </div>
      </div>

      {!done && (
        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-3">
          Aula individual com professor. Após solicitar, aguarde a confirmação.
        </p>
      )}

      {done && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {state.message}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.message}
        </div>
      )}

      <Button
        onClick={onRequest}
        loading={busy}
        disabled={done}
        className={done ? 'bg-gray-100 text-gray-500' : 'bg-brand-dark hover:bg-brand-dark-muted text-white'}
      >
        {done ? '✓ Solicitação enviada' : 'Solicitar aula OC1'}
      </Button>
    </div>
  )
}
