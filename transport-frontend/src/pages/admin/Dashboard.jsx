import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck, Users, UserCheck, MapPin,
  Navigation, ArrowRight,
} from 'lucide-react'
import { vehiclesApi, driversApi, employeesApi, routesApi, tripsApi } from '../../api/index'
import { StatCard, Badge } from '../../components/ui/index'

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null)
  const [active,  setActive]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      vehiclesApi.list({ per_page: 1 }),
      driversApi.list({ per_page: 1 }),
      employeesApi.list({ per_page: 1 }),
      routesApi.list({ per_page: 1 }),
      tripsApi.active(),
    ]).then(([v, d, e, r, t]) => {
      setStats({
        vehicles:  v.data.total,
        drivers:   d.data.total,
        employees: e.data.total,
        routes:    r.data.total,
      })
      setActive(t.data.trips || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-fade-in bg-white p-4 rounded-2xl">

  {/* Stats */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 ">
    <StatCard icon={Truck}     label="Vehicles"  value={stats?.vehicles}  color="blue" />
    <StatCard icon={UserCheck} label="Drivers"   value={stats?.drivers}   color="green" />
    <StatCard icon={Users}     label="Employees" value={stats?.employees} color="purple" />
    <StatCard icon={MapPin}    label="Routes"    value={stats?.routes}    color="amber" />
  </div>

  {/* Active trips */}
  <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm">

    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
        <h2 className="text-sm font-semibold text-black">Active Trips</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-black border border-green-300">
          {active.length} live
        </span>
      </div>

      <Link
        to="/admin/tracking"
        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
      >
        View map <ArrowRight size={13} />
      </Link>
    </div>

    {loading ? (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    ) : active.length === 0 ? (
      <div className="text-center py-10 text-black/60">
        <Navigation size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active trips right now</p>
      </div>
    ) : (
      <div className="space-y-2">
        {active.map((trip) => (
          <div
            key={trip.id}
            className="flex items-center gap-4 px-4 py-3 bg-gray-100 rounded-xl
                       border border-gray-300 hover:bg-gray-200 transition"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center
                            justify-center text-blue-600">
              <Navigation size={14} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black truncate">
                {trip.route?.name}
              </p>
              <p className="text-xs text-black/70">
                {trip.driver?.user?.name} · {trip.vehicle?.plate_number}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge status="active" />
              <Link
                to={`/admin/tracking?trip=${trip.id}`}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Track →
              </Link>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Quick actions */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {[
      { to: '/admin/vehicles',  icon: Truck,     label: 'Add Vehicle'  },
      { to: '/admin/drivers',   icon: UserCheck, label: 'Add Driver'   },
      { to: '/admin/employees', icon: Users,     label: 'Add Employee' },
      { to: '/admin/routes',    icon: MapPin,    label: 'Add Route'    },
    ].map(({ to, icon: Icon, label }) => (
      <Link
        key={to}
        to={to}
        className="bg-white border border-gray-300 rounded-xl px-4 py-3
                   flex items-center gap-3 hover:bg-gray-100 hover:shadow-sm
                   transition"
      >
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center
                        justify-center text-blue-600">
          <Icon size={15} />
        </div>

        <span className="text-sm font-medium text-black">{label}</span>

        <ArrowRight size={13} className="ml-auto text-black/60" />
      </Link>
    ))}
  </div>

</div>
  )
}