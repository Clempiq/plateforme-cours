import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, resetPasswordRequest, isConfigured } from '../api.js'
import PasswordField from '../components/PasswordField.jsx'
import { Header, Footer, Notice } from '../components/UI.jsx'
export default function AdminLogin({ onLogged }) {
  const [mode, setMode] = useState('login'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState('')
  const [error, setError] = useState(''),
    [info, setInfo] = useState(''),
    [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (!isConfigured)
        throw new Error(
          'La connexion à la plateforme n’est pas configurée. La démonstration reste accessible.',
        )
      if (mode === 'forgot') {
        await resetPasswordRequest(email.trim())
        setInfo(
          'Si un compte existe pour cette adresse, tu recevras un lien de réinitialisation. Pense à vérifier les courriers indésirables.',
        )
      } else {
        await signIn(email.trim(), password)
        onLogged()
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  function switchMode() {
    setMode(mode === 'login' ? 'forgot' : 'login')
    setError('')
    setInfo('')
  }
  return (
    <>
      <Header>
        <Link className="text-link" to="/aide">
          Besoin d’aide ?
        </Link>
      </Header>
      <main id="main-content" className="shell">
        <div className="auth-layout">
          <div className="panel auth-card">
            <p className="eyebrow">Espace enseignant</p>
            <h1 className="serif">
              {mode === 'login'
                ? 'Heureux de vous retrouver.'
                : 'Retrouver votre accès.'}
            </h1>
            <p className="muted">
              {mode === 'login'
                ? 'Connectez-vous pour préparer et partager vos cours.'
                : 'Recevez un lien par e-mail pour choisir un nouveau mot de passe. Aucun code d’invitation n’est nécessaire.'}
            </p>
            <form className="form-stack" onSubmit={submit}>
              <label className="field">
                Adresse e-mail
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              {mode === 'login' && (
                <PasswordField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              )}
              <Notice>{error}</Notice>
              <Notice kind="success">{info}</Notice>
              <button className="btn btn-primary" disabled={busy}>
                {busy
                  ? 'Un instant…'
                  : mode === 'login'
                    ? 'Se connecter'
                    : 'Envoyer le lien'}
              </button>
              <div className="auth-links">
                <button
                  type="button"
                  className="text-link"
                  onClick={switchMode}
                >
                  {mode === 'login'
                    ? 'Mot de passe oublié ?'
                    : '← Retour à la connexion'}
                </button>
                {mode === 'login' && (
                  <Link className="text-link" to="/inscription">
                    Créer un compte
                  </Link>
                )}
              </div>
            </form>
          </div>
          <p className="local-note" style={{ textAlign: 'center' }}>
            Vous souhaitez découvrir l’outil ?{' '}
            <Link className="text-link" to="/demo/enseignant">
              Essayer la démonstration
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
