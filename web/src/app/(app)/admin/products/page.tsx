'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { Plus, X, Pencil, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'vestuario', label: 'Vestuário' },
  { value: 'acessorio', label: 'Acessório' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'outro', label: 'Outro' },
] as const

const variantSchema = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  sku: z.string().optional(),
})

const productSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  category: z.enum(['vestuario', 'acessorio', 'equipamento', 'outro']),
  description: z.string().optional(),
  price: z.coerce.number().positive('Preço inválido'),
  variants: z.array(variantSchema).optional(),
})
type ProductForm = z.infer<typeof productSchema>

type ProductImage = { id: string; url: string; order: number }
type ProductVariant = { id: string; size?: string; color?: string; stock: number; sku?: string }
type Product = {
  id: string
  name: string
  category: string
  description?: string
  price: string
  active: boolean
  images: ProductImage[]
  variants: ProductVariant[]
}

const CATEGORY_LABELS: Record<string, string> = {
  vestuario: 'Vestuário',
  acessorio: 'Acessório',
  equipamento: 'Equipamento',
  outro: 'Outro',
}

export default function AdminProductsPage() {
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const queryClient = useQueryClient()

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/products/all').then((r) => r.data),
  })

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { category: 'vestuario', variants: [] },
  })

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  })

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  function openCreate() {
    reset({ name: '', category: 'vestuario', description: '', price: 0, variants: [] })
    setEditing(null)
    setNewImageUrl('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    reset({
      name: p.name,
      category: p.category as ProductForm['category'],
      description: p.description ?? '',
      price: Number(p.price),
      variants: p.variants.map((v) => ({
        size: v.size ?? '',
        color: v.color ?? '',
        stock: v.stock,
        sku: v.sku ?? '',
      })),
    })
    setEditing(p)
    setNewImageUrl('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    reset()
  }

  const createMutation = useMutation({
    mutationFn: (data: ProductForm) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      closeForm()
      showToast('success', 'Produto criado!')
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'Erro ao criar produto.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductForm }) =>
      api.patch(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      closeForm()
      showToast('success', 'Produto atualizado!')
    },
    onError: (err: any) => showToast('error', err.response?.data?.message || 'Erro ao atualizar.'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/products/${id}/status`, { active: !active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  const addImageMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      api.post(`/products/${id}/images`, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setNewImageUrl('')
      setEditing((prev) => prev
        ? { ...prev, images: [...prev.images, { id: '', url: newImageUrl, order: prev.images.length }] }
        : prev
      )
    },
  })

  const removeImageMutation = useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      api.delete(`/products/${productId}/images/${imageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  function onSubmit(data: ProductForm) {
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
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Novo produto
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

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              {editing ? 'Editar produto' : 'Novo produto'}
            </h2>
            <button onClick={closeForm}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                {...register('name')}
                placeholder="Ex: Camiseta Manahau"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  {...register('category')}
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                <input
                  {...register('price')}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Detalhes do produto..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
              />
            </div>

            {/* Variações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Variações</label>
                <button
                  type="button"
                  onClick={() => appendVariant({ size: '', color: '', stock: 0, sku: '' })}
                  className="flex items-center gap-1 text-xs text-brand-orange font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>
              {variantFields.length === 0 && (
                <p className="text-xs text-gray-400 italic">Nenhuma variação adicionada.</p>
              )}
              <div className="space-y-2">
                {variantFields.map((field, idx) => (
                  <div key={field.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500">Variação {idx + 1}</p>
                      <button type="button" onClick={() => removeVariant(idx)}>
                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        {...register(`variants.${idx}.size`)}
                        placeholder="Tamanho (ex: M, G)"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                      <input
                        {...register(`variants.${idx}.color`)}
                        placeholder="Cor (ex: Preto)"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                      <input
                        {...register(`variants.${idx}.stock`)}
                        type="number"
                        min="0"
                        placeholder="Estoque"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                      <input
                        {...register(`variants.${idx}.sku`)}
                        placeholder="SKU (opcional)"
                        className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Imagens (so em modo edicao) */}
            {editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagens</label>
                {editing.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {editing.images.map((img) => (
                      <div key={img.id} className="relative">
                        <img
                          src={img.url}
                          alt=""
                          className="w-16 h-16 object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageMutation.mutate({ productId: editing.id, imageId: img.id })}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="URL da imagem..."
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                  />
                  <button
                    type="button"
                    onClick={() => newImageUrl && addImageMutation.mutate({ id: editing.id, url: newImageUrl })}
                    disabled={!newImageUrl || addImageMutation.isPending}
                    className="bg-brand-orange text-white px-3 py-2 rounded-xl disabled:opacity-50"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-brand-orange text-white font-semibold py-3 rounded-xl disabled:opacity-60 transition"
            >
              {busy ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar produto'}
            </button>
          </form>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="font-medium text-gray-600">Nenhum produto cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const image = p.images[0]?.url
            return (
              <div
                key={p.id}
                className={cn(
                  'bg-white rounded-2xl border shadow-sm p-4 flex gap-3',
                  p.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                )}
              >
                {/* Thumb */}
                <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                  {image ? (
                    <img src={image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🛶</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{CATEGORY_LABELS[p.category]}</p>
                      <p className="text-brand-orange font-bold text-sm mt-0.5">
                        R$ {Number(p.price).toFixed(2).replace('.', ',')}
                      </p>
                      {p.variants.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.variants.length} varia{p.variants.length !== 1 ? 'ções' : 'ção'}
                          {' · '}estoque: {p.variants.reduce((s, v) => s + v.stock, 0)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate({ id: p.id, active: p.active })}
                        className={cn(
                          'text-xs font-medium px-3 py-1.5 rounded-xl transition',
                          p.active
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        )}
                      >
                        {p.active ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
