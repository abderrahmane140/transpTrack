import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navigation, RefreshCw, Cpu, Square, CheckCircle2 } from 'lucide-react'
import { tripsApi, locationsApi, simulationApi, routesApi } from '../../api/index'
import { Badge, Spinner } from '../../components/ui/index'
import LiveMap from '../../components/map/LiveMap'
import { useTripChannel } from '../../hooks/useEcho'
import useTripStore from '../../store/tripStore'
import toast from 'react-hot-toast'

// ── Fetch road route from OSRM (runs in browser — no server restriction) ──────
async function fetchOSRMRoute(stops) {
  if (!stops || stops.length < 2) return []
  try {
    const coords = stops
      .map((s) => `${parseFloat(s.longitude)},${parseFloat(s.latitude)}`)
      .join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`
    const res  = await fetch(url)
    const json = await res.json()
    if (json.code !== 'Ok' || !json.routes?.length) return []
    // Convert GeoJSON [lng,lat] → [[lat,lng]] for Leaflet
    return json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch (err) {
    console.warn('[OSRM] Road route fetch failed:', err)
    return []
  }
}

export default function LiveTracking() {
  const [searchParams]              = useSearchParams()
  const [trips,      setTrips]      = useState([])
  const [selected,   setSelected]   = useState(null)
  const [stops,      setStops]      = useState([])
  const [roadPath,   setRoadPath]   = useState([])    // OSRM road geometry
  const [eta,        setEta]        = useState(null)
  const [simStatus,  setSimStatus]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [follow,     setFollow]     = useState(true)
  const [simLoading, setSimLoading] = useState(false)
  const simPollRef                  = useRef(null)

  const {
    vehiclePosition, locationHistory,
    setCurrentTrip, onLocationUpdated, reset,
  } = useTripStore()

  useTripChannel(selected?.id)

  const loadTrips = useCallback(async () => {
    try {
      const res  = await tripsApi.active()
      const list = res.data.trips || []
      setTrips(list)
      setLoading(false)
      const paramId = searchParams.get('trip')
      if (paramId && !selected) {
        const found = list.find((t) => t.id === parseInt(paramId))
        if (found) selectTrip(found)
      }
    } catch { setLoading(false) }
  }, [])

  useEffect(() => {
    loadTrips()
    const iv = setInterval(loadTrips, 10000)
    return () => {
      clearInterval(iv)
      if (simPollRef.current) clearInterval(simPollRef.current)
    }
  }, [])

  const selectTrip = async (trip) => {
    reset()
    setSelected(trip)
    setCurrentTrip(trip)
    setEta(null)
    setSimStatus(null)
    setRoadPath([])

    // Load route stops
    const stopsRes = await routesApi.stops(trip.route_id)
    const stopList = stopsRes.data.stops || []
    setStops(stopList)

    // Fetch OSRM road path from browser (no server restriction)
    if (stopList.length >= 2) {
      const path = await fetchOSRMRoute(stopList)
      setRoadPath(path)
    }

    // Load latest location
    try {
      const locRes = await locationsApi.latest(trip.id)
      if (locRes.data.location) onLocationUpdated({ location: locRes.data.location })
    } catch {}

    // Check simulation status
    try {
      const simRes = await simulationApi.status(trip.id)
      setSimStatus(simRes.data)
    } catch {}
  }

  // Refresh ETA when vehicle moves
  useEffect(() => {
    if (!selected || !vehiclePosition) return
    const fetchEta = async () => {
      try {
        const res = await locationsApi.eta(selected.id)
        setEta(res.data)
      } catch {}
    }
    fetchEta()
  }, [vehiclePosition?.recorded_at])

  // ── Start simulation — sends OSRM road waypoints to backend ──────────────
  const startSim = async () => {
    setSimLoading(true)
    try {
      // Convert [[lat,lng]] → [{lat,lng}] for the API
      const waypoints = roadPath.map(([lat, lng]) => ({ lat, lng }))

      await simulationApi.start(selected.id, { waypoints })

      toast.success(
        roadPath.length > 0
          ? '🛣️ Simulation started — vehicle will follow real roads'
          : '⚠️ Simulation started (straight lines — OSRM unavailable)'
      )
      setSimStatus({ is_running: true, progress_percent: 0 })

      // Poll simulation progress every 5 seconds
      if (simPollRef.current) clearInterval(simPollRef.current)
      simPollRef.current = setInterval(async () => {
        try {
          const res = await simulationApi.status(selected.id)
          setSimStatus(res.data)
          if (!res.data.is_running) {
            clearInterval(simPollRef.current)
            toast.success('Simulation completed — trip finished')
          }
        } catch { clearInterval(simPollRef.current) }
      }, 5000)

    } catch (err) {
      toast.error('Failed to start simulation')
    } finally {
      setSimLoading(false)
    }
  }

  const stopSim = async () => {
    try {
      await simulationApi.stop(selected.id)
      toast.success('Simulation stopped')
      setSimStatus((p) => ({ ...p, is_running: false }))
      if (simPollRef.current) clearInterval(simPollRef.current)
    } catch {}
  }

  const nextStop = eta?.next_stop || null

  return (
    <div className="flex gap-4 animate-fade-in" style={{ height: 'calc(100vh - 7rem)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">

        {/* Active trips */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Active Trips</h3>
            <button onClick={loadTrips}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8">
              <Navigation size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-xs text-gray-400">No active trips</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((trip) => (
                <button key={trip.id} onClick={() => selectTrip(trip)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all
                    ${selected?.id === trip.id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-gray-50 border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{trip.route?.name}</p>
                    <Badge status="active" />
                  </div>
                  <p className="text-xs text-gray-500">{trip.driver?.user?.name}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{trip.vehicle?.plate_number}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trip details panel */}
        {selected && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm shrink-0 space-y-4">

            {/* Road status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              ${roadPath.length > 0 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
              {roadPath.length > 0
                ? <><CheckCircle2 size={12} /> Road route loaded ({roadPath.length} points)</>
                : <><Navigation size={12} /> Loading road route...</>
              }
            </div>

            {/* Vehicle position */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Live Position</p>
              {vehiclePosition ? (
                <div className="space-y-1.5 text-sm">
                  {[
                    ['Speed',   vehiclePosition.speed   ? `${Math.round(vehiclePosition.speed)} km/h` : '—'],
                    ['Heading', vehiclePosition.heading ? `${Math.round(vehiclePosition.heading)}°`    : '—'],
                    ['Updated', vehiclePosition.recorded_at ? new Date(vehiclePosition.recorded_at).toLocaleTimeString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-400 text-xs">{k}</span>
                      <span className="text-gray-900 text-xs font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400"><Spinner size={11} /> Waiting...</div>
              )}
            </div>

            {/* Next stop ETA */}
            {nextStop && nextStop.status !== 'passed' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-1">Next Stop</p>
                <p className="text-sm font-semibold text-gray-900">{nextStop.stop_name}</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {nextStop.eta_minutes}<span className="text-sm font-normal text-indigo-400 ml-1">min</span>
                </p>
              </div>
            )}

            {/* Simulation controls */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Simulation</p>
              {simStatus?.is_running ? (
                <>
                  <button onClick={stopSim}
                    className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors mb-2">
                    <Square size={12} /> Stop Simulation
                  </button>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(simStatus.progress_percent ?? 0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${simStatus.progress_percent ?? 0}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <button onClick={startSim} disabled={simLoading}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50">
                  {simLoading ? <Spinner size={12} /> : <Cpu size={12} />}
                  {simLoading ? 'Fetching road route...' : 'Start Simulation'}
                </button>
              )}
              <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                {roadPath.length > 0
                  ? '✓ Vehicle will follow real roads via OSRM routing'
                  : 'Vehicle will follow straight lines between stops'}
              </p>
            </div>

            {/* Follow toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Auto-follow vehicle</span>
              <button onClick={() => setFollow(!follow)}
                className={`relative w-10 h-5 rounded-full transition-colors ${follow ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${follow ? 'left-[calc(100%-1.125rem)]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Map ───────────────────────────────────────────────────────── */}
      <div className="flex-1">
        {selected ? (
          <LiveMap
            vehiclePosition={vehiclePosition}
            routeStops={stops}
            roadPath={roadPath}
            nextStop={nextStop}
            pathHistory={locationHistory}
            follow={follow}
            height="100%"
          />
        ) : (
          <div className="h-full bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-gray-400">
            <Navigation size={48} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Select an active trip</p>
            <p className="text-xs mt-1 text-gray-300">to start tracking on the map</p>
          </div>
        )}
      </div>
    </div>
  )
}