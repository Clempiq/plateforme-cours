// Interrupteur « Publier / Masquer » (F-18, F-20).
// Contrôlé : appelle onChange(nouvelleValeur) ; le parent gère la
// confirmation éventuelle (ex. publication d'un contrôle).
export default function VisibilityToggle({ visible, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      disabled={disabled}
      onClick={() => onChange(visible ? 0 : 1)}
      className={`inline-flex items-center gap-2 select-none ${disabled ? 'opacity-50' : ''}`}
      aria-label={visible ? 'Publié — cliquer pour masquer' : 'Masqué — cliquer pour publier'}>
      <span className={`relative w-11 h-6 rounded-full transition-colors ${visible ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${visible ? 'translate-x-5' : ''}`} />
      </span>
      <span className={`text-xs font-semibold ${visible ? 'text-emerald-700' : 'text-slate-500'}`}>
        {visible ? 'Publié' : 'Masqué'}
      </span>
    </button>
  )
}
