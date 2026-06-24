'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, X } from 'lucide-react'


export default function AdminOc1Page() {
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['oc1-pending'],
    queryFn: () => api.get('/oc1/pending').then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/oc1/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oc1-pending'] }),
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Solicitações OC1</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-dark border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p>Nenhuma solicitação pendente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{req.user.name}</p>
                  <p className="text-xs text-gray-500">{req.user.email}</p>
                  <p className="text-sm text-gray-700 mt-2">
                    {format(new Date(req.lesson.date), "dd 'de' MMMM", { locale: ptBR })}
                    {' · '}
                    {req.lesson.classTime}
                  </p>
                  {req.notes && (
                    <p className="text-xs text-gray-400 mt-1 bg-gray-50 rounded-lg px-2 py-1">{req.notes}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => updateMutation.mutate({ id: req.id, status: 'confirmed' })}
                    className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-xl transition"
                    title="Confirmar"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: req.id, status: 'cancelled' })}
                    className="bg-red-100 hover:bg-red-200 text-red-500 p-2 rounded-xl transition"
                    title="Recusar"
                  >
                    <X className="w-4 h-4" />
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
