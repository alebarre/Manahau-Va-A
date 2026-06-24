'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Image from 'next/image'
import { Upload, Star, Trash2, CheckCircle, AlertCircle, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ACCEPTED_EXTENSIONS = 'JPG, PNG, WebP, GIF'
const MAX_MB = 5
const MAX_BYTES = MAX_MB * 1024 * 1024

type Toast = { type: 'success' | 'error'; text: string }

// Lê o arquivo como Data URL — falha se o arquivo não estiver disponível localmente
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function AdminPhotosPage() {
  const [caption, setCaption]         = useState('')
  const [preview, setPreview]         = useState<string | null>(null)   // data URL
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [reading, setReading]         = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [toast, setToast]             = useState<Toast | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  function showToast(type: Toast['type'], text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação de tipo
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast('error', `Tipo não permitido. Use ${ACCEPTED_EXTENSIONS}.`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Validação de tamanho
    if (file.size > MAX_BYTES) {
      showToast('error', `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: ${MAX_MB} MB.`)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    // Lê os bytes agora — garante que o arquivo está disponível localmente
    setReading(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      setSelectedFile(file)
      setPreview(dataUrl)
    } catch {
      showToast(
        'error',
        'Não foi possível ler o arquivo. ' +
        'Se ele estiver no OneDrive ou Google Drive, aguarde o download completo antes de tentar novamente.'
      )
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setReading(false)
    }
  }

  function clearSelection() {
    setSelectedFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpload() {
    if (!selectedFile || !preview) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', selectedFile)
      if (caption.trim()) form.append('caption', caption.trim())

      await api.post('/photos/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      queryClient.invalidateQueries({ queryKey: ['admin-photos'] })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      showToast('success', 'Foto enviada com sucesso!')
      setCaption('')
      clearSelection()
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Erro ao enviar a foto. Verifique sua conexão e tente novamente.'
      showToast('error', msg)
    } finally {
      setUploading(false)
    }
  }

  const featuredMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      api.patch(`/photos/${id}/featured`, { featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/photos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] })
      queryClient.invalidateQueries({ queryKey: ['photos'] })
      showToast('success', 'Foto removida.')
    },
    onError: () => showToast('error', 'Erro ao remover a foto.'),
  })

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['admin-photos'],
    queryFn: () => api.get('/photos?limit=100').then((r) => r.data),
  })

  const isBusy = reading || uploading

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fotos da galeria</h1>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'flex items-start gap-2 rounded-2xl px-4 py-3 text-sm mb-5 border',
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-600 border-red-200'
        )}>
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          }
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Área de upload */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Enviar nova foto</h2>

        {/* Regras */}
        <div className="flex items-start gap-2 bg-brand-orange/5 border border-brand-orange/20 rounded-xl px-3 py-2.5 mb-4">
          <ImageIcon className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Formatos aceitos:</strong> {ACCEPTED_EXTENSIONS}
            <br />
            <strong>Tamanho máximo:</strong> {MAX_MB} MB por foto
            <br />
            <strong>Atenção:</strong> arquivos do OneDrive ou Google Drive devem estar completamente baixados antes do envio.
          </p>
        </div>

        {/* Preview ou zona de seleção */}
        {preview ? (
          <div className="relative mb-4">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            </div>
            <button
              onClick={clearSelection}
              disabled={isBusy}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-xs text-gray-400 mt-1.5 truncate">
              {selectedFile?.name}
              {' · '}
              {((selectedFile?.size ?? 0) / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isBusy}
            className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-brand-orange/40 hover:border-brand-orange text-brand-orange py-8 rounded-xl transition mb-4 disabled:opacity-50"
          >
            {reading ? (
              <>
                <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Lendo arquivo...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-sm font-medium">Selecionar foto</span>
                <span className="text-xs text-gray-400">Clique para escolher o arquivo</span>
              </>
            )}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Legenda */}
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Legenda (opcional)"
          disabled={isBusy}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50"
        />

        <button
          onClick={handleUpload}
          disabled={!selectedFile || isBusy}
          className="flex items-center justify-center gap-2 w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Enviar foto
            </>
          )}
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">📸</p>
          <p className="text-sm">Nenhuma foto enviada ainda.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              {photos.length} foto{photos.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">⭐ destaque aparece na home</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo: any) => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden">
                <Image src={photo.url} alt={photo.caption || ''} fill className="object-cover" />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => featuredMutation.mutate({ id: photo.id, featured: !photo.featured })}
                    className={cn(
                      'p-2 rounded-full transition',
                      photo.featured ? 'bg-yellow-400' : 'bg-white/90 hover:bg-yellow-100'
                    )}
                    title={photo.featured ? 'Remover destaque' : 'Destacar na home'}
                  >
                    <Star className={cn('w-4 h-4', photo.featured ? 'text-white' : 'text-gray-600')} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Excluir esta foto permanentemente?')) {
                        deleteMutation.mutate(photo.id)
                      }
                    }}
                    className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition"
                    title="Excluir foto"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>

                {photo.featured && (
                  <div className="absolute top-1.5 left-1.5 bg-yellow-400 rounded-full p-1 shadow">
                    <Star className="w-2.5 h-2.5 text-white" />
                  </div>
                )}

                {photo.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 opacity-0 group-hover:opacity-100 transition">
                    <p className="text-white text-[10px] truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
