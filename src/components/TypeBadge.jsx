import { TYPES } from '../lib.js'

export default function TypeBadge({ type }) {
  const t = TYPES[type] || { label: type, cls: 'bg-slate-100 text-slate-700 border-slate-200' }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${t.cls}`}>
      {t.label}
    </span>
  )
}
