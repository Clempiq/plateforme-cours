import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClassePublic } from '../api.js'
import ChapitreAccordion from '../components/ChapitreAccordion.jsx'

// Vue ÉLÈVE — mobile first. URL : #/classe/:slug
export default function ClasseEleve() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    getClassePublic(slug)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [slug])

  if (error) {
    return (
      <Shell>
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-600">Cette classe est introuvable.</p>
          <p className="text-sm text-slate-400 mt-1">Vérifie le lien fourni par ton enseignante.</p>
        </div>
      </Shell>
    )
  }

  if (!data) {
    return <Shell><p className="text-center text-slate-400 py-16">Chargement…</p></Shell>
  }

  // Recherche par nom dans la classe courante (F-28) — filtrage local, tout est déjà visible.
  const chapitres = (data.chapitres || []).map((ch) => {
    if (!q.trim()) return ch
    const needle = q.toLowerCase()
    return { ...ch, documents: (ch.documents || []).filter((d) => d.libelle.toLowerCase().includes(needle)) }
  }).filter((ch) => !q.trim() || (ch.documents && ch.documents.length > 0))

  return (
    <Shell title={data.classe.libelle}>
      <div className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un document…"
          aria-label="Rechercher un document"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      <div className="space-y-3">
        {chapitres.length === 0 && (
          <p className="text-center text-slate-400 py-10">Aucun document pour le moment.</p>
        )}
        {chapitres.map((ch, i) => (
          <ChapitreAccordion key={ch.id} chapitre={ch} defaultOpen={i === 0 && !!q.trim()} />
        ))}
      </div>
    </Shell>
  )
}

function Shell({ title, children }) {
  return (
    <div className="min-h-screen">
      <header className="bg-indigo-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <p className="text-xs uppercase tracking-wide text-indigo-200">Physique-Chimie</p>
          <h1 className="text-xl font-bold">{title || 'Espace de la classe'}</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5">{children}</main>
      <footer className="max-w-2xl mx-auto px-4 py-8 text-center text-xs text-slate-400">
        Documents mis à disposition par ton enseignante.
      </footer>
    </div>
  )
}
