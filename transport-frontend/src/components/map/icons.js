// Shared Leaflet icon factories for the entire app.
// Keeps the vehicle/driver/stop/picker visuals in one place so the live map,
// the picker modal, and any future map (e.g. the landing hero) all stay
// visually consistent.
import L from 'leaflet'

// ── Default marker icon paths (Leaflet quirk fix) ─────────────────────────
// Without this, default markers 404 under bundlers like Vite.
let defaultIconsPatched = false
export function patchDefaultLeafletIcons() {
  if (defaultIconsPatched) return
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
  defaultIconsPatched = true
}

// ── Vehicle icon (indigo pulsing dot with white truck silhouette) ──────────
export const vehicleIcon = L.divIcon({
  html: `
    <div style="position:relative;width:40px;height:40px">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(79,70,229,0.25);animation:vping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:5px;border-radius:50%;background:#4f46e5;border:3px solid white;box-shadow:0 2px 12px rgba(79,70,229,0.5);display:flex;align-items:center;justify-content:center;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
          <path d="M18 18.5a1.5 1.5 0 0 1-3 0m3 0H6m12 0h2.5A.5.5 0 0 0 21 18V9l-3-5H6a2 2 0 0 0-2 2v12h2m0 0a1.5 1.5 0 0 0 3 0m-3 0h3"/>
        </svg>
      </div>
    </div>
    <style>@keyframes vping{75%,100%{transform:scale(2.1);opacity:0}}</style>
  `,
  className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -24],
})

// ── Driver location icon (small blue dot) ─────────────────────────────────
export const driverIcon = L.divIcon({
  html: `
    <div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:vping 2s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:3px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 6px rgba(59,130,246,0.5);"></div>
    </div>
    <style>@keyframes vping{75%,100%{transform:scale(2);opacity:0}}</style>
  `,
  className: '', iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12],
})

// ── Stop marker (numbered, with "next" / "passed" variants) ───────────────
export function makeStopIcon(order, isNext = false, isPassed = false) {
  const bg     = isNext ? '#4f46e5' : isPassed ? '#e5e7eb' : '#ffffff'
  const border = isNext ? '2px solid white' : '2px solid #d1d5db'
  const color  = isNext ? 'white' : isPassed ? '#9ca3af' : '#374151'
  return L.divIcon({
    html: `<div style="width:26px;height:26px;background:${bg};border:${border};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${color};font-size:10px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${order}</div>`,
    className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14],
  })
}

// ── Map picker pin (teardrop used in MapPicker) ───────────────────────────
export const pickerIcon = L.divIcon({
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
