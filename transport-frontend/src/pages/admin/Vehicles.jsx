import React, { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react'
import { vehiclesApi } from '../../api/index'
import { DataTable, Badge, Modal, Spinner, Pagination } from '../../components/ui/index'
import toast from 'react-hot-toast'

const EMPTY = {
  name: '', plate_number: '', type: 'bus', capacity: '',
  model: '', year: '', color: '', status: 'active', notes: '',
}

export default function Vehicles() {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [page,    setPage]    = useState(1)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await vehiclesApi.list({ search, status, page, per_page: 10 })
      setData(res.data.data)
      setTotal(res.data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, status, page])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit   = (v) => { setEditing(v); setForm({ ...v }); setModal(true) }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await vehiclesApi.update(editing.id, form)
        toast.success('Vehicle updated successfully')
      } else {
        await vehiclesApi.create(form)
        toast.success('Vehicle created successfully')
      }
      closeModal()
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return
    try {
      await vehiclesApi.delete(id)
      toast.success('Vehicle deleted')
      load()
    } catch {}
  }

  const columns = [
    {
      key: 'name', label: 'Vehicle',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600/15 rounded-lg flex items-center justify-center">
            <Truck size={13} className="text-brand-400" />
          </div>
          <div>
            <p className="font-medium text-black text-sm">{r.name}</p>
            <p className="text-xs text-blackfont-mono">{r.plate_number}</p>
          </div>
        </div>
      ),
    },
    { key: 'type',     label: 'Type',     render: (r) => <span className="capitalize text-sm">{r.type}</span> },
    { key: 'capacity', label: 'Capacity', render: (r) => `${r.capacity} seats` },
    { key: 'model',    label: 'Model',    render: (r) => r.model || '—' },
    { key: 'status',   label: 'Status',   render: (r) => <Badge status={r.status} /> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => openEdit(r)} className="btn-ghost py-1.5 px-2">
            <Pencil size={13} />
          </button>
          <button onClick={() => handleDelete(r.id)} className="btn-danger py-1.5 px-2">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

return (
  <div className="space-y-5 animate-fade-in">

    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-black">Fleet Vehicles</h2>
        <p className="text-xs text-black/70">{total} vehicles registered</p>
      </div>

      <button
        onClick={openCreate}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                   bg-blue-600 text-white text-sm font-medium
                   hover:bg-blue-700 active:scale-[0.98] transition"
      >
        <Plus size={15} /> Add Vehicle
      </button>
    </div>

    {/* Filters */}
    <div className="flex gap-3">

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
        <input
          type="text"
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300
                     text-black placeholder-black/40
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     transition"
        />
      </div>

      {/* Select */}
      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        className="w-44 px-3 py-2.5 rounded-xl border border-gray-300
                   text-black bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   transition"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>

    {/* Table */}
    <div className="bg-white border border-gray-300 rounded-2xl shadow-sm">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No vehicles found. Click 'Add Vehicle' to get started."
      />
      <div className="border-t border-gray-200 p-3">
        <Pagination page={page} total={total} perPage={10} onChange={setPage} />
      </div>
    </div>

    {/* Modal */}
    <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Vehicle' : 'Add New Vehicle'}>

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="grid grid-cols-2 gap-4">

          {[
            { label: 'Vehicle Name', key: 'name' },
            { label: 'Plate Number', key: 'plate_number', extra: 'uppercase font-mono' },
          ].map(({ label, key, extra }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-black mb-1">{label}</label>
              <input
                className={`w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black ${extra || ''}
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
              />
            </div>
          ))}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Vehicle Type</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="bus">Bus</option>
              <option value="van">Van</option>
              <option value="minibus">Minibus</option>
              <option value="car">Car</option>
            </select>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Capacity</label>
            <input
              type="number"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              required
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Model</label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Mercedes Sprinter"
              value={form.model || ''}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Year</label>
            <input
              type="number"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.year || ''}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Color</label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.color || ''}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Status</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-black mb-1">Notes</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black resize-none
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">

          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-xl border border-gray-300 text-black
                       hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white
                       hover:bg-blue-700 transition flex items-center gap-2"
          >
            {saving ? <Spinner size={14} /> : (editing ? 'Save Changes' : 'Create Vehicle')}
          </button>

        </div>

      </form>

    </Modal>

  </div>
)
}