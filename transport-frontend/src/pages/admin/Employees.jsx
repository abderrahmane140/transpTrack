import React, { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react'
import { employeesApi, routesApi } from '../../api/index'
import { Modal, Spinner } from '../../components/ui/index'
import MapPicker from '../../components/map/MapPicker'
import toast from 'react-hot-toast'

// ── Shared light styles ───────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px',
  background: '#ffffff', border: '1px solid #d1d5db',
  borderRadius: 8, color: '#111827', fontSize: 13,
  outline: 'none', fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
}

function FInput({ label, required, placeholder, value, onChange, type = 'text', disabled, mono }) {
  const [f, setF] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} required={required} disabled={disabled}
        style={{ ...inp, fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif', borderColor: f ? '#6366f1' : '#d1d5db', boxShadow: f ? '0 0 0 3px #eef2ff' : 'none', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
      />
    </div>
  )
}

function FSelect({ label, value, onChange, children }) {
  const [f, setF] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <select value={value} onChange={onChange}
        style={{ ...inp, cursor: 'pointer', borderColor: f ? '#6366f1' : '#d1d5db', boxShadow: f ? '0 0 0 3px #eef2ff' : 'none' }}
        onFocus={() => setF(true)} onBlur={() => setF(false)}>
        {children}
      </select>
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

const EMPTY = {
  name: '', email: '', password: '', password_confirmation: '',
  phone: '', employee_code: '', department: '', position: '',
  route_id: '', pickup_stop: '',
  pickup_latitude: '', pickup_longitude: '', notes: '',
}

export default function Employees() {
  const [data,    setData]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [routes,  setRoutes]  = useState([])
  const [search,  setSearch]  = useState('')
  const [dept,    setDept]    = useState('')
  const [page,    setPage]    = useState(1)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const perPage = 10

  const load = async () => {
    setLoading(true)
    try {
      const [eR, rR] = await Promise.all([
        employeesApi.list({ search, department: dept, page, per_page: perPage }),
        routesApi.list({ active_only: true, per_page: 100 }),
      ])
      setData(eR.data.data); setTotal(eR.data.total); setRoutes(rR.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, dept, page])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit   = (e) => {
    setEditing(e)
    setForm({
      name: e.user?.name || '', email: e.user?.email || '',
      phone: e.user?.phone || '', password: '', password_confirmation: '',
      employee_code: e.employee_code || '', department: e.department || '',
      position: e.position || '', route_id: e.route_id || '',
      pickup_stop: e.pickup_stop || '',
      pickup_latitude:  e.pickup_latitude  || '',
      pickup_longitude: e.pickup_longitude || '',
      notes: e.notes || '',
    })
    setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await employeesApi.update(editing.id, form); toast.success('Employee updated') }
      else         { await employeesApi.create(form); toast.success('Employee created') }
      closeModal(); load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return
    try { await employeesApi.delete(id); toast.success('Deleted'); load() } catch {}
  }

  const totalPages = Math.ceil(total / perPage)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Employees</h2>
          <p className="text-sm text-gray-500">{total} employees registered</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700
                     text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Plus size={15} /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search employees..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ ...inp, paddingLeft: 32 }}
            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #eef2ff' }}
            onBlur={(e)  => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
          />
        </div>
        <input type="text" placeholder="Filter by department..." value={dept}
          onChange={(e) => { setDept(e.target.value); setPage(1) }}
          style={{ ...inp, width: 200 }}
          onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #eef2ff' }}
          onBlur={(e)  => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none' }}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

        {/* Table head */}
        <div className="grid gap-0 px-5 py-3 bg-gray-50 border-b border-gray-200"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1.5fr 80px' }}>
          {['Employee', 'Code', 'Department', 'Route', 'Pickup Stop', ''].map((h) => (
            <span key={h} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-indigo-500" />
            </div>
            <p className="text-gray-500 font-semibold">No employees found</p>
            <p className="text-gray-400 text-sm">Add your first employee to get started</p>
          </div>
        ) : (
          data.map((emp, idx) => (
            <div
              key={emp.id}
              className="grid items-center px-5 py-3.5 hover:bg-gray-50 transition-colors"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1.5fr 80px', borderBottom: idx < data.length - 1 ? '1px solid #f3f4f6' : 'none' }}
            >
              {/* Name */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200
                                flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                  {emp.user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{emp.user?.name}</p>
                  <p className="text-xs text-gray-400">{emp.user?.email}</p>
                </div>
              </div>

              {/* Code */}
              <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md w-fit">
                {emp.employee_code}
              </span>

              {/* Department */}
              <span className="text-sm text-gray-600">{emp.department || <span className="text-gray-300">—</span>}</span>

              {/* Route */}
              {emp.route
                ? <span className="text-sm font-medium text-indigo-600">{emp.route.name}</span>
                : <span className="text-xs text-amber-500 font-medium italic">Unassigned</span>
              }

              {/* Pickup stop */}
              {emp.pickup_stop
                ? <span className="text-xs text-gray-500">📍 {emp.pickup_stop}</span>
                : <span className="text-gray-300 text-sm">—</span>
              }

              {/* Actions */}
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(emp)}
                  className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600
                             flex items-center justify-center hover:bg-indigo-100 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(emp.id)}
                  className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 text-red-500
                             flex items-center justify-center hover:bg-red-100 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
            <span className="text-xs text-gray-500">Page {page} of {totalPages} · {total} total</span>
            <div className="flex gap-2">
              {[{ l: 'Previous', d: page === 1, a: () => setPage(p => p - 1) }, { l: 'Next', d: page >= totalPages, a: () => setPage(p => p + 1) }].map(({ l, d, a }) => (
                <button key={l} onClick={a} disabled={d}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                    ${d ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Employee' : 'Add New Employee'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">

          <SectionBox title="Account Information">
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Full Name" required placeholder="Mohammed Amine" value={form.name} onChange={set('name')} />
              <FInput label="Email Address" type="email" required={!editing} disabled={!!editing} placeholder="amine@company.com" value={form.email} onChange={set('email')} />
              {!editing && (
                <>
                  <FInput label="Password" type="password" required placeholder="Min 8 characters" value={form.password} onChange={set('password')} />
                  <FInput label="Confirm Password" type="password" required placeholder="Repeat password" value={form.password_confirmation} onChange={set('password_confirmation')} />
                </>
              )}
              <FInput label="Phone Number" placeholder="+212-600-000000" value={form.phone} onChange={set('phone')} />
              <FInput label="Employee Code" required placeholder="EMP-0001" mono value={form.employee_code} onChange={set('employee_code')} />
            </div>
          </SectionBox>

          <SectionBox title="Job Information">
            <div className="grid grid-cols-2 gap-3">
              <FInput label="Department" placeholder="Engineering, Finance, HR..." value={form.department} onChange={set('department')} />
              <FInput label="Position" placeholder="Developer, Manager..." value={form.position} onChange={set('position')} />
            </div>
          </SectionBox>

          <SectionBox title="Transport Assignment">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <FSelect label="Assign Route" value={form.route_id || ''} onChange={set('route_id')}>
                <option value="">No route assigned</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </FSelect>
              <FInput label="Pickup Stop Name" placeholder="e.g. Koutoubia Mosque" value={form.pickup_stop} onChange={set('pickup_stop')} />
            </div>

            <MapPicker
              label="Pickup Location on Map (optional)"
              value={form.pickup_latitude && form.pickup_longitude
                ? { lat: parseFloat(form.pickup_latitude), lng: parseFloat(form.pickup_longitude) }
                : null
              }
              onChange={(p) => setForm({ ...form, pickup_latitude: p?.lat || '', pickup_longitude: p?.lng || '' })}
            />

            {form.pickup_latitude && form.pickup_longitude && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-600 font-bold text-sm">✓</span>
                <span className="text-green-700 text-xs font-mono font-semibold">
                  {parseFloat(form.pickup_latitude).toFixed(6)}, {parseFloat(form.pickup_longitude).toFixed(6)}
                </span>
                <span className="text-green-600 text-xs">— Pickup location set</span>
              </div>
            )}
          </SectionBox>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={closeModal}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                         text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              {saving && <Spinner size={13} />}
              {editing ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}