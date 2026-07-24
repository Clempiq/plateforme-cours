import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUpWithCode, signIn } from '../api.js'
import PasswordField from '../components/PasswordField.jsx'

// Inscription enseignant sur invitation (code requis). #/inscription
export default function Inscription() {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Mot de passe trop court (8 caractères minimum).'); return }
    setBusy(true); setError(null)
    try {
      await signUpWithCode(email.trim(), password, code.trim(), { prenom: prenom.trim(), nom: nom.trim() })
      await signIn(email.trim(), password)   // connexion automatique
      navigate('/admin/classes')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-emerald-50 via-white to-cream">
      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-lg font-bold text-slate-900">Créer un compte enseignant</h1>
        <p className="text-sm text-slate-500 mt-1 mb-4">Réservé aux enseignants disposant d'un code d'invitation.</p>

        <div className="flex gap-2">
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" autoComplete="given-name"
            className="w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" autoComplete="family-name"
            className="w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
        </div>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" autoComplete="email"
          className="mt-3 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
        <PasswordField className="mt-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (8 caractères min.)" autoComplete="new-password" />
        <PasswordField className="mt-3" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le mot de passe" autoComplete="new-password" />
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code d'invitation"
          className="mt-3 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button type="submit" disabled={busy || !email || !password || !confirm || !code}
          className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
          {busy ? 'Création…' : 'Créer mon compte'}
        </button>
        <p className="text-xs text-slate-400 mt-3 text-center">
          Déjà un compte ? <Link to="/admin" className="text-emerald-700 hover:underline">Se connecter</Link>
        </p>
      </form>
    </div>
  )
}
