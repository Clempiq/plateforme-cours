import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { admin, signOut, getProfile } from '../api.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

// Matières principales, ordre alphabétique (+ « Autre… » dans le menu).
const SUBJECTS = [
  'Allemand', 'Anglais', 'Arts plastiques', 'Éducation musicale',
  'Éducation physique et sportive (EPS)', 'Enseignement moral et civique (EMC)',
  'Espagnol', 'Français', 'Géographie', 'Histoire', 'Histoire-Géographie',
  'Italien', 'Latin', 'Mathématiques', 'Numérique et sciences informatiques (NSI)',
  'Philosophie', 'Physique-Chimie', 'Sciences de la vie et de la Terre (SVT)',
  'Sciences économiques et sociales (SES)', 'Technologie',
]

// Liste des classes (tableau de bord admin). #/admin/classes
export default function AdminClasses({ onLogout }) {
  const [classes, setClasses] = useState([])
  const [newLibelle, setNewLibelle] = useState('')
  const [newCode, setNewCode] = useState('')
  const [matiereSel, setMatiereSel] = useState('')
  const [matiereAutre, setMatiereAutre] = useState('')
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState(null) // {id, libelle}
  const [copiedId, setCopiedId] = useState(null)
  const [copiedLinkId, setCopiedLinkId] = useState(null)
  const [qrClass, setQrClass] = useState(null)
  const [profile, setProfile] = useState({ prenom: '', matiere: '' })
  const navigate = useNavigate()

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {})
  }, [])

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true }
    const t = document.createElement('textarea')
    t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'
    document.body.appendChild(t); t.focus(); t.select()
    const ok = document.execCommand('copy'); t.remove(); return ok
  }

  function reload() {
    admin.listClasses().then((d) => setClasses(Array.isArray(d) ? d : [])).catch((e) => setError(e.message))
  }
  useEffect(reload, [])

  function cleanSlug(s) {
    return s.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9_-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }
  async function create(e) {
    e.preventDefault()
    if (!newLibelle.trim()) return
    const custom = newCode.trim() ? cleanSlug(newCode) : null
    const matiere = matiereSel === '__autre__' ? (matiereAutre.trim() || null) : (matiereSel || null)
    try {
      await admin.createClasse(newLibelle.trim(), custom, matiere)
      setNewLibelle(''); setNewCode(''); setMatiereSel(''); setMatiereAutre(''); setError(null); reload()
    } catch (err) { setError(err.message) }
  }

  async function rename(c) {
    const val = prompt('Nouveau nom de la classe :', c.libelle)
    if (val && val.trim() && val !== c.libelle) {
      await admin.renameClasse(c.id, val.trim()); reload()
    }
  }

  async function doDelete() {
    await admin.deleteClasse(confirm.id); setConfirm(null); reload()
  }

  const publicLink = (slug) => `${location.origin}${location.pathname}#/classe/${slug}`

  async function copyCode(c) {
    try {
      await copyText(c.slug)
      setCopiedId(c.id); setTimeout(() => setCopiedId((id) => (id === c.id ? null : id)), 1500)
    } catch { window.prompt('Copie ce code de classe :', c.slug) }
  }
  async function copyLink(c) {
    const url = publicLink(c.slug)
    try {
      await copyText(url)
      setCopiedLinkId(c.id); setTimeout(() => setCopiedLinkId((id) => (id === c.id ? null : id)), 1500)
    } catch { window.prompt('Copie ce lien élève :', url) }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Espace enseignant</p>
            <h1 className="font-bold text-slate-800">
              {profile.prenom ? `Bonjour ${profile.prenom} 👋` : 'Mes classes'}
            </h1>
          </div>
          <button onClick={() => signOut().then(onLogout)} className="text-sm text-slate-500 hover:text-slate-800">Déconnexion</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <form onSubmit={create} className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex gap-2">
            <input
              value={newLibelle}
              onChange={(e) => setNewLibelle(e.target.value)}
              placeholder="Nouvelle classe (ex. 3e B)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <button className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shrink-0">
              Créer
            </button>
          </div>
          <select
            value={matiereSel}
            onChange={(e) => setMatiereSel(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
            <option value="">Matière (facultatif)</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__autre__">Autre…</option>
          </select>
          {matiereSel === '__autre__' && (
            <input
              value={matiereAutre}
              onChange={(e) => setMatiereAutre(e.target.value)}
              placeholder="Préciser la matière"
              autoFocus
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          )}
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Code personnalisé (facultatif, ex. TermD-lyceeZola)"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <p className="text-xs text-slate-400">
            La matière s'affiche en haut de l'espace élève. Le code sert d'adresse à la classe : laisse vide pour un code au hasard, il n'est plus modifiable ensuite.
          </p>
        </form>

        <div className="space-y-3">
          {classes.length === 0 && <p className="text-slate-400 text-sm">Aucune classe pour l'instant.</p>}
          {classes.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/admin/classe/${c.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter') && navigate(`/admin/classe/${c.id}`)}
              className="group bg-white rounded-2xl border border-slate-200 p-4 cursor-pointer transition-all hover:border-emerald-300 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-800 group-hover:text-emerald-700">{c.libelle}</h2>
                    {c.matiere && <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{c.matiere}</span>}
                    {c.nb_masques > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                        {c.nb_masques} masqué{c.nb_masques > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{c.nb_chapitres} chapitre{c.nb_chapitres > 1 ? 's' : ''}</p>
                  {/* Zone code : clics neutralisés pour ne pas ouvrir la classe */}
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[11px] text-slate-400 mb-1">Code de la classe (à donner aux élèves)</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 break-all select-all">
                        {c.slug}
                      </code>
                      <button
                        onClick={() => copyCode(c)}
                        className="text-xs font-medium px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        {copiedId === c.id ? '✓ Copié' : 'Copier le code'}
                      </button>
                      <button
                        onClick={() => copyLink(c)}
                        title={publicLink(c.slug)}
                        className="text-xs font-medium px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                        {copiedLinkId === c.id ? '✓ Copié' : 'Copier le lien'}
                      </button>
                      <button
                        onClick={() => setQrClass(c)}
                        className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
                        QR code
                      </button>
                      <a
                        href={publicLink(c.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">
                        Aperçu élève ↗
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-slate-300 group-hover:text-emerald-500 text-lg leading-none" aria-hidden="true">→</span>
                  <div className="flex gap-2">
                    <button onClick={() => rename(c)} className="text-xs text-slate-500 hover:text-slate-800">Renommer</button>
                    <button onClick={() => setConfirm(c)} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <ConfirmDialog
        open={!!confirm}
        danger
        title="Supprimer la classe ?"
        message={confirm ? `« ${confirm.libelle} » et tous ses chapitres et documents seront définitivement supprimés.` : ''}
        confirmLabel="Supprimer"
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
      />

      {qrClass && (
        <QRModal classe={qrClass} url={publicLink(qrClass.slug)} onClose={() => setQrClass(null)} />
      )}
    </div>
  )
}

// Fenêtre QR code d'une classe (à afficher/projeter/imprimer pour les élèves).
function QRModal({ classe, url, onClose }) {
  const wrap = useRef(null)
  function download() {
    const canvas = wrap.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `qr-${classe.slug}.png`
    a.click()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900">{classe.libelle}</h3>
        <p className="text-sm text-slate-500 mt-1">Les élèves scannent ce code pour ouvrir la classe.</p>
        <div ref={wrap} className="flex justify-center py-4">
          <QRCodeCanvas value={url} size={220} level="M" marginSize={2} />
        </div>
        <p className="text-[11px] text-slate-400 break-all">{url}</p>
        <div className="mt-4 flex gap-2 justify-center">
          <button onClick={download} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700">
            Télécharger
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
