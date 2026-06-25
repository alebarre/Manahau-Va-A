'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, X, Pencil, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const sponsorSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  contact: z.string().optional(),
  socialMedia: z.string().optional(),
  whatsApp: z.string().optional(),
})

const eventSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  location: z.string().min(2, 'Informe o local'),
  startAt: z.string().min(1, 'Informe o inicio'),
  endAt: z.string().min(1, 'Informe o termino'),
  notes: z.string().optional(),
  sponsors: z.array(sponsorSchema).optional(),
})
type EventForm = z.infer<typeof eventSchema>

type Sponsor = { id: string; name: string; contact?: string; socialMedia?: string; whatsApp?: string }
type Event = {
  id: string
  name: string
  location: string
  startAt: string
  endAt: string
  notes?: string
  imageUrl?: string
  active: boolean
  sponsors: Sponsor[]
}

function toDatetimeLocal(iso: string) {
  return iso ? iso.slice(0, 16) : ''
}

export default function AdminEventsPage() {
  const [editing, setEditing] = useState<Event | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const queryClient = useQueryClient()

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['admin-events'],
    queryFn: () => api.get('/events').then((r) => r.data),
  })

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { sponsors: [] },
  })

  const { fields: sponsorFields, append: appendSponsor, remove: removeSponsor } = useFieldArray({
    control,
    name: 'sponsors',
  })

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  function openCreate() {
    reset({ name: '', location: '', startAt: '', endAt: '', notes: '', sponsors: [] })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(ev: Event) {
    reset({
      name: ev.name,
      location: ev.location,
      startAt: toDatetimeLocal(ev.startAt),
      endAt: toDatetimeLocal(ev.endAt),
      notes: ev.notes ?? '',
      sponsors: ev.sponsors.map((s) => ({
        name: s.name,
        contact: s.contact ?? '',
        socialMedia: s.socialMedia ?? '',
        whatsApp: s.whatsApp ?? '',
      })),
    })
    setEditing(ev)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    reset()
  }

  const imageInputRef = useRef<HTMLInputElement>(null)

  const addImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/events/${id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      setEditing((prev) => prev ? { ...prev, imageUrl: res.data.imageUrl } : null)
      showToast('success', 'Imagem atualizada!')
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'Erro ao enviar imagem.'),
  })

  const createMutation = useMutation({
    mutationFn: (data: EventForm) => api.post('/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      closeForm()
      showToast('success', 'Evento criado com sucesso!')
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'Erro ao criar evento.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventForm }) =>
      api.patch(`/events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      closeForm()
      showToast('success', 'Evento atualizado!')
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'Erro ao atualizar evento.'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/events/${id}/status`, { active: !active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-events'] }),
  })

  function onSubmit(data: EventForm) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const busy = isSubmitting || createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Novo evento
        </button>
      </div>

      {toast && (
        <div className={cn(
          'rounded-xl px-4 py-2 text-sm mb-4 border',
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-600 border-red-200'
        )}>
          {toast.text}
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              {editing ? 'Editar evento' : 'Novo evento'}
            </h2>
            <button onClick={closeForm}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do evento</label>
              <input
                {...register('name')}
                placeholder="Ex: Campeonato Estadual Va'A"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Local */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
              <input
                {...register('location')}
                placeholder="Ex: Praia de Itaipu, Niteroi/RJ"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                <input
                  {...register('startAt')}
                  type="datetime-local"
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                {errors.startAt && <p className="text-red-500 text-xs mt-1">{errors.startAt.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
                <input
                  {...register('endAt')}
                  type="datetime-local"
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                {errors.endAt && <p className="text-red-500 text-xs mt-1">{errors.endAt.message}</p>}
              </div>
            </div>

            {/* Observacoes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Detalhes do evento..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
              />
            </div>

            {/* Imagem — apenas em edição */}
            {editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagem</label>
                {editing.imageUrl && (
                  <img
                    src={editing.imageUrl}
                    alt="Imagem atual"
                    className="w-full h-32 object-cover rounded-xl mb-2"
                  />
                )}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={addImageMutation.isPending}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-brand-orange hover:text-brand-orange transition disabled:opacity-60"
                >
                  {addImageMutation.isPending
                    ? 'Enviando...'
                    : editing.imageUrl
                    ? 'Trocar imagem'
                    : 'Adicionar imagem'}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) addImageMutation.mutate({ id: editing.id, file })
                    e.target.value = ''
                  }}
                />
              </div>
            )}

            {/* Patrocinadores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Patrocinadores</label>
                <button
                  type="button"
                  onClick={() => appendSponsor({ name: '', contact: '', socialMedia: '', whatsApp: '' })}
                  className="flex items-center gap-1 text-xs text-brand-orange font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>
              {sponsorFields.length === 0 && (
                <p className="text-xs text-gray-400 italic">Nenhum patrocinador adicionado.</p>
              )}
              <div className="space-y-3">
                {sponsorFields.map((field, idx) => (
                  <div key={field.id} className="bg-gray-50 rounded-xl p-3 relative">
                    <button
                      type="button"
                      onClick={() => removeSponsor(idx)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Patrocinador {idx + 1}</p>
                    <div className="space-y-2">
                      <input
                        {...register(`sponsors.${idx}.name`)}
                        placeholder="Nome *"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                      <input
                        {...register(`sponsors.${idx}.whatsApp`)}
                        placeholder="WhatsApp"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                      <input
                        {...register(`sponsors.${idx}.socialMedia`)}
                        placeholder="Rede social"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl disabled:opacity-60 transition"
            >
              {busy ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar evento'}
            </button>
          </form>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-medium text-gray-600">Nenhum evento cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={cn(
                'bg-white rounded-2xl border shadow-sm p-4',
                ev.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              )}
            >
              {ev.imageUrl && (
                <img
                  src={ev.imageUrl}
                  alt={ev.name}
                  className="w-full h-32 object-cover rounded-xl mb-3"
                />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{ev.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{ev.location}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(ev.startAt), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                    {' — '}
                    {format(new Date(ev.endAt), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                  </p>
                  {ev.notes && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ev.notes}</p>
                  )}
                  {ev.sponsors.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Patrocinadores: {ev.sponsors.map((s) => s.name).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(ev)}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate({ id: ev.id, active: ev.active })}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded-xl transition',
                      ev.active
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    )}
                  >
                    {ev.active ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
