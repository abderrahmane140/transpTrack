import { useEffect } from "react"
import { driversApi, vehiclesApi } from "../../api"
import toast from "react-hot-toast"

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
        const [drRes, vRes] = await Promis.all([
            driversApi.list({search, page, per_page: 10}),
            vehiclesApi.list({search: 'active', per_page: 100}),
        ])
        setData(drRes.data.data)
        setTotal(drRes.data.total)
        setVehicles(vRes.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(), [search, page]})

  const openCreate = () => { setEditing(null); setForm(EMPTY), setModal(true)}
  const openEdit   = (d)  => {
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
  const closeModal = () => {setModal(false); setEditing(null)}

  const handleSubmit = async (e) => {
    e.preventDerault()
    setSaving(true)
    try{
        if(editing) {
            await driversApi.update(editing.id, form)
            toast.success('Driver updated')
        } else {
            await driversApi.create(form)
            toast.success('Driver created - they can now log in')
        }
        closeModal(); load()
    } finally {setSaving(false)}
    }

    const handleDelete = async (id) => {
        if(!confirm('Delete this driver? Their account will be removed.')) return 
        try {await driversApi.delete(id); toast.success('Driver deleted'); load()} catch {}
    }

    const columns = [
         {
            key: 'name', label: 'Driver',
            render: (r) => (
                <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/15 rounded-full flex items-center
                                justify-center text-xs font-bold text-green-400">
                    {r.user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                    <p className="font-medium text-white text-sm">{r.user?.name}</p>
                    <p className="text-xs text-white/40">{r.user?.email}</p>
                </div>
                </div>
            ),
            },
            {
            key: 'license', label: 'License',
            render: (r) => (
                <div>
                <p className="text-sm font-mono text-white/80">{r.license_number}</p>
                <p className="text-xs text-white/40">
                    Expires {r.license_expiry?.split('T')[0] || '—'}
                </p>
                </div>
            ),
            },
            {
            key: 'vehicle', label: 'Vehicle',
            render: (r) => r.vehicle
                ? <span className="font-mono text-xs text-brand-300">{r.vehicle.name} · {r.vehicle.plate_number}</span>
                : <span className="text-white/20 text-xs italic">Unassigned</span>,
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
        <div className="flex items-center justify-between">
            <div>
            <h2 className="text-lg font-semibold text-white">Drivers</h2>
            <p className="text-xs text-white/40">{total} registered drivers</p>
            </div>
            <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add Driver</button>
        </div>
    
        <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search drivers..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="input pl-9" />
        </div>
    
        <div className="card">
            <DataTable columns={columns} data={data} loading={loading}
            emptyMessage="No drivers found. Add your first driver." />
            <Pagination page={page} total={total} perPage={10} onChange={setPage} />
        </div>
    
        <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Driver' : 'Add New Driver'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-white/40 bg-white/3 rounded-xl px-3 py-2">
                This creates both a user account and driver profile. The driver can log in immediately.
            </p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="label">Full Name</label>
                <input className="input" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                <label className="label">Email Address</label>
                <input type="email" className="input" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required={!editing} disabled={!!editing} />
                </div>
                {!editing && (
                <>
                    <div>
                    <label className="label">Password</label>
                    <input type="password" className="input" value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                    </div>
                    <div>
                    <label className="label">Confirm Password</label>
                    <input type="password" className="input" value={form.password_confirmation}
                        onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} required />
                    </div>
                </>
                )}
                <div>
                <label className="label">Phone Number</label>
                <input className="input" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1-555-0000" />
                </div>
                <div>
                <label className="label">License Number</label>
                <input className="input font-mono" value={form.license_number}
                    onChange={(e) => setForm({ ...form, license_number: e.target.value })} required />
                </div>
                <div>
                <label className="label">License Expiry Date</label>
                <input type="date" className="input" value={form.license_expiry}
                    onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} required />
                </div>
                <div>
                <label className="label">License Type</label>
                <select className="input" value={form.license_type}
                    onChange={(e) => setForm({ ...form, license_type: e.target.value })}>
                    {['A', 'B', 'C', 'D', 'EB'].map((t) => (
                    <option key={t} value={t}>Type {t}</option>
                    ))}
                </select>
                </div>
                <div className="col-span-2">
                <label className="label">Assign Vehicle (optional)</label>
                <select className="input" value={form.vehicle_id || ''}
                    onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
                    <option value="">No vehicle assigned</option>
                    {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} — {v.plate_number}</option>
                    ))}
                </select>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Spinner size={14} /> : (editing ? 'Save Changes' : 'Create Driver')}
                </button>
            </div>
            </form>
        </Modal>
    </div>
    )
}