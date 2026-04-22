// IMPORTANT: leaflet CSS must be the very first import
import 'leaflet/dist/leaflet.css'

import React, { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'

// ── Fix Vite broken default icon paths ────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Vehicle animated icon ─────────────────────────────────────────────────────
const vehicleIcon = L.divIcon({
  html: `
    <div style="position:relative;width:40px;height:40px">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:rgba(99,102,241,0.3);
        animation:vping 1.4s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;inset:5px;border-radius:50%;
        background:#6366f1;
        border:3px solid white;
        box-shadow:0 2px 12px rgba(99,102,241,0.6);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M18 18.5a1.5 1.5 0 0 1-3 0m3 0H6m12 0h2.5A.5.5 0 0 0 21 18V9l-3-5H6a2 2 0 0 0-2 2v12h2m0 0a1.5 1.5 0 0 0 3 0m-3 0h3"/>
        </svg>
      </div>
    </div>
    <style>
      @keyframes vping{75%,100%{transform:scale(2.1);opacity:0}}
    </style>
  `,
  className:  '',
  iconSize:   [40, 40],
  iconAnchor: [20, 20],
  popupAnchor:[0, -24],
})

// ── Stop marker factory ───────────────────────────────────────────────────────
function makeStopIcon(order, isNext = false, isPassed = false) {
  const bg     = isNext ? '#6366f1' : isPassed ? '#ffffff12' : '#1e2230'
  const border = isNext ? '3px solid #fff'
    : isPassed ? '2px solid #ffffff15'
    : '2px solid #ffffff30'
  const color  = isNext ? '#fff' : isPassed ? '#ffffff30' : '#ffffff70'

  return L.divIcon({
    html: `
      <div style="
        width:28px;height:28px;background:${bg};border:${border};
        border-radius:50%;display:flex;align-items:center;justify-content:center;
        color:${color};font-size:11px;font-weight:700;
        font-family:DM Sans,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.4);
      ">${order}</div>
    `,
    className:  '',
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    popupAnchor:[0, -16],
  })
}

// ── Auto-pan to follow vehicle ────────────────────────────────────────────────
function AutoPan({ position, follow }) {
  const map = useMap()
  useEffect(() => {
    if (follow && position) {
      map.panTo(
        [position.latitude, position.longitude],
        { animate: true, duration: 0.5 },
      )
    }
  }, [position?.latitude, position?.longitude, follow])
  return null
}

// ── Fix grey tiles on first render ────────────────────────────────────────────
function SizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    const t3 = setTimeout(() => map.invalidateSize(), 900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])
  return null
}

// ── Fetch real road route from OSRM ──────────────────────────────────────────
// OSRM is free, open source, uses OpenStreetMap road data.
// No API key needed.
//
// How it works:
//   1. We send all stop coordinates as waypoints
//   2. OSRM returns the exact road geometry (hundreds of lat/lng points)
//   3. We draw a Polyline through those points — it follows the roads
//
async function fetchRoadRoute(stops) {
  if (!stops || stops.length < 2) return null

  try {
    // Build coordinate string: "lng,lat;lng,lat;..."
    // OSRM uses longitude first, then latitude
    const coords = stops
      .map((s) => `${parseFloat(s.longitude)},${parseFloat(s.latitude)}`)
      .join(';')

    // Use the public OSRM demo server
    // For production, run your own OSRM server or use a paid service
    const url =
      `https://router.project-osrm.org/route/v1/driving/${coords}` +
      `?overview=full&geometries=geojson&steps=false`

    const res  = await fetch(url)
    const json = await res.json()

    if (json.code !== 'Ok' || !json.routes?.length) return null

    // Convert GeoJSON coordinates [lng, lat] → Leaflet [lat, lng]
    const geometry = json.routes[0].geometry.coordinates
    return geometry.map(([lng, lat]) => [lat, lng])

  } catch (err) {
    console.warn('[OSRM] Route fetch failed, falling back to straight lines:', err)
    return null
  }
}

// ── Main LiveMap component ────────────────────────────────────────────────────
export default function LiveMap({
  vehiclePosition,
  routeStops    = [],
  nextStop      = null,
  pathHistory   = [],
  follow        = false,
  height        = '500px',
  className     = '',
}) {
  // Road geometry from OSRM — starts as null (shows straight lines while loading)
  const [roadCoords, setRoadCoords] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  // Fetch real road route whenever stops change
  useEffect(() => {
    if (routeStops.length < 2) {
      setRoadCoords(null)
      return
    }

    setRouteLoading(true)
    fetchRoadRoute(routeStops).then((coords) => {
      setRoadCoords(coords)
      setRouteLoading(false)
    })
  }, [
    // Re-fetch only if stop IDs change, not on every render
    routeStops.map((s) => s.id).join(','),
  ])

  // Map center
  const defaultCenter = routeStops.length
    ? [parseFloat(routeStops[0].latitude), parseFloat(routeStops[0].longitude)]
    : [31.6295, -8.0082] // Marrakesh default

  const center = vehiclePosition
    ? [vehiclePosition.latitude, vehiclePosition.longitude]
    : defaultCenter

  // Fallback straight lines between stops (shown while OSRM loads)
  const straightCoords = routeStops.map((s) => [
    parseFloat(s.latitude),
    parseFloat(s.longitude),
  ])

  // The actual route line to draw — real road if available, straight line as fallback
  const routeLineCoords = roadCoords ?? straightCoords

  // Driven path (actual GPS history)
  const historyCoords = pathHistory.map((l) => [
    parseFloat(l.latitude),
    parseFloat(l.longitude),
  ])

  const cssHeight = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      style={{ height: cssHeight, minHeight: '300px', position: 'relative' }}
      className={`rounded-2xl overflow-hidden border border-white/5 ${className}`}
    >
      {/* Loading indicator while fetching road route */}
      {routeLoading && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(15,17,23,0.85)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '4px 12px',
          color: 'rgba(255,255,255,0.6)', fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 6,
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#6366f1',
            animation: 'pulse 1s ease-in-out infinite',
          }} />
          Loading road route...
        </div>
      )}

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl
        scrollWheelZoom
      >
        <SizeWatcher />

        {/* OpenStreetMap tiles — always works, no API key */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
          keepBuffer={4}
        />

        {/*
          ── PLANNED ROUTE LINE ──────────────────────────────────────────────
          Shows the route the vehicle will follow.
          - Uses real road geometry from OSRM when available
          - Falls back to straight lines while loading
          The dashed style makes it visually distinct from the driven path
        */}
        {routeLineCoords.length > 1 && (
          <Polyline
            positions={routeLineCoords}
            pathOptions={{
              color:     '#6366f1',
              weight:    4,
              opacity:   roadCoords ? 0.7 : 0.35,  // more visible when road-accurate
              dashArray: roadCoords ? '1'  : '10 8', // solid when real road, dashed when straight
            }}
          />
        )}

        {/*
          ── DRIVEN PATH ─────────────────────────────────────────────────────
          Shows where the vehicle has actually been.
          This is real GPS history — already follows roads naturally.
        */}
        {historyCoords.length > 1 && (
          <Polyline
            positions={historyCoords}
            pathOptions={{
              color:   '#a5b4fc',
              weight:  4,
              opacity: 0.9,
            }}
          />
        )}

        {/* ── STOP MARKERS ──────────────────────────────────────────────── */}
        {routeStops.map((stop) => {
          const isNext   = nextStop && stop.id === nextStop.stop_id
          const isPassed = nextStop
            && stop.order_number < (nextStop.order_number ?? 999)

          return (
            <Marker
              key={stop.id}
              position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
              icon={makeStopIcon(stop.order_number, isNext, isPassed)}
            >
              <Popup>
                <div style={{ color: '#111', minWidth: 150 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {stop.order_number}. {stop.name}
                  </p>
                  {stop.landmark && (
                    <p style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>
                      📍 {stop.landmark}
                    </p>
                  )}
                  <p style={{ color: '#4f46e5', fontSize: 11 }}>
                    +{stop.estimated_minutes_from_start} min from start
                  </p>
                  {isNext && (
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      background: '#ede9fe', color: '#4f46e5',
                      padding: '2px 10px', borderRadius: 20,
                      fontSize: 10, fontWeight: 700,
                    }}>
                      NEXT STOP
                    </span>
                  )}
                  {isPassed && (
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      background: '#f3f4f6', color: '#9ca3af',
                      padding: '2px 10px', borderRadius: 20,
                      fontSize: 10, fontWeight: 600,
                    }}>
                      ✓ PASSED
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* ── VEHICLE MARKER ────────────────────────────────────────────── */}
        {vehiclePosition && (
          <Marker
            position={[
              parseFloat(vehiclePosition.latitude),
              parseFloat(vehiclePosition.longitude),
            ]}
            icon={vehicleIcon}
          >
            <Popup>
              <div style={{ color: '#111', minWidth: 170 }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  🚌 Live Vehicle
                </p>
                <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Speed',    vehiclePosition.speed    ? `${Math.round(vehiclePosition.speed)} km/h` : '—'],
                      ['Heading',  vehiclePosition.heading  ? `${Math.round(vehiclePosition.heading)}°`   : '—'],
                      ['Accuracy', vehiclePosition.accuracy ? `±${Math.round(vehiclePosition.accuracy)}m` : '—'],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ color: '#888', paddingRight: 8, paddingBottom: 3 }}>{k}</td>
                        <td style={{ fontWeight: 600 }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vehiclePosition.recorded_at && (
                  <p style={{ color: '#aaa', fontSize: 10, marginTop: 6 }}>
                    Updated {new Date(vehiclePosition.recorded_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        <AutoPan position={vehiclePosition} follow={follow} />
      </MapContainer>
    </div>
  )
}