import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, signUpWithCode, isConfigured } from '../api.js'
import PasswordField from '../components/PasswordField.jsx'
import { Header, Footer, Notice } from '../components/UI.jsx'
export default function Inscription() {
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    matiere: '',
    code: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [created, setCreated] = useState(false)
  const navigate = useNavigate()
  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm({ ...form, [name]: e.target.value }),
  })
  async function submit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      if (!isConfigured)
        throw new Error('L’inscription n’est pas configurée sur cette version.')
      await signUpWithCode(form.email.trim(), form.password, form.code.trim(), {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        matiere: form.matiere.trim(),
      })
      setCreated(true)
      try {
        await signIn(form.email.trim(), form.password)
        navigate('/admin/classes')
      } catch {
        setError(
          'Le compte est créé, mais la connexion automatique a échoué. Connecte-toi avec ton adresse et ton mot de passe.',
        )
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Header>
        <Link className="text-link" to="/admin">
          Déjà un compte ?
        </Link>
      </Header>
      <main id="main-content" className="shell">
        <div className="auth-layout">
          <div className="panel auth-card">
            <p className="eyebrow">Sur invitation</p>
            <h1 className="serif">Votre prochain cours commence ici.</h1>
            <p className="muted">
              Créez votre espace enseignant avec le code reçu de
              l’administrateur.
            </p>
            <form className="form-stack" onSubmit={submit}>
              <div className="form-grid">
                <label className="field">
                  Prénom
                  <input
                    {...field('prenom')}
                    autoComplete="given-name"
                    required
                    maxLength={80}
                  />
                </label>
                <label className="field">
                  Nom
                  <input
                    {...field('nom')}
                    autoComplete="family-name"
                    required
                    maxLength={80}
                  />
                </label>
              </div>
              <label className="field">
                Adresse e-mail
                <input
                  type="email"
                  {...field('email')}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                Matière{' '}
                <span className="field-hint">
                  Facultatif · vous pourrez choisir la matière de chaque classe.
                </span>
                <input
                  {...field('matiere')}
                  placeholder="Ex. Physique-Chimie"
                  maxLength={100}
                />
              </label>
              <PasswordField
                {...field('password')}
                label="Mot de passe · 8 caractères minimum"
                minLength={8}
                autoComplete="new-password"
              />
              <PasswordField
                {...field('confirm')}
                label="Confirmer le mot de passe"
                minLength={8}
                autoComplete="new-password"
              />
              <label className="field">
                Code d’invitation
                <input
                  {...field('code')}
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <span className="field-hint">
                  Ce code est à usage unique. Il est différent du code de classe
                  des élèves.
                </span>
              </label>
              <Notice>{error}</Notice>
              {created ? (
                <Link className="btn btn-primary" to="/admin">
                  Aller à la connexion
                </Link>
              ) : (
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? 'Création…' : 'Créer mon espace enseignant'}
                </button>
              )}
            </form>
            <p className="local-note">
              Mot de passe oublié ?{' '}
              <Link className="text-link" to="/admin">
                Récupérez votre compte existant.
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
