// Couche d'accès aux données — Supabase.
// La sécurité repose sur les politiques RLS de la base : la clé "publishable"
// ci-dessous est PUBLIQUE par conception (elle est livrée dans le site).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY
export const supabase = createClient(url, key)

const BUCKET = 'documents'
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'odt', 'xlsx', 'mp4']

/* ---------- Helpers ---------- */
function extOf(name) {
  const m = /\.([^.]+)$/.exec(name || '')
  return m ? m[1].toLowerCase() : ''
}
function randomKey(ext) {
  const b = crypto.getRandomValues(new Uint8Array(16))
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return ext ? `${hex}.${ext}` : hex
}
function randomSlug(libelle) {
  const base = (libelle || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'classe'
  const rnd = randomKey('').slice(0, 8)
  return `${base}-${rnd}`
}

/* ---------- Fichiers (liens signés) ---------- */
// Génère un lien signé à durée limitée. Fonctionne pour un document visible
// (politique publique) ou pour l'enseignante connectée (politique authenticated).
export async function signedUrl(objet_cle, downloadName = null) {
  const opts = downloadName ? { download: downloadName } : {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objet_cle, 3600, opts)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
// Ouvre un document : aperçu (nouvel onglet) ou téléchargement.
export async function openDocument(doc, download = false) {
  const name = download ? `${doc.libelle}.${extOf(doc.objet_cle)}` : null
  const u = await signedUrl(doc.objet_cle, name)
  window.open(u, '_blank', 'noopener')
}

/* ---------- Public (élève) ---------- */
export async function getClassePublic(slug) {
  const { data, error } = await supabase.rpc('get_classe_publique', { p_slug: slug })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Classe introuvable')
  return data
}

/* ---------- Authentification (enseignante) ---------- */
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error("Identifiants incorrects.")
}
export async function signOut() {
  await supabase.auth.signOut()
}
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/* ---------- Admin (protégé par RLS : nécessite une session) ---------- */
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}

async function objetClesForClasse(classe_id) {
  const { data } = await supabase
    .from('documents')
    .select('objet_cle, chapitre_id, chapitres!inner(classe_id)')
    .eq('chapitres.classe_id', classe_id)
  return (data || []).map((d) => d.objet_cle)
}
async function objetClesForChapitre(chapitre_id) {
  const { data } = await supabase.from('documents').select('objet_cle').eq('chapitre_id', chapitre_id)
  return (data || []).map((d) => d.objet_cle)
}
async function removeFiles(cles) {
  if (cles && cles.length) await supabase.storage.from(BUCKET).remove(cles)
}

export const admin = {
  // Tableau de bord
  listClasses: () => rpc('get_admin_overview'),
  tree: (classe_id) => rpc('get_admin_tree', { p_classe_id: classe_id }),

  // Classes
  async createClasse(libelle) {
    for (let i = 0; i < 5; i++) {
      const slug = randomSlug(libelle)
      const { data, error } = await supabase.from('classes').insert({ libelle, slug }).select().single()
      if (!error) return data
      if (error.code !== '23505') throw new Error(error.message) // 23505 = slug déjà pris, on réessaie
    }
    throw new Error('Impossible de générer un identifiant de classe unique.')
  },
  async renameClasse(id, libelle) {
    const { error } = await supabase.from('classes').update({ libelle }).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async deleteClasse(id) {
    await removeFiles(await objetClesForClasse(id))
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // Chapitres
  async createChapitre(classe_id, libelle) {
    const { data: last } = await supabase.from('chapitres')
      .select('ordre').eq('classe_id', classe_id).order('ordre', { ascending: false }).limit(1)
    const ordre = (last && last[0] ? last[0].ordre : 0) + 1
    const { error } = await supabase.from('chapitres').insert({ classe_id, libelle, ordre })
    if (error) throw new Error(error.message)
  },
  async renameChapitre(id, libelle) {
    const { error } = await supabase.from('chapitres').update({ libelle }).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async deleteChapitre(id) {
    await removeFiles(await objetClesForChapitre(id))
    const { error } = await supabase.from('chapitres').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // Documents
  async renameDocument(id, libelle) {
    const { error } = await supabase.from('documents').update({ libelle }).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async deleteDocument(id) {
    const { data } = await supabase.from('documents').select('objet_cle').eq('id', id).single()
    if (data) await removeFiles([data.objet_cle])
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
  // publie_le est géré automatiquement par un trigger en base (1re publication).
  async toggleDocument(id, visible) {
    const { error } = await supabase.from('documents').update({ visible: visible === 1 || visible === true }).eq('id', id)
    if (error) throw new Error(error.message)
  },
}

/* ---------- Upload ---------- */
export async function uploadDocument({ chapitre_id, type, libelle, file }) {
  const ext = extOf(file.name)
  if (!ALLOWED_EXT.includes(ext)) throw new Error('Format de fichier non autorisé.')
  if (file.size > 50 * 1024 * 1024) throw new Error('Fichier trop volumineux (max 50 Mo).')

  const key = randomKey(ext) // nom physique aléatoire (Règle 3)
  const { error: upErr } = await supabase.storage.from(BUCKET)
    .upload(key, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (upErr) throw new Error(upErr.message)

  const visible = type === 'cours' // F-17
  const { data, error } = await supabase.from('documents').insert({
    chapitre_id,
    libelle: libelle || file.name.replace(/\.[^.]+$/, ''),
    objet_cle: key,
    taille: file.size,
    mime: file.type || '',
    type,
    visible,
  }).select().single()

  if (error) {
    // Nettoyage si l'insertion échoue après l'upload
    await removeFiles([key])
    throw new Error(error.message)
  }
  return data
}
