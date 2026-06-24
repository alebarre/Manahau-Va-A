'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { key: '', label: 'Todos' },
  { key: 'vestuario', label: 'Vestuário' },
  { key: 'acessorio', label: 'Acessórios' },
  { key: 'equipamento', label: 'Equipamentos' },
  { key: 'outro', label: 'Outros' },
]

export default function ShopPage() {
  const [category, setCategory] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category],
    queryFn: () =>
      api.get(`/products${category ? `?category=${category}` : ''}`).then((r) => r.data),
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Shop</h1>

      {/* Filtro por categoria */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition border',
              category === c.key
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p>Nenhum produto disponível.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: any }) {
  const image = product.images?.[0]?.url
  const hasVariants = product.variants?.length > 0
  const sizes = [...new Set(product.variants?.map((v: any) => v.size).filter(Boolean))]

  return (
    <Link href={`/shop/${product.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
        <div className="relative aspect-square bg-gray-100">
          {image ? (
            <Image src={image} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🛶</div>
          )}
        </div>
        <div className="p-3">
          <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{product.name}</p>
          <p className="text-brand-orange font-bold text-base">
            R$ {Number(product.price).toFixed(2).replace('.', ',')}
          </p>
          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(sizes as string[]).slice(0, 4).map((s) => (
                <span key={s} className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
