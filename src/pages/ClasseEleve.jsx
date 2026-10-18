import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getClassePublic, isConfigured } from '../api.js'
import { getDemoData } from '../demo.js'
import { filterDocuments, flattenDocuments } from '../catalog.js'
import { rememberClass, useLocalState } from '../preferences.js'
import {
  Header,
  Footer,
  EmptyState,
  Loading,
  Notice,
} from '../components/UI.jsx'
import Icon from '../components/Icon.jsx'
import DocumentCard from '../components/DocumentCard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { SITE } from '../config.js'

export default function ClasseEleve({ demo = false }) {
  const { slug } = useParams()
  return <StudentClass key={demo ? 'demo' : slug} slug={slug} demo={demo} />
}
function StudentClass({ slug, demo }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0)
  const [query, setQuery] = useState(''),
    [type, setType] = useState('all'),
    [scope, setScope] = useState('all'),
    [chapter, setChapter] = useState('all'),
    [sort, setSort] = useState('chapter')
  const [rawMarks, setMarks, stored] = useLocalState(
    'marks:' + (demo ? 'demo' : slug),
    {},
  )
  const marks =
    rawMarks && typeof rawMarks === 'object' && !Array.isArray(rawMarks)
      ? rawMarks
      : {}
  const [notice, setNotice] = useState(''),
    [clear, setClear] = useState(false)
  useEffect(() => {
    let alive = true
    setError('')
    setData(null)
    const request = demo
      ? Promise.resolve(getDemoData())
      : isConfigured
        ? getClassePublic(slug)
        : Promise.reject(
            new Error('La connexion à la plateforme n’est pas configurée.'),
          )
    request
      .then((d) => {
        if (alive) setData(d)
      })
      .catch((e) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
    }
  }, [slug, demo, reload])
  const domaines = data?.domaines || [],
    chapters = domaines.flatMap((d) =>
      (d.chapitres || []).map((c) => ({ ...c, domaine: d.libelle })),
    )
  // Demo uses the same explicit publication rule. Production filtering happens in Supabase.
  const docs = flattenDocuments(domaines).filter((d) => !demo || d.visible)
  const selected = chapters.find((c) => String(c.id) === chapter)
  const source =
    chapter === 'all'
      ? docs
      : docs.filter((d) => String(d.chapitreId) === chapter)
  const results = filterDocuments(source, { query, type, scope, marks, sort })
  const read = docs.filter((d) => marks[d.id]?.read).length
  function resetFilters() {
    setQuery('')
    setType('all')
    setScope('all')
    setChapter('all')
    setSort('chapter')
  }
  function mark(id, field) {
    setMarks({ ...marks, [id]: { ...marks[id], [field]: !marks[id]?.[field] } })
  }
  return (
    <>
      {demo && (
        <div className="demo-banner">
          Démonstration · classe fictive, sans compte.
          <Link to="/demo/enseignant">Essayer l’espace enseignant →</Link>
        </div>
      )}
      <Header>
        <Link className="text-link" to="/">
          Changer de classe
        </Link>
      </Header>
      {data && (
        <section className="class-heading">
          <div className="shell">
            <div>
              <p className="eyebrow">{data.classe.matiere || SITE.matiere}</p>
              <h1 className="serif">{data.classe.libelle}</h1>
              <p className="muted">
                {chapters.length} chapitres · {docs.length} documents
                disponibles
              </p>
            </div>
            {!demo && (
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setNotice(
                    rememberClass(data.classe)
                      ? 'Classe ajoutée aux raccourcis de l’accueil, sur cet appareil.'
                      : 'Le navigateur ne permet pas d’enregistrer ce raccourci.',
                  )
                }
              >
                <Icon name="plus" size={16} />
                Retenir ma classe
              </button>
            )}
          </div>
        </section>
      )}
      <main id="main-content" className="shell">
        {error ? (
          <EmptyState icon="search" title="La classe n’a pas pu s’ouvrir">
            <p>
              {error === 'Classe introuvable'
                ? 'Vérifie le code transmis par ton professeur.'
                : error}
            </p>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 16 }}
              onClick={() => setReload((v) => v + 1)}
            >
              Réessayer
            </button>
          </EmptyState>
        ) : !data ? (
          <Loading />
        ) : (
          <>
            <Notice kind="success">{notice}</Notice>
            <div className="class-layout">
              <aside className="class-sidebar" aria-label="Chapitres">
                <p className="sidebar-label">MA CLASSE</p>
                <button
                  className={
                    'sidebar-button ' + (chapter === 'all' ? 'active' : '')
                  }
                  onClick={() => setChapter('all')}
                >
                  <Icon name="grid" size={16} />
                  Tous les documents<span className="count">{docs.length}</span>
                </button>
                {domaines.map((dm) => (
                  <details className="chapter-group" open key={dm.id}>
                    <summary>{dm.libelle}</summary>
                    {(dm.chapitres || []).map((ch) => (
                      <button
                        className={
                          'sidebar-button ' +
                          (chapter === String(ch.id) ? 'active' : '')
                        }
                        key={ch.id}
                        aria-current={
                          chapter === String(ch.id) ? 'page' : undefined
                        }
                        onClick={() => setChapter(String(ch.id))}
                      >
                        {ch.libelle}
                        <span className="count">
                          {docs.filter((d) => d.chapitreId === ch.id).length}
                        </span>
                      </button>
                    ))}
                  </details>
                ))}
                <p className="sidebar-label">MES REPÈRES</p>
                <p className="small muted">
                  {read} document{read > 1 ? 's' : ''} marqué
                  {read > 1 ? 's' : ''} comme lu{read > 1 ? 's' : ''}
                </p>
                <div className="progress-track">
                  <span
                    style={{
                      width:
                        (docs.length ? (100 * read) / docs.length : 0) + '%',
                    }}
                  />
                </div>
                <p className="local-note">
                  Tes repères restent sur cet appareil. Ils ne sont pas transmis
                  à ton professeur.
                </p>
                <button className="text-link" onClick={() => setClear(true)}>
                  Effacer mes repères
                </button>
              </aside>
              <section className="student-main" aria-label="Documents">
                <div className="mobile-chapters">
                  <label className="field">
                    Chapitre
                    <select
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                    >
                      <option value="all">Tous les documents</option>
                      {domaines.map((dm) => (
                        <optgroup key={dm.id} label={dm.libelle}>
                          {(dm.chapitres || []).map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              {ch.libelle}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="eyebrow">
                  {selected?.domaine || 'Les ressources de ta classe'}
                </p>
                <h2 className="serif">
                  {selected?.libelle || 'À chaque étape, le bon support.'}
                </h2>
                {selected?.description && (
                  <p className="muted description" style={{ marginBottom: 22 }}>
                    {selected.description}
                  </p>
                )}
                <div className="toolbar">
                  <label className="search-field">
                    <span className="sr-only">
                      Rechercher dans les documents et chapitres
                    </span>
                    <Icon name="search" />
                    <input
                      className="input"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Un document, un chapitre, une notion…"
                    />
                  </label>
                </div>
                <div className="chips" aria-label="Type de document">
                  {[
                    ['all', 'Tous'],
                    ['cours', 'Cours'],
                    ['controle', 'Contrôles'],
                    ['correction', 'Corrections'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className="chip"
                      aria-pressed={type === id}
                      onClick={() => setType(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div
                  className="toolbar"
                  style={{ marginTop: 16, marginBottom: 0 }}
                >
                  <label className="sr-only" htmlFor="scope">
                    Mes repères
                  </label>
                  <select
                    id="scope"
                    className="input"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option value="all">Tous mes documents</option>
                    <option value="saved">★ À revoir</option>
                    <option value="unread">Pas encore lus</option>
                  </select>
                  <label className="sr-only" htmlFor="sort">
                    Trier les documents
                  </label>
                  <select
                    id="sort"
                    className="input"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="chapter">Ordre des chapitres</option>
                    <option value="recent">Ajouts récents</option>
                    <option value="name">Ordre alphabétique</option>
                  </select>
                </div>
                <p className="result-count" role="status">
                  {results.length} document{results.length > 1 ? 's' : ''}
                  {query ? ' correspondant à ta recherche' : ''}
                </p>
                {results.length ? (
                  <div className="document-list">
                    {results.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        mark={marks[doc.id]}
                        onMark={(field) => mark(doc.id, field)}
                        showChapter={chapter === 'all'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="panel">
                    <EmptyState
                      icon="search"
                      title={
                        docs.length
                          ? 'Aucun document dans cette sélection'
                          : 'Les cours arrivent bientôt'
                      }
                      action={
                        docs.length ? (
                          <button
                            className="btn btn-secondary"
                            onClick={resetFilters}
                          >
                            Réinitialiser les filtres
                          </button>
                        ) : null
                      }
                    >
                      {docs.length
                        ? 'Essaie un autre mot, un autre chapitre ou un autre filtre.'
                        : 'Ton professeur retrouvera ici les documents qu’il choisit de publier.'}
                    </EmptyState>
                  </div>
                )}
                <p className="local-note">
                  ★ À revoir · ✓ Lu — tes repères personnels, sur ce navigateur
                  uniquement.{' '}
                  <button className="text-link" onClick={() => setClear(true)}>
                    Effacer
                  </button>
                </p>
                {!stored && (
                  <Notice kind="warning">
                    Le navigateur bloque l’enregistrement : tes repères seront
                    perdus en quittant cette page.
                  </Notice>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      <Footer />
      <ConfirmDialog
        open={clear}
        title="Effacer tes repères ?"
        message="Les marques « Lu » et « À revoir » de cette classe seront effacées sur cet appareil."
        confirmLabel="Effacer les repères"
        onCancel={() => setClear(false)}
        onConfirm={() => {
          setMarks({})
          setClear(false)
        }}
      />
    </>
  )
}
