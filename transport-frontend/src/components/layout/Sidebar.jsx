import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Truck, Users, UserCheck,
  MapPin, Map, LogOut, Bus,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const adminLinks = [
  { to: '/admin',           label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/admin/vehicles',  label: 'Vehicles',      icon: Truck           },
  { to: '/admin/drivers',   label: 'Drivers',       icon: UserCheck       },
  { to: '/admin/employees', label: 'Employees',     icon: Users           },
  { to: '/admin/routes',    label: 'Routes',        icon: MapPin          },
  { to: '/admin/tracking',  label: 'Live Tracking', icon: Map             },
]
const driverLinks   = [{ to: '/driver',   label: 'My Dashboard', icon: LayoutDashboard }]
const employeeLinks = [{ to: '/employee', label: 'My Transport', icon: LayoutDashboard }]

export default function Sidebar() {
  const { user, logout, isAdmin, isDriver } = useAuthStore()
  const navigate = useNavigate()

  const links = isAdmin()
    ? adminLinks
    : isDriver()
    ? driverLinks
    : employeeLinks

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-surface-800 border-r border-white/5 flex flex-col shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center
                          shadow-lg shadow-brand-900/50">
            <Bus size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">TransportTrack</p>
            <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/driver' || to === '/employee'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
               transition-all duration-150
               ${isActive
                 ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                 : 'text-white/50 hover:text-white hover:bg-white/5'
               }`
            }
          >
            <Icon size={17} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-brand-600/30 rounded-full flex items-center justify-center
                          text-xs font-semibold text-brand-300">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm
                     text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}