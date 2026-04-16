import React from 'react'
import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import useAuthStore from '../../store/authStore'

const titles = {
  '/admin':            'Dashboard',
  '/admin/vehicles':   'Vehicles',
  '/admin/drivers':    'Drivers',
  '/admin/employees':  'Employees',
  '/admin/routes':     'Routes',
  '/admin/tracking':   'Live Tracking',
  '/driver':           'Driver Dashboard',
  '/employee':         'My Transport',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { user }     = useAuthStore()
  const title        = titles[pathname] || 'Dashboard'

  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <header className="h-16 bg-surface-800 border-b border-white/5 px-6
                       flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        <p className="text-xs text-white/30">{now}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl
                           flex items-center justify-center transition-colors">
          <Bell size={16} className="text-white/60" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-500 rounded-full" />
        </button>
        <div className="w-9 h-9 bg-brand-600/30 rounded-xl flex items-center justify-center
                        text-sm font-semibold text-brand-300">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}