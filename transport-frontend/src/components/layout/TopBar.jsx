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
  '/admin/trips':    'Trips', 
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { user }     = useAuthStore()
  const title        = titles[pathname] || 'Dashboard'

  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

return (
  <header className="h-16 bg-white border-b border-gray-300 px-6
                     flex items-center justify-between shrink-0">

    {/* Title */}
    <div>
      <h1 className="text-lg font-semibold text-black">{title}</h1>
      <p className="text-xs text-black/70">{now}</p>
    </div>

    {/* Right side */}
    <div className="flex items-center gap-3">

      {/* Notification */}
      <button className="relative w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl
                         flex items-center justify-center transition">
        <Bell size={16} className="text-black" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
      </button>

      {/* Avatar */}
      <div className="w-9 h-9  rounded-xl flex items-center justify-center
                      text-sm font-semibold text-white">
        <img
          src={user?.avatar || "/avatar.jpg"}
          alt="avatar"
          className="w-9 h-9 rounded-3xl object-cover"
        />
      </div>

    </div>
  </header>
)
}