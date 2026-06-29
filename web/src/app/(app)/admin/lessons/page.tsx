'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const lessonSchema = z.object({
  date: z.string().min(1, 'Selecione uma data'),
  classTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  classType: z.enum(['OC6', 'OC1']),
  maxSpots: z.coerce.number().int().min(1).max(6).default(6),
  notes: z.string().optional(),
})
type LessonForm = z.infer<typeof lessonSchema>

export default function AdminLessonsPage() {
  const [showForm, setShowForm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['admin-lessons'],
    queryFn: () => api.get('/lessons').then((r) => r.data),
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<LessonForm>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { classTime: '06:00', classType: 'OC6', maxSpots: 6 },
  })

  const classType = watch('classType')

  const createMutation = useMutation({
    mutationFn: (data: LessonForm) => api.post('/lessons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
      reset()
      setShowForm(false)
      setFormError(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message ?? 'Erro ao criar aula. Tente novamente.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
      setConfirmDeleteId(null)
    },
    onError: () => {
      setConfirmDeleteId(null)
    },
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Aulas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Nova aula
        </button>
      </div>

      {success && (
        <p className="bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-2 text-sm mb-4">
          Aula criada com sucesso!
        </p>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Nova aula</h2>
            <button onClick={() => { setShowForm(false); setFormError(null) }}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                {...register('date')}
                type="date"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                <input
                  {...register('classTime')}
                  type="time"
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                {errors.classTime && <p className="text-red-500 text-xs mt-1">{errors.classTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  {...register('classType')}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="OC6">OC6</option>
                  <option value="OC1">OC1</option>
                </select>
              </div>
            </div>

            {classType === 'OC6' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vagas (max. 6)</label>
                <input
                  {...register('maxSpots')}
                  type="number"
                  min={1}
                  max={6}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
              />
            </div>

            {formError && (
              <p className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">
                {formError}
              </p>
            )}

            <Button type="submit" loading={isSubmitting || createMutation.isPending}>
              Criar aula
            </Button>
          </form>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson: any) => (
            <div key={lesson.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(lesson.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                    {' · '}
                    {lesson.classTime}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      lesson.classType === 'OC6' ? 'bg-brand-orange/10 text-brand-orange' : 'bg-brand-dark/10 text-brand-dark'
                    )}>
                      {lesson.classType}
                    </span>
                    {lesson.classType === 'OC6' && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        {lesson._count.bookings}/{lesson.maxSpots}
                      </span>
                    )}
                  </div>
                  {lesson.notes && <p className="text-xs text-gray-400 mt-1">{lesson.notes}</p>}
                </div>

                {confirmDeleteId === lesson.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(lesson.id)}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition"
                    >
                      {deleteMutation.isPending && <Spinner className="w-3 h-3" />}
                      {deleteMutation.isPending ? 'Aguarde' : 'Confirmar'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(lesson.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
