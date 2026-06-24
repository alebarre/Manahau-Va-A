'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type BookedUser = {
  id: string
  user: { id: string; name: string; avatarUrl: string | null }
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

export default function RemadasPage() {
  const [lessonStates, setLessonStates] = useState<Record<string, LessonState>>({})
  const queryClient = useQueryClient()

  const { data: lessons = [], isLoading, isError } = useQuery<Lesson[]>({
    queryKey: ['remadas-all'],
    queryFn: () => api.get('/lessons').then((r) => r.data),
  })

  function setLessonState(id: string, state: LessonState) {
    setLessonStates((prev) => ({ ...prev, [id]: state }))
  }

  const bookMutation = useMutation({
    mutationFn: (lessonId: string) => api.post('/bookings', { lessonId }),
    onMutate: (lessonId) => setLessonState(lessonId, { status: 'loading' }),
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ['remadas-all'] })
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
    onMutate: (lessonId) => setLessonState(lessonId, { status: 'loading' }),
    onSuccess: (_, lessonId) => {
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

  // Group by date
  const byDate = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    const key = lesson.date.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(lesson)
    return acc
  }, {})

  const dateSections = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <p className="text-sm text-gray-500 mb-5">
        Todas as remadas abertas a partir de hoje.
      </p>

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
          <p className="text-sm mt-1">Aguarde a programação do professor.</p>
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
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      state={lessonStates[lesson.id] ?? { status: 'idle' }}
                      onAction={() => bookMutation.mutate(lesson.id)}
                    />
                  ))}
                  {oc1.map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      state={lessonStates[lesson.id] ?? { status: 'idle' }}
                      onAction={() => oc1Mutation.mutate(lesson.id)}
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

function LessonCard({
  lesson,
  state,
  onAction,
}: {
  lesson: Lesson
  state: LessonState
  onAction: () => void
}) {
  const isOc6 = lesson.classType === 'OC6'
  const spots = lesson.maxSpots - lesson._count.bookings
  const full  = isOc6 && spots <= 0
  const done  = state.status === 'success'
  const err   = state.status === 'error'
  const busy  = state.status === 'loading'

  const accentColor = isOc6 ? 'text-brand-orange' : 'text-brand-dark'
  const accentBg    = isOc6 ? 'bg-brand-orange/10' : 'bg-brand-dark/10'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-4 transition',
      done ? 'border-green-200' : err ? 'border-red-200' : 'border-gray-100',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('p-2 rounded-xl', accentBg)}>
            <Clock className={cn('w-4 h-4', accentColor)} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg leading-none">{lesson.classTime}</p>
            <p className="text-xs text-gray-400 mt-0.5">Chegada: {arriveTime(lesson.classTime)}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            'text-xs font-semibold px-2.5 py-0.5 rounded-full',
            isOc6 ? 'bg-brand-orange/10 text-brand-orange' : 'bg-brand-dark/10 text-brand-dark',
          )}>
            {isOc6 ? 'OC6' : 'OC1'}
          </span>
          {isOc6 && (
            <span className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              full ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600',
            )}>
              <Users className="w-3 h-3" />
              {full ? 'Lotado' : `${spots} vaga${spots !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      {lesson.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3">{lesson.notes}</p>
      )}

      {/* Alunos agendados */}
      {isOc6 && lesson.bookings.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {lesson.bookings.map((b, i) => (
            <div key={b.id} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-4 text-xs text-gray-400 text-right shrink-0">{i + 1}</span>
              {b.user.avatarUrl ? (
                <img
                  src={b.user.avatarUrl}
                  alt={b.user.name}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brand-orange/20 text-brand-orange text-[10px] font-bold flex items-center justify-center shrink-0">
                  {b.user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="truncate">{b.user.name}</span>
            </div>
          ))}
        </div>
      )}

      {!isOc6 && !done && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-3">
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
        onClick={onAction}
        loading={busy}
        disabled={full || done}
        variant={done ? 'secondary' : 'primary'}
        className={cn(
          !done && !isOc6 && 'bg-brand-dark hover:bg-brand-dark-muted text-white',
        )}
      >
        {done
          ? isOc6 ? '✓ Agendado' : '✓ Solicitação enviada'
          : isOc6
            ? full ? 'Sem vagas' : 'Agendar'
            : 'Solicitar aula OC1'}
      </Button>
    </div>
  )
}
