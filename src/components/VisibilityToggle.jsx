import Icon from './Icon.jsx'
export default function VisibilityToggle({ visible, disabled, onChange }) {
  return (
    <button
      type="button"
      className="vis-switch"
      role="switch"
      aria-checked={visible}
      aria-label={
        visible
          ? 'Publié — masquer le document'
          : 'Masqué — publier le document'
      }
      disabled={disabled}
      onClick={() => onChange(visible ? 0 : 1)}
    >
      <span className="vis-dot" />
      <Icon name={visible ? 'eye' : 'lock'} size={13} />
      {visible ? 'Publié' : 'Masqué'}
    </button>
  )
}
