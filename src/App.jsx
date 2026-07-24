import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase, getSession } from './api.js'
import ClasseEleve from './pages/ClasseEleve.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminClasses from './pages/AdminClasses.jsx'
import AdminChapitre from './pages/AdminChapitre.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/classe/:slug" element={<ClasseEleve />} />
      <Route path="/admin/*" element={<AdminArea />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <p className="text-4xl mb-3">📚</p>
        <h1 className="text-xl font-bold text-slate-800">Espace de cours — Physique-Chimie</h1>
        <p className="text-slate-500 mt-2 text-sm">Ouvre le lien de ta classe fourni par ton enseignante.</p>
      </div>
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
