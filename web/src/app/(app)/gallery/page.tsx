'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Photo = {
  id: string
  url: string
  caption?: string
  takenAt: string
  featured: boolean
}

export default function GalleryPage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['photos'],
    queryFn: () => api.get('/photos?limit=200').then((r) => r.data),
  })

  // Agrupa por mês/ano
  const grouped = photos.reduce<Record<string, Photo[]>>((acc, photo) => {
    const key = format(new Date(photo.takenAt), 'MMMM yyyy', { locale: ptBR })
    if (!acc[key]) acc[key] = []
    acc[key].push(photo)
    return acc
  }, {})

  const sections = Object.entries(grouped)

  function openLightbox(photo: Photo) {
    const idx = photos.findIndex((p) => p.id === photo.id)
    setLightboxIndex(idx)
  }

  function prev() {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
  }

  function next() {
    setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))
  }

  const current = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Galeria</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📸</p>
          <p>Nenhuma foto ainda.</p>
          <p className="text-sm mt-1">As fotos das remadas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(([month, monthPhotos]) => (
            <section key={month}>
              <h2 className="text-sm font-bold text-gray-600 tracking-wide mb-3 capitalize">
                {month}
              </h2>
              <div className="grid grid-cols-3 gap-1.5">
                {monthPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => openLightbox(photo)}
                    className="aspect-square relative rounded-xl overflow-hidden group"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.caption || 'Foto da remada'}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                    {photo.featured && (
                      <div className="absolute top-1.5 right-1.5 bg-brand-orange rounded-full w-2.5 h-2.5" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {current && lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Fechar */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-7 h-7" />
          </button>

          {/* Anterior */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-2"
              onClick={(e) => { e.stopPropagation(); prev() }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Próximo */}
          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-2"
              onClick={(e) => { e.stopPropagation(); next() }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Imagem */}
          <div
            className="max-w-sm w-full px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden">
              <Image
                src={current.url}
                alt={current.caption || ''}
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-3 text-center">
              {current.caption && (
                <p className="text-white font-medium">{current.caption}</p>
              )}
              <p className="text-white/50 text-xs mt-1">
                {lightboxIndex + 1} / {photos.length}
                {current.takenAt && (
                  <span>
                    {' · '}
                    {format(new Date(current.takenAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
