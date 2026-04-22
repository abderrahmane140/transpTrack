import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navigation, RefreshCw, Cpu, Square } from 'lucide-react'
import { tripsApi, locationsApi, simulationApi, routesApi } from '../../api/index'
import { Badge, Spinner } from '../../components/ui/index'

import { useTripChannel } from '../../hooks/useEcho'
import useTripStore from '../../store/tripStore'
import toast from 'react-hot-toast'
import LiveMap from '../../components/map/Livemap'

export default function LiveTracking() {
  const [searchParams]              = useSearchParams()
  const [trips,    setTrips]        = useState([])
  const [selected, setSelected]     = useState(null)
  const [stops,    setStops]        = useState([])
  const [eta,      setEta]          = useState(null)
  const [simStatus,setSimStatus]    = useState(null)
  const [loading,  setLoading]      = useState(true)
  const [follow,   setFollow]       = useState(true)

  const {
    vehiclePosition, locationHistory,
    setCurrentTrip, onLocationUpdated, reset,
  } = useTripStore()

  useTripChannel(selected?.id)
  

  const loadTrips = useCallback(async () => {
    try {
      const res = await tripsApi.active()
      const list = res.data.trips || []
      setTrips(list)
      setLoading(false)

      const paramId = searchParams.get('trip')
      if (paramId && !selected) {
        const found = list.find((t) => t.id === parseInt(paramId))
        if (found) await selectTrip(found)
      }
    } catch { setLoading(false) }
  }, [])

  useEffect(() => {
    loadTrips()
    const iv = setInterval(loadTrips, 10000)
    return () => clearInterval(iv)
  }, [])

  const selectTrip = async (trip) => {
    reset()
    setSelected(trip)
    setCurrentTrip(trip)
    setEta(null)
    setSimStatus(null)

    const [stopsRes] = await Promise.all([routesApi.stops(trip.route_id)])
    setStops(stopsRes.data.stops || [])

    try {
      const locRes = await locationsApi.latest(trip.id)
      if (locRes.data.location) onLocationUpdated({ location: locRes.data.location })
    } catch {}

    try {
      const simRes = await simulationApi.status(trip.id)
      setSimStatus(simRes.data)
    } catch {}
  }

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

  const startSim = async () => {
    try {
      await simulationApi.start(selected.id)
      toast.success('Simulation started — vehicle will begin moving on the map')
      setSimStatus({ is_running: true, progress_percent: 0 })
      // Poll sim status
      const iv = setInterval(async () => {
        try {
          const res = await simulationApi.status(selected.id)
          setSimStatus(res.data)
          if (!res.data.is_running) clearInterval(iv)
        } catch { clearInterval(iv) }
      }, 5000)
    } catch {}
  }

  const stopSim = async () => {
    try {
      await simulationApi.stop(selected.id)
      toast.success('Simulation stopped')
      setSimStatus((prev) => ({ ...prev, is_running: false }))
    } catch {}
  }

  const nextStop = eta?.next_stop || null

  return (
    <div className="flex gap-5 h-[calc(100vh-9rem)] animate-fade-in">

      {/* ── Left sidebar ───────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">

        {/* Active trip list */}
        <div className="card flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-black">Active Trips</h3>
            <button onClick={loadTrips} className="text-black hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
              <RefreshCw size={13} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 text-black">
              <Navigation size={28} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs">No active trips right now</p>
              <p className="text-[10px] text-black mt-1">Create and start a trip to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => selectTrip(trip)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition-all duration-150
                    ${selected?.id === trip.id
                      ? 'bg-brand-600/15 border-brand-500/30 shadow-lg shadow-brand-900/20'
                      : 'bg-white/3 border-white/5 hover:border-white/15 hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-black truncate">{trip.route?.name}</p>
                    <Badge status="active" />
                  </div>
                  <p className="text-xs text-black">{trip.driver?.user?.name}</p>
                  <p className="text-[11px] text-black font-mono mt-0.5">
                    {trip.vehicle?.plate_number}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected trip details */}
        {selected && (
          <div className="card space-y-4 shrink-0">

            {/* Vehicle position */}
            <div>
              <p className="text-xs font-semibold text-black uppercase tracking-wider mb-2">
                Live Position
              </p>
              {vehiclePosition ? (
                <div className="space-y-1.5 text-sm">
                  {[
                    ['Speed',   vehiclePosition.speed    ? `${Math.round(vehiclePosition.speed)} km/h` : '—'],
                    ['Heading', vehiclePosition.heading  ? `${Math.round(vehiclePosition.heading)}°`   : '—'],
                    ['Updated', vehiclePosition.recorded_at ? new Date(vehiclePosition.recorded_at).toLocaleTimeString() : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-black">{k}</span>
                      <span className="text-black text-xs font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-black">
                  <Spinner size={12} /> Waiting for location...
                </div>
              )}
            </div>

            {/* Next stop ETA */}
            {nextStop && nextStop.status !== 'passed' && (
              <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl p-3">
                <p className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider mb-1">
                  Next Stop
                </p>
                <p className="text-sm text-black font-medium">{nextStop.stop_name}</p>
                <p className="text-2xl font-bold text-brand-300 mt-1">
                  {nextStop.eta_minutes}
                  <span className="text-sm font-normal text-brand-400/70 ml-1">min</span>
                </p>
                <p className="text-xs text-brand-400/60 mt-0.5">ETA {nextStop.eta_time}</p>
              </div>
            )}

            {/* Simulation */}
            <div>
              <p className="text-xs font-semibold text-black uppercase tracking-wider mb-2">
                GPS Simulation
              </p>
              {simStatus?.is_running ? (
                <>
                  <button onClick={stopSim} className="btn-danger w-full justify-center py-2 mb-2">
                    <Square size={13} /> Stop Simulation
                  </button>
                  <div>
                    <div className="flex justify-between text-xs text-black mb-1">
                      <span>Progress</span>
                      <span>{Math.round(simStatus.progress_percent ?? 0)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-brand-400
                                   rounded-full transition-all duration-1000"
                        style={{ width: `${simStatus.progress_percent ?? 0}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <button onClick={startSim} className="btn-ghost w-full justify-center py-2">
                  <Cpu size={13} /> Start Simulation
                </button>
              )}
              <p className="text-[10px] text-black mt-2 leading-relaxed">
                Simulation sends GPS coordinates every 3s along the route without real hardware.
              </p>
            </div>

            {/* Auto-follow toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-black">Auto-follow vehicle</span>
              <button
                onClick={() => setFollow(!follow)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200
                  ${follow ? 'bg-brand-600' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md
                                  transition-all duration-200
                                  ${follow ? 'left-[calc(100%-1.25rem)]' : 'left-1'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Map ───────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {selected ? (
          <LiveMap
            vehiclePosition={vehiclePosition}
            routeStops={stops}
            nextStop={nextStop}
            pathHistory={locationHistory}
            follow={follow}
            height="600px"
          />
        ) : (
          <div className="h-full card flex flex-col items-center justify-center text-black">
            <Navigation size={52} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Select an active trip</p>
            <p className="text-xs mt-1 text-black">to start tracking on the map</p>
          </div>
        )}
      </div>
    </div>
  )
}