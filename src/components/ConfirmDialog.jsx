import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { Notice } from './UI.jsx'
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  danger,
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    if (open) setError('')
  }, [open])
  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      title={title}
      busy={busy}
      onClose={() => {
        setError('')
        onCancel()
      }}
    >
      <p className="muted">{message}</p>
      <Notice>{error}</Notice>
      <div className="modal-actions">
        <button
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Annuler
        </button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={confirm}
          disabled={busy}
        >
          {busy ? 'En cours…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
