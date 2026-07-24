import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { admin, signOut } from '../api.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

// Liste des classes (tableau de bord admin). #/admin/classes
export default function AdminClasses({ onLogout }) {
  const [classes, setClasses] = useState([])
  const [newLibelle, setNewLibelle] = useState('')
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState(null) // {id, libelle}

  function reload() {
    admin.listClasses().then((d) => setClasses(d.classes || [])).catch((e) => setError(e.message))
  }
  useEffect(reload, [])

  async function create(e) {
    e.preventDefault()
    if (!newLibelle.trim()) return
    try { await admin.createClasse(newLibelle.trim()); setNewLibelle(''); reload() }
    catch (err) { setError(err.message) }
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

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold">Espace enseignante</h1>
          <button onClick={() => signOut().then(onLogout)} className="text-sm text-slate-300 hover:text-white">Déconnexion</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <form onSubmit={create} className="flex gap-2 mb-6">
          <input
            value={newLibelle}
            onChange={(e) => setNewLibelle(e.target.value)}
            placeholder="Nouvelle classe (ex. 3e B)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Créer
          </button>
        </form>

        <div className="space-y-3">
          {classes.length === 0 && <p className="text-slate-400 text-sm">Aucune classe pour l'instant.</p>}
          {classes.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-800">{c.libelle}</h2>
                    {c.nb_masques > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                        {c.nb_masques} masqué{c.nb_masques > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{c.nb_chapitres} chapitre{c.nb_chapitres > 1 ? 's' : ''}</p>
                  <button
                    onClick={() => navigator.clipboard?.writeText(publicLink(c.slug))}
                    title="Copier le lien élève"
                    className="text-xs text-indigo-600 hover:underline mt-1 break-all text-left">
                    🔗 Lien élève (cliquer pour copier)
                  </button>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Link to={`/admin/classe/${c.id}`} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                    Gérer
                  </Link>
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
    </div>
  )
}
