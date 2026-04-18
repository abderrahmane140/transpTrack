import { create } from 'zustand'
import { authApi } from '../api/auth'
import toast from 'react-hot-toast'

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('user') || 'null'),
  token:   localStorage.getItem('token') || null,
  loading: false,

  login: async (credentials) => {
    set({ loading: true })
    try {
      const { data } = await authApi.login(credentials)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, token: data.token, loading: false })
      toast.success(`Welcome back, ${data.user.name}!`)
      return data.user
    } catch {
      set({ loading: false })
      throw new Error('Login failed')
    }
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  refreshUser: async () => {
    try {
      const { data } = await authApi.me()
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user })
    } catch {}
  },

  isAdmin:    () => get().user?.role === 'admin',
  isDriver:   () => get().user?.role === 'driver',
  isEmployee: () => get().user?.role === 'employee',
  isLoggedIn: () => !!get().token,
}))

export default useAuthStore