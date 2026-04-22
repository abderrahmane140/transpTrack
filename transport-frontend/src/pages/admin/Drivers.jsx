import React, { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { driversApi, vehiclesApi } from '../../api/index'
import { DataTable, Badge, Modal, Spinner, Pagination } from '../../components/ui/index'
import toast from 'react-hot-toast'

const EMPTY = {
  name: '', email: '', password: '', password_confirmation: '',
  phone: '', license_number: '', license_expiry: '',
  license_type: 'D', vehicle_id: '', notes: '',
}

export default function Drivers() {
  const [data,     setData]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [vehicles, setVehicles] = useState([])
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [drRes, vRes] = await Promise.all([
        driversApi.list({ search, page, per_page: 10 }),
        vehiclesApi.list({ status: 'active', per_page: 100 }),
      ])
      setData(drRes.data.data)
      setTotal(drRes.data.total)
      setVehicles(vRes.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, page])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit   = (d) => {
    setEditing(d)
    setForm({
      name: d.user?.name || '', email: d.user?.email || '',
      phone: d.user?.phone || '', password: '', password_confirmation: '',
      license_number: d.license_number || '',
      license_expiry: d.license_expiry?.split('T')[0] || '',
      license_type: d.license_type || 'D',
      vehicle_id: d.vehicle_id || '', notes: d.notes || '',
    })
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await driversApi.update(editing.id, form)
        toast.success('Driver updated')
      } else {
        await driversApi.create(form)
        toast.success('Driver created — they can now log in')
      }
      closeModal(); load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this driver? Their account will be removed.')) return
    try { await driversApi.delete(id); toast.success('Driver deleted'); load() } catch {}
  }

  const columns = [
    {
      key: 'name', label: 'Driver',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/15 rounded-full flex items-center
                          justify-center text-xs font-bold text-green-400">
                <img
                  src={"/avatar.jpg"}
                  alt="avatar"
                  className="w-9 h-9 rounded-3xl object-cover"
                />
          </div>
          <div>
            <p className="font-medium text-black text-sm">{r.user?.name}</p>
            <p className="text-xs text-black">{r.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'license', label: 'License',
      render: (r) => (
        <div>
          <p className="text-sm font-mono text-black">{r.license_number}</p>
          <p className="text-xs text-black">
            Expires {r.license_expiry?.split('T')[0] || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'vehicle', label: 'Vehicle',
      render: (r) => r.vehicle
        ? <span className="font-mono text-xs text-brand-300">{r.vehicle.name} · {r.vehicle.plate_number}</span>
        : <span className="text-black text-xs italic">Unassigned</span>,
    },
    {
      key: 'available', label: 'Status',
      render: (r) => <Badge status={r.is_available ? 'available' : 'unavailable'} />,
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <button onClick={() => openEdit(r)} className="btn-ghost py-1.5 px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDelete(r.id)} className="btn-danger py-1.5 px-2"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
  <div className="space-y-5 animate-fade-in">

    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-black">Drivers</h2>
        <p className="text-xs text-black/70">{total} registered drivers</p>
      </div>

      <button
        onClick={openCreate}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                   bg-blue-600 text-white text-sm font-medium
                   hover:bg-blue-700 active:scale-[0.98] transition"
      >
        <Plus size={15} /> Add Driver
      </button>
    </div>

    {/* Search */}
    <div className="relative max-w-xs">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50" />
      <input
        type="text"
        placeholder="Search drivers..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300
                   text-black placeholder-black/40
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   transition"
      />
    </div>

    {/* Table */}
    <div className="bg-white border border-gray-300 rounded-2xl shadow-sm">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No drivers found. Add your first driver."
      />

      <div className="border-t border-gray-200 p-3">
        <Pagination page={page} total={total} perPage={10} onChange={setPage} />
      </div>
    </div>

    {/* Modal */}
    <Modal
      open={modal}
      onClose={closeModal}
      title={editing ? 'Edit Driver' : 'Add New Driver'}
      size="lg"
    >

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Info box */}
        <p className="text-xs text-black/70 bg-gray-100 border border-gray-300 rounded-xl px-3 py-2">
          This creates both a user account and driver profile. The driver can log in immediately.
        </p>

        <div className="grid grid-cols-2 gap-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Full Name</label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email Address</label>
            <input
              type="email"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required={!editing}
              disabled={!!editing}
            />
          </div>

          {/* Passwords */}
          {!editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">Confirm Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.password_confirmation}
                  onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">Phone Number</label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1-555-0000"
            />
          </div>

          {/* License number */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">License Number</label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black font-mono
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              required
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">License Expiry</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.license_expiry}
              onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
              required
            />
          </div>

          {/* License type */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">License Type</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.license_type}
              onChange={(e) => setForm({ ...form, license_type: e.target.value })}
            >
              {['A', 'B', 'C', 'D', 'EB'].map((t) => (
                <option key={t} value={t}>Type {t}</option>
              ))}
            </select>
          </div>

          {/* Vehicle */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-black mb-1">
              Assign Vehicle (optional)
            </label>

            <select
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-black
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={form.vehicle_id || ''}
              onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
            >
              <option value="">No vehicle assigned</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.plate_number}
                </option>
              ))}
            </select>
          </div>

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
            {saving ? <Spinner size={14} /> : (editing ? 'Save Changes' : 'Create Driver')}
          </button>

        </div>

      </form>

    </Modal>

  </div>
)
}