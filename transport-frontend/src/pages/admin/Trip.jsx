import React, { useEffect, useState } from 'react'
import { Plus, Play, Square, Trash2, Navigation, RefreshCw, Eye } from 'lucide-react'
import { tripsApi, routesApi, vehiclesApi, driversApi } from '../../api/index'
import { DataTable, Badge, Modal, Spinner, Pagination } from '../../components/ui/index'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const EMPTY = {
  route_id:         '',
  vehicle_id:       '',
  driver_id:        '',
  scheduled_start:  '',
  notes:            '',
}

export default function Trips() {
  const [data,     setData]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [routes,   setRoutes]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers,  setDrivers]  = useState([])
  const [status,   setStatus]   = useState('')
  const [page,     setPage]     = useState(1)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [acting,   setActing]   = useState(null) // trip id being started/stopped

  // ── Load trips ─────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const res = await tripsApi.list({ status, page, per_page: 10 })
      setData(res.data.data)
      setTotal(res.data.total)
    } finally { setLoading(false) }
  }

  // ── Load dropdown options ──────────────────────────────────────────────
  const loadOptions = async () => {
    const [r, v, d] = await Promise.all([
      routesApi.list({ active_only: true, per_page: 100 }),
      vehiclesApi.list({ status: 'active', per_page: 100 }),
      driversApi.list({ available: 1, per_page: 100 }),
    ])
    setRoutes(r.data.data   || [])
    setVehicles(v.data.data || [])
    setDrivers(d.data.data  || [])
  }

  useEffect(() => { load() }, [status, page])

  const openModal = () => {
    loadOptions()
    setForm(EMPTY)
    setModal(true)
  }
  const closeModal = () => { setModal(false); setForm(EMPTY) }

  // ── Create trip ────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.scheduled_start) delete payload.scheduled_start
      if (!payload.notes)           delete payload.notes

      await tripsApi.create(payload)
      toast.success('Trip created successfully!')
      closeModal()
      load()
    } finally { setSaving(false) }
  }

  // ── Start trip ─────────────────────────────────────────────────────────
  const handleStart = async (trip) => {
    if (!confirm(`Start trip on route "${trip.route?.name}"?`)) return
    setActing(trip.id)
    try {
      await tripsApi.start(trip.id)
      toast.success('Trip started successfully!')
      load()
    } finally { setActing(null) }
  }

  // ── Stop trip ──────────────────────────────────────────────────────────
  const handleStop = async (trip) => {
    if (!confirm('End this active trip?')) return
    setActing(trip.id)
    try {
      const res = await tripsApi.stop(trip.id)
      toast.success(`Trip completed in ${res.data.duration_minutes} minutes!`)
      load()
    } finally { setActing(null) }
  }

  // ── Delete trip ────────────────────────────────────────────────────────
  const handleDelete = async (trip) => {
    if (!confirm('Cancel and delete this trip?')) return
    try {
      await tripsApi.delete(trip.id)
      toast.success('Trip deleted')
      load()
    } catch {}
  }

  // ── Table columns ──────────────────────────────────────────────────────
  const columns = [
    {
      key: 'route', label: 'Route',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600/15 rounded-lg flex items-center justify-center shrink-0">
            <Navigation size={13} className="text-brand-400" />
          </div>
          <div>
            <p className="font-medium text-black text-sm">{r.route?.name || '—'}</p>
            <p className="text-xs text-black">
              {r.route?.start_location} → {r.route?.end_location}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'driver', label: 'Driver',
      render: (r) => (
        <div>
          <p className="text-sm text-black">{r.driver?.user?.name || '—'}</p>
          <p className="text-xs text-black font-mono">{r.vehicle?.plate_number || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (r) => <Badge status={r.status} />,
    },
    {
      key: 'time', label: 'Time',
      render: (r) => (
        <div className="text-xs text-black">
          {r.status === 'active' && r.started_at && (
            <span className="text-green-400">
              Started {formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}
            </span>
          )}
          {r.status === 'scheduled' && r.scheduled_start && (
            <span>Scheduled {new Date(r.scheduled_start).toLocaleString()}</span>
          )}
          {r.status === 'scheduled' && !r.scheduled_start && (
            <span className="text-black italic">No schedule set</span>
          )}
          {r.status === 'completed' && r.ended_at && (
            <span>Ended {formatDistanceToNow(new Date(r.ended_at), { addSuffix: true })}</span>
          )}
          {r.status === 'cancelled' && (
            <span className="text-red-400/60">Cancelled</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">

          {/* Track on map */}
          {r.status === 'active' && (
            <Link
              to={`/admin/tracking?trip=${r.id}`}
              className="btn-ghost py-1.5 px-2 text-xs"
              title="Track on map"
            >
              <Eye size={13} />
            </Link>
          )}

          {/* Start button — only for scheduled trips */}
          {r.status === 'scheduled' && (
            <button
              onClick={() => handleStart(r)}
              disabled={acting === r.id}
              className="btn py-1.5 px-2.5 bg-green-500/15 hover:bg-green-500/25
                         text-green-400 hover:text-green-300 text-xs"
              title="Start trip"
            >
              {acting === r.id ? <Spinner size={12} /> : <Play size={13} />}
            </button>
          )}

          {/* Stop button — only for active trips */}
          {r.status === 'active' && (
            <button
              onClick={() => handleStop(r)}
              disabled={acting === r.id}
              className="btn py-1.5 px-2.5 bg-red-500/15 hover:bg-red-500/25
                         text-red-400 hover:text-red-300 text-xs"
              title="End trip"
            >
              {acting === r.id ? <Spinner size={12} /> : <Square size={13} />}
            </button>
          )}

          {/* Delete — only for scheduled/cancelled */}
          {(r.status === 'scheduled' || r.status === 'cancelled') && (
            <button
              onClick={() => handleDelete(r)}
              className="btn-danger py-1.5 px-2"
              title="Delete trip"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
  <div className="space-y-5 animate-fade-in">

    {/* ── Header ───────────────────────────────────────── */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-black">Trips</h2>
        <p className="text-xs text-gray-600">{total} trips total</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={load}
          className="px-3 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={15} /> Create Trip
        </button>
      </div>
    </div>

    {/* ── Status Tabs ───────────────────────────────────── */}
    <div className="flex gap-2 flex-wrap">
      {[
        { label: 'All', value: '' },
        { label: 'Active', value: 'active' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ].map(({ label, value }) => (
        <button
          key={value}
          onClick={() => { setStatus(value); setPage(1) }}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition
            ${status === value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          {label}
        </button>
      ))}
    </div>

    {/* ── Table ─────────────────────────────────────────── */}
    <div className="bg-white border border-gray-300 rounded-2xl shadow-sm">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No trips found. Click 'Create Trip' to schedule the first one."
      />

      <div className="border-t border-gray-200 p-3">
        <Pagination page={page} total={total} perPage={10} onChange={setPage} />
      </div>
    </div>

    {/* ── Modal ─────────────────────────────────────────── */}
    <Modal open={modal} onClose={closeModal} title="Create New Trip" size="md">

      <form onSubmit={handleCreate} className="space-y-5">

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          A trip connects a <strong>route</strong>, a <strong>vehicle</strong>, and a <strong>driver</strong>.
        </div>

        {/* Route */}
        <div>
          <label className="text-sm font-medium text-black">Route *</label>
          <select
            className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-300 text-sm text-black focus:ring-2 focus:ring-blue-500"
            value={form.route_id}
            onChange={(e) => setForm({ ...form, route_id: e.target.value })}
            required
          >
            <option value="">Select a route...</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.start_location} → {r.end_location}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle */}
        <div>
          <label className="text-sm font-medium text-black">Vehicle *</label>
          <select
            className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-300 text-sm text-black focus:ring-2 focus:ring-blue-500"
            value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
            required
          >
            <option value="">Select a vehicle...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.plate_number}
              </option>
            ))}
          </select>
        </div>

        {/* Driver */}
        <div>
          <label className="text-sm font-medium text-black">Driver *</label>
          <select
            className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-300 text-sm text-black focus:ring-2 focus:ring-blue-500"
            value={form.driver_id}
            onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
            required
          >
            <option value="">Select a driver...</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user?.name} — {d.license_number}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="text-sm font-medium text-black">Scheduled Start</label>
          <input
            type="datetime-local"
            className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-300 text-sm text-black focus:ring-2 focus:ring-blue-500"
            value={form.scheduled_start}
            onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-black">Notes</label>
          <textarea
            rows={2}
            className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-300 text-sm text-black focus:ring-2 focus:ring-blue-500"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">

          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            {saving ? <Spinner size={14} /> : <Plus size={14} />}
            Create Trip
          </button>

        </div>

      </form>
    </Modal>

  </div>
)
}