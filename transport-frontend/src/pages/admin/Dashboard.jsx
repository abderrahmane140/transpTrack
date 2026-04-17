import { useEffect, useState } from "react";
import { driversApi, employeesApi, routeApi, tripApi, vehiclesApi } from "../../api";

export default function AdminDashboard() {
    const [stats, setStats]     = useState(null)
    const [active, setActive]   = useState([])
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        Promise.all([
            vehiclesApi.list({per_page: 1}),
            driversApi.list({per_page: 1}),
            employeesApi.list({per_page: 1}),
            routeApi.list({per_page: 1}),
            tripApi.active(),
        ]).then(([v, d, e, r,]) => {
            setStats({
                vehicles:  v.data.total,
                drivers:   d.data.total,
                employees: e.data.total,
                routes:    r.data.total,
            })
            setActive(tripApi.data.trips || [])
        }).finally(() => setLoading(false))
    },[])


    return (
        <div className="space-y-6 animate-fade-in">
 
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Truck}     label="Vehicles"  value={stats?.vehicles}  color="brand"  />
        <StatCard icon={UserCheck} label="Drivers"   value={stats?.drivers}   color="green"  />
        <StatCard icon={Users}     label="Employees" value={stats?.employees} color="purple" />
        <StatCard icon={MapPin}    label="Routes"    value={stats?.routes}    color="amber"  />
      </div>
 
      {/* Active trips */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-white">Active Trips</h2>
            <span className="badge bg-green-500/15 text-green-400 border border-green-500/20">
              {active.length} live
            </span>
          </div>
          <Link to="/admin/tracking" className="btn-ghost text-xs gap-1">
            View map <ArrowRight size={13} />
          </Link>
        </div>
 
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-10 text-white/30">
            <Navigation size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">No active trips right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((trip) => (
              <div
                key={trip.id}
                className="flex items-center gap-4 px-4 py-3 bg-white/3 rounded-xl
                           border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="w-8 h-8 bg-brand-600/20 rounded-lg flex items-center
                                justify-center text-brand-400">
                  <Navigation size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {trip.route?.name}
                  </p>
                  <p className="text-xs text-white/40">
                    {trip.driver?.user?.name} · {trip.vehicle?.plate_number}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status="active" />
                  <Link
                    to={`/admin/tracking?trip=${trip.id}`}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
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
            className="card hover:border-brand-500/20 hover:bg-surface-700
                       transition-all duration-200 flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-brand-600/15 rounded-lg flex items-center
                            justify-center text-brand-400">
              <Icon size={15} />
            </div>
            <span className="text-sm font-medium text-white/70">{label}</span>
            <ArrowRight size={13} className="ml-auto text-white/20" />
          </Link>
        ))}
      </div>
    </div>
  )
}