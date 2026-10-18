import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { admin, getProfile, signOut } from '../api.js'
import { demoAdmin, resetDemo } from '../demo.js'
import { normalize } from '../catalog.js'
import {
  Header,
  Footer,
  Notice,
  Loading,
  EmptyState,
} from '../components/UI.jsx'
import Icon from '../components/Icon.jsx'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function AdminClasses({ onLogout, demo = false }) {
  const service = demo ? demoAdmin : admin
  const [classes, setClasses] = useState([]),
    [profile, setProfile] = useState({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  const [query, setQuery] = useState(''),
    [createOpen, setCreateOpen] = useState(false),
    [rename, setRename] = useState(null),
    [remove, setRemove] = useState(null),
    [share, setShare] = useState(null)
  async function reload() {
    setLoading(true)
    setError('')
    try {
      const d = await service.listClasses()
      setClasses(Array.isArray(d) ? d : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    reload()
    if (!demo)
      getProfile()
        .then(setProfile)
        .catch(() => {})
  }, [demo])
  const list = classes.filter((c) =>
    normalize(c.libelle + ' ' + (c.matiere || '')).includes(normalize(query)),
  )
  const chapters = classes.reduce((n, c) => n + Number(c.nb_chapitres || 0), 0),
    hidden = classes.reduce((n, c) => n + Number(c.nb_masques || 0), 0)
  async function logout() {
    try {
      await signOut()
      onLogout()
    } catch (e) {
      setError(e.message)
    }
  }
  return (
    <>
      {demo && (
        <div className="demo-banner">
          Démonstration enseignant · les modifications restent temporaires dans
          cet onglet.<Link to="/demo">Voir côté élève →</Link>
        </div>
      )}
      <Header>
        <Link className="hide-mobile" to="/aide">
          Guide rapide
        </Link>
        {demo ? (
          <Link className="btn btn-secondary" to="/admin">
            Me connecter
          </Link>
        ) : (
          <button className="btn btn-secondary" onClick={logout}>
            Déconnexion
          </button>
        )}
      </Header>
      <main id="main-content" className="shell">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Mon espace enseignant</p>
            <h1 className="serif">
              {profile.prenom
                ? 'Bonjour ' + profile.prenom + '.'
                : 'Vos cours, bien organisés.'}
            </h1>
            <p className="muted">
              Préparez vos chapitres, partagez les bons supports au bon moment.
            </p>
          </div>
          {!demo && (
            <button
              className="btn btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              <Icon name="plus" size={18} />
              Créer une classe
            </button>
          )}
        </div>
        <Notice>{error}</Notice>
        <div className="stats">
          <div className="panel stat">
            <strong>{classes.length}</strong>
            <span>Classes</span>
          </div>
          <div className="panel stat">
            <strong>{chapters}</strong>
            <span>Chapitres préparés</span>
          </div>
          <div className="panel stat">
            <strong>{hidden}</strong>
            <span>Documents masqués</span>
          </div>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Rechercher une classe</span>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une classe ou une matière…"
            />
          </label>
          <button
            className="btn btn-secondary"
            onClick={reload}
            disabled={loading}
          >
            Actualiser
          </button>
        </div>
        {loading ? (
          <Loading />
        ) : list.length ? (
          <div className="class-grid">
            {list.map((c) => (
              <article className="panel class-card" key={c.id}>
                <div className="class-card-heading">
                  <span className="badge">
                    {c.matiere || 'Espace de classe'}
                  </span>
                  {Number(c.nb_masques) > 0 && (
                    <span className="badge badge-amber">
                      <Icon name="lock" size={11} />
                      {c.nb_masques} masqués
                    </span>
                  )}
                </div>
                <h2 className="serif">
                  <Link
                    to={
                      demo ? '/demo/enseignant/classe' : '/admin/classe/' + c.id
                    }
                  >
                    {c.libelle}
                  </Link>
                </h2>
                <p className="muted small">
                  {c.nb_chapitres || 0} chapitres · accès élève sans compte
                </p>
                <code>{c.slug}</code>
                <div className="class-card-actions">
                  <Link
                    className="btn btn-primary btn-sm"
                    to={
                      demo ? '/demo/enseignant/classe' : '/admin/classe/' + c.id
                    }
                  >
                    Préparer les cours <Icon name="arrow" size={14} />
                  </Link>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShare(c)}
                  >
                    <Icon name="share" size={14} />
                    Partager
                  </button>
                  {!demo && (
                    <>
                      <button
                        className="btn btn-quiet btn-sm"
                        onClick={() => setRename(c)}
                      >
                        Renommer
                      </button>
                      <button
                        className="icon-button"
                        aria-label={'Supprimer ' + c.libelle}
                        onClick={() => setRemove(c)}
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel">
            <EmptyState
              title={
                query
                  ? 'Aucune classe trouvée'
                  : 'Votre première classe vous attend'
              }
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => (query ? setQuery('') : setCreateOpen(true))}
                >
                  {query ? 'Effacer la recherche' : 'Créer ma première classe'}
                </button>
              }
            >
              {query
                ? 'Essayez un autre nom ou une autre matière.'
                : 'Créez une classe, ajoutez un grand titre et un chapitre, puis déposez vos premiers supports.'}
            </EmptyState>
          </div>
        )}
        {demo && (
          <p style={{ marginTop: 24 }}>
            <button
              className="text-link"
              onClick={() => {
                resetDemo()
                reload()
              }}
            >
              Réinitialiser la démonstration
            </button>
          </p>
        )}
        <section className="teacher-invite">
          <Icon name="lock" size={28} />
          <div style={{ flex: 1 }}>
            <h2 className="serif">Vous décidez de ce qui est partagé.</h2>
            <p className="muted">
              Contrôles et corrections sont masqués par défaut. Enregistrez vos
              changements pour les appliquer.
            </p>
          </div>
          <Link className="text-link" to="/aide">
            Lire le guide →
          </Link>
        </section>
      </main>
      <Footer />
      {createOpen && (
        <ClassForm
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            reload()
          }}
          defaultSubject={profile.matiere}
        />
      )}
      {rename && (
        <RenameForm
          classe={rename}
          onClose={() => setRename(null)}
          onDone={() => {
            setRename(null)
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={!!remove}
        title="Supprimer cette classe ?"
        danger
        message={
          '« ' +
          (remove?.libelle || '') +
          ' » et tous ses chapitres et fichiers seront définitivement supprimés.'
        }
        confirmLabel="Supprimer la classe"
        onCancel={() => setRemove(null)}
        onConfirm={async () => {
          await admin.deleteClasse(remove.id)
          setRemove(null)
          reload()
        }}
      />
      {share && (
        <ShareModal classe={share} demo={demo} onClose={() => setShare(null)} />
      )}
    </>
  )
}
function ClassForm({ onClose, onCreated, defaultSubject }) {
  const [name, setName] = useState(''),
    [subject, setSubject] = useState(defaultSubject || ''),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    setError('')
    if (code.trim() && !/^[A-Za-z0-9_-]{3,100}$/.test(code.trim())) {
      setError(
        'Le code doit contenir 3 à 100 lettres non accentuées, chiffres, tirets ou traits de soulignement.',
      )
      return
    }
    setBusy(true)
    try {
      await admin.createClasse(
        name.trim(),
        code.trim() || null,
        subject.trim() || null,
      )
      onCreated()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Une nouvelle classe" busy={busy} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          Nom de la classe
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. 3e B"
            required
            maxLength={100}
          />
        </label>
        <label className="field">
          Matière
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex. Physique-Chimie"
            maxLength={100}
          />
        </label>
        <label className="field">
          Code personnalisé · facultatif
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="none"
            spellCheck={false}
          />
          <span className="field-hint">
            Laissez vide pour un code généré automatiquement. Il servira
            d’adresse permanente à la classe.
          </span>
        </label>
        <Notice>{error}</Notice>
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Création…' : 'Créer la classe'}
        </button>
      </form>
    </Modal>
  )
}
function RenameForm({ classe, onClose, onDone }) {
  const [value, setValue] = useState(classe.libelle),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  return (
    <Modal title="Renommer la classe" onClose={onClose} busy={busy}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await admin.renameClasse(classe.id, value.trim())
            onDone()
          } catch (e) {
            setError(e.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="field">
          Nom de la classe
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            maxLength={100}
          />
        </label>
        <Notice>{error}</Notice>
        <button className="btn btn-primary" disabled={busy || !value.trim()}>
          Enregistrer le nom
        </button>
      </form>
    </Modal>
  )
}
function ShareModal({ classe, demo, onClose }) {
  const ref = useRef(null),
    [info, setInfo] = useState(''),
    [error, setError] = useState('')
  const url =
    location.origin +
    location.pathname +
    (demo ? '#/demo' : '#/classe/' + encodeURIComponent(classe.slug))
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      setInfo('Copié dans le presse-papiers.')
      setError('')
    } catch {
      setError('Copie manuellement le code ou le lien ci-dessous.')
    }
  }
  function download() {
    const canvas = ref.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'qr-' + classe.slug + '.png'
    a.click()
  }
  return (
    <Modal title={'Partager · ' + classe.libelle} onClose={onClose}>
      <p className="muted">
        Les élèves scannent le QR code ou saisissent ce code sur l’accueil.
        Aucun compte n’est nécessaire.
      </p>
      <div className="qr-wrap" ref={ref}>
        <QRCodeCanvas value={url} size={220} level="M" marginSize={3} />
      </div>
      <code className="share-code">{classe.slug}</code>
      <label className="field">
        Lien élève
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
      </label>
      <Notice kind="success">{info}</Notice>
      <Notice>{error}</Notice>
      <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => copy(classe.slug)}>
          Copier le code
        </button>
        <button className="btn btn-primary" onClick={() => copy(url)}>
          Copier le lien
        </button>
        <button className="btn btn-secondary" onClick={download}>
          Télécharger le QR
        </button>
        <a
          className="btn btn-quiet"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Vue élève ↗
        </a>
      </div>
    </Modal>
  )
}
