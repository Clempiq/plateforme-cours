import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClassePublic } from '../api.js'
import DocumentCard from '../components/DocumentCard.jsx'
import { SITE } from '../config.js'
import { TYPES } from '../lib.js'

// Vue ÉLÈVE — bandeau classe/matière, menu grands titres + chapitres, contenu à droite.
export default function ClasseEleve() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())

  useEffect(() => {
    let alive = true
    getClassePublic(slug)
      .then((d) => {
        if (!alive) return
        setData(d)
        const firstDom = d.domaines?.find((dm) => dm.chapitres?.length)
        setActiveId(firstDom?.chapitres?.[0]?.id ?? null)
        setExpanded(new Set(firstDom ? [firstDom.id] : []))  // premier grand titre déplié
      })
      .catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [slug])

  const toggleDomaine = (dmId) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(dmId) ? n.delete(dmId) : n.add(dmId); return n })

  const domaines = data?.domaines || []
  const allChapitres = useMemo(
    () => domaines.flatMap((dm) => (dm.chapitres || []).map((ch) => ({ ...ch, _domaine: dm.libelle }))),
    [domaines]
  )
  const active = allChapitres.find((c) => c.id === activeId) || allChapitres[0]

  const searchResults = useMemo(() => {
    if (!q.trim()) return null
    const needle = q.toLowerCase()
    const out = []
    for (const ch of allChapitres)
      for (const d of ch.documents || [])
        if (d.libelle.toLowerCase().includes(needle)) out.push({ ...d, _chap: ch.libelle })
    return out
  }, [q, allChapitres])

  if (error) {
    return (
      <Shell classe="" matiere={SITE.matiere}>
        <div className="text-center py-20 px-4">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-600">Cette classe est introuvable.</p>
          <p className="text-sm text-slate-400 mt-1">Vérifie le code transmis par ton professeur.</p>
        </div>
      </Shell>
    )
  }
  if (!data) return <Shell classe="" matiere={SITE.matiere}><p className="text-center text-slate-400 py-20">Chargement…</p></Shell>

  const hasContent = allChapitres.length > 0

  return (
    <Shell classe={data.classe.libelle} matiere={data.classe.matiere || SITE.matiere}>
      <div className="px-4 pt-4 max-w-5xl mx-auto w-full">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un document…"
          aria-label="Rechercher un document"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      {!hasContent ? (
        <p className="text-center text-slate-400 py-16">Aucun document pour le moment.</p>
      ) : searchResults ? (
        <div className="max-w-5xl mx-auto w-full px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">
            {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
          </h2>
          {searchResults.length === 0 && <p className="text-slate-400 text-sm">Aucun document ne correspond.</p>}
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 px-4">
            {searchResults.map((doc) => (
              <div key={doc.id}>
                <p className="text-[11px] text-slate-400 pt-2">{doc._chap}</p>
                <DocumentCard doc={doc} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full px-4 py-4 md:flex md:gap-6">
          {/* Menu : grands titres + chapitres (desktop) / liste déroulante (mobile) */}
          <nav className="md:w-72 md:shrink-0 mb-4 md:mb-0">
            {/* Mobile : sélecteur groupé */}
            <select
              className="md:hidden w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
              value={active?.id ?? ''}
              onChange={(e) => setActiveId(Number(e.target.value))}
              aria-label="Choisir un chapitre">
              {domaines.map((dm) => (
                <optgroup key={dm.id} label={dm.libelle}>
                  {(dm.chapitres || []).map((ch) => <option key={ch.id} value={ch.id}>{ch.libelle}</option>)}
                </optgroup>
              ))}
            </select>

            {/* Desktop : accordéon grands titres → chapitres */}
            <div className="hidden md:block space-y-2">
              {domaines.map((dm) => {
                const open = expanded.has(dm.id)
                return (
                  <div key={dm.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleDomaine(dm.id)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50">
                      <span className="text-sm font-bold text-slate-700 truncate">{dm.libelle}</span>
                      <svg className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {open && (
                      <div className="px-2 pb-2 flex flex-col gap-1">
                        {(dm.chapitres || []).map((ch) => {
                          const isActive = ch.id === active?.id
                          const n = (ch.documents || []).length
                          return (
                            <button
                              key={ch.id}
                              onClick={() => setActiveId(ch.id)}
                              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2
                                ${isActive ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                              <span className="truncate">{ch.libelle}</span>
                              <span className={`text-xs ${isActive ? 'text-emerald-200' : 'text-slate-400'}`}>{n}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </nav>

          <section className="flex-1 min-w-0">
            {active && <ChapitreContenu chapitre={active} />}
          </section>
        </div>
      )}
    </Shell>
  )
}

function ChapitreContenu({ chapitre }) {
  const docs = chapitre.documents || []
  const groupes = Object.keys(TYPES)
    .sort((a, b) => TYPES[a].order - TYPES[b].order)
    .map((type) => ({ type, items: docs.filter((d) => d.type === type) }))
    .filter((g) => g.items.length > 0)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">{chapitre._domaine}</p>
      <h2 className="text-lg font-bold text-slate-800 mb-1">{chapitre.libelle}</h2>
      {chapitre.description && <p className="text-sm text-slate-500 mb-3">{chapitre.description}</p>}
      {docs.length === 0 && (
        <p className="text-sm text-slate-400 bg-white rounded-2xl border border-slate-200 p-6 text-center mt-3">
          Aucun document disponible dans ce chapitre pour l'instant.
        </p>
      )}
      <div className="space-y-4 mt-3">
        {groupes.map((g) => (
          <div key={g.type} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-cream/60">
              <span className={`w-2 h-2 rounded-full ${TYPES[g.type].dot}`} />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{TYPES[g.type].label}</span>
            </div>
            <div className="px-4 divide-y divide-slate-100">
              {g.items.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Shell({ classe, matiere, children }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-bold text-slate-800 truncate">{classe || 'Classe'}</h1>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-500 shrink-0">{matiere}</p>
        </div>
      </header>
      <main className="flex-1 w-full">{children}</main>
      <footer className="py-6 text-center text-xs text-slate-400">
        Documents mis à disposition par ton professeur.
      </footer>
    </div>
  )
}
