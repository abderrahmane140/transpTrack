import React from 'react'
import { X } from 'lucide-react'

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-600/15 text-brand-400',
    green:  'bg-green-500/15 text-green-400',
    amber:  'bg-amber-500/15 text-amber-400',
    red:    'bg-red-500/15 text-red-400',
    purple: 'bg-purple-500/15 text-purple-400',
  }

  return (
    <div className="card flex items-start gap-4 animate-slide-up">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-2xl font-semibold text-white mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ status }) {
  const styles = {
    active:      'bg-green-500/15 text-green-400 border border-green-500/20',
    scheduled:   'bg-brand-500/15 text-brand-400 border border-brand-500/20',
    completed:   'bg-white/5 text-white/40 border border-white/10',
    cancelled:   'bg-red-500/15 text-red-400 border border-red-500/20',
    maintenance: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    inactive:    'bg-white/5 text-white/30 border border-white/10',
    available:   'bg-green-500/15 text-green-400 border border-green-500/20',
    unavailable: 'bg-red-500/15 text-red-400 border border-red-500/20',
  }

  const dots = {
    active:      'bg-green-400',
    scheduled:   'bg-brand-400',
    completed:   'bg-white/30',
    cancelled:   'bg-red-400',
    maintenance: 'bg-amber-400',
    inactive:    'bg-white/20',
    available:   'bg-green-400',
    unavailable: 'bg-red-400',
  }

  const cls    = styles[status] || 'bg-white/5 text-white/40 border border-white/10'
  const dotCls = dots[status]   || 'bg-white/30'

  return (
    <span className={`badge ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls} ${status === 'active' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full ${sizes[size]} bg-surface-800 border border-white/8
                        rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ columns, data, loading, emptyMessage = 'No records found.' }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="text-center py-16 text-white/30">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-xs font-medium text-white/40
                           uppercase tracking-wider py-3 px-4 first:pl-0"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-white/3 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 first:pl-0 text-white/80">
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin text-brand-400"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
      <p className="text-xs text-white/40">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="btn-ghost py-1.5 px-3 text-xs"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost py-1.5 px-3 text-xs"
        >
          Next
        </button>
      </div>
    </div>
  )
}