import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Espace de cours — accueil">
      <span className="brand-icon">
        <Icon name="book" size={23} />
      </span>
      <span>
        Espace de cours
        <span className="brand-subtitle">LE SAVOIR, À PORTÉE DE MAIN</span>
      </span>
    </Link>
  )
}
export function Header({ children }) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav aria-label="Navigation principale" className="header-actions">
          {children}
        </nav>
      </div>
    </header>
  )
}
export function EmptyState({ icon = 'book', title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h2>{title}</h2>
      <div className="muted">{children}</div>
      {action}
    </div>
  )
}
export function Notice({ children, kind = 'error' }) {
  if (!children) return null
  return (
    <div
      className={`notice notice-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}
export function Loading({ children = 'Chargement de votre espace…' }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {children}
    </div>
  )
}
export function Footer() {
  return (
    <footer className="site-footer shell">
      <span>Un espace pour apprendre, à son rythme.</span>
      <Link to="/aide">Besoin d’aide ?</Link>
    </footer>
  )
}
