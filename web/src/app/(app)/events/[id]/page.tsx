'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Calendar, Clock, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!event) return null

  return (
    <div className="max-w-lg mx-auto">
      {/* Imagem */}
      {event.imageUrl ? (
        <div className="relative w-full">
          <img src={event.imageUrl} alt={event.name} className="w-full h-auto block" />
          <Link href="/events" className="absolute top-4 left-4 bg-white/90 rounded-full p-2 shadow">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
        </div>
      ) : (
        <div className="px-4 pt-6">
          <Link href="/events" className="flex items-center gap-1 text-brand-orange text-sm mb-4">
            <ChevronLeft className="w-4 h-4" />Eventos
          </Link>
        </div>
      )}

      <div className="px-4 py-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{event.name}</h1>

        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-brand-orange" />
            {format(new Date(event.startAt), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-brand-orange" />
            {format(new Date(event.startAt), 'HH:mm')} — {format(new Date(event.endAt), 'HH:mm')}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-brand-orange" />
            {event.location}
          </div>
        </div>

        {event.notes && (
          <p className="text-gray-600 text-sm leading-relaxed mb-5">{event.notes}</p>
        )}

        {event.sponsors?.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Patrocinadores</h2>
            <div className="space-y-2">
              {event.sponsors.map((s: any) => (
                <div key={s.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="font-medium text-gray-800">{s.name}</p>
                  {s.socialMedia && <p className="text-xs text-gray-500 mt-0.5">{s.socialMedia}</p>}
                  {s.whatsApp && (
                    <a
                      href={`https://wa.me/${s.whatsApp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline mt-0.5 block"
                    >
                      WhatsApp: {s.whatsApp}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
