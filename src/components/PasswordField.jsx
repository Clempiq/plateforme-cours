import { useState } from 'react'

// Champ mot de passe avec bouton « afficher / masquer » (œil).
export default function PasswordField({ value, onChange, placeholder, autoComplete, className = '' }) {
  const [show, setShow] = useState(false)
  return (
    <div className={`relative ${className}`}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-base px-1 leading-none">
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
