import { useEffect, useId, useRef } from 'react'
import Icon from './Icon.jsx'
export default function Modal({
  open = true,
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}) {
  const ref = useRef(null),
    titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const previous = document.activeElement
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])
  if (!open) return null
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose()
      }}
    >
      <div className="modal-content">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
