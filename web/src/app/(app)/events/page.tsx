'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Calendar, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function EventsPage() {
  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => api.get('/events?upcoming=true').then((r) => r.data),
  })

  const { data: past = [] } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: () => api.get('/events').then((r) => r.data),
  })

  const pastEvents = past.filter(
    (e: any) => !upcoming.find((u: any) => u.id === e.id)
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Eventos</h1>

      {loadingUpcoming ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Próximos</h2>
              <div className="space-y-3">
                {upcoming.map((event: any) => (
                  <EventCard key={event.id} event={event} highlight />
                ))}
              </div>
            </section>
          )}

          {pastEvents.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Anteriores</h2>
              <div className="space-y-3">
                {pastEvents.map((event: any) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {upcoming.length === 0 && pastEvents.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🏆</p>
              <p>Nenhum evento por enquanto.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EventCard({ event, highlight }: { event: any; highlight?: boolean }) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition ${highlight ? 'border-brand-orange/30' : 'border-gray-100'}`}>
        {event.imageUrl && (
          <div className="relative h-36 w-full">
            <Image src={event.imageUrl} alt={event.name} fill className="object-cover" />
          </div>
        )}
        <div className="p-4">
          {highlight && (
            <span className="inline-block text-xs font-semibold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full mb-2">
              Em breve
            </span>
          )}
          <h3 className="font-bold text-gray-900 text-base mb-2">{event.name}</h3>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {format(new Date(event.startAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {event.location}
          </div>
          {event.sponsors?.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Patrocinadores: {event.sponsors.map((s: any) => s.name).join(', ')}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
