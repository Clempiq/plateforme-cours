import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { admin, openDocument } from '../api.js'
import { formatSize, formatDate, isPdf, isImage, TYPES } from '../lib.js'
import TypeBadge from '../components/TypeBadge.jsx'
import VisibilityToggle from '../components/VisibilityToggle.jsx'
import UploadDropzone from '../components/UploadDropzone.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

// Gestion d'une classe : chapitres + documents. #/admin/classe/:id
export default function AdminChapitre() {
  const { id } = useParams()
  const classeId = Number(id)
  const [tree, setTree] = useState(null)
  const [error, setError] = useState(null)
  const [newChap, setNewChap] = useState('')
  const [confirm, setConfirm] = useState(null) // {title, message, danger, confirmLabel, onConfirm}

  const reload = useCallback(() => {
    admin.tree(classeId).then(setTree).catch((e) => setError(e.message))
  }, [classeId])
  useEffect(reload, [reload])

  async function addChapitre(e) {
    e.preventDefault()
    if (!newChap.trim()) return
    await admin.createChapitre(classeId, newChap.trim()); setNewChap(''); reload()
  }

  // Bascule de visibilité, avec confirmation si on PUBLIE un contrôle (F, point de vigilance).
  function onToggle(doc) {
    const next = doc.visible ? 0 : 1
    const publishingControle = next === 1 && doc.type === 'controle'
    if (publishingControle) {
      setConfirm({
        title: 'Publier ce contrôle ?',
        message: `« ${doc.libelle} » deviendra immédiatement visible par les élèves. À ne faire qu'une fois l'épreuve passée.`,
        confirmLabel: 'Publier le contrôle',
        onConfirm: async () => { await admin.toggleDocument(doc.id, 1); setConfirm(null); reload() },
      })
    } else {
      admin.toggleDocument(doc.id, next).then(reload)
    }
  }

  function renameDoc(doc) {
    const val = prompt('Nouveau nom du document :', doc.libelle)
    if (val && val.trim() && val !== doc.libelle) admin.renameDocument(doc.id, val.trim()).then(reload)
  }

  function deleteDoc(doc) {
    setConfirm({
      title: 'Supprimer le document ?',
      message: `« ${doc.libelle} » sera définitivement supprimé.`,
      danger: true, confirmLabel: 'Supprimer',
      onConfirm: async () => { await admin.deleteDocument(doc.id); setConfirm(null); reload() },
    })
  }

  function renameChap(ch) {
    const val = prompt('Nouveau nom du chapitre :', ch.libelle)
    if (val && val.trim() && val !== ch.libelle) admin.renameChapitre(ch.id, val.trim()).then(reload)
  }

  function deleteChap(ch) {
    setConfirm({
      title: 'Supprimer le chapitre ?',
      message: `« ${ch.libelle} » et ses ${ch.documents.length} document(s) seront supprimés.`,
      danger: true, confirmLabel: 'Supprimer',
      onConfirm: async () => { await admin.deleteChapitre(ch.id); setConfirm(null); reload() },
    })
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!tree) return <div className="p-6 text-slate-400">Chargement…</div>

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link to="/admin/classes" className="text-xs text-slate-400 hover:text-white">← Toutes les classes</Link>
            <h1 className="font-bold">{tree.classe.libelle}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <form onSubmit={addChapitre} className="flex gap-2">
          <input
            value={newChap}
            onChange={(e) => setNewChap(e.target.value)}
            placeholder="Nouveau chapitre"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Ajouter
          </button>
        </form>

        {tree.chapitres.length === 0 && (
          <p className="text-slate-400 text-sm">Crée un premier chapitre pour commencer à déposer des documents.</p>
        )}

        {tree.chapitres.map((ch) => (
          <section key={ch.id} className="bg-slate-100/60 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-slate-800">{ch.libelle}</h2>
                {ch.nb_masques > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                    {ch.nb_masques} masqué{ch.nb_masques > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => renameChap(ch)} className="text-xs text-slate-500 hover:text-slate-800">Renommer</button>
                <button onClick={() => deleteChap(ch)} className="text-xs text-red-500 hover:text-red-700">Supprimer</button>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-2 mb-3">
              {ch.documents.length === 0 && (
                <p className="text-xs text-slate-400 px-1">Aucun document dans ce chapitre.</p>
              )}
              {ch.documents.map((doc) => (
                <div key={doc.id} className={`bg-white rounded-xl border p-3 ${doc.visible ? 'border-slate-200' : 'border-amber-200 bg-amber-50/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={doc.type} />
                        <span className="text-sm font-medium text-slate-800 truncate">{doc.libelle}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatSize(doc.taille)} · déposé le {formatDate(doc.depose_le)}
                        {doc.publie_le && <> · publié le {formatDate(doc.publie_le)}</>}
                      </p>
                    </div>
                    <VisibilityToggle visible={!!doc.visible} onChange={() => onToggle(doc)} />
                  </div>
                  <div className="flex gap-3 mt-2 text-xs">
                    {(isPdf(doc.mime) || isImage(doc.mime)) && (
                      <button onClick={() => openDocument(doc, false)} className="text-indigo-600 hover:underline">Aperçu</button>
                    )}
                    <button onClick={() => openDocument(doc, true)} className="text-slate-500 hover:text-slate-800">Télécharger</button>
                    <button onClick={() => renameDoc(doc)} className="text-slate-500 hover:text-slate-800">Renommer</button>
                    <button onClick={() => deleteDoc(doc)} className="text-red-500 hover:text-red-700">Supprimer</button>
                  </div>
                </div>
              ))}
            </div>

            <UploadDropzone chapitreId={ch.id} onUploaded={reload} />
          </section>
        ))}
      </main>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        danger={confirm?.danger}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </div>
  )
}
