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

export default function Routes() {
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
      const res = await routesApi.list({ search, per_page: 50 })
      setData(res.data.data)
      setTotal(res.data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])

  const toggleExpand = async (route) => {
    if (expanded === route.id) { setExpanded(null); return }
    setExpanded(route.id)
    if (!stopsMap[route.id]) {
      const res = await routesApi.stops(route.id)
      setStopsMap((prev) => ({ ...prev, [route.id]: res.data.stops || [] }))
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

    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-black">Routes</h2>
        <p className="text-xs text-gray-600">{total} routes configured</p>
      </div>

      <button
        onClick={openCreate}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
      >
        <Plus size={15} /> Add Route
      </button>
    </div>

    {/* Search */}
    <div className="relative max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
      <input
        type="text"
        placeholder="Search routes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-sm text-black
                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* Routes List */}
    <div className="bg-white border border-gray-300 rounded-2xl shadow-sm p-2">

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <MapPin size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No routes yet. Create your first route.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">

          {data.map((route) => (
            <React.Fragment key={route.id}>

              {/* Route Row */}
              <div className="flex items-center gap-3 py-3.5 px-3 hover:bg-gray-50 rounded-xl transition">

                <button
                  onClick={() => toggleExpand(route)}
                  className="text-gray-500 hover:text-black p-1"
                >
                  {expanded === route.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>

                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <MapPin size={13} className="text-amber-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-black text-sm">{route.name}</p>

                    {route.code && (
                      <span className="text-[10px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                        {route.code}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 truncate">
                    {route.start_location} → {route.end_location}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  {route.estimated_duration_minutes && <span>~{route.estimated_duration_minutes}min</span>}
                  <span>{route.stops_count ?? 0} stops</span>
                  <Badge status={route.is_active ? 'active' : 'inactive'} />
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(route)}
                    className="px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                  >
                    <Pencil size={12} />
                  </button>

                  <button
                    onClick={() => handleDeleteRoute(route.id)}
                    className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Expanded Stops */}
              {expanded === route.id && (
                <div className="pl-12 pb-4 pt-2">

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-600 uppercase font-medium">
                      Stops ({stopsMap[route.id]?.length || 0})
                    </p>

                    <button
                      onClick={() => openAddStop(route)}
                      className="px-3 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                      <Plus size={11} /> Add Stop
                    </button>
                  </div>

                  {!stopsMap[route.id] ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                      <Spinner size={12} /> Loading...
                    </div>
                  ) : stopsMap[route.id].length === 0 ? (
                    <p className="text-xs text-gray-500">No stops yet.</p>
                  ) : (
                    <div className="space-y-2 relative">

                      <div className="absolute left-3 top-4 bottom-4 w-px bg-gray-300" />

                      {stopsMap[route.id].map((stop) => (
                        <div
                          key={stop.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 group"
                        >

                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-600">
                            {stop.order_number}
                          </div>

                          <div className="flex-1">
                            <p className="text-sm text-black font-medium">{stop.name}</p>
                            {stop.landmark && (
                              <p className="text-xs text-gray-500">{stop.landmark}</p>
                            )}
                          </div>

                          <div className="text-xs text-gray-500">
                            +{stop.estimated_minutes_from_start}min
                          </div>

                          <button
                            onClick={() => handleDeleteStop(route.id, stop.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
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

    {/* MODAL */}
    <Modal open={modal} onClose={closeModal} title="Route">

      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-2 gap-4">

          <input className="input" {...f('name')} placeholder="Route Name" />
          <input className="input" {...f('code')} placeholder="Code" />

          <input className="input" {...f('start_location')} placeholder="Start location" />
          <input className="input" {...f('end_location')} placeholder="End location" />

          <input className="input" type="number" {...f('estimated_duration_minutes')} placeholder="Duration" />
          <input className="input" type="number" {...f('total_distance_km')} placeholder="Distance" />

        </div>

        <textarea
          className="w-full rounded-xl border border-gray-300 p-3 text-sm text-black
                     focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Description"
          {...f('description')}
        />

        <div className="flex justify-end gap-3">

          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>

        </div>

      </form>
    </Modal>

  </div>
)
}