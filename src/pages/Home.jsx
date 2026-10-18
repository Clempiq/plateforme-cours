import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header, Footer, Notice } from '../components/UI.jsx'
import Icon from '../components/Icon.jsx'
import { SITE } from '../config.js'
import { parseClassCode } from '../catalog.js'
import { useLocalState } from '../preferences.js'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState(''),
    [error, setError] = useState('')
  const [recent, setRecent] = useLocalState('classes', [])
  const classes = Array.isArray(recent) ? recent : []
  function join(e) {
    e.preventDefault()
    const slug = parseClassCode(code)
    if (!slug) {
      setError(
        'Saisis le code de ta classe ou colle le lien transmis par ton professeur.',
      )
      return
    }
    navigate('/classe/' + encodeURIComponent(slug))
  }
  return (
    <>
      <Header>
        <Link className="hide-mobile" to="/aide">
          Comment ça marche
        </Link>
        <Link className="btn btn-secondary" to="/admin">
          <Icon name="lock" size={15} /> Espace enseignant
        </Link>
      </Header>
      <main id="main-content" className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              {SITE.matiere} · du cours à la compréhension
            </p>
            <h1 className="serif">
              Tout pour apprendre.
              <br />
              <em>À ton rythme.</em>
            </h1>
            <p className="hero-copy">
              Tes cours, tes contrôles et leurs corrections, réunis au même
              endroit. Retrouve les documents de ta classe et prépare ta
              prochaine séance.
            </p>
            <form className="join-form" onSubmit={join}>
              <label htmlFor="class-code">
                Le code ou le lien de ta classe
              </label>
              <div className="join-input">
                <input
                  id="class-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError('')
                  }}
                  placeholder="Ex. 3eB-physique"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
                <button className="btn btn-primary">
                  Rejoindre <Icon name="arrow" size={17} />
                </button>
              </div>
              <Notice>{error}</Notice>
              <p className="join-note">
                <Icon name="check" size={14} /> Pas de compte élève. Juste le
                code donné par ton professeur.
              </p>
            </form>
          </div>
          <div className="hero-visual">
            <div className="preview-label">
              <span>UN APERÇU DE TON ESPACE</span>
              <span>01 / 03</span>
            </div>
            <div className="preview-card">
              <span className="badge">Classe de démonstration</span>
              <h2 className="serif">La physique, pas à pas.</h2>
              <p className="muted small" style={{ marginBottom: 12 }}>
                Chapitre 1 · Les circuits électriques
              </p>
              {[
                [
                  'book',
                  'Comprendre le circuit électrique',
                  'Les notions essentielles',
                  'Cours',
                ],
                [
                  'file',
                  'Vérifier ses connaissances',
                  'Un contrôle publié par le professeur',
                  'Contrôle',
                ],
                [
                  'check',
                  'Comprendre ses erreurs',
                  'La correction, quand elle est publiée',
                  'Correction',
                ],
              ].map(([icon, title, sub, badge]) => (
                <div className="preview-row" key={title}>
                  <span>
                    <Icon name={icon} size={19} />
                  </span>
                  <div>
                    {title}
                    <small>{sub}</small>
                  </div>
                  <span className="badge hide-mobile">{badge}</span>
                </div>
              ))}
            </div>
            <div className="preview-bottom">
              <Icon name="book" />
              <span>
                Un chapitre, des repères.
                <br />
                Tu retrouves facilement ce dont tu as besoin.
              </span>
            </div>
            <Link
              className="text-link"
              style={{ display: 'inline-block', marginTop: 18 }}
              to="/demo"
            >
              Explorer la démonstration →
            </Link>
          </div>
        </section>
        <section className="feature-strip" aria-label="Les essentiels">
          {[
            [
              'grid',
              'Tout est bien rangé',
              'Des chapitres clairs, des cours et des corrections faciles à retrouver.',
            ],
            [
              'search',
              'Le bon document, tout de suite',
              'Recherche par titre ou chapitre, et filtre par type de support.',
            ],
            [
              'star',
              'Des repères pour réviser',
              'Garde les documents à revoir et note ceux que tu as lus, sur cet appareil.',
            ],
          ].map(([icon, title, copy]) => (
            <div className="feature-item" key={title}>
              <Icon name={icon} size={23} />
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </section>
        {classes.length > 0 && (
          <section>
            <div className="section-heading">
              <h2 className="serif">Retrouver ma classe</h2>
              <button className="text-link" onClick={() => setRecent([])}>
                Effacer les raccourcis
              </button>
            </div>
            <div className="recent-grid">
              {classes.map((c) => (
                <Link
                  className="panel recent-card"
                  to={'/classe/' + encodeURIComponent(c.slug)}
                  key={c.slug}
                >
                  <div>
                    <h3>{c.libelle}</h3>
                    <p className="muted small">{c.matiere || SITE.matiere}</p>
                  </div>
                  <Icon name="arrow" />
                </Link>
              ))}
            </div>
            <p className="local-note">
              Ces raccourcis sont enregistrés uniquement dans ce navigateur.
            </p>
          </section>
        )}
        <section className="teacher-invite">
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Côté enseignant
            </p>
            <h2 className="serif">
              Moins de liens à envoyer. Plus de temps pour enseigner.
            </h2>
            <p className="muted">
              Organisez vos supports et choisissez quand les rendre visibles à
              vos élèves.
            </p>
          </div>
          <Link to="/admin" className="btn btn-primary">
            Gérer mes classes <Icon name="arrow" size={17} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  )
}
