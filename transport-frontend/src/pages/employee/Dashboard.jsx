import React, { useEffect, useState, useRef } from 'react'
import { MapPin, Clock, Bus, AlertCircle, RefreshCw, Navigation } from 'lucide-react'
import { employeesApi, locationsApi } from '../../api/index'
import { Badge, Spinner } from '../../components/ui/index'

import { useTripChannel } from '../../hooks/useEcho'
import useTripStore from '../../store/tripStore'
import useAuthStore from '../../store/authStore'
import LiveMap from '../../components/map/Livemap'

export default function EmployeeDashboard() {
  const { user }              = useAuthStore()
  const [route,    setRoute]  = useState(null)
  const [trip,     setTrip]   = useState(null)
  const [stops,    setStops]  = useState([])
  const [eta,      setEta]    = useState(null)
  const [loading,  setLoading]= useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const etaRef                = useRef(null)

  const {
    vehiclePosition, locationHistory,
    onLocationUpdated, setCurrentTrip, reset,
  } = useTripStore()

  const employee   = user?.employee
  const pickupStop = employee?.pickup_stop

  // Subscribe to WebSocket for real-time location
  useTripChannel(trip?.id)

  const load = async () => {
    try {
      const [routeRes, tripRes] = await Promise.all([
        employeesApi.myRoute(),
        employeesApi.myActiveTrip(),
      ])

      const r = routeRes.data.route
      setRoute(r)
      setStops(r?.stops || [])

      const activeTrip = tripRes.data.trip
      setTrip(activeTrip)

      if (activeTrip) {
        setCurrentTrip(activeTrip)

        // Get latest location
        try {
          const locRes = await locationsApi.latest(activeTrip.id)
          if (locRes.data.location) onLocationUpdated({ location: locRes.data.location })
        } catch {}

        // Get initial ETA
        try {
          const etaRes = await locationsApi.eta(activeTrip.id)
          setEta(etaRes.data)
        } catch {}
      }
    } catch {
      // No route assigned — handled by UI
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    return () => {
      reset()
      if (etaRef.current) clearInterval(etaRef.current)
    }
  }, [])

  // Refresh ETA every time vehicle position updates via WebSocket
  useEffect(() => {
    if (!trip || !vehiclePosition) return
    const fetchEta = async () => {
      try {
        const res = await locationsApi.eta(trip.id)
        setEta(res.data)
      } catch {}
    }
    fetchEta()
  }, [vehiclePosition?.recorded_at])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const myStopEta = eta?.my_stop_eta
    || eta?.stops?.find((s) => s.stop_name === pickupStop)
  const nextStop  = eta?.next_stop

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner /></div>
  )

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">My Transport</h2>
          <p className="text-xs text-black">
            {route ? route.name : 'No route assigned yet'}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost py-2">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* No route assigned */}
      {!route ? (
        <div className="card text-center py-16">
          <AlertCircle size={40} className="mx-auto mb-3 text-black" />
          <p className="text-black text-sm font-medium">No transport route assigned</p>
          <p className="text-black text-xs mt-2 max-w-xs mx-auto leading-relaxed">
            Your administrator will assign you to a transport route. Please check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left info panel ──────────────────────────── */}
          <div className="space-y-4">

            {/* My route */}
            <div className="card space-y-3">
              <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                My Route
              </h3>
              <div className="flex gap-3">
                <MapPin size={14} className="text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-black text-sm">{route.name}</p>
                  <p className="text-xs text-black mt-0.5">
                    {route.start_location} → {route.end_location}
                  </p>
                  {route.estimated_duration_minutes && (
                    <p className="text-xs text-white/25 mt-0.5">
                      ~{route.estimated_duration_minutes} min journey
                    </p>
                  )}
                </div>
              </div>

              {/* Pickup stop highlight */}
              {pickupStop && (
                <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider mb-0.5">
                    Your Pickup Stop
                  </p>
                  <p className="text-sm text-black font-medium">{pickupStop}</p>
                </div>
              )}
            </div>

            {/* Trip status */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                  Today's Trip
                </h3>
                {trip && <Badge status={trip.status} />}
              </div>

              {!trip ? (
                <div className="text-center py-5">
                  <Bus size={28} className="mx-auto mb-2 text-black" />
                  <p className="text-xs text-black font-medium">No active trip</p>
                  <p className="text-[11px] text-black mt-1">
                    Trip will appear here when your driver starts
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Driver',  trip.driver?.user?.name],
                    ['Vehicle', trip.vehicle?.plate_number],
                    ['Started', trip.started_at ? new Date(trip.started_at).toLocaleTimeString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-black">{k}</span>
                      <span className={`text-black text-xs font-medium ${k === 'Vehicle' ? 'font-mono' : ''}`}>{v || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ETA panel — only when trip is active */}
            {trip?.status === 'active' && (
              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
                  Estimated Arrival
                </h3>

                {/* My pickup stop ETA */}
                {myStopEta && myStopEta.status !== 'passed' ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wider mb-0.5">
                      Your Stop
                    </p>
                    <p className="text-sm text-black font-medium">{myStopEta.stop_name}</p>
                    <p className="text-4xl font-bold text-green-300 my-2 leading-none">
                      {myStopEta.eta_minutes}
                    </p>
                    <p className="text-xs text-green-400/70">
                      minutes away · {myStopEta.eta_time}
                    </p>
                  </div>
                ) : myStopEta?.status === 'passed' ? (
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-sm text-black">Your stop has been passed</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-black py-1">
                    <Spinner size={12} /> Calculating ETA...
                  </div>
                )}

                {/* All stops ETA list */}
                {eta?.stops && eta.stops.length > 0 && (
                  <div className="space-y-1">
                    {eta.stops.map((s) => (
                      <div
                        key={s.stop_id}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-xs
                          ${s.status === 'passed'   ? 'opacity-25'        : ''}
                          ${s.status === 'next'     ? 'bg-brand-600/10'   : ''}
                          ${s.stop_name === pickupStop ? 'bg-green-500/8' : ''}
                        `}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0
                          ${s.status === 'passed' ? 'bg-white/15'
                          : s.status === 'next'   ? 'bg-brand-400 animate-pulse'
                          : s.stop_name === pickupStop ? 'bg-green-400'
                          : 'bg-white/30'}`}
                        />
                        <span className={`flex-1 truncate
                          ${s.status === 'next'       ? 'text-brand-300 font-semibold'
                          : s.stop_name === pickupStop ? 'text-green-300 font-medium'
                          : s.status === 'passed'      ? 'text-black'
                          : 'text-white/55'}`}
                        >
                          {s.stop_name}
                          {s.stop_name === pickupStop && (
                            <span className="ml-1 text-[9px] text-green-400/70">YOUR STOP</span>
                          )}
                        </span>
                        <span className={`shrink-0 font-medium
                          ${s.status === 'passed' ? 'text-black' : 'text-black'}`}>
                          {s.status === 'passed' ? '✓' : `${s.eta_minutes}m`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Speed info */}
                {vehiclePosition?.speed != null && vehiclePosition.speed > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                    <span className="text-black">Vehicle speed</span>
                    <span className="text-black font-medium">
                      {Math.round(vehiclePosition.speed)} km/h
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Map ───────────────────────────────────────── */}
          <div className="lg:col-span-2 relative">
            <LiveMap
              vehiclePosition={vehiclePosition}
              routeStops={stops}
              nextStop={nextStop}
              pathHistory={locationHistory}
              follow
              height="calc(100vh - 14rem)"
            />

            {/* Waiting overlay */}
            {!vehiclePosition && trip?.status === 'active' && (
              <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
                <div className="bg-surface-800/90 border border-white/10 backdrop-blur-sm
                                rounded-xl px-4 py-3 text-sm text-black
                                flex items-center gap-2.5 shadow-xl">
                  <Spinner size={14} />
                  Waiting for vehicle location...
                </div>
              </div>
            )}

            {/* No active trip overlay */}
            {!trip && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-surface-800/80 border border-white/8 backdrop-blur-sm
                                rounded-2xl px-6 py-5 text-center shadow-2xl">
                  <Navigation size={28} className="mx-auto mb-2 text-black" />
                  <p className="text-sm text-black">Map will activate when your trip starts</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}