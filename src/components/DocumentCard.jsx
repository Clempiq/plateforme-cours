import { useState } from 'react'
import { openDocument } from '../api.js'
import { formatSize, isPdf, isImage } from '../lib.js'

// Carte document côté ÉLÈVE : visualiser + télécharger (liens signés).
export default function DocumentCard({ doc }) {
  const viewable = isPdf(doc.mime) || isImage(doc.mime)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)

  async function open(download) {
    setBusy(true); setErr(false)
    try { await openDocument(doc, download) }
    catch { setErr(true) }
    finally { setBusy(false) }
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500" aria-hidden="true">
        {isPdf(doc.mime) ? '📄' : isImage(doc.mime) ? '🖼️' : '📎'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{doc.libelle}</p>
        <p className="text-xs text-slate-400">
          {formatSize(doc.taille)}{err && <span className="text-red-500"> · indisponible</span>}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {viewable && (
          <button
            onClick={() => open(false)}
            disabled={busy}
            aria-label={`Visualiser ${doc.libelle}`}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
            Voir
          </button>
        )}
        <button
          onClick={() => open(true)}
          disabled={busy}
          aria-label={`Télécharger ${doc.libelle}`}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50">
          {busy ? '…' : 'Télécharger'}
        </button>
      </div>
    </div>
  )
}
