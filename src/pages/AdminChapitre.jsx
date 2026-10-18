import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { admin, uploadDocument, openDocument } from '../api.js'
import { demoAdmin, demoUpload } from '../demo.js'
import { saveDraft } from '../saveDraft.js'
import { moveItem, validateFile } from '../catalog.js'
import { formatSize, TYPES } from '../lib.js'
import { Loading, Notice, EmptyState } from '../components/UI.jsx'
import Icon from '../components/Icon.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import VisibilityToggle from '../components/VisibilityToggle.jsx'

export default function AdminChapitre({ demo = false }) {
  const { id } = useParams()
  return (
    <Editor
      key={demo ? 'demo' : id}
      classeId={demo ? 1 : Number(id)}
      demo={demo}
    />
  )
}
function Editor({ classeId, demo }) {
  const api = demo ? demoAdmin : admin,
    upload = demo ? demoUpload : uploadDocument,
    navigate = useNavigate()
  const [classe, setClasse] = useState(null),
    [draft, setDraft] = useState({ domaines: [] }),
    [activeId, setActiveId] = useState(null)
  const [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [info, setInfo] = useState(''),
    [progress, setProgress] = useState('')
  const [confirm, setConfirm] = useState(null),
    [edit, setEdit] = useState(null)
  const baseline = useRef({ domaines: [] }),
    files = useRef(new Map()),
    counter = useRef(-1),
    saveLock = useRef(false)
  const findChapter = (tree, cid) =>
    tree.domaines.flatMap((d) => d.chapitres).find((c) => c.id === cid)
  const active = findChapter(draft, activeId)
  useEffect(() => {
    let alive = true
    api
      .tree(classeId)
      .then((t) => {
        if (!alive) return
        if (!t?.classe)
          throw new Error('Cette classe est introuvable ou inaccessible.')
        setClasse(t.classe)
        const tree = { domaines: t.domaines || [] }
        baseline.current = structuredClone(tree)
        setDraft(tree)
        setActiveId(tree.domaines.flatMap((d) => d.chapitres)[0]?.id ?? null)
      })
      .catch((e) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
    }
  }, [classeId, api])
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function mutate(fn) {
    if (saveLock.current) return
    setDraft((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
    setDirty(true)
    setInfo('')
  }
  function leave() {
    if (dirty)
      setConfirm({
        title: 'Quitter sans enregistrer ?',
        message: 'Les modifications encore dans le brouillon seront perdues.',
        confirmLabel: 'Quitter',
        onConfirm: () => navigate(demo ? '/demo/enseignant' : '/admin/classes'),
      })
    else navigate(demo ? '/demo/enseignant' : '/admin/classes')
  }
  function editDomaine(dm) {
    setEdit({
      title: dm ? 'Modifier le grand titre' : 'Nouveau grand titre',
      value: dm?.libelle || '',
      description: dm?.description || '',
      onSubmit: (value, description) => {
        const id = dm?.id ?? counter.current--
        mutate((t) => {
          if (dm)
            Object.assign(
              t.domaines.find((d) => d.id === dm.id),
              { libelle: value, description },
            )
          else
            t.domaines.push({ id, libelle: value, description, chapitres: [] })
        })
        setEdit(null)
      },
    })
  }
  function editChapter(dm, ch) {
    setEdit({
      title: ch ? 'Modifier le chapitre' : 'Nouveau chapitre',
      value: ch?.libelle || '',
      description: ch?.description || '',
      onSubmit: (value, description) => {
        const id = ch?.id ?? counter.current--
        mutate((t) => {
          if (ch)
            Object.assign(findChapter(t, ch.id), {
              libelle: value,
              description,
            })
          else
            t.domaines
              .find((d) => d.id === dm.id)
              .chapitres.push({
                id,
                libelle: value,
                description,
                documents: [],
              })
        })
        setActiveId(id)
        setEdit(null)
      },
    })
  }
  function remove(kind, item) {
    setConfirm({
      title:
        'Supprimer ' +
        (kind === 'dm'
          ? 'ce grand titre'
          : kind === 'ch'
            ? 'ce chapitre'
            : 'ce document') +
        ' ?',
      message:
        '« ' +
        item.libelle +
        ' » sera supprimé à l’enregistrement, avec son contenu. Vous pouvez annuler le brouillon avant d’enregistrer.',
      danger: true,
      confirmLabel: 'Retirer du brouillon',
      onConfirm: () => {
        mutate((t) => {
          if (kind === 'dm')
            t.domaines = t.domaines.filter((d) => d.id !== item.id)
          else if (kind === 'ch')
            t.domaines.forEach(
              (d) =>
                (d.chapitres = d.chapitres.filter((c) => c.id !== item.id)),
            )
          else
            t.domaines.forEach((d) =>
              d.chapitres.forEach(
                (c) =>
                  (c.documents = c.documents.filter((x) => x.id !== item.id)),
              ),
            )
        })
        setConfirm(null)
      },
    })
  }
  function addFiles(type, list) {
    if (saveLock.current) return
    const additions = [],
      errors = []
    for (const file of Array.from(list)) {
      const err = validateFile(file)
      if (err) {
        errors.push(err)
        continue
      }
      const id = counter.current--
      files.current.set(id, file)
      additions.push({
        id,
        libelle: file.name.replace(/\.[^.]+$/, ''),
        type,
        visible: type === 'cours',
        taille: file.size,
        mime: file.type,
        _new: true,
      })
    }
    setError(errors.join('\n'))
    if (additions.length)
      mutate((t) => findChapter(t, activeId).documents.push(...additions))
  }
  function toggle(doc) {
    const apply = () =>
      mutate((t) => {
        const d = findChapter(t, activeId).documents.find(
          (x) => x.id === doc.id,
        )
        d.visible = !d.visible
      })
    if (!doc.visible && (doc.type === 'controle' || doc.type === 'correction'))
      setConfirm({
        title:
          'Publier ' +
          (doc.type === 'controle' ? 'ce contrôle' : 'cette correction') +
          ' ?',
        message:
          '« ' +
          doc.libelle +
          ' » deviendra accessible aux élèves après l’enregistrement.',
        confirmLabel: 'Préparer la publication',
        onConfirm: () => {
          apply()
          setConfirm(null)
        },
      })
    else apply()
  }
  function renameDoc(doc) {
    setEdit({
      title: 'Renommer le document',
      value: doc.libelle,
      onSubmit: (value) => {
        mutate((t) => {
          findChapter(t, activeId).documents.find(
            (d) => d.id === doc.id,
          ).libelle = value
        })
        setEdit(null)
      },
    })
  }
  async function preview(doc) {
    setError('')
    try {
      await openDocument(doc)
    } catch (e) {
      setError(e.message)
    }
  }
  async function save() {
    if (saveLock.current) return
    saveLock.current = true
    setSaving(true)
    setError('')
    setInfo('')
    const work = structuredClone(draft),
      journal = structuredClone(baseline.current)
    try {
      await saveDraft({
        draft: work,
        baseline: journal,
        files: files.current,
        classeId,
        api,
        upload,
        onProgress: setProgress,
      })
      baseline.current = structuredClone(work)
      files.current.clear()
      setDraft(work)
      setDirty(false)
      setActiveId(
        work.domaines.flatMap((d) => d.chapitres).some((c) => c.id === activeId)
          ? activeId
          : (work.domaines.flatMap((d) => d.chapitres)[0]?.id ?? null),
      )
      setInfo('Les modifications sont enregistrées. La vue élève est à jour.')
    } catch (e) {
      baseline.current = journal
      setDraft(work)
      setActiveId(work.domaines.flatMap((d) => d.chapitres)[0]?.id ?? null)
      setError(
        'Enregistrement interrompu : ' +
          e.message +
          ' Les opérations déjà confirmées sont conservées. Réessayez pour terminer.',
      )
      setDirty(true)
    } finally {
      setSaving(false)
      setProgress('')
      saveLock.current = false
    }
  }
  function cancel() {
    setConfirm({
      title: 'Annuler les modifications ?',
      message:
        'Le brouillon reviendra au dernier état enregistré. Les fichiers encore en attente ne seront pas envoyés.',
      confirmLabel: 'Annuler le brouillon',
      onConfirm: () => {
        setDraft(structuredClone(baseline.current))
        files.current.clear()
        setActiveId(
          baseline.current.domaines.flatMap((d) => d.chapitres)[0]?.id ?? null,
        )
        setDirty(false)
        setError('')
        setConfirm(null)
      },
    })
  }
  if (!classe)
    return (
      <main className="shell">
        {error ? (
          <>
            <Notice>{error}</Notice>
            <button className="btn btn-secondary" onClick={leave}>
              Retour aux classes
            </button>
          </>
        ) : (
          <Loading />
        )}
      </main>
    )
  return (
    <>
      {demo && (
        <div className="demo-banner">
          Démonstration · aucun fichier n’est envoyé au serveur. Tout est
          réinitialisé au rechargement.
        </div>
      )}
      <header className="editor-header">
        <div className="shell">
          <div>
            <button className="text-link" onClick={leave} disabled={saving}>
              ← Mes classes
            </button>
            <h1>{classe.libelle}</h1>
          </div>
          <div className="editor-actions">
            <a
              className="btn btn-secondary hide-mobile"
              href={
                demo ? '#/demo' : '#/classe/' + encodeURIComponent(classe.slug)
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Vue élève ↗
            </a>
            <button
              className="btn btn-secondary"
              onClick={cancel}
              disabled={!dirty || saving}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={!dirty || saving}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="shell">
        <Notice>{error}</Notice>
        <Notice kind="success">{info}</Notice>
        {dirty && (
          <div className="save-status" role="status">
            {saving
              ? progress
              : 'Brouillon non enregistré · les élèves ne voient pas encore ces changements.'}
          </div>
        )}
        <fieldset className="editor-fieldset" disabled={saving}>
          <legend className="sr-only">Organisation des cours</legend>
          <div className="editor-layout">
            <nav
              className="editor-sidebar"
              aria-label="Organisation des chapitres"
            >
              <p className="eyebrow" style={{ marginBottom: 16 }}>
                Plan de la classe
              </p>
              {draft.domaines.map((dm, di) => (
                <section className="editor-group" key={dm.id}>
                  <div className="editor-group-heading">
                    <span>{dm.libelle}</span>
                    <button
                      className="icon-button"
                      onClick={() => editDomaine(dm)}
                      aria-label={'Modifier ' + dm.libelle}
                    >
                      ✎
                    </button>
                  </div>
                  <div className="editor-group-controls">
                    <button
                      className="icon-button"
                      disabled={di === 0}
                      onClick={() =>
                        mutate((t) => {
                          t.domaines = moveItem(t.domaines, di, -1)
                        })
                      }
                      aria-label={'Monter ' + dm.libelle}
                    >
                      ↑
                    </button>
                    <button
                      className="icon-button"
                      disabled={di === draft.domaines.length - 1}
                      onClick={() =>
                        mutate((t) => {
                          t.domaines = moveItem(t.domaines, di, 1)
                        })
                      }
                      aria-label={'Descendre ' + dm.libelle}
                    >
                      ↓
                    </button>
                    <button
                      className="icon-button"
                      aria-label={'Supprimer ' + dm.libelle}
                      onClick={() => remove('dm', dm)}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  {dm.chapitres.map((ch, ci) => (
                    <div className="editor-chapter" key={ch.id}>
                      <button
                        className={
                          'sidebar-button ' +
                          (activeId === ch.id ? 'active' : '')
                        }
                        aria-current={activeId === ch.id ? 'page' : undefined}
                        onClick={() => setActiveId(ch.id)}
                      >
                        {ch.libelle}
                        <span className="count">{ch.documents.length}</span>
                      </button>
                      <div className="editor-chapter-controls">
                        <button
                          disabled={ci === 0}
                          aria-label={'Monter ' + ch.libelle}
                          onClick={() =>
                            mutate((t) => {
                              const d = t.domaines.find((d) => d.id === dm.id)
                              d.chapitres = moveItem(d.chapitres, ci, -1)
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          disabled={ci === dm.chapitres.length - 1}
                          aria-label={'Descendre ' + ch.libelle}
                          onClick={() =>
                            mutate((t) => {
                              const d = t.domaines.find((d) => d.id === dm.id)
                              d.chapitres = moveItem(d.chapitres, ci, 1)
                            })
                          }
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="btn btn-quiet btn-sm"
                    onClick={() => editChapter(dm, null)}
                  >
                    <Icon name="plus" size={14} />
                    Ajouter un chapitre
                  </button>
                </section>
              ))}
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => editDomaine(null)}
              >
                <Icon name="plus" size={16} />
                Nouveau grand titre
              </button>
            </nav>
            <section className="panel editor-content">
              {!active ? (
                <EmptyState
                  title="Construisons votre prochain cours"
                  action={
                    !draft.domaines.length ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => editDomaine(null)}
                      >
                        Créer un grand titre
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => editChapter(draft.domaines[0], null)}
                      >
                        Ajouter un chapitre
                      </button>
                    )
                  }
                >
                  Organisez votre classe en grands titres, puis en chapitres.
                  Ajoutez ensuite vos supports.
                </EmptyState>
              ) : (
                <>
                  <p className="eyebrow" style={{ marginBottom: 10 }}>
                    Préparer le chapitre
                  </p>
                  <div className="editor-content-heading">
                    <h2 className="serif">{active.libelle}</h2>
                    <div>
                      <button
                        className="btn btn-quiet btn-sm"
                        onClick={() => editChapter(null, active)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-quiet btn-sm"
                        onClick={() => remove('ch', active)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  {active.description ? (
                    <p
                      className="muted description"
                      style={{ marginBottom: 20 }}
                    >
                      {active.description}
                    </p>
                  ) : (
                    <p className="muted small" style={{ marginBottom: 20 }}>
                      Ajoutez une description pour donner des objectifs ou des
                      consignes à vos élèves.
                    </p>
                  )}
                  {active.documents.length === 0 && (
                    <p className="muted">
                      Aucun support pour le moment. Déposez les premiers
                      fichiers ci-dessous.
                    </p>
                  )}
                  {active.documents.map((doc) => (
                    <article className="editor-doc" key={doc.id}>
                      <div className="editor-doc-top">
                        <div>
                          <span
                            className={
                              'badge ' +
                              (doc.type === 'controle'
                                ? 'badge-amber'
                                : doc.type === 'correction'
                                  ? 'badge-purple'
                                  : '')
                            }
                          >
                            {TYPES[doc.type]?.label}
                          </span>
                          <h3>{doc.libelle}</h3>
                          <p className="document-meta">
                            {formatSize(doc.taille)}
                            {doc._new ? ' · en attente d’envoi' : ''}
                          </p>
                        </div>
                        <VisibilityToggle
                          visible={!!doc.visible}
                          onChange={() => toggle(doc)}
                        />
                      </div>
                      <div className="editor-doc-actions">
                        {!doc._new && (
                          <button
                            className="text-link"
                            onClick={() => preview(doc)}
                          >
                            Ouvrir
                          </button>
                        )}
                        <button
                          className="text-link"
                          onClick={() => renameDoc(doc)}
                        >
                          Renommer
                        </button>
                        <button
                          className="text-link"
                          onClick={() => remove('doc', doc)}
                        >
                          Retirer
                        </button>
                      </div>
                    </article>
                  ))}
                  <Dropzone onAdd={addFiles} />
                </>
              )}
            </section>
          </div>
        </fieldset>
        <p className="local-note">
          Les fichiers restent privés tant que leur statut est « Masqué ».
          Enregistrez pour appliquer une modification.
        </p>
      </main>
      <ConfirmDialog
        open={!!confirm}
        {...confirm}
        onCancel={() => setConfirm(null)}
      />
      {edit && <EditForm config={edit} onClose={() => setEdit(null)} />}
    </>
  )
}
function EditForm({ config, onClose }) {
  const [value, setValue] = useState(config.value),
    [description, setDescription] = useState(config.description || '')
  return (
    <Modal title={config.title} onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim())
            config.onSubmit(value.trim(), description.trim() || null)
        }}
      >
        <label className="field">
          Intitulé
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={180}
          />
        </label>
        {config.description !== undefined && (
          <label className="field">
            Description / consignes
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={3000}
              placeholder="Les objectifs du chapitre, une consigne de révision…"
            />
            <span className="field-hint">
              Visible par les élèves après enregistrement.
            </span>
          </label>
        )}
        <button className="btn btn-primary" disabled={!value.trim()}>
          Ajouter au brouillon
        </button>
      </form>
    </Modal>
  )
}
function Dropzone({ onAdd }) {
  const [type, setType] = useState('cours'),
    [drag, setDrag] = useState(false),
    ref = useRef(null)
  return (
    <div style={{ marginTop: 28 }}>
      <label className="field">
        Type des fichiers à ajouter
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="cours">Cours · publié par défaut</option>
          <option value="controle">Contrôle · masqué par défaut</option>
          <option value="correction">Correction · masquée par défaut</option>
        </select>
      </label>
      <div
        className={'dropzone ' + (drag ? 'dragging' : '')}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          onAdd(type, e.dataTransfer.files)
        }}
      >
        <Icon name="upload" size={26} />
        <p>Déposez vos fichiers ici</p>
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => ref.current.click()}
        >
          Choisir des fichiers
        </button>
        <small>
          PDF, PNG, JPG, DOCX, ODT, XLSX ou MP4 · 50 Mo maximum par fichier.
          <br />
          L’envoi aura lieu lorsque vous enregistrerez.
        </small>
        <input
          ref={ref}
          className="sr-only"
          tabIndex={-1}
          type="file"
          aria-label="Choisir les fichiers du chapitre"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.docx,.odt,.xlsx,.mp4"
          onChange={(e) => {
            onAdd(type, e.target.files)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
