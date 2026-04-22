import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bus, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function Login() {
  const navigate           = useNavigate()
  const { login, loading } = useAuthStore()

  const [form,     setForm]     = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const user = await login(form)
      if (user.role === 'admin')         navigate('/admin')
      else if (user.role === 'driver')   navigate('/driver')
      else                               navigate('/employee')
    } catch {
      setError('Invalid email or password. Please try again.')
    }
  }

  const fillDemo = (email, password) => setForm({ email, password })

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Bus size={28} className="text-white" />
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">
            TransportTrack
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Employee Transport Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            Sign in to your account
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Email address
              </label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                : 'Sign in'
              }
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider text-center">
              Quick demo login
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Admin', email: 'admin@transport.com', password: 'password' },
                { label: 'Driver', email: 'john.driver@transport.com', password: 'password' },
                { label: 'Employee', email: 'alice@company.com', password: 'password' },
              ].map(({ label, email, password }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillDemo(email, password)}
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}