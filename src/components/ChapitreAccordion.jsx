import { useState } from 'react'
import DocumentCard from './DocumentCard.jsx'
import { TYPES } from '../lib.js'

// Chapitre dépliable côté ÉLÈVE. Documents regroupés par type (F-27).
export default function ChapitreAccordion({ chapitre, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const docs = chapitre.documents || []

  // Regroupement par type, dans l'ordre cours -> contrôle -> correction.
  const groupes = Object.keys(TYPES)
    .sort((a, b) => TYPES[a].order - TYPES[b].order)
    .map((type) => ({ type, items: docs.filter((d) => d.type === type) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="font-semibold text-slate-800">{chapitre.libelle}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">
            {docs.length} doc{docs.length > 1 ? 's' : ''}
          </span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {docs.length === 0 && (
            <p className="text-sm text-slate-400 py-2">
              Aucun document disponible pour l'instant.
            </p>
          )}
          {groupes.map((g) => (
            <div key={g.type} className="mt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                {TYPES[g.type].label}
              </p>
              <div className="divide-y divide-slate-100">
                {g.items.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
