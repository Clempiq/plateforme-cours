import { Component, lazy, Suspense, useEffect, useState } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Link,
} from 'react-router-dom'
import { supabase, getSession, updatePassword } from './api.js'
import Home from './pages/Home.jsx'
import { Header, Footer, Loading, Notice } from './components/UI.jsx'
import Modal from './components/Modal.jsx'
import PasswordField from './components/PasswordField.jsx'
const Help = lazy(() => import('./pages/Help.jsx'))
const ClasseEleve = lazy(() => import('./pages/ClasseEleve.jsx'))
const AdminClasses = lazy(() => import('./pages/AdminClasses.jsx'))
const AdminChapitre = lazy(() => import('./pages/AdminChapitre.jsx'))
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'))
const Inscription = lazy(() => import('./pages/Inscription.jsx'))

class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <>
        <Header />
        <main className="shell" style={{ paddingBlock: 60 }}>
          <h1 className="serif" style={{ fontSize: 36 }}>
            Une erreur a interrompu l’affichage.
          </h1>
          <p className="muted" style={{ marginBlock: 20 }}>
            Rechargez la page pour retrouver votre espace. Les modifications de
            brouillon non enregistrées seront perdues.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </main>
      </>
    ) : (
      this.props.children
    )
  }
}
export default function App() {
  const [recovery, setRecovery] = useState(false)
  const location = useLocation()
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    document.title =
      (location.pathname.startsWith('/admin')
        ? 'Espace enseignant'
        : location.pathname.startsWith('/demo')
          ? 'Démonstration'
          : location.pathname === '/aide'
            ? 'Aide'
            : 'Espace de cours') + ' — Physique-Chimie'
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <ErrorBoundary>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          const main = document.getElementById('main-content')
          main?.setAttribute('tabindex', '-1')
          main?.focus()
        }}
      >
        Aller au contenu
      </a>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aide" element={<Help />} />
          <Route path="/classe/:slug" element={<ClasseEleve />} />
          <Route path="/demo" element={<ClasseEleve demo />} />
          <Route path="/demo/enseignant" element={<AdminClasses demo />} />
          <Route
            path="/demo/enseignant/classe"
            element={<AdminChapitre demo />}
          />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/admin/*" element={<AdminArea />} />
          <Route
            path="*"
            element={
              <>
                <Header />
                <main
                  id="main-content"
                  className="shell"
                  style={{ paddingBlock: 60 }}
                >
                  <h1 className="serif" style={{ fontSize: 40 }}>
                    Cette page n’existe pas.
                  </h1>
                  <Link
                    className="btn btn-primary"
                    style={{ marginTop: 24 }}
                    to="/"
                  >
                    Revenir à l’accueil
                  </Link>
                </main>
                <Footer />
              </>
            }
          />
        </Routes>
      </Suspense>
      {recovery && <ResetPassword onDone={() => setRecovery(false)} />}
    </ErrorBoundary>
  )
}
function AdminArea() {
  const [state, setState] = useState('loading')
  const navigate = useNavigate()
  useEffect(() => {
    let alive = true
    getSession()
      .then((s) => alive && setState(s ? 'in' : 'out'))
      .catch(() => alive && setState('out'))
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      if (alive) setState(session ? 'in' : 'out')
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])
  if (state === 'loading') return <Loading />
  if (state === 'out')
    return (
      <AdminLogin
        onLogged={() => {
          setState('in')
          navigate('/admin/classes')
        }}
      />
    )
  return (
    <Routes>
      <Route index element={<Navigate to="/admin/classes" replace />} />
      <Route
        path="classes"
        element={<AdminClasses onLogout={() => setState('out')} />}
      />
      <Route path="classe/:id" element={<AdminChapitre />} />
      <Route path="*" element={<Navigate to="/admin/classes" replace />} />
    </Routes>
  )
}
function ResetPassword({ onDone }) {
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const navigate = useNavigate()
  async function submit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await updatePassword(password)
      onDone()
      navigate('/admin/classes')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Choisir un nouveau mot de passe" busy={busy} onClose={onDone}>
      <form className="form-stack" onSubmit={submit}>
        <p className="muted">
          Choisissez un mot de passe d’au moins 8 caractères pour retrouver
          votre espace.
        </p>
        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirmer le mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          autoComplete="new-password"
        />
        <Notice>{error}</Notice>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}
        </button>
      </form>
    </Modal>
  )
}
