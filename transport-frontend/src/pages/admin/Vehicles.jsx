import React, { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react'
import { vehiclesApi } from '../../api/index'
import { DataTable, Badge, Modal, Spinner, Pagination } from '../../components/ui/index'
import toast from 'react-hot-toast'

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

  const EMPTY = {
    name: '', plate_number: '', type: 'bus', capacity: '',
    model: '', year: '', color: '', status: 'active', notes: '',
  }
 

  const load = async () => {
    setLoading(true)
    try {
        const res = await vehiclesApi.list({search, status, page, per_page: 10})
        setData(res.data.data)
        setTotal(res.data.total)
    } finally {setLoading(false)}
  }

  useEffect(() => { load() }, [search, status, page])

  const openCreate = ()  => { setEditing(null); setForm(EMPTY); setModal(true)}
  const openEdit   = (v) => {setEditing(v); setForm({...v}); setModal(true)}
  const closeModel = ()  => {setModal(false); setEditing(null)}


  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
        if (editing) {
            await vehiclesApi.update(editing.id, form)
            toast.success('Vehicle updated successfully')
        } else {
            await vehiclesApi.create(from)
            toast.success('Vehicle created successfully')
        }
        closeModel()
        load()
    } finally { setSaving(false)}
  }

  const handleDelete = async (id) => {
    if(!confirm('Delete this vehicle? This cannot be undone.')) return
    try {
        await vehiclesApi.delete(id)
        toast.success('Vehicle deleted')
        load()
    }catch {}
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
                <p className="font-medium text-white text-sm">{r.name}</p>
                <p className="text-xs text-white/40 font-mono">{r.plate_number}</p>
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
 
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Fleet Vehicles</h2>
          <p className="text-xs text-white/40">{total} vehicles registered</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={15} /> Add Vehicle
        </button>
      </div>
 
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="input w-44"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>
 
      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="No vehicles found. Click 'Add Vehicle' to get started."
        />
        <Pagination page={page} total={total} perPage={10} onChange={setPage} />
      </div>
 
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Vehicle' : 'Add New Vehicle'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vehicle Name</label>
              <input className="input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Plate Number</label>
              <input className="input font-mono uppercase" value={form.plate_number}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value })} required />
            </div>
            <div>
              <label className="label">Vehicle Type</label>
              <select className="input" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="bus">Bus</option>
                <option value="van">Van</option>
                <option value="minibus">Minibus</option>
                <option value="car">Car</option>
              </select>
            </div>
            <div>
              <label className="label">Capacity (seats)</label>
              <input type="number" min="1" max="100" className="input" value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" value={form.model || ''}
                placeholder="e.g. Mercedes Sprinter"
                onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <label className="label">Year</label>
              <input type="number" min="2000" max="2030" className="input" value={form.year || ''}
                placeholder={new Date().getFullYear()}
                onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" value={form.color || ''}
                onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none" rows={2} value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner size={14} /> : (editing ? 'Save Changes' : 'Create Vehicle')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

