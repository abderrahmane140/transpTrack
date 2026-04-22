import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Truck, Users, UserCheck, MapPin, Map, LogOut, Bus, Route } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const adminLinks = [
  { to: '/admin',           label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/admin/vehicles',  label: 'Vehicles',      icon: Truck           },
  { to: '/admin/drivers',   label: 'Drivers',       icon: UserCheck       },
  { to: '/admin/employees', label: 'Employees',     icon: Users           },
  { to: '/admin/routes',    label: 'Routes',        icon: MapPin          },
  { to: '/admin/trips',     label: 'Trips',         icon: Route           }, // ← add this
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
    <aside className="w-64 bg-white border-r border-gray-300 flex flex-col shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Bus size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black leading-none">
              TransportTrack
            </p>
            <p className="text-[10px] text-black/70 mt-0.5 uppercase tracking-widest">
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/driver' || to === '/employee'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              transition
              ${isActive
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-black hover:bg-gray-100'
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-300">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center
                          text-xs font-semibold text-white">
                <img
                    src={user?.avatar || "/avatar.jpg"}
                    alt="avatar"
                    className="w-9 h-8 rounded-3xl object-cover"
                  />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black truncate">
              {user?.name}
            </p>
            <p className="text-xs text-black/70 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm
                    text-black hover:text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}