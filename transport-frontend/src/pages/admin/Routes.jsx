import React, { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { routesApi } from '../../api/index'
import { Modal, Spinner, Badge } from '../../components/ui/index'
import toast from 'react-hot-toast'

const EMPTY_ROUTE = {
  name: '', code: '', description: '', start_location: '', end_location: '',
  start_latitude: '', start_longitude: '', end_latitude: '', end_longitude: '',
  estimated_duration_minutes: '', total_distance_km: '', is_active: true,
}
const EMPTY_STOP = {
  name: '', latitude: '', longitude: '', order_number: '',
  estimated_minutes_from_start: '0', landmark: '', notes: '',
}


export default function Employee() {
    const [data,       setData]       = useState([])
    const [total,      setTotal]      = useState(0)
    const [loading,    setLoading]    = useState(true)
    const [search,     setSearch]     = useState('')
    const [expanded,   setExpanded]   = useState(null)
    const [stopsMap,   setStopsMap]   = useState({})
    const [modal,      setModal]      = useState(false)
    const [stopModal,  setStopModal]  = useState(false)
    const [editing,    setEditing]    = useState(null)
    const [activeRoute,setActiveRoute]= useState(null)
    const [form,       setForm]       = useState(EMPTY_ROUTE)
    const [stopForm,   setStopForm]   = useState(EMPTY_STOP)
    const [saving,     setSaving]     = useState(false)   


    const load = async () => {
        setLoading(true)
        try {
            const res= await routeApi.list({search, per_page: 50})
            setData(res.data.data)
            setTotal(res.data.total)
        } finally { setLoading(false)}
    }

    useEffect(() => {load()}, [search])

    const toggleExpand = async (route) => {
        if(expanded === route.id) {setExpanded(null); return}
        setExpanded(route.id)
        if (!stopsMap[route.id]) {
            const res = await routeApi.stops(route.id)
            setStopsMap((prev) => ({...prev, [route.id]: res.data.stops || []}))
        }
    }

     const refreshStops = async (routeId) => {
    const res = await routesApi.stops(routeId)
    setStopsMap((prev) => ({ ...prev, [routeId]: res.data.stops || [] }))
  }
 
  const openCreate = () => { setEditing(null); setForm(EMPTY_ROUTE); setModal(true) }
  const openEdit   = (r) => { setEditing(r); setForm({ ...r, is_active: !!r.is_active }); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null) }
 
  const openAddStop   = (route) => { setActiveRoute(route); setStopForm(EMPTY_STOP); setStopModal(true) }
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
      toast.success('Stop added to route')
      await refreshStops(activeRoute.id)
      closeStopModal()
    } finally { setSaving(false) }
  }
 
  const handleDeleteRoute = async (id) => {
    if (!confirm('Delete this route?')) return
    try { await routesApi.delete(id); toast.success('Route deleted'); load() } catch {}
  }
 
  const handleDeleteStop = async (routeId, stopId) => {
    if (!confirm('Delete this stop?')) return
    try {
      await routesApi.deleteStop(routeId, stopId)
      await refreshStops(routeId)
      toast.success('Stop deleted')
    } catch {}
  }
 
  const f = (key) => ({ value: form[key] || '', onChange: (e) => setForm({ ...form, [key]: e.target.value }) })
  const sf = (key) => ({ value: stopForm[key] || '', onChange: (e) => setStopForm({ ...stopForm, [key]: e.target.value }) })
 
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Routes</h2>
          <p className="text-xs text-white/40">{total} routes configured</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add Route</button>
      </div>
 
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Search routes..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
      </div>
 
      <div className="card">
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
          ))}</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <MapPin size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">No routes yet. Create your first route.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.map((route) => (
              <React.Fragment key={route.id}>
                <div className="flex items-center gap-3 py-3.5 px-1 hover:bg-white/2 rounded-xl -mx-1 transition-colors">
                  <button onClick={() => toggleExpand(route)}
                    className="text-white/30 hover:text-white p-1 rounded-lg transition-colors">
                    {expanded === route.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin size={13} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm">{route.name}</p>
                      {route.code && <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{route.code}</span>}
                    </div>
                    <p className="text-xs text-white/40 truncate">{route.start_location} → {route.end_location}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40 shrink-0">
                    {route.estimated_duration_minutes && <span>~{route.estimated_duration_minutes}min</span>}
                    <span>{route.stops_count ?? 0} stops</span>
                    <Badge status={route.is_active ? 'active' : 'inactive'} />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(route)} className="btn-ghost py-1.5 px-2"><Pencil size={12} /></button>
                    <button onClick={() => handleDeleteRoute(route.id)} className="btn-danger py-1.5 px-2"><Trash2 size={12} /></button>
                  </div>
                </div>
 
                {expanded === route.id && (
                  <div className="pl-12 pb-4 pt-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-white/30 uppercase tracking-wider font-medium">
                        Stops ({stopsMap[route.id]?.length || 0})
                      </p>
                      <button onClick={() => openAddStop(route)} className="btn-ghost py-1 px-2.5 text-xs">
                        <Plus size={11} /> Add Stop
                      </button>
                    </div>
 
                    {!stopsMap[route.id] ? (
                      <div className="flex items-center gap-2 text-xs text-white/30 py-2">
                        <Spinner size={12} /> Loading stops...
                      </div>
                    ) : stopsMap[route.id].length === 0 ? (
                      <p className="text-xs text-white/20 py-2">No stops yet. Add the first stop above.</p>
                    ) : (
                      <div className="space-y-1.5 relative">
                        {/* Vertical line connecting stops */}
                        <div className="absolute left-2.5 top-4 bottom-4 w-px bg-white/10" />
                        {stopsMap[route.id].map((stop) => (
                          <div key={stop.id}
                            className="flex items-center gap-3 bg-white/3 hover:bg-white/5
                                       rounded-xl px-3 py-2.5 transition-colors group">
                            <div className="w-5 h-5 bg-brand-600/25 rounded-full flex items-center
                                            justify-center text-[10px] font-bold text-brand-400 shrink-0 z-10">
                              {stop.order_number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/90 font-medium">{stop.name}</p>
                              {stop.landmark && (
                                <p className="text-xs text-white/30">{stop.landmark}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-xs text-white/30">
                              <span className="font-mono">{parseFloat(stop.latitude).toFixed(4)}, {parseFloat(stop.longitude).toFixed(4)}</span>
                              <span>+{stop.estimated_minutes_from_start}min</span>
                            </div>
                            <button
                              onClick={() => handleDeleteStop(route.id, stop.id)}
                              className="opacity-0 group-hover:opacity-100 text-white/20
                                         hover:text-red-400 transition-all p-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
 
      {/* Route create/edit modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Route' : 'Create Route'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Route Name</label>
              <input className="input" {...f('name')} required placeholder="North Route" />
            </div>
            <div>
              <label className="label">Route Code</label>
              <input className="input font-mono" {...f('code')} placeholder="RT-N01" />
            </div>
            <div>
              <label className="label">Start Location</label>
              <input className="input" {...f('start_location')} required placeholder="North Park Terminal" />
            </div>
            <div>
              <label className="label">End Location</label>
              <input className="input" {...f('end_location')} required placeholder="Company HQ" />
            </div>
            <div>
              <label className="label">Start Latitude</label>
              <input type="number" step="any" className="input font-mono" {...f('start_latitude')} placeholder="40.7589" />
            </div>
            <div>
              <label className="label">Start Longitude</label>
              <input type="number" step="any" className="input font-mono" {...f('start_longitude')} placeholder="-73.9851" />
            </div>
            <div>
              <label className="label">End Latitude</label>
              <input type="number" step="any" className="input font-mono" {...f('end_latitude')} placeholder="40.7128" />
            </div>
            <div>
              <label className="label">End Longitude</label>
              <input type="number" step="any" className="input font-mono" {...f('end_longitude')} placeholder="-74.0060" />
            </div>
            <div>
              <label className="label">Est. Duration (minutes)</label>
              <input type="number" min="1" className="input" {...f('estimated_duration_minutes')} />
            </div>
            <div>
              <label className="label">Total Distance (km)</label>
              <input type="number" step="0.1" min="0" className="input" {...f('total_distance_km')} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} {...f('description')} placeholder="Brief description of this route..." />
          </div>
          <div className="flex items-center gap-3 py-1">
            <input type="checkbox" id="is_active_route" checked={!!form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-brand-500 cursor-pointer" />
            <label htmlFor="is_active_route" className="text-sm text-white/60 cursor-pointer">
              Route is active (employees can be assigned)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner size={14} /> : (editing ? 'Save Changes' : 'Create Route')}
            </button>
          </div>
        </form>
      </Modal>
 
      {/* Add stop modal */}
      <Modal open={stopModal} onClose={closeStopModal} title={`Add Stop — ${activeRoute?.name}`}>
        <form onSubmit={handleStopSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Stop Name</label>
              <input className="input" {...sf('name')} required placeholder="Central Library" />
            </div>
            <div>
              <label className="label">Latitude</label>
              <input type="number" step="any" className="input font-mono" {...sf('latitude')} required placeholder="40.7520" />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input type="number" step="any" className="input font-mono" {...sf('longitude')} required placeholder="-73.9780" />
            </div>
            <div>
              <label className="label">Order Number</label>
              <input type="number" min="1" className="input" {...sf('order_number')} required placeholder="1" />
            </div>
            <div>
              <label className="label">Minutes from Start</label>
              <input type="number" min="0" className="input" {...sf('estimated_minutes_from_start')} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="label">Landmark (optional)</label>
              <input className="input" {...sf('landmark')} placeholder="Near the bus shelter on the corner" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeStopModal} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner size={14} /> : 'Add Stop'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}