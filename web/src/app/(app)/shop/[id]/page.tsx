'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!product) return null

  const sizes = [...new Set(product.variants?.map((v: any) => v.size).filter(Boolean))] as string[]
  const colors = [...new Set(product.variants?.map((v: any) => v.color).filter(Boolean))] as string[]

  const whatsappMsg = encodeURIComponent(
    `Olá! Tenho interesse no produto: ${product.name} — R$ ${Number(product.price).toFixed(2).replace('.', ',')}`
  )

  return (
    <div className="max-w-lg mx-auto">
      {/* Imagens */}
      <div className="relative bg-gray-100">
        <div className="relative aspect-square">
          {product.images?.length > 0 ? (
            <Image
              src={product.images[selectedImage].url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">🛶</div>
          )}
        </div>
        <Link href="/shop" className="absolute top-4 left-4 bg-white/90 rounded-full p-2 shadow">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </Link>

        {product.images?.length > 1 && (
          <div className="flex gap-2 p-3">
            {product.images.map((img: any, i: number) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(i)}
                className={cn(
                  'w-14 h-14 rounded-xl overflow-hidden border-2 transition',
                  selectedImage === i ? 'border-brand-orange' : 'border-transparent'
                )}
              >
                <Image src={img.url} alt="" width={56} height={56} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-5">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 flex-1 pr-3">{product.name}</h1>
          <p className="text-xl font-bold text-brand-orange whitespace-nowrap">
            R$ {Number(product.price).toFixed(2).replace('.', ',')}
          </p>
        </div>

        {product.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-5">{product.description}</p>
        )}

        {/* Tamanhos */}
        {sizes.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Tamanho</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedVariant(s)}
                  className={cn(
                    'px-4 py-2 rounded-xl border text-sm font-medium transition',
                    selectedVariant === s
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'border-gray-200 text-gray-700 hover:border-brand-orange'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cores */}
        {colors.length > 0 && (
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Cor</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <span key={c} className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA WhatsApp */}
        <a
          href={`https://wa.me/55${process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, '') || ''}`
            + `?text=${whatsappMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-2xl transition"
        >
          <MessageCircle className="w-5 h-5" />
          Comprar via WhatsApp
        </a>
      </div>
    </div>
  )
}
