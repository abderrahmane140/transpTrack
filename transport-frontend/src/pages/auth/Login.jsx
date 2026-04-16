import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { useState } from "react";

export default function Login() {
    const navigate         = useNavigate()
    const {login, loading} = useAuthStore()

    const [from,   setForm] = useState({email: '', password: ''})
    const [showPass, setShowPass] = useState(false)
    const [error,    setError]  =useState('')


    const handleSubmit  = async (e) =>{
        e.preventDefault()
        setError('')
        try {
            const user = await login(from)
            if (user.role === 'admin')     navigate('/admin')
            else if (user.role === 'driver')   navigate('/driver')
            else                               navigate('/employee')
        }catch {
            setError('Invalid email or password. Please try again.')
        }
    }

    const fillDemo = (email, password) => setForm({email, password})

     return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
 
      {/* Subtle background grid */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(99,102,241,1) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
 
      <div className="w-full max-w-md relative animate-slide-up">
 
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center
                          mx-auto mb-4 shadow-2xl shadow-brand-900/60">
            <Bus size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">TransportTrack</h1>
          <p className="text-sm text-white/40 mt-1">Employee Transport Management</p>
        </div>
 
        {/* Login card */}
        <div className="card border border-white/8 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-6">Sign in to your account</h2>
 
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm
                            rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}
 
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>
 
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
 
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-2"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                : 'Sign in'
              }
            </button>
          </form>
 
          {/* Demo account shortcuts */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-xs text-white/30 mb-3 uppercase tracking-wider font-medium text-center">
              Quick demo login
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Admin',    email: 'admin@transport.com',       password: 'password' },
                { label: 'Driver',   email: 'john.driver@transport.com', password: 'password' },
                { label: 'Employee', email: 'alice@company.com',         password: 'password' },
              ].map(({ label, email, password }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => fillDemo(email, password)}
                  className="text-xs px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10
                             text-white/50 hover:text-white/80 transition-colors border
                             border-white/5 hover:border-white/10"
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