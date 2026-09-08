import 'leaflet/dist/leaflet.css'
import React, { useEffect, useRef } from 'react'
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, useMap,
} from 'react-leaflet'
import { patchDefaultLeafletIcons, vehicleIcon, driverIcon, makeStopIcon } from './icons'

patchDefaultLeafletIcons()

// ── BUG FIX 1: AutoPan only fires when follow=true AND position actually changes ──
// Uses a ref to avoid re-centering on mount
function AutoPan({ position, follow }) {
  const map      = useMap()
  const prevPos  = useRef(null)
  const mounted  = useRef(false)

  useEffect(() => {
    // Skip first render — don't auto-pan on initial load
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (!follow || !position) return

    // Only pan if position actually changed (not just re-render)
    const prev = prevPos.current
    if (prev && prev.latitude === position.latitude && prev.longitude === position.longitude) return

    prevPos.current = position
    map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.8 })
  }, [position?.latitude, position?.longitude, follow])

  return null
}

// ── Fix grey tiles on mount ───────────────────────────────────────────────────
function SizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  return null
}

// ── Main LiveMap ──────────────────────────────────────────────────────────────
export default function LiveMap({
  vehiclePosition,   // { latitude, longitude, speed, heading } — vehicle being tracked
  driverPosition,    // { latitude, longitude } — driver's own GPS (shown as blue dot)
  routeStops    = [],
  roadPath      = [], // pre-computed road geometry [[lat,lng],...] from OSRM
  nextStop      = null,
  pathHistory   = [],
  follow        = false,
  height        = '500px',
  className     = '',
}) {
  // BUG FIX 3: Center is computed ONCE from stops — never from user's GPS position
  // This prevents the map jumping to the user's real location
  const initialCenter = useRef(
    routeStops.length
      ? [parseFloat(routeStops[0].latitude), parseFloat(routeStops[0].longitude)]
      : [31.6295, -8.0082] // Marrakesh default
  )

  const cssHeight = typeof height === 'number' ? `${height}px` : height

  // The route line: use OSRM road path if available, else straight lines between stops
  const routeLineCoords = roadPath.length > 1
    ? roadPath
    : routeStops.map((s) => [parseFloat(s.latitude), parseFloat(s.longitude)])

  const historyCoords = pathHistory.map((l) => [parseFloat(l.latitude), parseFloat(l.longitude)])

  return (
    <div style={{ height: cssHeight, minHeight: 300, position: 'relative' }}
      className={`rounded-xl overflow-hidden border border-gray-200 shadow-sm ${className}`}>
      <MapContainer
        center={initialCenter.current}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl
        scrollWheelZoom
      >
        <SizeWatcher />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
          keepBuffer={4}
        />

        {/* Planned route — dashed when straight lines, solid when road-following */}
        {routeLineCoords.length > 1 && (
          <Polyline
            positions={routeLineCoords}
            pathOptions={{
              color:     '#4f46e5',
              weight:    4,
              opacity:   roadPath.length > 1 ? 0.7 : 0.35,
              dashArray: roadPath.length > 1 ? null : '10 8',
            }}
          />
        )}

        {/* Actual driven path (GPS history) */}
        {historyCoords.length > 1 && (
          <Polyline
            positions={historyCoords}
            pathOptions={{ color: '#7c3aed', weight: 4, opacity: 0.85 }}
          />
        )}

        {/* Stop markers */}
        {routeStops.map((stop) => {
          const isNext   = nextStop && stop.id === nextStop.stop_id
          const isPassed = nextStop && stop.order_number < (nextStop.order_number ?? 999)
          return (
            <Marker
              key={stop.id}
              position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
              icon={makeStopIcon(stop.order_number, isNext, isPassed)}
            >
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#111827' }}>
                    {stop.order_number}. {stop.name}
                  </p>
                  {stop.landmark && <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>📍 {stop.landmark}</p>}
                  <p style={{ color: '#4f46e5', fontSize: 11 }}>+{stop.estimated_minutes_from_start} min</p>
                  {isNext && <span style={{ display:'inline-block', marginTop:6, background:'#eef2ff', color:'#4f46e5', padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700 }}>NEXT STOP</span>}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* BUG FIX 2: Vehicle marker (the bus being tracked — indigo) */}
        {vehiclePosition && (
          <Marker
            position={[parseFloat(vehiclePosition.latitude), parseFloat(vehiclePosition.longitude)]}
            icon={vehicleIcon}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#111827' }}>🚌 Vehicle</p>
                <table style={{ fontSize: 11, width: '100%' }}>
                  <tbody>
                    {[
                      ['Speed',   vehiclePosition.speed   ? `${Math.round(vehiclePosition.speed)} km/h`  : '—'],
                      ['Heading', vehiclePosition.heading ? `${Math.round(vehiclePosition.heading)}°`     : '—'],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ color: '#6b7280', paddingRight: 8, paddingBottom: 3 }}>{k}</td>
                        <td style={{ fontWeight: 600, color: '#111827' }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vehiclePosition.recorded_at && (
                  <p style={{ color: '#9ca3af', fontSize: 10, marginTop: 4 }}>
                    Updated {new Date(vehiclePosition.recorded_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* BUG FIX 2: Driver's own GPS position (blue dot — "you are here") */}
        {driverPosition && (
          <Marker
            position={[parseFloat(driverPosition.latitude), parseFloat(driverPosition.longitude)]}
            icon={driverIcon}
          >
            <Popup>
              <div style={{ fontSize: 12, color: '#111827' }}>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>📍 Your Location</p>
                <p style={{ color: '#6b7280', fontSize: 11 }}>
                  {parseFloat(driverPosition.latitude).toFixed(5)}, {parseFloat(driverPosition.longitude).toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Auto-pan follows vehicle (not driver GPS) */}
        <AutoPan position={vehiclePosition} follow={follow} />
      </MapContainer>
    </div>
  )
}