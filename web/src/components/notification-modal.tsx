'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Bell } from 'lucide-react'

type Notification = { id: string; message: string; createdAt: string }

export function NotificationModal() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread').then((r) => r.data),
    staleTime: 0,
  })

  useEffect(() => {
    if (notifications.length > 0) setOpen(true)
  }, [notifications.length])

  const markRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.setQueryData(['notifications-unread'], [])
      setOpen(false)
    },
  })

  if (!open || notifications.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-brand-orange px-5 py-4 flex items-center gap-3">
          <Bell className="w-5 h-5 text-white flex-shrink-0" />
          <h2 className="text-white font-bold text-base">
            {notifications.length === 1 ? 'Nova notificação' : `${notifications.length} notificações`}
          </h2>
        </div>

        <div className="px-5 py-4 space-y-2.5 max-h-64 overflow-y-auto">
          {notifications.map((n) => (
            <p key={n.id} className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
              {n.message}
            </p>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => markRead.mutate()}
            disabled={markRead.isPending}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
