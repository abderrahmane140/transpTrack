// ─────────────────────────────────────────────────────────────
//  TranspTrack — Public landing page
//  Visual identity: white · black · electric blue (#0A4DFF)
//  Map-first, transport-tech, editorial. Real Leaflet in the
//  hero with a vehicle that actually moves along a route.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import {
  patchDefaultLeafletIcons, vehicleIcon, makeStopIcon,
} from '../../components/map/icons'
import './home.css'

patchDefaultLeafletIcons()

// ─────────────────────────────────────────────────────────────
//  A small route used by the hero map (Marrakesh area, ~6 stops)
//  These are real coordinates so the polyline sits on real streets.
// ─────────────────────────────────────────────────────────────
const HERO_ROUTE = [
  { id: 1, name: 'Gare Routière',   lat: 31.6295, lng: -8.0082 },
  { id: 2, name: 'Place de la Liberté', lat: 31.6325, lng: -8.0012 },
  { id: 3, name: 'Guéliz',          lat: 31.6388, lng: -8.0089 },
  { id: 4, name: 'Hivernage',       lat: 31.6462, lng: -8.0148 },
  { id: 5, name: 'Médina Sud',      lat: 31.6192, lng: -8.0212 },
  { id: 6, name: 'Avenue Mohammed V', lat: 31.6302, lng: -8.0110 },
]

// ─────────────────────────────────────────────────────────────
//  Reveal helpers
// ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 28, className = '' }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Invalidate map size after mount (Leaflet grey-tile fix)
// ─────────────────────────────────────────────────────────────
function SizeWatcher() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 50)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', onResize) }
  }, [map])
  return null
}

// ─────────────────────────────────────────────────────────────
//  Hero map: a moving vehicle that walks the route on a loop.
//  Position is animated with requestAnimationFrame for smoothness.
// ─────────────────────────────────────────────────────────────
function HeroMap() {
  // Build the full polyline (straight lines between stops — fine for a hero).
  const fullPath = HERO_ROUTE.map((s) => [s.lat, s.lng])

  const [vehicle, setVehicle] = useState({ lat: fullPath[0][0], lng: fullPath[0][1] })
  const [progress, setProgress] = useState(0)     // 0..1 along the path
  const rafRef = useRef(0)
  const tRef   = useRef(0)

  // Animate progress forward, loop on overflow.
  useEffect(() => {
    let last = performance.now()
    const SPEED = 0.07 // full route in ~14s
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      tRef.current += dt * SPEED
      const p = tRef.current % 1
      setProgress(p)

      // Find which segment we're on and interpolate.
      const segs = fullPath.length - 1
      const scaled = p * segs
      const i = Math.min(Math.floor(scaled), segs - 1)
      const localT = scaled - i
      const a = fullPath[i]
      const b = fullPath[i + 1]
      const lat = a[0] + (b[0] - a[0]) * localT
      const lng = a[1] + (b[1] - a[1]) * localT
      setVehicle({ lat, lng })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The "drawn so far" portion of the route.
  const drawn = []
  const segs = fullPath.length - 1
  const scaled = progress * segs
  const wholeCount = Math.floor(scaled) + 1
  for (let i = 0; i < wholeCount && i < fullPath.length; i++) drawn.push(fullPath[i])
  if (wholeCount < fullPath.length) {
    const i = wholeCount - 1
    const localT = scaled - i
    const a = fullPath[i]
    const b = fullPath[i + 1]
    if (a && b) drawn.push([a[0] + (b[0] - a[0]) * localT, a[1] + (b[1] - a[1]) * localT])
  }

  // Compute the "current speed" synthetically from progress to feel real.
  const speedKmh = (38 + Math.sin(progress * Math.PI * 6) * 8).toFixed(0)

  // Pick the "next" stop index (the one the vehicle is heading to).
  const nextStopIdx = Math.min(Math.ceil(scaled), fullPath.length - 1)

  return (
    <div className="tt-map-dark relative w-full h-full">
      <MapContainer
        center={[31.6325, -8.0125]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl
      >
        <SizeWatcher />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
          subdomains={['a', 'b', 'c']}
          maxZoom={19}
        />

        {/* Full route — faint white (the road yet to travel) */}
        <Polyline
          positions={fullPath}
          pathOptions={{ color: '#ffffff', weight: 2, opacity: 0.25, dashArray: '4 6' }}
        />
        {/* Drawn-so-far — solid blue */}
        {drawn.length > 1 && (
          <Polyline
            positions={drawn}
            pathOptions={{ color: '#0A4DFF', weight: 4, opacity: 1 }}
          />
        )}

        {/* Stops */}
        {HERO_ROUTE.map((s, i) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={makeStopIcon(i + 1, i === nextStopIdx, i < Math.floor(scaled))}
          />
        ))}

        {/* Vehicle */}
        <Marker position={[vehicle.lat, vehicle.lng]} icon={vehicleIcon} />
      </MapContainer>

      {/* Live telemetry overlay (bottom-left) */}
      <div className="absolute left-4 sm:left-6 bottom-4 sm:bottom-6 z-[1000] pointer-events-none">
        <div className="tt-mono bg-black/85 backdrop-blur border border-white/10 text-white px-3.5 py-2.5 rounded-sm">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0A4DFF] tt-blink" />
            Vehicle · BUS-24
          </div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <div className="text-2xl font-semibold tabular-nums">{speedKmh}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">km/h</div>
            <div className="text-white/30">·</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Next</div>
            <div className="text-sm font-medium text-white">
              {HERO_ROUTE[nextStopIdx]?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Coordinates overlay (top-right) */}
      <div className="absolute right-4 sm:right-6 top-4 sm:top-6 z-[1000] pointer-events-none">
        <div className="tt-mono text-right text-white/70 text-[10px] uppercase tracking-[0.18em]">
          <div>{vehicle.lat.toFixed(5)} N</div>
          <div>{vehicle.lng.toFixed(5)} W</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Top navigation
// ─────────────────────────────────────────────────────────────
function Nav() {
  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="absolute top-0 left-0 right-0 z-30"
    >
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 bg-white" />
            <div className="absolute inset-[3px] bg-[#0A4DFF]" />
            <div className="absolute w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <div className="tt-mono text-white text-sm leading-none">
            <div className="font-semibold tracking-tight">TRANSPTRACK</div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/50 mt-1">v2.0</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/80">
          <a href="#capabilities" className="hover:text-white transition">Capabilities</a>
          <a href="#how"           className="hover:text-white transition">How it works</a>
          <a href="#roles"         className="hover:text-white transition">For teams</a>
        </nav>

        <Link
          to="/login"
          className="tt-btn-on-dark text-sm"
        >
          Open console
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </motion.header>
  )
}

// ─────────────────────────────────────────────────────────────
//  Hero — full-bleed black, real map, overlaid console
// ─────────────────────────────────────────────────────────────
function Hero() {
  const reduce = useReducedMotion()
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const mapY  = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%'])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.6])

  return (
    <section ref={heroRef} className="relative bg-black text-white overflow-hidden">
      {/* Map fills the section */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: reduce ? '0%' : mapY }}
      >
        <HeroMap />
        {/* Vignette so the white console card on the left stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-black/0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black pointer-events-none" />
      </motion.div>

      {/* Content sits on top */}
      <motion.div
        className="relative z-10 max-w-[1320px] mx-auto px-6 lg:px-10 pt-36 lg:pt-44 pb-24 lg:pb-32 min-h-[100svh] flex items-center"
        style={{ y: reduce ? '0%' : textY, opacity }}
      >
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="tt-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/70"
          >
            <span className="w-2 h-2 bg-[#0A4DFF] rounded-full tt-blink" />
            Live · 1,247 vehicles online
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="tt-display text-white mt-6 text-[clamp(2.5rem,7vw,5.5rem)]"
          >
            The map<br />is the product.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-white/70 max-w-md leading-relaxed"
          >
            TranspTrack turns GPS pings from every driver into a single, live view of your fleet — road-snapped routes, real-time ETAs, vehicle simulation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link to="/login" className="tt-btn-on-dark">
              Open console <ArrowRight size={16} />
            </Link>
            <a href="#capabilities" className="tt-btn-ghost border-white/30 text-white hover:bg-white hover:text-black">
              See it move
            </a>
          </motion.div>

          {/* Coordinate / system status block */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }}
            className="tt-mono mt-12 grid grid-cols-3 gap-px max-w-md bg-white/10"
          >
            {[
              { k: 'LATENCY',    v: '180ms' },
              { k: 'UPTIME',     v: '99.98%' },
              { k: 'GPS PINGS/S', v: '142' },
            ].map((s) => (
              <div key={s.k} className="bg-black/60 px-3 py-2.5">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/50">{s.k}</div>
                <div className="text-white text-sm font-semibold mt-0.5 tabular-nums">{s.v}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom hairline marker — "section 01" */}
      <div className="absolute bottom-5 left-6 lg:left-10 z-10 tt-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
        § 01 — Overview
      </div>
      <div className="absolute bottom-5 right-6 lg:right-10 z-10 tt-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
        Scroll ↓
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//  Live ticker — scrolling vehicle status tape
// ─────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { id: 'BUS-24',   route: 'Marrakesh → Guéliz',    speed: '42 km/h', status: 'On route',   on: true },
  { id: 'BUS-11',   route: 'Hivernage Loop',        speed: '28 km/h', status: 'On route',   on: true },
  { id: 'BUS-03',   route: 'Médina Express',        speed: '0 km/h',  status: 'At stop',    on: true },
  { id: 'VAN-19',   route: 'Airport Shuttle',       speed: '64 km/h', status: 'On route',   on: true },
  { id: 'TRK-07',   route: 'Industrial District',   speed: '—',       status: 'Idle',       on: false },
  { id: 'BUS-44',   route: 'Suburb Connector',      speed: '37 km/h', status: 'On route',   on: true },
  { id: 'BUS-12',   route: 'University Line',       speed: '31 km/h', status: 'On route',   on: true },
  { id: 'VAN-08',   route: 'Hotel Circuit',         speed: '—',       status: 'Off duty',   on: false },
  { id: 'BUS-31',   route: 'Casablanca Express',    speed: '88 km/h', status: 'On route',   on: true },
  { id: 'BUS-09',   route: 'Souk Loop',             speed: '22 km/h', status: 'Slowed',     on: true },
]

function Ticker() {
  // Duplicate so the marquee can loop seamlessly.
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div className="bg-white border-y border-black/10 overflow-hidden">
      <div className="tt-marquee">
        <div className="tt-marquee-track">
          {items.map((it, i) => (
            <div key={i} className="tt-cell py-3.5">
              <span className="tt-mono text-xs font-semibold text-black">{it.id}</span>
              <span className="text-black/40">/</span>
              <span className="text-sm text-black/70">{it.route}</span>
              <span className="text-black/30">·</span>
              <span className="tt-mono text-xs text-black/80 tabular-nums">{it.speed}</span>
              <span className="inline-flex items-center gap-1.5 ml-1">
                <span className={`w-1.5 h-1.5 rounded-full ${it.on ? 'bg-[#0A4DFF]' : 'bg-black/30'}`} />
                <span className="tt-mono text-[10px] uppercase tracking-[0.16em] text-black/60">{it.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Capabilities — asymmetric bento with live mini maps
// ─────────────────────────────────────────────────────────────

// Tiny self-contained map component used inside bento tiles.
function MiniMap({ center, polyline, stops, vehicle, dark = true, height = 220 }) {
  return (
    <div className={`relative w-full overflow-hidden ${dark ? 'tt-map-dark' : ''}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <SizeWatcher />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={['a', 'b', 'c']}
        />
        {polyline && polyline.length > 1 && (
          <Polyline positions={polyline} pathOptions={{ color: '#0A4DFF', weight: 3, opacity: 0.9 }} />
        )}
        {stops?.map((s, i) => (
          <Marker key={i} position={s.pos} icon={makeStopIcon(i + 1, s.next, s.done)} />
        ))}
        {vehicle && <Marker position={vehicle} icon={vehicleIcon} />}
      </MapContainer>
    </div>
  )
}

// Animated mini vehicle for the "simulation" tile (no real map — just an SVG track).
function SimTrack() {
  const [t, setT] = useState(0)
  useEffect(() => {
    let raf, last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setT((v) => (v + dt * 0.18) % 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Build a small bezier-like path.
  const path = 'M 20 130 C 110 80, 180 180, 280 110 S 460 140, 560 90'
  // Approximate path length for stroke-dasharray. Visually fine to set large.
  const drawLen = 800
  const drawn   = drawLen * t
  const px = 20 + (560 - 20) * t

  return (
    <svg viewBox="0 0 580 200" className="w-full h-full">
      <defs>
        <linearGradient id="simLine" x1="0" x2="1">
          <stop offset="0%"   stopColor="#0A4DFF" />
          <stop offset="100%" stopColor="#0A4DFF" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Faint base line */}
      <path d={path} fill="none" stroke="#E5E7EB" strokeWidth="2" />
      {/* Animated draw-on line */}
      <path
        d={path} fill="none" stroke="url(#simLine)" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={drawLen}
        strokeDashoffset={drawLen - drawn}
        style={{ filter: 'drop-shadow(0 0 6px rgba(10,77,255,0.35))' }}
      />
      {/* Stops */}
      {[20, 280, 560].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={i === 0 ? 130 : i === 1 ? 110 : 90} r="4" fill="#fff" stroke="#0A0A0A" strokeWidth="1.5" />
        </g>
      ))}
      {/* Vehicle */}
      <g transform={`translate(${px - 8}, ${interpY(path, t) - 8})`}>
        <circle r="14" fill="rgba(10,77,255,0.18)" className="tt-ripple" />
        <circle r="6"  fill="#0A4DFF" stroke="#fff" strokeWidth="2" />
      </g>
      <text x="20"  y="180" fontSize="9" fontFamily="JetBrains Mono" fill="#6B7280" letterSpacing="2">START</text>
      <text x="540" y="180" fontSize="9" fontFamily="JetBrains Mono" fill="#6B7280" letterSpacing="2">END</text>
    </svg>
  )
}
// Tiny linear interpolation for the demo SVG (good enough visually).
function interpY(/* path, t */) { return 100 } // keep simple — vehicle stays mid-line

function Capabilities() {
  return (
    <section id="capabilities" className="bg-white text-black">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 pt-24 pb-24">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <div className="tt-kicker">§ 02 — Capabilities</div>
              <h2 className="tt-display text-black mt-4 text-[clamp(2rem,4.5vw,3.5rem)] max-w-2xl">
                One screen. Every vehicle.<br />No refresh button.
              </h2>
            </div>
            <p className="text-black/60 max-w-sm leading-relaxed">
              Built around three jobs-to-be-done: see the fleet, plan the trip, run the route.
            </p>
          </div>
        </Reveal>

        {/* Bento grid: 12 columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 auto-rows-[minmax(0,auto)]">
          {/* Tile 1: Live tracking (big) — 7 cols */}
          <Reveal className="md:col-span-7" delay={0.05}>
            <div className="tt-bento h-full bg-black text-white border border-black overflow-hidden flex flex-col">
              <div className="flex-1 min-h-[320px]">
                <MiniMap
                  dark
                  height={320}
                  center={[31.6325, -8.0125]}
                  polyline={HERO_ROUTE.map((s) => [s.lat, s.lng])}
                  stops={HERO_ROUTE.map((s, i) => ({ pos: [s.lat, s.lng], next: i === 2, done: i < 2 }))}
                  vehicle={[31.6400, -8.0140]}
                />
              </div>
              <div className="p-6 flex items-end justify-between gap-6 border-t border-white/10">
                <div>
                  <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-white/50">01 · Live tracking</div>
                  <div className="text-2xl font-semibold mt-1">Every ping, on the map.</div>
                  <p className="text-white/60 text-sm mt-2 max-w-md">
                    Sub-second WebSocket updates. Speed, heading, and last-update on every vehicle.
                  </p>
                </div>
                <ArrowUpRight size={22} className="text-white/70 shrink-0" />
              </div>
            </div>
          </Reveal>

          {/* Tile 2: ETAs — 5 cols */}
          <Reveal className="md:col-span-5" delay={0.1}>
            <div className="tt-bento h-full bg-white border border-black p-6 flex flex-col">
              <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-black/50">02 · Stop ETAs</div>
              <div className="text-2xl font-semibold mt-1">Per-stop time, not vague ETAs.</div>

              <div className="mt-6 space-y-3 flex-1">
                {[
                  { name: 'Gare Routière',         eta: '00:00', done: true,  next: false },
                  { name: 'Place de la Liberté',   eta: '04:00', done: true,  next: false },
                  { name: 'Guéliz',                eta: '11:00', done: false, next: true  },
                  { name: 'Hivernage',             eta: '23:00', done: false, next: false },
                  { name: 'Médina Sud',            eta: '38:00', done: false, next: false },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between border-b border-black/10 pb-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`tt-stop ${row.next ? 'tt-stop--next' : row.done ? 'tt-stop--done' : ''}`} />
                      <span className={`text-sm ${row.done ? 'text-black/40 line-through' : 'text-black'}`}>
                        {row.name}
                      </span>
                      {row.next && (
                        <span className="tt-mono text-[9px] uppercase tracking-[0.18em] text-[#0A4DFF] border border-[#0A4DFF] px-1.5 py-0.5">
                          Next
                        </span>
                      )}
                    </div>
                    <span className="tt-mono text-xs text-black/60 tabular-nums">{row.eta}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Tile 3: Road-snapped routing — 5 cols */}
          <Reveal className="md:col-span-5" delay={0.15}>
            <div className="tt-bento h-full bg-[#0A4DFF] text-white p-6 flex flex-col">
              <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-white/70">03 · Routing</div>
              <div className="text-2xl font-semibold mt-1">Stops connected by real roads.</div>
              <p className="text-white/80 text-sm mt-2 max-w-xs">
                OSRM road geometry — what drivers see on the ground, not straight-line guesses.
              </p>
              <div className="mt-6 flex-1 grid place-items-center">
                <svg viewBox="0 0 360 140" className="w-full">
                  {/* Faint */}
                  <path d="M20 100 L340 100" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 4" fill="none" />
                  {/* Road-snapped */}
                  <path
                    d="M20 100 C 60 60, 90 130, 130 90 S 200 50, 240 90 S 310 130, 340 60"
                    stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.35))' }}
                  />
                  {[20, 130, 240, 340].map((x, i) => (
                    <circle key={i} cx={x} cy={[100, 90, 90, 60][i]} r="4" fill="#fff" />
                  ))}
                </svg>
              </div>
            </div>
          </Reveal>

          {/* Tile 4: Simulation — 7 cols */}
          <Reveal className="md:col-span-7" delay={0.2}>
            <div className="tt-bento h-full bg-white border border-black p-6 flex flex-col">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-black/50">04 · Simulation</div>
                  <div className="text-2xl font-semibold mt-1">Replay any trip, step by step.</div>
                </div>
                <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-black/40 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A4DFF] tt-blink" /> Replaying
                </div>
              </div>
              <div className="flex-1 min-h-[180px] border-t border-black/10 pt-4">
                <SimTrack />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-px bg-black/10">
                {[
                  { k: 'Elapsed',  v: '00:14:32' },
                  { k: 'Distance', v: '6.2 km' },
                  { k: 'Avg speed',v: '28 km/h' },
                ].map((s) => (
                  <div key={s.k} className="bg-white px-3 py-2.5">
                    <div className="tt-mono text-[9px] uppercase tracking-[0.18em] text-black/50">{s.k}</div>
                    <div className="text-sm font-semibold tabular-nums">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Tile 5: API / data (full width, minimal) — 12 cols */}
          <Reveal className="md:col-span-12" delay={0.25}>
            <div className="tt-bento bg-white border border-black p-6 lg:p-8 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-black/50">05 · Realtime data</div>
                <div className="text-2xl font-semibold mt-1">Push, don't poll.</div>
                <p className="text-black/60 text-sm mt-2 max-w-md">
                  WebSocket streams for positions, route updates, and trip events. REST endpoints for everything else.
                </p>
              </div>
              <div className="tt-mono text-xs bg-black text-white p-4 rounded-sm leading-relaxed">
                <div className="text-white/50">// Subscribe to vehicle updates</div>
                <div><span className="text-[#0A4DFF]">echo</span>.channel(<span className="text-emerald-300">'fleet.'</span> + vehicleId)</div>
                <div className="pl-4 text-white/80">.listen(<span className="text-emerald-300">'position.update'</span>, (e) =&gt; {`{`}</div>
                <div className="pl-8 text-white/60">lat: e.lat, lng: e.lng,</div>
                <div className="pl-8 text-white/60">speed: e.speed, ts: e.ts</div>
                <div className="pl-4 text-white/80">{`}`})</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//  How it works — scroll-driven number rail
// ─────────────────────────────────────────────────────────────
const STEPS = [
  { n: '01', title: 'Import fleet',  desc: 'Vehicles, drivers, route stops — CSV or manual entry.' },
  { n: '02', title: 'Drivers go live', desc: 'The driver app shares GPS over WebSockets.' },
  { n: '03', title: 'Dispatch watches', desc: 'Live map updates stop by stop, in real time.' },
  { n: '04', title: 'Employees follow', desc: 'Passengers see their pickup without calling dispatch.' },
]

function HowItWorks() {
  const railRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: railRef, offset: ['start 0.7', 'end 0.5'] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])
  const reduce = useReducedMotion()

  return (
    <section id="how" ref={railRef} className="bg-white text-black border-t border-black/10">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-24">
        <Reveal>
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div>
              <div className="tt-kicker">§ 03 — How it works</div>
              <h2 className="tt-display text-black mt-4 text-[clamp(2rem,4.5vw,3.5rem)]">
                Four steps from<br />import to in-transit.
              </h2>
            </div>
            <p className="text-black/60 md:pt-8 max-w-md leading-relaxed">
              No setup call, no integration project. The whole flow is configured in the console and live in minutes.
            </p>
          </div>
        </Reveal>

        <div className="relative">
          {/* Animated connecting line */}
          <div className="hidden md:block tt-rail-line">
            <motion.div
              className="absolute inset-0 bg-[#0A4DFF]"
              style={{ transformOrigin: 'left center', scaleX: reduce ? 1 : lineScale }}
            />
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-black flex items-center justify-center tt-mono text-xs font-semibold">
                      {s.n}
                    </div>
                    <div className="hidden md:block flex-1 h-px bg-black/10" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-black/60 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//  Roles — black section, no icons
// ─────────────────────────────────────────────────────────────
const ROLES = [
  {
    role: 'Admin',
    title: 'Run the whole operation.',
    points: [
      'Fleet-wide live map with every vehicle',
      'Manage drivers, employees, vehicles, routes',
      'Trip scheduling and history',
    ],
  },
  {
    role: 'Driver',
    title: 'Just drive — we do the rest.',
    points: [
      'Auto-shared GPS while on duty',
      'See the full route, stop by stop',
      'One-tap start / end trip',
    ],
  },
  {
    role: 'Employee',
    title: 'Know exactly when to leave.',
    points: [
      'Follow your assigned vehicle live',
      'See the next stop and ETA',
      'Get notified as pickup nears',
    ],
  },
]

function Roles() {
  return (
    <section id="roles" className="bg-black text-white">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-24">
        <Reveal>
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div>
              <div className="tt-kicker text-white/50">§ 04 — For teams</div>
              <h2 className="tt-display text-white mt-4 text-[clamp(2rem,4.5vw,3.5rem)]">
                Three workspaces.<br />One source of truth.
              </h2>
            </div>
            <p className="text-white/60 md:pt-8 max-w-md leading-relaxed">
              Each role gets a focused experience — no clutter, no hunting for the right screen.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-px bg-white/10">
          {ROLES.map((r, i) => (
            <Reveal key={r.role} delay={i * 0.08}>
              <div className="bg-black p-8 h-full hover:bg-white hover:text-black transition-colors duration-300 group">
                <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-white/50 group-hover:text-black/50">
                  {r.role}
                </div>
                <h3 className="text-2xl font-semibold mt-3 leading-tight">{r.title}</h3>
                <ul className="mt-6 space-y-3">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-white/70 group-hover:text-black/70">
                      <span className="mt-2 w-1 h-1 bg-current rounded-full shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//  CTA — minimal, full-bleed
// ─────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section id="cta" className="bg-white text-black border-t border-black/10">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-32">
        <Reveal>
          <Link
            to="/login"
            className="group block"
          >
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <h2 className="tt-display text-black text-[clamp(2.5rem,8vw,7rem)]">
                Open the<br />console.
              </h2>
              <div className="flex items-center gap-3 pb-4">
                <span className="tt-mono text-sm text-black/50">Free · No credit card</span>
                <span className="w-12 h-12 rounded-full bg-black text-white grid place-items-center group-hover:bg-[#0A4DFF] transition">
                  <ArrowRight size={20} />
                </span>
              </div>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
//  Footer
// ─────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-white text-black border-t border-black/10">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-[2px] bg-[#0A4DFF]" />
            <div className="absolute w-1 h-1 bg-white rounded-full" style={{ left: 8, top: 8 }} />
          </div>
          <div className="tt-mono text-xs leading-none">
            <div className="font-semibold">TRANSPTRACK</div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-black/50 mt-1">Fleet intelligence</div>
          </div>
        </div>

        <div className="tt-mono text-[10px] uppercase tracking-[0.22em] text-black/50">
          © {new Date().getFullYear()} · Built with React, Leaflet, WebSockets
        </div>

        <div className="flex items-center gap-6 tt-mono text-[10px] uppercase tracking-[0.22em]">
          <Link to="/login" className="text-black hover:text-[#0A4DFF] transition">Sign in</Link>
          <a href="#capabilities" className="text-black hover:text-[#0A4DFF] transition">Capabilities</a>
          <a href="#cta"          className="text-black hover:text-[#0A4DFF] transition">Console</a>
        </div>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="tt-page selection:bg-[#0A4DFF] selection:text-white">
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <Capabilities />
        <HowItWorks />
        <Roles />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
