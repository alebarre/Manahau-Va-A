import axios from 'axios'
import { apiLoadingStart, apiLoadingEnd } from '@/contexts/loading-context'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
})

api.interceptors.request.use((config) => {
  apiLoadingStart()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => {
    apiLoadingEnd()
    return res
  },
  (error) => {
    apiLoadingEnd()
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
