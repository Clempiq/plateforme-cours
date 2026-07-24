import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, resetPasswordRequest } from '../api.js'
import PasswordField from '../components/PasswordField.jsx'

// Écran de connexion enseignant (Supabase Auth). #/admin
export default function AdminLogin({ onLogged }) {
  const [mode, setMode] = useState('login') // login | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function login(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try { await signIn(email, password); onLogged() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  async function forgot(e) {
    e.preventDefault()
    setBusy(true); setError(null); setInfo(null)
    try {
      await resetPasswordRequest(email.trim())
      setInfo("Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.")
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {mode === 'login' ? (
        <form onSubmit={login} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full max-w-sm">
          <h1 className="text-lg font-bold text-slate-900">Espace enseignant</h1>
          <p className="text-sm text-slate-500 mt-1 mb-4">Connexion protégée.</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" autoFocus autoComplete="username"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          <PasswordField className="mt-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" autoComplete="current-password" />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <button type="submit" disabled={busy || !email || !password}
            className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
          <div className="mt-3 flex items-center justify-between text-xs">
            <button type="button" onClick={() => { setMode('forgot'); setError(null); setInfo(null) }} className="text-slate-500 hover:text-slate-800">
              Mot de passe oublié ?
            </button>
            <Link to="/inscription" className="text-emerald-700 hover:underline">Créer un compte</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={forgot} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full max-w-sm">
          <h1 className="text-lg font-bold text-slate-900">Mot de passe oublié</h1>
          <p className="text-sm text-slate-500 mt-1 mb-4">Saisis ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" autoFocus autoComplete="username"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          {info && <p className="text-sm text-emerald-700 mt-2">{info}</p>}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <button type="submit" disabled={busy || !email}
            className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {busy ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          <button type="button" onClick={() => { setMode('login'); setError(null); setInfo(null) }} className="mt-3 w-full text-xs text-slate-500 hover:text-slate-800">
            ← Retour à la connexion
          </button>
        </form>
      )}
    </div>
  )
}
