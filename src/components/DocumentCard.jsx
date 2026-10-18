import { useState } from 'react'
import { openDocument } from '../api.js'
import { formatSize, formatDate, isPdf, isImage, TYPES } from '../lib.js'
import Icon from './Icon.jsx'
export default function DocumentCard({
  doc,
  mark = {},
  onMark,
  showChapter = false,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function open(download) {
    setBusy(true)
    setError('')
    try {
      await openDocument(doc, download)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className="document-row">
      <span className="document-icon">
        <Icon name="file" size={23} />
      </span>
      <div className="document-main">
        <span
          className={
            'badge ' +
            (doc.type === 'controle'
              ? 'badge-amber'
              : doc.type === 'correction'
                ? 'badge-purple'
                : '')
          }
        >
          {TYPES[doc.type]?.label || 'Document'}
        </span>
        <h3>{doc.libelle}</h3>
        <p className="document-meta">
          {showChapter && <>{doc.chapitre} · </>}
          {formatSize(doc.taille)}
          {doc.depose_le && <> · ajouté le {formatDate(doc.depose_le)}</>}
        </p>
        <div className="document-actions">
          {(isPdf(doc.mime) ||
            isImage(doc.mime) ||
            doc.mime === 'video/mp4') && (
            <button
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => open(false)}
              aria-label={'Ouvrir ' + doc.libelle}
            >
              <Icon name="eye" size={15} />
              Ouvrir
            </button>
          )}
          <button
            className="btn btn-quiet btn-sm"
            disabled={busy}
            onClick={() => open(true)}
            aria-label={'Télécharger ' + doc.libelle}
          >
            <Icon name="download" size={15} />
            {busy ? 'Ouverture…' : 'Télécharger'}
          </button>
        </div>
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
      </div>
      {onMark && (
        <div className="document-flags">
          <button
            className={'icon-button ' + (mark.saved ? 'selected' : '')}
            title="À revoir"
            aria-label={'À revoir : ' + doc.libelle}
            aria-pressed={Boolean(mark.saved)}
            onClick={() => onMark('saved')}
          >
            <Icon name="star" size={18} />
          </button>
          <button
            className={'icon-button ' + (mark.read ? 'selected read' : '')}
            title="Lu"
            aria-label={'Lu : ' + doc.libelle}
            aria-pressed={Boolean(mark.read)}
            onClick={() => onMark('read')}
          >
            <Icon name="check" size={18} />
          </button>
        </div>
      )}
    </article>
  )
}
