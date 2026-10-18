// Petits utilitaires d'affichage partagés.

export function formatSize(octets) {
  if (!octets && octets !== 0) return ''
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  if (isNaN(d)) return iso
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Métadonnées par type de document (libellé, couleur, ordre d'affichage).
export const TYPES = {
  cours: {
    label: 'Cours',
    cls: 'bg-teal-100 text-teal-800 border-teal-200',
    dot: 'bg-teal-600',
    order: 0,
  },
  controle: {
    label: 'Contrôle',
    cls: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-600',
    order: 1,
  },
  correction: {
    label: 'Correction',
    cls: 'bg-violet-100 text-violet-800 border-violet-200',
    dot: 'bg-violet-600',
    order: 2,
  },
}

export function isPdf(mime) {
  return mime === 'application/pdf'
}
export function isImage(mime) {
  return typeof mime === 'string' && mime.startsWith('image/')
}
