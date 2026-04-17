import { useEffect } from "react"
import { employeesApi, routeApi } from "../../api"
import toast from "react-hot-toast"

const EMPTY = {
  name: '', email: '', password: '', password_confirmation: '',
  phone: '', employee_code: '', department: '', position: '',
  route_id: '', pickup_stop: '', notes: '',
}

export default function Employee() {
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


    const laod = async () => {
        setLoading(true)
        try {
            const [empRes, rtsRes] = await Promise.all([
                employeesApi.list({search, department: dept, page, per_page: 10}),
                routeApi.list({ active_only: true, per_page: 100})
            ])
            setData(empRes.data.data)
            setTotal(empRes.data.total)
            setRoutes(rtsRes.data.data)
        } finally {setLoading(false)}
    }


    useEffect(() => { load() }, [search, dept, page])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setModel(true) }
    const openEdit   = (emp) => {
        setEditing(emp)
        setForm({
            name: emp.user?.name || '', email: emp.user?.email || '',
            phone: emp.user?.phone || '', password: '', password_confirmation: '',
            employee_code: emp.employee_code || '', department: emp.department || '',
            position: emp.position || '', route_id: emp.route_id || '',
            pickup_stop: emp.pickup_stop || '', notes: emp.notes || '',
        })
        setModal(true)
    }
    const closeModal  = () => { setModal(false); setEditing(null)}

    const handleSubmit = async (e) => {
        e.preventDefault
        setSaving(true)
        try {
            if (editing) {
                await employeesApi.update(editing.id, from)
                toast.success('Employee updated')
            } else {
                await employeesApi.create(form)
                toast.success('Employee created — they can now log in')
            }
            closeModal(); load()
        } finally { setSaving(false)}
    }

    const handleDelete = async (id) => {
        if(!confirm('Delete this employee? Their account will be removed.')) return 
        try { await employeesApi.delete(id); toast.success('Employee deleted'); load()} catch {}
    }

    const columns = [
    {
      key: 'name', label: 'Employee',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/15 rounded-full flex items-center
                          justify-center text-xs font-bold text-purple-400">
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
      key: 'employee_code', label: 'Code',
      render: (r) => <span className="font-mono text-xs text-white/60">{r.employee_code}</span>,
    },
    {
      key: 'department', label: 'Department',
      render: (r) => r.department || <span className="text-white/20">—</span>,
    },
    {
      key: 'route', label: 'Route',
      render: (r) => r.route
        ? <span className="text-brand-300 text-xs">{r.route.name}</span>
        : <span className="text-amber-500/60 text-xs italic">Unassigned</span>,
    },
    {
      key: 'pickup_stop', label: 'Pickup Stop',
      render: (r) => r.pickup_stop
        ? <span className="text-xs text-white/60">{r.pickup_stop}</span>
        : <span className="text-white/20 text-xs">—</span>,
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
          <h2 className="text-lg font-semibold text-white">Employees</h2>
          <p className="text-xs text-white/40">{total} employees registered</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Add Employee</button>
      </div>
 
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Search employees..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="input pl-9" />
        </div>
        <input type="text" placeholder="Filter by department..." value={dept}
          onChange={(e) => { setDept(e.target.value); setPage(1) }}
          className="input w-52" />
      </div>
 
      <div className="card">
        <DataTable columns={columns} data={data} loading={loading}
          emptyMessage="No employees found. Add your first employee." />
        <Pagination page={page} total={total} perPage={10} onChange={setPage} />
      </div>
 
      <Modal open={modal} onClose={closeModal} title={editing ? 'Edit Employee' : 'Add New Employee'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-white/40 bg-white/3 rounded-xl px-3 py-2">
            This creates both a user account and employee profile. The employee can log in immediately.
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
              <label className="label">Employee Code</label>
              <input className="input font-mono" value={form.employee_code}
                onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                placeholder="EMP-0001" required />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input className="input" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Engineering, HR, Finance..." />
            </div>
            <div>
              <label className="label">Position</label>
              <input className="input" value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <label className="label">Assign Route</label>
              <select className="input" value={form.route_id || ''}
                onChange={(e) => setForm({ ...form, route_id: e.target.value })}>
                <option value="">No route assigned</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.code || r.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Pickup Stop Name</label>
              <input className="input" value={form.pickup_stop}
                onChange={(e) => setForm({ ...form, pickup_stop: e.target.value })}
                placeholder="e.g. North Park Terminus" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner size={14} /> : (editing ? 'Save Changes' : 'Create Employee')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}