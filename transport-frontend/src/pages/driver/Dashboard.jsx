import React, { useEffect, useState } from 'react'
import { Play, Square, MapPin, Clock, Truck, Wifi, WifiOff, Navigation } from 'lucide-react'
import { tripsApi, routesApi } from '../../api/index'
import { Badge, Spinner } from '../../components/ui/index'

import { useGeolocation } from '../../hooks/useGeolocation'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import LiveMap from '../../components/map/Livemap'

export default function DriverDashboard() {
  const { user }              = useAuthStore()
  const [trip,     setTrip]   = useState(null)
  const [stops,    setStops]  = useState([])
  const [loading,  setLoading]= useState(true)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)

  const driver  = user?.driver
  const vehicle = driver?.vehicle

  // Real GPS tracking — only active when trip is running
  const { position, posting, error: gpsError } = useGeolocation(trip?.id, {
    enabled:    trip?.status === 'active',
    intervalMs: 3000,
  })

  const load = async () => {
    setLoading(true)
    try {
      // 1. Check for active trip (driver already on road)
      const activeRes = await tripsApi.active()
      const myActive  = activeRes.data.trips?.find((t) => t.driver_id === driver?.id)

      if (myActive) {
        setTrip(myActive)
        const sr = await routesApi.stops(myActive.route_id)
        setStops(sr.data.stops || [])
        return
      }

      // 2. Check for scheduled trip using the dedicated driver endpoint
      //    (avoids calling admin-only /api/trips list)
      try {
        const schedRes = await driversApi.myScheduledTrip()
        if (schedRes.data.trip) {
          setTrip(schedRes.data.trip)
          const sr = await routesApi.stops(schedRes.data.trip.route_id)
          setStops(sr.data.stops || [])
        }
      } catch {
        // No scheduled trip — driver has nothing assigned yet
      }

    } catch (err) {
      console.error('Failed to load trip:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleStart = async () => {
    if (!trip) return
    setStarting(true)
    try {
      const res = await tripsApi.start(trip.id)
      setTrip(res.data.trip)
      toast.success('Trip started! Your GPS location is now being tracked.')
    } finally { setStarting(false) }
  }

  const handleStop = async () => {
    if (!trip) return
    if (!confirm('End this trip? This action cannot be undone.')) return
    setStopping(true)
    try {
      const res = await tripsApi.stop(trip.id)
      setTrip(res.data.trip)
      toast.success(`Trip completed in ${res.data.duration_minutes} minutes. Well done!`)
    } finally { setStopping(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner /></div>
  )

  const mapPosition = position
    ? { latitude: position.latitude, longitude: position.longitude,
        speed: position.speed, heading: position.heading }
    : null

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Driver info bar */}
      <div className="card flex items-center gap-5">
        <div className="w-12 h-12 bg-green-500/15 rounded-xl flex items-center justify-center shrink-0">
          <Truck size={22} className="text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-black">{user?.name}</p>
          <p className="text-xs text-black">
            {vehicle
              ? `${vehicle.name} · ${vehicle.plate_number} · ${vehicle.capacity} seats`
              : 'No vehicle assigned — contact admin'
            }
          </p>
        </div>

        {/* GPS status indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium
          ${posting
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-white/5 border-white/10 text-black'
          }`}
        >
          {posting
            ? <><Wifi size={13} className="animate-pulse" /> GPS Live</>
            : <><WifiOff size={13} /> GPS Off</>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left panel ──────────────────────────────────── */}
        <div className="space-y-4">

          {!trip ? (
            <div className="card text-center py-12">
              <Navigation size={36} className="mx-auto mb-3 text-black" />
              <p className="text-sm text-black font-medium">No trip assigned</p>
              <p className="text-xs text-black mt-1">
                Contact your administrator to get a trip assigned
              </p>
            </div>
          ) : (
            <>
              {/* Trip card */}
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-black">Current Trip</h3>
                  <Badge status={trip.status} />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <MapPin size={14} className="text-black mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-black mb-0.5">Route</p>
                      <p className="text-blackfont-medium text-sm">{trip.route?.name}</p>
                      <p className="text-xs text-black mt-0.5">
                        {trip.route?.start_location} → {trip.route?.end_location}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <Clock size={14} className="text-black mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-black mb-0.5">
                        {trip.status === 'active' ? 'Started' : 'Scheduled for'}
                      </p>
                      <p className="text-black text-sm">
                        {trip.started_at
                          ? formatDistanceToNow(new Date(trip.started_at), { addSuffix: true })
                          : trip.scheduled_start
                            ? new Date(trip.scheduled_start).toLocaleString()
                            : 'When youre ready'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <Truck size={14} className="text-black mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-black mb-0.5">Vehicle</p>
                      <p className="text-black text-sm font-mono">{trip.vehicle?.plate_number}</p>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                {trip.status === 'scheduled' && (
                  <button
                    onClick={handleStart}
                    disabled={starting || !vehicle}
                    className="btn-primary w-full justify-center py-3 mt-1"
                  >
                    {starting ? <><Spinner size={14} /> Starting...</> : <><Play size={15} /> Start Trip</>}
                  </button>
                )}

                {trip.status === 'active' && (
                  <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="w-full justify-center py-3 btn
                               bg-red-500/15 hover:bg-red-500/25
                               text-red-400 hover:text-red-300
                               border border-red-500/20"
                  >
                    {stopping ? <><Spinner size={14} /> Ending...</> : <><Square size={15} /> End Trip</>}
                  </button>
                )}

                {trip.status === 'completed' && (
                  <div className="text-center py-3 text-green-400 text-sm font-medium
                                  bg-green-500/10 rounded-xl">
                    ✓ Trip completed successfully
                  </div>
                )}
              </div>

              {/* Route stops */}
              <div className="card">
                <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-3">
                  Route Stops ({stops.length})
                </h3>
                <div className="space-y-2 relative">
                  <div className="absolute left-3 top-4 bottom-4 w-px bg-white/8" />
                  {stops.map((stop) => (
                    <div key={stop.id} className="flex items-start gap-3 pl-1">
                      <div className="w-6 h-6 bg-brand-600/20 border border-brand-500/20 rounded-full
                                      flex items-center justify-center text-[10px] font-bold
                                      text-brand-400 shrink-0 z-10 mt-0.5">
                        {stop.order_number}
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <p className="text-sm text-black font-medium">{stop.name}</p>
                        {stop.landmark && (
                          <p className="text-xs text-black">{stop.landmark}</p>
                        )}
                        <p className="text-[11px] text-black mt-0.5">
                          +{stop.estimated_minutes_from_start} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live GPS readout */}
              {position && (
                <div className="card">
                  <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-3">
                    Your GPS
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Latitude',  position.latitude?.toFixed(6)],
                      ['Longitude', position.longitude?.toFixed(6)],
                      ['Speed',     position.speed ? `${Math.round(position.speed)} km/h` : '—'],
                      ['Accuracy',  position.accuracy ? `±${Math.round(position.accuracy)}m` : '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-white/3 rounded-xl p-2.5">
                        <p className="text-[10px] text-black mb-0.5 uppercase tracking-wider">{k}</p>
                        <p className="text-black font-mono text-xs">{v}</p>
                      </div>
                    ))}
                  </div>
                  {gpsError && (
                    <p className="text-xs text-red-400 mt-2 bg-red-500/10 rounded-lg px-2 py-1.5">
                      GPS error: {gpsError}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Map ────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <LiveMap
            vehiclePosition={mapPosition}
            routeStops={stops}
            follow
            height="calc(100vh - 14rem)"
          />
        </div>
      </div>
    </div>
  )
}