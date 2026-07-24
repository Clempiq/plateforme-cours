import { useRef, useState } from 'react'
import { uploadDocument } from '../api.js'

const TYPE_OPTIONS = [
  { value: 'cours', label: 'Cours (visible par défaut)' },
  { value: 'controle', label: 'Contrôle (masqué par défaut)' },
  { value: 'correction', label: 'Correction (masquée par défaut)' },
]

// Glisser-déposer + sélection OBLIGATOIRE du type avant envoi (F-08, F-11).
export default function UploadDropzone({ chapitreId, onUploaded }) {
  const [type, setType] = useState('cours')
  const [drag, setDrag] = useState(false)
  const [queue, setQueue] = useState([]) // [{name, status:'upload'|'done'|'error', error}]
  const inputRef = useRef(null)

  async function handleFiles(fileList) {
    const files = Array.from(fileList)
    if (files.length === 0) return
    for (const file of files) {
      const entry = { name: file.name, status: 'upload', error: null }
      setQueue((q) => [...q, entry])
      try {
        await uploadDocument({ chapitre_id: chapitreId, type, file })
        setQueue((q) => q.map((x) => x === entry ? { ...x, status: 'done' } : x))
      } catch (e) {
        setQueue((q) => q.map((x) => x === entry ? { ...x, status: 'error', error: e.message } : x))
      }
    }
    onUploaded && onUploaded()
    setTimeout(() => setQueue((q) => q.filter((x) => x.status === 'error')), 1500)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <label className="text-sm font-medium text-slate-700">Type du document :</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${drag ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-slate-400'}`}>
        <p className="text-3xl mb-1">⬆️</p>
        <p className="text-sm text-slate-600">Glisse un ou plusieurs fichiers ici, ou clique pour choisir.</p>
        <p className="text-xs text-slate-400 mt-1">PDF, images, DOCX, ODT, XLSX, MP4 — 50 Mo max.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.docx,.odt,.xlsx,.mp4"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {queue.length > 0 && (
        <div className="mt-3 space-y-2">
          {queue.map((x, i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="truncate text-slate-600">{x.name}</span>
                <span className={x.status === 'error' ? 'text-red-600' : x.status === 'done' ? 'text-emerald-600' : 'text-slate-400'}>
                  {x.status === 'error' ? 'Échec' : x.status === 'done' ? 'Envoyé ✓' : 'Envoi…'}
                </span>
              </div>
              {x.status === 'error'
                ? <p className="text-red-600">{x.error}</p>
                : <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-emerald-500 ${x.status === 'done' ? 'w-full' : 'w-1/2 animate-pulse'}`} />
                  </div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
