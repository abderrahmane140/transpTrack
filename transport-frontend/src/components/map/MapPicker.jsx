import 'leaflet/dist/leaflet.css'
import React, { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const pickerIcon = L.divIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center">
      <div style="
        width:28px;height:28px;
        background:#4f46e5;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 3px 10px rgba(79,70,229,0.4);
      "></div>
      <div style="width:6px;height:6px;background:#4f46e5;border-radius:50%;margin-top:2px;"></div>
    </div>
  `,
  className: '',
  iconSize:   [28, 36],
  iconAnchor: [14, 36],
})

function ClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) } })
  return null
}

function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], map.getZoom(), { animate: true })
  }, [position])
  return null
}

function SizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  return null
}

async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    return data.display_name || null
  } catch { return null }
}

async function searchPlace(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`, { headers: { 'Accept-Language': 'en' } })
    return await res.json()
  } catch { return [] }
}

export default function MapPicker({ value, onChange, label = 'Location', required = false }) {
  const [isOpen,    setIsOpen]    = useState(false)
  const [position,  setPosition]  = useState(value || null)
  const [address,   setAddress]   = useState('')
  const [search,    setSearch]    = useState('')
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const defaultCenter = [31.6295, -8.0082]
  const mapCenter     = position ? [position.lat, position.lng] : defaultCenter

  const handlePick = useCallback(async ({ lat, lng }) => {
    const pos = { lat: parseFloat(lat.toFixed(7)), lng: parseFloat(lng.toFixed(7)) }
    setPosition(pos)
    setGeocoding(true)
    const name = await reverseGeocode(pos.lat, pos.lng)
    setAddress(name || `${pos.lat}, ${pos.lng}`)
    setGeocoding(false)
  }, [])

  const handleConfirm = () => {
    if (position) { onChange(position); setIsOpen(false) }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true); setResults([])
    const data = await searchPlace(search + ', Marrakesh')
    setResults(data); setSearching(false)
  }

  const handleResultClick = async (result) => {
    await handlePick({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) })
    setResults([]); setSearch('')
  }

  return (
    <div>
      {/* Label */}
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: value ? '#eef2ff' : '#f9fafb',
          border: `1px solid ${value ? '#a5b4fc' : '#d1d5db'}`,
          borderRadius: 10, cursor: 'pointer',
          textAlign: 'left', transition: 'all 0.15s',
          fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#6366f1'
          e.currentTarget.style.background  = '#eef2ff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = value ? '#a5b4fc' : '#d1d5db'
          e.currentTarget.style.background  = value ? '#eef2ff' : '#f9fafb'
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: value ? '#e0e7ff' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
          <MapPin size={15} color={value ? '#4f46e5' : '#9ca3af'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {value ? (
            <>
              <p style={{ color: '#1f2937', fontSize: 13, fontWeight: 600, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </p>
              {address && (
                <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {address.split(',').slice(0, 3).join(',')}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
              Click to pick {label.toLowerCase()} on the map
            </p>
          )}
        </div>
        {value ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); setPosition(null); setAddress('') }}
            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', borderRadius: 4, display: 'flex', alignItems: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            <X size={13} />
          </button>
        ) : (
          <Navigation size={13} color="#9ca3af" />
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div style={{ width: '100%', maxWidth: 680, height: 600, background: '#ffffff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e5e7eb' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, background: '#e0e7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={16} color="#4f46e5" />
                </div>
                <div>
                  <p style={{ color: '#111827', fontWeight: 700, fontSize: 15, margin: 0, fontFamily: 'Inter, sans-serif' }}>Pick {label}</p>
                  <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>Search by name or click directly on the map</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ width: 30, height: 30, borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 16px', background: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search: Jemaa el-Fna, Koutoubia, Gueliz..."
                    style={{ width: '100%', padding: '8px 12px 8px 32px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, color: '#111827', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
                    onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff' }}
                    onBlur={(e)  => { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#f9fafb' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  style={{ padding: '8px 16px', background: '#4f46e5', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif' }}
                >
                  {searching ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={13} />}
                  Search
                </button>
              </form>

              {results.length > 0 && (
                <div style={{ marginTop: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', maxHeight: 150, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  {results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleResultClick(r)}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: 'transparent', border: 'none', borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none', color: '#374151', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'Inter, sans-serif' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f3ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <MapPin size={12} color="#6366f1" style={{ marginTop: 2, shrink: 0 }} />
                      <span style={{ lineHeight: 1.4 }}>{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Instruction */}
            <div style={{ padding: '7px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={12} color="#3b82f6" />
              <p style={{ color: '#1d4ed8', fontSize: 12, margin: 0 }}>Click anywhere on the map to place the pin</p>
              {geocoding && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: '#6366f1', fontSize: 11 }}>
                  <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  Getting address...
                </div>
              )}
            </div>

            {/* Map */}
            <div style={{ flex: 1, position: 'relative' }}>
              <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl>
                <SizeWatcher />
                <ClickHandler onPick={handlePick} />
                {position && <Recenter position={position} />}
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                  subdomains={['a', 'b', 'c']}
                  maxZoom={19}
                  keepBuffer={4}
                />
                {position && <Marker position={[position.lat, position.lng]} icon={pickerIcon} />}
              </MapContainer>

              {!position && (
                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none', background: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: 20, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                  <MapPin size={13} color="#6366f1" />
                  <span style={{ color: '#374151', fontSize: 12, fontWeight: 500 }}>Click on the map to set location</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                {position ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, background: '#e0e7ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={12} color="#4f46e5" />
                    </div>
                    <div>
                      <p style={{ color: '#111827', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', margin: 0, fontWeight: 600 }}>
                        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                      </p>
                      {address && (
                        <p style={{ color: '#6b7280', fontSize: 10, margin: 0, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {address.split(',').slice(0, 2).join(',')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic', margin: 0 }}>No location selected yet</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#fff', border: '1px solid #d1d5db', color: '#374151', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!position}
                  style={{ padding: '8px 20px', borderRadius: 8, background: position ? '#4f46e5' : '#e5e7eb', border: 'none', color: position ? 'white' : '#9ca3af', fontSize: 13, fontWeight: 600, cursor: position ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <MapPin size={13} />
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
    </div>
  )
}