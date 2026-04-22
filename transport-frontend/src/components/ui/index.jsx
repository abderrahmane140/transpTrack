import React from 'react'
import { X } from 'lucide-react'

// ── StatCard ─────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-600',
    green:  'bg-green-100 text-green-600',
    amber:  'bg-amber-100 text-amber-600',
    red:    'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="bg-white border border-gray-300 rounded-2xl p-4 flex items-start gap-4 shadow-sm">

      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-black uppercase tracking-wider font-medium">
          {label}
        </p>

        <p className="text-2xl font-semibold text-black mt-0.5">
          {value ?? '—'}
        </p>

        {sub && <p className="text-xs text-black/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────
export function Badge({ status }) {
  const styles = {
    active:      'bg-green-100 text-green-700 border border-green-300',
    scheduled:   'bg-blue-100 text-blue-700 border border-blue-300',
    completed:   'bg-gray-100 text-black border border-gray-300',
    cancelled:   'bg-red-100 text-red-700 border border-red-300',
    maintenance: 'bg-amber-100 text-amber-700 border border-amber-300',
    inactive:    'bg-gray-100 text-black/70 border border-gray-300',
    available:   'bg-green-100 text-green-700 border border-green-300',
    unavailable: 'bg-red-100 text-red-700 border border-red-300',
  }

  const dots = {
    active:      'bg-green-600',
    scheduled:   'bg-blue-600',
    completed:   'bg-gray-500',
    cancelled:   'bg-red-600',
    maintenance: 'bg-amber-500',
    inactive:    'bg-gray-500',
    available:   'bg-green-600',
    unavailable: 'bg-red-600',
  }

  const cls = styles[status] || 'bg-gray-100 text-black border border-gray-300'
  const dot = dots[status] || 'bg-gray-500'

  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}

// ── Modal ────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full ${sizes[size]} bg-white border border-gray-300
                        rounded-2xl shadow-xl flex flex-col max-h-[90vh]`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-black">{title}</h2>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-black hover:bg-gray-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
  )
}

// ── DataTable ────────────────────────────────────────────
export function DataTable({ columns, data, loading, emptyMessage = 'No records found.' }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="text-center py-16 text-black/60">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">

        <thead>
          <tr className="border-b border-gray-300">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-xs font-medium text-black uppercase tracking-wider py-3 px-4"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-100 transition">

              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 text-black">
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

// ── Spinner ──────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin text-blue-600"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Pagination ───────────────────────────────────────────
export function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-300">

      <p className="text-xs text-black/60">
        Page {page} of {totalPages} · {total} total
      </p>

      <div className="flex gap-2">

        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          Previous
        </button>

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          Next
        </button>

      </div>

    </div>
  )
}