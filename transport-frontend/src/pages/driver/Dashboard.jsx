import React, { useEffect, useState, useRef } from 'react'
import { Play, Square, MapPin, Clock, Truck, Wifi, WifiOff, Navigation } from 'lucide-react'
import { tripsApi, routesApi } from '../../api/index'
import { driversApi } from '../../api/index'
import { Badge, Spinner } from '../../components/ui/index'
import LiveMap from '../../components/map/LiveMap'
import { useGeolocation } from '../../hooks/useGeolocation'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

// Fetch OSRM road path (browser can reach OSRM, server cannot)
async function fetchRoadPath(stops) {
  if (!stops || stops.length < 2) return []
  try {
    const coords = stops.map((s) => `${parseFloat(s.longitude)},${parseFloat(s.latitude)}`).join(';')
    const url    = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`
    const res    = await fetch(url)
    const json   = await res.json()
    if (json.code !== 'Ok' || !json.routes?.length) return []
    return json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch { return [] }
}

export default function DriverDashboard() {
  const { user }               = useAuthStore()
  const [trip,     setTrip]    = useState(null)
  const [stops,    setStops]   = useState([])
  const [roadPath, setRoadPath]= useState([])
  const [loading,  setLoading] = useState(true)
  const [starting, setStarting]= useState(false)
  const [stopping, setStopping]= useState(false)

  const driver  = user?.driver
  const vehicle = driver?.vehicle

  // BUG FIX 2: useGeolocation gives the driver's OWN GPS position
  // This is shown as a blue "you are here" dot on the map
  // It is SEPARATE from the vehicle marker (indigo bus icon)
  const { position: driverGPS, posting, error: gpsError } = useGeolocation(trip?.id, {
    enabled:    trip?.status === 'active',
    intervalMs: 3000,
  })

  const load = async () => {
    setLoading(true)
    try {
      // Check for active trip
      const activeRes = await tripsApi.active()
      const myActive  = activeRes.data.trips?.find((t) => t.driver_id === driver?.id)

      if (myActive) {
        setTrip(myActive)
        const sr   = await routesApi.stops(myActive.route_id)
        const list = sr.data.stops || []
        setStops(list)
        const path = await fetchRoadPath(list)
        setRoadPath(path)
        return
      }

      // Check for scheduled trip
      try {
        const schedRes = await driversApi.myScheduledTrip()
        if (schedRes.data.trip) {
          const t    = schedRes.data.trip
          setTrip(t)
          const sr   = await routesApi.stops(t.route_id)
          const list = sr.data.stops || []
          setStops(list)
          const path = await fetchRoadPath(list)
          setRoadPath(path)
        }
      } catch {}

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
      toast.success('Trip started! Your GPS is now being tracked.')
    } finally { setStarting(false) }
  }

  const handleStop = async () => {
    if (!trip) return
    if (!confirm('End this trip?')) return
    setStopping(true)
    try {
      const res = await tripsApi.stop(trip.id)
      setTrip(res.data.trip)
      toast.success(`Trip completed in ${res.data.duration_minutes} minutes.`)
    } finally { setStopping(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>

  // BUG FIX 2:
  // driverGPS  = driver's own phone GPS → shown as blue dot ("you are here")
  // vehiclePosition (from WebSocket) would be for watching other vehicles
  // For the driver, they ARE the vehicle, so we use driverGPS as both
  const driverPosition = driverGPS
    ? { latitude: driverGPS.latitude, longitude: driverGPS.longitude }
    : null

  // The vehicle marker tracks the same position as the driver's GPS
  // because the driver IS the vehicle
  const vehiclePosition = driverGPS
    ? { latitude: driverGPS.latitude, longitude: driverGPS.longitude, speed: driverGPS.speed, heading: driverGPS.heading }
    : null

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Driver info bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
        <div className="w-11 h-11 bg-green-50 border border-green-200 rounded-xl flex items-center justify-center shrink-0">
          <Truck size={20} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">
            {vehicle ? `${vehicle.name} · ${vehicle.plate_number} · ${vehicle.capacity} seats` : 'No vehicle assigned'}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold
          ${posting ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
          {posting ? <><Wifi size={13} className="animate-pulse" /> GPS Live</> : <><WifiOff size={13} /> GPS Off</>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left panel */}
        <div className="space-y-4">
          {!trip ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <Navigation size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium text-sm">No trip assigned</p>
              <p className="text-gray-400 text-xs mt-1">Contact your administrator</p>
            </div>
          ) : (
            <>
              {/* Trip card */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Current Trip</h3>
                  <Badge status={trip.status} />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Route</p>
                      <p className="text-sm font-semibold text-gray-900">{trip.route?.name}</p>
                      <p className="text-xs text-gray-400">{trip.route?.start_location} → {trip.route?.end_location}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Clock size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">{trip.status === 'active' ? 'Started' : 'Scheduled'}</p>
                      <p className="text-sm text-gray-700">
                        {trip.started_at
                          ? formatDistanceToNow(new Date(trip.started_at), { addSuffix: true })
                          : trip.scheduled_start
                            ? new Date(trip.scheduled_start).toLocaleString()
                            : 'When ready'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {trip.status === 'scheduled' && (
                  <button onClick={handleStart} disabled={starting || !vehicle}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50">
                    {starting ? <Spinner size={14} /> : <Play size={15} />}
                    Start Trip
                  </button>
                )}
                {trip.status === 'active' && (
                  <button onClick={handleStop} disabled={stopping}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                    {stopping ? <Spinner size={14} /> : <Square size={15} />}
                    End Trip
                  </button>
                )}
                {trip.status === 'completed' && (
                  <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl">
                    ✓ Trip completed
                  </div>
                )}
              </div>

              {/* Route stops */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Route Stops ({stops.length})
                </h3>
                <div className="space-y-2">
                  {stops.map((stop) => (
                    <div key={stop.id} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-indigo-50 border border-indigo-200 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0 mt-0.5">
                        {stop.order_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{stop.name}</p>
                        {stop.landmark && <p className="text-xs text-gray-400">{stop.landmark}</p>}
                        <p className="text-[10px] text-gray-300">+{stop.estimated_minutes_from_start}min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GPS readout */}
              {driverGPS && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your GPS</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Latitude',  driverGPS.latitude?.toFixed(6)],
                      ['Longitude', driverGPS.longitude?.toFixed(6)],
                      ['Speed',     driverGPS.speed ? `${Math.round(driverGPS.speed)} km/h` : '—'],
                      ['Accuracy',  driverGPS.accuracy ? `±${Math.round(driverGPS.accuracy)}m` : '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">{k}</p>
                        <p className="text-xs font-mono font-semibold text-gray-900">{v}</p>
                      </div>
                    ))}
                  </div>
                  {gpsError && <p className="text-xs text-red-500 mt-2 bg-red-50 px-2 py-1 rounded">{gpsError}</p>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          {/*
            BUG FIX 2:
            - vehiclePosition = the bus icon (indigo) — shows where the vehicle is
            - driverPosition  = the blue dot — shows "you are here"
            For the driver, both are the same GPS position, but they are
            visually different markers so the driver can see themselves on the map
          */}
          <LiveMap
            vehiclePosition={vehiclePosition}
            driverPosition={driverPosition}
            routeStops={stops}
            roadPath={roadPath}
            follow
            height="calc(100vh - 220px)"
          />
        </div>
      </div>
    </div>
  )
}