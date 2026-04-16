import React, { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'

// Fix default Leaflet icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Animated vehicle icon ─────────────────────────────────────────────────────
const vehicleIcon = L.divIcon({
  html: `
    <div style="position:relative;width:40px;height:40px">
      <div style="
        position:absolute;inset:0;
        background:rgba(99,102,241,0.25);
        border-radius:50%;
        animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;inset:5px;
        background:#6366f1;
        border-radius:50%;
        border:2.5px solid white;
        box-shadow:0 0 0 2px #6366f1, 0 4px 12px rgba(99,102,241,0.5);
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4zm8 1H8v2H6V8H4v10h16V8h-2v1h-2V7zm-6-1h4V4h-4v2z"/>
        </svg>
      </div>
    </div>
    <style>
      @keyframes ping {
        75%,100%{transform:scale(2.2);opacity:0}
      }
    </style>
  `,
  className:  '',
  iconSize:   [40, 40],
  iconAnchor: [20, 20],
  popupAnchor:[0, -22],
})

// ── Stop marker factory ───────────────────────────────────────────────────────
function makeStopIcon(order, isNext = false, isPassed = false) {
  const bg     = isNext   ? '#6366f1' : isPassed ? 'rgba(255,255,255,0.06)' : '#1e2230'
  const border = isNext   ? '2.5px solid white' : isPassed ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(255,255,255,0.2)'
  const color  = isNext   ? 'white' : isPassed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)'

  return L.divIcon({
    html: `
      <div style="
        width:30px;height:30px;
        background:${bg};
        border:${border};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        color:${color};
        font-size:11px;font-weight:700;
        font-family:'DM Sans',sans-serif;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        transition:all .2s;
      ">${order}</div>
    `,
    className:  '',
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
    popupAnchor:[0, -17],
  })
}

// ── Auto-pan hook ─────────────────────────────────────────────────────────────
function AutoPan({ position, follow }) {
  const map = useMap()
  useEffect(() => {
    if (follow && position) {
      map.panTo(
        [position.latitude, position.longitude],
        { animate: true, duration: 0.6 },
      )
    }
  }, [position?.latitude, position?.longitude, follow])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LiveMap({
  vehiclePosition,
  routeStops    = [],
  nextStop      = null,
  pathHistory   = [],
  follow        = false,
  height        = '100%',
  className     = '',
}) {
  const defaultCenter = routeStops.length
    ? [parseFloat(routeStops[0].latitude), parseFloat(routeStops[0].longitude)]
    : [40.7128, -74.006]

  const center = vehiclePosition
    ? [vehiclePosition.latitude, vehiclePosition.longitude]
    : defaultCenter

  const routeCoords   = routeStops.map((s) => [parseFloat(s.latitude), parseFloat(s.longitude)])
  const historyCoords = pathHistory.map((l)  => [parseFloat(l.latitude), parseFloat(l.longitude)])

  return (
    <div style={{ height }} className={`rounded-2xl overflow-hidden border border-white/5 ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        {/* CARTO Dark Matter tile layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Planned route — dashed indigo line */}
        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#6366f1', weight: 3, opacity: 0.35,
              dashArray: '8 7',
            }}
          />
        )}

        {/* Driven path — solid indigo line */}
        {historyCoords.length > 1 && (
          <Polyline
            positions={historyCoords}
            pathOptions={{ color: '#818cf8', weight: 3.5, opacity: 0.85 }}
          />
        )}

        {/* Route stop markers */}
        {routeStops.map((stop) => {
          const isNext   = nextStop && stop.id === nextStop.stop_id
          const isPassed = nextStop && stop.order_number < (nextStop.order_number || 999)

          return (
            <Marker
              key={stop.id}
              position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
              icon={makeStopIcon(stop.order_number, isNext, isPassed)}
            >
              <Popup>
                <div style={{ color: '#fff', minWidth: 150 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>
                    Stop {stop.order_number}: {stop.name}
                  </p>
                  {stop.landmark && (
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 4 }}>
                      {stop.landmark}
                    </p>
                  )}
                  <p style={{ color: '#818cf8', fontSize: 11 }}>
                    +{stop.estimated_minutes_from_start} min from start
                  </p>
                  {isNext && (
                    <div style={{
                      marginTop: 7, padding: '3px 10px',
                      background: 'rgba(99,102,241,0.25)',
                      borderRadius: 20, display: 'inline-block',
                      color: '#818cf8', fontSize: 10, fontWeight: 700,
                    }}>
                      NEXT STOP
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Vehicle marker */}
        {vehiclePosition && (
          <Marker
            position={[vehiclePosition.latitude, vehiclePosition.longitude]}
            icon={vehicleIcon}
          >
            <Popup>
              <div style={{ color: '#fff', minWidth: 170 }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  Live Vehicle
                </p>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '4px 12px', fontSize: 11,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Speed</span>
                  <span style={{ color: '#818cf8', fontWeight: 600 }}>
                    {vehiclePosition.speed
                      ? `${Math.round(vehiclePosition.speed)} km/h`
                      : 'N/A'}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Heading</span>
                  <span>
                    {vehiclePosition.heading
                      ? `${Math.round(vehiclePosition.heading)}°`
                      : 'N/A'}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Lat</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
                    {parseFloat(vehiclePosition.latitude).toFixed(5)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Lng</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
                    {parseFloat(vehiclePosition.longitude).toFixed(5)}
                  </span>
                  {vehiclePosition.recorded_at && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Updated</span>
                      <span style={{ fontSize: 10 }}>
                        {new Date(vehiclePosition.recorded_at).toLocaleTimeString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        <AutoPan position={vehiclePosition} follow={follow} />
      </MapContainer>
    </div>
  )
}