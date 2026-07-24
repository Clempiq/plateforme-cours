import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom'
import { supabase, getSession, updatePassword } from './api.js'
import { SITE } from './config.js'
import PasswordField from './components/PasswordField.jsx'
import ClasseEleve from './pages/ClasseEleve.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminClasses from './pages/AdminClasses.jsx'
import AdminChapitre from './pages/AdminChapitre.jsx'
import Inscription from './pages/Inscription.jsx'

export default function App() {
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    // Au clic sur le lien de réinitialisation reçu par e-mail, Supabase émet
    // l'événement PASSWORD_RECOVERY : on affiche alors le formulaire.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/classe/:slug" element={<ClasseEleve />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/admin/*" element={<AdminArea />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {recovery && <ResetPasswordModal onDone={() => setRecovery(false)} />}
    </>
  )
}

function ResetPasswordModal({ onDone }) {
  const [pw, setPw] = useState('')
  const [cf, setCf] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    if (pw !== cf) { setError('Les deux mots de passe ne correspondent pas.'); return }
    if (pw.length < 8) { setError('Mot de passe trop court (8 caractères minimum).'); return }
    setBusy(true); setError(null)
    try {
      await updatePassword(pw)
      setOk(true)
      setTimeout(() => { onDone(); navigate('/admin/classes') }, 1200)
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-slate-900">Nouveau mot de passe</h3>
        {ok ? (
          <p className="text-sm text-emerald-700 mt-2">Mot de passe mis à jour. Redirection…</p>
        ) : (
          <>
            <p className="text-sm text-slate-500 mt-1 mb-3">Choisis ton nouveau mot de passe.</p>
            <PasswordField value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nouveau mot de passe (8 car. min.)" autoComplete="new-password" />
            <PasswordField className="mt-3" value={cf} onChange={(e) => setCf(e.target.value)} placeholder="Confirmer" autoComplete="new-password" />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <button type="submit" disabled={busy || !pw || !cf}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {busy ? 'Enregistrement…' : 'Valider'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function join(e) {
    e.preventDefault()
    let v = code.trim()
    if (!v) return
    // Tolère un lien complet collé (ex. https://.../#/classe/xxxx) : on extrait le code.
    const m = v.match(/classe\/([^/?#\s]+)/)
    if (m) v = m[1]
    navigate(`/classe/${encodeURIComponent(v)}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* En-tête identité */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center text-3xl">
              ⚗️
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">{SITE.matiere}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">{SITE.titre}</h1>
            {(SITE.enseignante || SITE.etablissement) && (
              <p className="mt-1 text-sm text-slate-500">
                {[SITE.enseignante, SITE.etablissement].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Carte "Rejoindre ma classe" */}
          <form onSubmit={join} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <label htmlFor="code" className="block text-sm font-semibold text-slate-700">
              Rejoindre ma classe
            </label>
            <p className="mt-1 text-xs text-slate-400">{SITE.message_eleve}</p>
            <div className="mt-3 flex gap-2">
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code de la classe"
                autoComplete="off"
                className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className="shrink-0 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
                Rejoindre →
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="py-6 text-center">
        <Link to="/admin" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">
          Espace enseignant
        </Link>
      </footer>
    </div>
  )
}

// Zone admin : suit la session Supabase et route login / dashboard.
function AdminArea() {
  const [state, setState] = useState('loading') // loading | in | out
  const navigate = useNavigate()

  useEffect(() => {
    getSession().then((s) => setState(s ? 'in' : 'out')).catch(() => setState('out'))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? 'in' : 'out')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Chargement…</div>
  }

  if (state === 'out') {
    return <AdminLogin onLogged={() => { setState('in'); navigate('/admin/classes') }} />
  }

  return (
    <Routes>
      <Route index element={<Navigate to="/admin/classes" replace />} />
      <Route path="classes" element={<AdminClasses onLogout={() => setState('out')} />} />
      <Route path="classe/:id" element={<AdminChapitre />} />
      <Route path="*" element={<Navigate to="/admin/classes" replace />} />
    </Routes>
  )
}
