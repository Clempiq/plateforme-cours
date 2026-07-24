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
// Envoie un e-mail de réinitialisation de mot de passe.
export async function resetPasswordRequest(email) {
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error(error.message)
}
// Définit un nouveau mot de passe (après clic sur le lien de réinitialisation).
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}
// Inscription enseignante gardée par un code d'invitation (Edge Function).
export async function signUpWithCode(email, password, code, extra = {}) {
  const res = await fetch(`${url}/functions/v1/inscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ email, password, code, ...extra }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.error) || 'Inscription impossible.')
  return data
}
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}
// Profil de l'enseignant connecté (nom, prénom, matière) depuis ses métadonnées.
export async function getProfile() {
  const { data } = await supabase.auth.getSession()
  const u = data.session?.user
  const m = u?.user_metadata || {}
  return { email: u?.email || '', prenom: m.prenom || '', nom: m.nom || '', matiere: m.matiere || '' }
}

/* ---------- Admin (protégé par RLS : nécessite une session) ---------- */
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}

async function objetClesForClasse(classe_id) {
  const { data } = await supabase.rpc('objet_cles_classe', { p_classe_id: classe_id })
  return data || []
}
async function objetClesForDomaine(domaine_id) {
  const { data } = await supabase.rpc('objet_cles_domaine', { p_domaine_id: domaine_id })
  return data || []
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
  async createClasse(libelle, customSlug = null, matiere = null) {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) throw new Error('Session expirée. Reconnecte-toi et réessaie.')
    const base = { libelle, owner_id: uid, matiere: matiere || null }

    if (customSlug) {
      const { data, error } = await supabase.from('classes')
        .insert({ ...base, slug: customSlug }).select().single()
      if (error) {
        if (error.code === '23505') throw new Error('Ce code est déjà utilisé par une autre classe.')
        throw new Error(error.message)
      }
      return data
    }
    for (let i = 0; i < 5; i++) {
      const slug = randomSlug(libelle)
      const { data, error } = await supabase.from('classes')
        .insert({ ...base, slug }).select().single()
      if (!error) return data
      if (error.code !== '23505') throw new Error(error.message) // 23505 = slug déjà pris, on réessaie
    }
    throw new Error('Impossible de générer un code unique, réessaie.')
  },
  async renameClasse(id, libelle) {
    const { error } = await supabase.from('classes').update({ libelle }).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async updateSlug(id, slug) {
    const { error } = await supabase.from('classes').update({ slug }).eq('id', id)
    if (error) {
      if (error.code === '23505') throw new Error('Ce code est déjà utilisé par une autre classe.')
      throw new Error(error.message)
    }
  },
  async deleteClasse(id) {
    await removeFiles(await objetClesForClasse(id))
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // Grands titres (domaines)
  async createDomaine(classe_id, libelle, description = null) {
    const { data: last } = await supabase.from('domaines')
      .select('ordre').eq('classe_id', classe_id).order('ordre', { ascending: false }).limit(1)
    const ordre = (last && last[0] ? last[0].ordre : 0) + 1
    const { data, error } = await supabase.from('domaines')
      .insert({ classe_id, libelle, description, ordre }).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  },
  async updateDomaine(id, fields) {
    const { error } = await supabase.from('domaines').update(fields).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async deleteDomaine(id) {
    await removeFiles(await objetClesForDomaine(id))
    const { error } = await supabase.from('domaines').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // Chapitres (rattachés à un grand titre)
  async createChapitre(domaine_id, libelle, description = null) {
    const { data: last } = await supabase.from('chapitres')
      .select('ordre').eq('domaine_id', domaine_id).order('ordre', { ascending: false }).limit(1)
    const ordre = (last && last[0] ? last[0].ordre : 0) + 1
    const { data, error } = await supabase.from('chapitres')
      .insert({ domaine_id, libelle, description, ordre }).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  },
  async updateChapitre(id, fields) {
    const { error } = await supabase.from('chapitres').update(fields).eq('id', id)
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

  // Rangé dans un dossier au nom du propriétaire (cloisonnement multi-enseignants) :
  // "<uid>/<aléatoire>.ext". Le nom reste imprévisible (Règle 3).
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) throw new Error('Session expirée. Reconnecte-toi.')
  const key = `${uid}/${randomKey(ext)}`
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
