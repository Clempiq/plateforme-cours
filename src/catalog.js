export const normalize = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
export function parseClassCode(input) {
  const value = String(input || '').trim(),
    match = value.match(/(?:#)?\/classe\/([^/?#\s]+)/)
  let code = match ? match[1] : value
  try {
    code = decodeURIComponent(code)
  } catch {
    return ''
  }
  return /^[A-Za-z0-9_-]{1,150}$/.test(code) ? code : ''
}
export function flattenDocuments(domaines = []) {
  return domaines.flatMap((dm) =>
    (dm.chapitres || []).flatMap((ch) =>
      (ch.documents || []).map((doc) => ({
        ...doc,
        chapitre: ch.libelle,
        chapitreId: ch.id,
        domaine: dm.libelle,
      })),
    ),
  )
}
export function filterDocuments(
  docs,
  {
    query = '',
    type = 'all',
    scope = 'all',
    marks = {},
    sort = 'chapter',
  } = {},
) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const filtered = docs.filter((d) => {
    const haystack = normalize(`${d.libelle} ${d.chapitre} ${d.domaine}`)
    return (
      words.every((w) => haystack.includes(w)) &&
      (type === 'all' || d.type === type) &&
      (scope !== 'saved' || marks[d.id]?.saved) &&
      (scope !== 'unread' || !marks[d.id]?.read)
    )
  })
  if (sort === 'name')
    filtered.sort((a, b) =>
      a.libelle.localeCompare(b.libelle, 'fr', { numeric: true }),
    )
  if (sort === 'recent')
    filtered.sort(
      (a, b) => (Date.parse(b.depose_le) || 0) - (Date.parse(a.depose_le) || 0),
    )
  return filtered
}
export const MAX_FILE_SIZE = 50 * 1024 * 1024
export const ALLOWED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'docx',
  'odt',
  'xlsx',
  'mp4',
]
export function validateFile(file) {
  if (!ALLOWED_EXTENSIONS.includes(file.name.split('.').pop().toLowerCase()))
    return `${file.name} : format non pris en charge.`
  if (!file.size) return `${file.name} : le fichier est vide.`
  if (file.size > MAX_FILE_SIZE)
    return `${file.name} : le fichier dépasse 50 Mo.`
  return ''
}
export function moveItem(items, index, direction) {
  const next = [...items],
    target = index + direction
  if (target < 0 || target >= items.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
