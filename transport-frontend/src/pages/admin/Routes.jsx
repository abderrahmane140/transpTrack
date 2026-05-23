import React, { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { routesApi } from '../../api/index'
import { Modal, Spinner, Badge } from '../../components/ui/index'
import MapPicker from '../../components/map/MapPicker'
import toast from 'react-hot-toast'

const EMPTY_ROUTE = {
  name: '', code: '', description: '',
  start_location: '', end_location: '',
  start_latitude: '', start_longitude: '',
  end_latitude: '', end_longitude: '',
  estimated_duration_minutes: '', total_distance_km: '',
  is_active: true,
}
const EMPTY_STOP = {
  name: '', latitude: '', longitude: '',
  order_number: '', estimated_minutes_from_start: '0', landmark: '',
}

// ── Shared light input style ───────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px',
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: 8, color: '#111827',
  fontSize: 13, outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function FInput({ label, required, placeholder, value, onChange, type = 'text', mono = false }) {
  const [f, setF] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{ ...inp, fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif', borderColor: f ? '#6366f1' : '#d1d5db', boxShadow: f ? '0 0 0 3px #eef2ff' : 'none' }}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
      />
    </div>
  )
}

function FTextarea({ label, placeholder, value, onChange }) {
  const [f, setF] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <textarea
        value={value} onChange={onChange} placeholder={placeholder} rows={2}
        style={{ ...inp, resize: 'none', borderColor: f ? '#6366f1' : '#d1d5db', boxShadow: f ? '0 0 0 3px #eef2ff' : 'none' }}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
      />
    </div>
  )
}

function SectionBox({ title, children }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ color: '#4f46e5', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>{title}</p>
      {children}
    </div>
  )
}

function PrimaryBtn({ onClick, children, type = 'button', disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: disabled ? '#e5e7eb' : '#4f46e5', border: 'none', borderRadius: 9, color: disabled ? '#9ca3af' : 'white', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = '#4338ca')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = '#4f46e5')}
    >
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children, type = 'button' }) {
  return (
    <button type={type} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 9, color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
    >
      {children}
    </button>
  )
}

export default function Routes() {
  const [data,        setData]        = useState([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [expanded,    setExpanded]    = useState(null)
  const [stopsMap,    setStopsMap]    = useState({})
  const [modal,       setModal]       = useState(false)
  const [stopModal,   setStopModal]   = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [activeRoute, setActiveRoute] = useState(null)
  const [form,        setForm]        = useState(EMPTY_ROUTE)
  const [stopForm,    setStopForm]    = useState(EMPTY_STOP)
  const [saving,      setSaving]      = useState(false)

  const f  = (k) => ({ value: form[k] || '',     onChange: (e) => setForm({ ...form, [k]: e.target.value }) })
  const sf = (k) => ({ value: stopForm[k] || '', onChange: (e) => setStopForm({ ...stopForm, [k]: e.target.value }) })

  const load = async () => {
    setLoading(true)
    try { const r = await routesApi.list({ search, per_page: 50 }); setData(r.data.data); setTotal(r.data.total) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])

  const toggleExpand = async (route) => {
    if (expanded === route.id) { setExpanded(null); return }
    setExpanded(route.id)
    if (!stopsMap[route.id]) {
      const r = await routesApi.stops(route.id)
      setStopsMap((p) => ({ ...p, [route.id]: r.data.stops || [] }))
    }
  }

  const refreshStops = async (id) => {
    const r = await routesApi.stops(id)
    setStopsMap((p) => ({ ...p, [id]: r.data.stops || [] }))
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY_ROUTE); setModal(true) }
  const openEdit   = (r) => { setEditing(r); setForm({ ...r, is_active: !!r.is_active }); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null) }
  const openAddStop    = (r) => { setActiveRoute(r); setStopForm(EMPTY_STOP); setStopModal(true) }
  const closeStopModal = () => { setStopModal(false); setActiveRoute(null) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await routesApi.update(editing.id, form); toast.success('Route updated') }
      else         { await routesApi.create(form); toast.success('Route created') }
      closeModal(); load()
    } finally { setSaving(false) }
  }

  const handleStopSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await routesApi.createStop(activeRoute.id, stopForm)
      toast.success('Stop added'); await refreshStops(activeRoute.id); closeStopModal()
    } finally { setSaving(false) }
  }

  const delRoute = async (id) => {
    if (!confirm('Delete this route?')) return
    try { await routesApi.delete(id); toast.success('Route deleted'); load() } catch {}
  }

  const delStop = async (routeId, stopId) => {
    if (!confirm('Delete this stop?')) return
    try { await routesApi.deleteStop(routeId, stopId); await refreshStops(routeId); toast.success('Stop deleted') } catch {}
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Routes</h2>
          <p className="text-sm text-gray-500">{total} routes configured</p>
        </div>
        <PrimaryBtn onClick={openCreate}><Plus size={15} /> Add Route</PrimaryBtn>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 300 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text" placeholder="Search routes..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inp, paddingLeft: 34 }}
          onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #eef2ff' }}
          onBlur={(e)  => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
        />
      </div>

      {/* Routes list */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3 border border-indigo-100">
              <MapPin size={20} className="text-indigo-500" />
            </div>
            <p className="text-gray-500 font-medium">No routes yet</p>
            <p className="text-gray-400 text-sm">Create your first route to get started</p>
          </div>
        ) : (
          data.map((route, idx) => (
            <div key={route.id} className={idx < data.length - 1 ? 'border-b border-gray-100' : ''}>

              {/* Route row */}
              <div
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <button onClick={() => toggleExpand(route)} className="text-gray-400 hover:text-indigo-600 p-1 rounded transition-colors">
                  {expanded === route.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{route.name}</p>
                    {route.code && (
                      <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                        {route.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{route.start_location} → {route.end_location}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                  {route.estimated_duration_minutes && <span>~{route.estimated_duration_minutes}min</span>}
                  <span>{route.stops_count ?? 0} stops</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                    ${route.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${route.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {route.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(route)} className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => delRoute(route.id)} className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Stops */}
              {expanded === route.id && (
                <div className="px-16 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Stops ({stopsMap[route.id]?.length || 0})
                    </p>
                    <button
                      onClick={() => openAddStop(route)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-indigo-600 text-xs font-semibold hover:bg-indigo-50 transition-colors"
                    >
                      <Plus size={11} /> Add Stop
                    </button>
                  </div>

                  {!stopsMap[route.id] ? (
                    <p className="text-sm text-gray-400 flex items-center gap-2"><Spinner size={12} /> Loading...</p>
                  ) : stopsMap[route.id].length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No stops yet. Add the first stop above.</p>
                  ) : (
                    <div className="space-y-2">
                      {stopsMap[route.id].map((stop) => (
                        <div key={stop.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 group hover:border-indigo-200 transition-colors">
                          <div className="w-6 h-6 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                            {stop.order_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{stop.name}</p>
                            {stop.landmark && <p className="text-xs text-gray-400">📍 {stop.landmark}</p>}
                          </div>
                          <span className="text-xs text-gray-400 font-mono">{parseFloat(stop.latitude).toFixed(4)}, {parseFloat(stop.longitude).toFixed(4)}</span>
                          <span className="text-xs text-gray-400">+{stop.estimated_minutes_from_start}min</span>
                          <button
                            onClick={() => delStop(route.id, stop.id)}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Route Modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Route' : 'Create New Route'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">

          <SectionBox title="Basic Information">
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Route Name" required placeholder="Gueliz - Medina Route" {...f('name')} />
              <FInput label="Route Code" placeholder="RT-GM01" mono {...f('code')} />
              <FInput label="Start Location Name" required placeholder="Gueliz - Place du 16 Novembre" {...f('start_location')} />
              <FInput label="End Location Name" required placeholder="Medina - Jemaa el-Fna" {...f('end_location')} />
            </div>
          </SectionBox>

          <SectionBox title="Map Coordinates (click to pick)">
            <div className="grid grid-cols-2 gap-3">
              <MapPicker
                label="Start Point"
                value={form.start_latitude && form.start_longitude ? { lat: parseFloat(form.start_latitude), lng: parseFloat(form.start_longitude) } : null}
                onChange={(p) => setForm({ ...form, start_latitude: p?.lat || '', start_longitude: p?.lng || '' })}
              />
              <MapPicker
                label="End Point"
                value={form.end_latitude && form.end_longitude ? { lat: parseFloat(form.end_latitude), lng: parseFloat(form.end_longitude) } : null}
                onChange={(p) => setForm({ ...form, end_latitude: p?.lat || '', end_longitude: p?.lng || '' })}
              />
            </div>
          </SectionBox>

          <SectionBox title="Route Details">
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Duration (minutes)" type="number" placeholder="20" {...f('estimated_duration_minutes')} />
              <FInput label="Distance (km)" type="number" placeholder="3.5" {...f('total_distance_km')} />
            </div>
            <div className="mt-3">
              <FTextarea label="Description" placeholder="Brief description of this route..." {...f('description')} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input type="checkbox" id="is_active" checked={!!form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer" />
              <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer font-medium">
                Route is active
              </label>
            </div>
          </SectionBox>

          <div className="flex justify-end gap-3 pt-1">
            <GhostBtn onClick={closeModal}>Cancel</GhostBtn>
            <PrimaryBtn type="submit" disabled={saving}>
              {saving && <Spinner size={13} />}
              {editing ? 'Save Changes' : 'Create Route'}
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      {/* Add Stop Modal */}
      <Modal open={stopModal} onClose={closeStopModal} title={`Add Stop — ${activeRoute?.name}`}>
        <form onSubmit={handleStopSubmit} className="space-y-4">
          <FInput label="Stop Name" required placeholder="Koutoubia Mosque" {...sf('name')} />

          <MapPicker
            label="Stop Location"
            required
            value={stopForm.latitude && stopForm.longitude ? { lat: parseFloat(stopForm.latitude), lng: parseFloat(stopForm.longitude) } : null}
            onChange={(p) => setStopForm({ ...stopForm, latitude: p?.lat || '', longitude: p?.lng || '' })}
          />

          {stopForm.latitude && stopForm.longitude && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-600 font-bold">✓</span>
              <span className="text-green-700 text-xs font-mono font-semibold">
                {parseFloat(stopForm.latitude).toFixed(6)}, {parseFloat(stopForm.longitude).toFixed(6)}
              </span>
              <span className="text-green-600 text-xs">— Location confirmed</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FInput label="Order Number" required type="number" placeholder="1" {...sf('order_number')} />
            <FInput label="Minutes from Start" type="number" placeholder="0" {...sf('estimated_minutes_from_start')} />
          </div>
          <FInput label="Landmark (optional)" placeholder="Next to the minaret..." {...sf('landmark')} />

          <div className="flex justify-end gap-3 pt-1">
            <GhostBtn onClick={closeStopModal}>Cancel</GhostBtn>
            <PrimaryBtn type="submit" disabled={saving || !stopForm.latitude}>
              {saving && <Spinner size={13} />}
              Add Stop
            </PrimaryBtn>
          </div>
        </form>
      </Modal>
    </div>
  )
}