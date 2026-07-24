import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { admin, uploadDocument, openDocument } from '../api.js'
import { formatSize, formatDate, isPdf, isImage, TYPES } from '../lib.js'
import TypeBadge from '../components/TypeBadge.jsx'
import VisibilityToggle from '../components/VisibilityToggle.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

// Éditeur de classe en MODE BROUILLON : toutes les modifs s'accumulent en
// local, puis « Enregistrer » les applique (ou « Annuler » les jette).
// Layout harmonisé avec la vue élève : bandeau + menu latéral + contenu.
export default function AdminChapitre() {
  const { id } = useParams()
  const classeId = Number(id)
  const navigate = useNavigate()

  const [classe, setClasse] = useState(null)
  const [draft, setDraft] = useState({ domaines: [] })
  const [activeId, setActiveId] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())

  const toggleDomaine = (dmId) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(dmId) ? n.delete(dmId) : n.add(dmId); return n })

  const baselineRef = useRef({ domaines: [] })       // arbre serveur (pour diff)
  const deletedRef = useRef({ dom: new Set(), chap: new Set(), doc: new Set() })
  const filesRef = useRef(new Map())                 // tempDocId -> File
  const tmpRef = useRef(-1)
  const nextTmp = () => tmpRef.current--

  const loadFromServer = useCallback(async () => {
    try {
      const t = await admin.tree(classeId)
      setClasse(t.classe)
      baselineRef.current = structuredClone({ domaines: t.domaines })
      setDraft(structuredClone({ domaines: t.domaines }))
      deletedRef.current = { dom: new Set(), chap: new Set(), doc: new Set() }
      filesRef.current = new Map()
      setDirty(false)
      setActiveId((prev) => prev ?? t.domaines?.find((d) => d.chapitres?.length)?.chapitres?.[0]?.id ?? null)
      setExpanded((prev) => prev.size ? prev : new Set(t.domaines?.[0] ? [t.domaines[0].id] : []))
    } catch (e) { setError(e.message) }
  }, [classeId])
  useEffect(() => { loadFromServer() }, [loadFromServer])

  function mutate(fn) {
    setDraft((prev) => { const next = structuredClone(prev); fn(next); return next })
    setDirty(true)
  }
  const findChap = (tree, cid) => {
    for (const dm of tree.domaines) for (const ch of dm.chapitres) if (ch.id === cid) return ch
    return null
  }
  const active = findChap(draft, activeId)

  /* ---------- Actions locales (brouillon) ---------- */
  function addDomaine() {
    const v = prompt('Nom du grand titre (ex. Les années 2000) :')
    if (!v || !v.trim()) return
    mutate((d) => d.domaines.push({ id: nextTmp(), libelle: v.trim(), description: null, chapitres: [] }))
  }
  function editDomaine(dm) {
    const v = prompt('Nouveau nom du grand titre :', dm.libelle)
    if (v && v.trim() && v !== dm.libelle) mutate((d) => { d.domaines.find((x) => x.id === dm.id).libelle = v.trim() })
  }
  function deleteDomaine(dm) {
    setConfirm({
      title: 'Supprimer ce grand titre ?', danger: true, confirmLabel: 'Supprimer',
      message: `« ${dm.libelle} » et son contenu seront retirés (effectif à l'enregistrement).`,
      onConfirm: () => {
        if (dm.id > 0) deletedRef.current.dom.add(dm.id)
        mutate((d) => { d.domaines = d.domaines.filter((x) => x.id !== dm.id) })
        setConfirm(null)
      },
    })
  }
  function addChapitre(dm) {
    const v = prompt('Nom du chapitre :')
    if (!v || !v.trim()) return
    const cid = nextTmp()
    mutate((d) => d.domaines.find((x) => x.id === dm.id).chapitres.push({ id: cid, libelle: v.trim(), description: null, nb_masques: 0, documents: [] }))
    setExpanded((prev) => new Set(prev).add(dm.id))
    setActiveId(cid)
  }
  function editChapitre(ch) {
    const v = prompt('Nouveau nom du chapitre :', ch.libelle)
    if (v && v.trim() && v !== ch.libelle) mutate((d) => { findChap(d, ch.id).libelle = v.trim() })
  }
  function deleteChapitre(ch) {
    setConfirm({
      title: 'Supprimer le chapitre ?', danger: true, confirmLabel: 'Supprimer',
      message: `« ${ch.libelle} » et ses documents seront retirés (effectif à l'enregistrement).`,
      onConfirm: () => {
        if (ch.id > 0) deletedRef.current.chap.add(ch.id)
        mutate((d) => { for (const dm of d.domaines) dm.chapitres = dm.chapitres.filter((x) => x.id !== ch.id) })
        if (activeId === ch.id) setActiveId(null)
        setConfirm(null)
      },
    })
  }
  function addFiles(ch, type, fileList) {
    const files = Array.from(fileList)
    if (!files.length) return
    mutate((d) => {
      const c = findChap(d, ch.id)
      for (const f of files) {
        const did = nextTmp()
        filesRef.current.set(did, f)
        c.documents.push({ id: did, libelle: f.name.replace(/\.[^.]+$/, ''), type, visible: type === 'cours', taille: f.size, mime: f.type, _new: true })
      }
    })
  }
  function renameDoc(doc) {
    const v = prompt('Nouveau nom du document :', doc.libelle)
    if (v && v.trim() && v !== doc.libelle) mutate((d) => { for (const dm of d.domaines) for (const ch of dm.chapitres) { const x = ch.documents.find((y) => y.id === doc.id); if (x) x.libelle = v.trim() } })
  }
  function deleteDoc(doc) {
    if (doc.id > 0) deletedRef.current.doc.add(doc.id)
    else filesRef.current.delete(doc.id)
    mutate((d) => { for (const dm of d.domaines) for (const ch of dm.chapitres) ch.documents = ch.documents.filter((y) => y.id !== doc.id) })
  }
  function toggleDoc(doc) {
    const next = !doc.visible
    const apply = () => mutate((d) => { for (const dm of d.domaines) for (const ch of dm.chapitres) { const x = ch.documents.find((y) => y.id === doc.id); if (x) x.visible = next } })
    if (next && doc.type === 'controle') {
      setConfirm({
        title: 'Publier ce contrôle ?', confirmLabel: 'Publier le contrôle',
        message: `« ${doc.libelle} » sera visible par les élèves une fois enregistré. À ne faire qu'après l'épreuve.`,
        onConfirm: () => { apply(); setConfirm(null) },
      })
    } else apply()
  }

  /* ---------- Enregistrer / Annuler ---------- */
  async function save() {
    setSaving(true); setError(null)
    try {
      const del = deletedRef.current
      for (const docId of del.doc) await admin.deleteDocument(docId)
      for (const chId of del.chap) await admin.deleteChapitre(chId)
      for (const dmId of del.dom) await admin.deleteDomaine(dmId)

      const base = baselineRef.current
      const baseDom = new Map(base.domaines.map((d) => [d.id, d]))

      for (const dm of draft.domaines) {
        let domId = dm.id
        const bd = dm.id > 0 ? baseDom.get(dm.id) : null
        if (domId < 0) domId = await admin.createDomaine(classeId, dm.libelle, dm.description)
        else if (bd && (bd.libelle !== dm.libelle || (bd.description || '') !== (dm.description || '')))
          await admin.updateDomaine(dm.id, { libelle: dm.libelle, description: dm.description })

        const baseChap = bd ? new Map(bd.chapitres.map((c) => [c.id, c])) : new Map()
        for (const ch of dm.chapitres) {
          let chId = ch.id
          const bc = ch.id > 0 ? baseChap.get(ch.id) : null
          if (chId < 0) chId = await admin.createChapitre(domId, ch.libelle, ch.description)
          else if (bc && (bc.libelle !== ch.libelle || (bc.description || '') !== (ch.description || '')))
            await admin.updateChapitre(ch.id, { libelle: ch.libelle, description: ch.description })

          const baseDoc = bc ? new Map(bc.documents.map((d) => [d.id, d])) : new Map()
          for (const doc of ch.documents) {
            if (doc.id < 0) {
              const file = filesRef.current.get(doc.id)
              if (file) await uploadDocument({ chapitre_id: chId, type: doc.type, libelle: doc.libelle, file })
            } else {
              const bdoc = baseDoc.get(doc.id)
              if (bdoc && bdoc.libelle !== doc.libelle) await admin.renameDocument(doc.id, doc.libelle)
              if (bdoc && !!bdoc.visible !== !!doc.visible) await admin.toggleDocument(doc.id, doc.visible)
            }
          }
        }
      }
      await loadFromServer()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }
  function cancel() {
    setDraft(structuredClone(baselineRef.current))
    deletedRef.current = { dom: new Set(), chap: new Set(), doc: new Set() }
    filesRef.current = new Map()
    setDirty(false); setError(null)
  }
  function goBack() {
    if (dirty && !window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) return
    navigate('/admin/classes')
  }

  if (error && !classe) return <div className="p-6 text-red-600">{error}</div>
  if (!classe) return <div className="p-6 text-slate-400">Chargement…</div>

  return (
    <div className="min-h-screen bg-cream">
      {/* Bandeau */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <button onClick={goBack} className="text-xs text-slate-400 hover:text-slate-700">← Toutes les classes</button>
            <h1 className="font-bold text-slate-800 truncate">{classe.libelle}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && <span className="hidden sm:inline text-xs text-amber-600">Modifications non enregistrées</span>}
            <button onClick={cancel} disabled={!dirty || saving}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40">
              Annuler
            </button>
            <button onClick={save} disabled={!dirty || saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="max-w-5xl mx-auto px-4 pt-3 text-sm text-red-600">{error}</div>}

      <div className="max-w-5xl mx-auto w-full px-4 py-4 md:flex md:gap-6">
        {/* Menu latéral : grands titres → chapitres */}
        <nav className="md:w-72 md:shrink-0 mb-4 md:mb-0 space-y-2">
          {draft.domaines.map((dm) => {
            const open = expanded.has(dm.id)
            return (
              <div key={dm.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-1 px-2 py-2">
                  <button onClick={() => toggleDomaine(dm.id)} aria-expanded={open}
                    className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left">
                    <span className="text-sm font-bold text-slate-700 truncate">{dm.libelle}</span>
                    <svg className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button onClick={() => editDomaine(dm)} className="text-slate-400 hover:text-slate-700 text-[11px] px-1">✎</button>
                  <button onClick={() => deleteDomaine(dm)} className="text-red-400 hover:text-red-600 text-[11px] px-1">🗑</button>
                </div>
                {open && (
                  <div className="px-2 pb-2 flex flex-col gap-1">
                    {dm.chapitres.map((ch) => {
                      const isActive = ch.id === activeId
                      const masq = ch.documents.filter((d) => !d.visible).length
                      return (
                        <button key={ch.id} onClick={() => setActiveId(ch.id)}
                          className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2
                            ${isActive ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                          <span className="truncate">{ch.libelle}</span>
                          {masq > 0 && <span className={`text-[10px] px-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-100 text-amber-700'}`}>{masq}</span>}
                        </button>
                      )
                    })}
                    <button onClick={() => addChapitre(dm)} className="text-left px-3 py-1.5 rounded-lg text-xs text-emerald-700 hover:bg-slate-50">+ chapitre</button>
                  </div>
                )}
              </div>
            )
          })}
          <button onClick={addDomaine} className="w-full px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 border border-dashed border-emerald-300 hover:bg-white">
            + Grand titre
          </button>
        </nav>

        {/* Contenu du chapitre sélectionné */}
        <section className="flex-1 min-w-0">
          {!active ? (
            <p className="text-slate-400 text-sm bg-white rounded-2xl border border-slate-200 p-6 text-center">
              Sélectionne un chapitre à gauche, ou crée un grand titre puis un chapitre.
            </p>
          ) : (
            <ChapitreEditor
              chapitre={active}
              onRenameChap={() => editChapitre(active)}
              onDeleteChap={() => deleteChapitre(active)}
              onAddFiles={(type, files) => addFiles(active, type, files)}
              onRenameDoc={renameDoc} onDeleteDoc={deleteDoc} onToggleDoc={toggleDoc}
            />
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!confirm} title={confirm?.title} message={confirm?.message}
        danger={confirm?.danger} confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)} onConfirm={confirm?.onConfirm}
      />
    </div>
  )
}

/* ---------- Éditeur d'un chapitre ---------- */
function ChapitreEditor({ chapitre, onRenameChap, onDeleteChap, onAddFiles, onRenameDoc, onDeleteDoc, onToggleDoc }) {
  const docs = chapitre.documents || []
  const groupes = Object.keys(TYPES).sort((a, b) => TYPES[a].order - TYPES[b].order)
    .map((type) => ({ type, items: docs.filter((d) => d.type === type) })).filter((g) => g.items.length)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800 truncate">{chapitre.libelle}</h2>
        <div className="flex gap-3 shrink-0 text-xs">
          <button onClick={onRenameChap} className="text-slate-500 hover:text-slate-800">Renommer</button>
          <button onClick={onDeleteChap} className="text-red-500 hover:text-red-700">Supprimer</button>
        </div>
      </div>

      {docs.length === 0 && <p className="text-sm text-slate-400">Aucun document. Ajoute-en ci-dessous.</p>}

      {groupes.map((g) => (
        <div key={g.type} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-cream-50">
            <span className={`w-2 h-2 rounded-full ${TYPES[g.type].dot}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{TYPES[g.type].label}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {g.items.map((doc) => (
              <div key={doc.id} className={`p-3 ${doc.visible ? '' : 'bg-amber-50/40'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={doc.type} />
                      <span className="text-sm font-medium text-slate-800 truncate">{doc.libelle}</span>
                      {doc._new && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">nouveau</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatSize(doc.taille)}
                      {doc.depose_le && <> · déposé le {formatDate(doc.depose_le)}</>}
                      {doc.publie_le && <> · publié le {formatDate(doc.publie_le)}</>}
                    </p>
                  </div>
                  <VisibilityToggle visible={!!doc.visible} onChange={() => onToggleDoc(doc)} />
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  {!doc._new && (isPdf(doc.mime) || isImage(doc.mime)) && (
                    <button onClick={() => openDocument(doc, false)} className="text-emerald-700 hover:underline">Aperçu</button>
                  )}
                  <button onClick={() => onRenameDoc(doc)} className="text-slate-500 hover:text-slate-800">Renommer</button>
                  <button onClick={() => onDeleteDoc(doc)} className="text-red-500 hover:text-red-700">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <StagingDropzone onAdd={onAddFiles} />
    </div>
  )
}

/* ---------- Zone d'ajout de fichiers (brouillon, sans upload immédiat) ---------- */
function StagingDropzone({ onAdd }) {
  const [type, setType] = useState('cours')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)
  const OPTS = [
    { value: 'cours', label: 'Cours (visible)' },
    { value: 'controle', label: 'Contrôle (masqué)' },
    { value: 'correction', label: 'Correction (masquée)' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <label className="text-sm font-medium text-slate-700">Ajouter des documents :</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
          {OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onAdd(type, e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${drag ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-slate-400'}`}>
        <p className="text-2xl mb-1">⬆️</p>
        <p className="text-sm text-slate-600">Glisse des fichiers ici, ou clique pour choisir.</p>
        <p className="text-xs text-slate-400 mt-1">Ils seront envoyés à l'enregistrement. PDF, images, DOCX, ODT, XLSX, MP4 — 50 Mo.</p>
        <input ref={inputRef} type="file" multiple className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.docx,.odt,.xlsx,.mp4"
          onChange={(e) => { onAdd(type, e.target.files); e.target.value = '' }} />
      </div>
    </div>
  )
}
