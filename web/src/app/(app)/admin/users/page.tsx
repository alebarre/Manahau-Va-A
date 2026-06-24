'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
  professor: { label: 'Professor', color: 'bg-blue-100 text-blue-700' },
  aluno: { label: 'Aluno', color: 'bg-gray-100 text-gray-600' },
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/users/${id}/status`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = users.filter((u: any) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Usuários</h1>

      {/* Busca */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nome ou email..."
          className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
      </div>

      {/* Filtro role */}
      <div className="flex gap-2 mb-5">
        {['', 'aluno', 'professor', 'super_admin'].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition',
              roleFilter === r
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-gray-600 border-gray-200'
            )}
          >
            {r === '' ? 'Todos' : ROLE_LABELS[r]?.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: any) => {
            const rl = ROLE_LABELS[u.role]
            return (
              <div key={u.id} className={cn(
                'bg-white rounded-2xl border shadow-sm p-4',
                u.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', rl.color)}>
                      {rl.label}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <select
                    value={u.role}
                    onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="super_admin">Admin</option>
                  </select>
                  <button
                    onClick={() => toggleMutation.mutate({ id: u.id, active: !u.active })}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded-lg transition',
                      u.active
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    )}
                  >
                    {u.active ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-gray-400 text-sm">Nenhum usuário encontrado.</p>
          )}
        </div>
      )}
    </div>
  )
}
