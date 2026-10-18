// Couche d'accès aux données — Supabase.
// La sécurité repose sur les politiques RLS de la base : la clé "publishable"
// ci-dessous est PUBLIQUE par conception (elle est livrée dans le site).
import { createClient } from '@supabase/supabase-js'
import { validateFile } from './catalog.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY
export const isConfigured = Boolean(url && key)
export const supabase = createClient(
  url || 'https://unconfigured.supabase.co',
  key || 'unconfigured',
)

const BUCKET = 'documents'
const MIME_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp4: 'video/mp4',
}
function readableError(error) {
  const message = error?.message || ''
  return /fetch|network|load failed/i.test(message)
    ? 'Le service de données est momentanément inaccessible. Vérifie ta connexion puis réessaie.'
    : message || 'Une erreur est survenue. Réessaie.'
}

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
  const base =
    (libelle || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) || 'classe'
  const rnd = randomKey('').slice(0, 8)
  return `${base}-${rnd}`
}

/* ---------- Fichiers (liens signés) ---------- */
// Génère un lien signé à durée limitée. Fonctionne pour un document visible
// (politique publique) ou pour l'enseignante connectée (politique authenticated).
export async function signedUrl(objet_cle, downloadName = null) {
  const opts = downloadName ? { download: downloadName } : {}
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objet_cle, 300, opts)
  if (error) throw new Error(readableError(error))
  return data.signedUrl
}
// Ouvre un document : aperçu (nouvel onglet) ou téléchargement.
export async function openDocument(doc, download = false) {
  if (doc.demoUrl && download) {
    const a = document.createElement('a')
    a.href = doc.demoUrl
    a.download = `${doc.libelle}.${extOf(doc.objet_cle)}`
    a.click()
    return
  }
  // Reserve the tab during the user gesture, before requesting a signed URL.
  const tab = window.open('about:blank', '_blank')
  if (!tab)
    throw new Error(
      'Le navigateur a bloqué l’ouverture. Autorise les fenêtres pour ce site puis réessaie.',
    )
  tab.opener = null
  try {
    const name = download ? `${doc.libelle}.${extOf(doc.objet_cle)}` : null
    const u = doc.demoUrl || (await signedUrl(doc.objet_cle, name))
    tab.location.replace(u)
  } catch (e) {
    tab.close()
    throw e
  }
}

/* ---------- Public (élève) ---------- */
export async function getClassePublic(slug) {
  const { data, error } = await supabase.rpc('get_classe_publique', {
    p_slug: slug,
  })
  if (error) throw new Error(readableError(error))
  if (!data) throw new Error('Classe introuvable')
  return data
}

/* ---------- Authentification (enseignante) ---------- */
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error)
    throw new Error(
      error.code === 'invalid_credentials'
        ? 'Adresse e-mail ou mot de passe incorrect. Tu peux utiliser « Mot de passe oublié ? ».'
        : readableError(error),
    )
}
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error('La déconnexion a échoué. Réessaie.')
}
// Envoie un e-mail de réinitialisation de mot de passe.
export async function resetPasswordRequest(email) {
  const redirectTo = window.location.origin + window.location.pathname
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  if (error) throw new Error(readableError(error))
}
// Définit un nouveau mot de passe (après clic sur le lien de réinitialisation).
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(readableError(error))
}
// Inscription enseignante gardée par un code d'invitation (Edge Function).
export async function signUpWithCode(email, password, code, extra = {}) {
  const res = await fetch(`${url}/functions/v1/inscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ email, password, code, ...extra }),
  }).catch((error) => {
    throw new Error(readableError(error))
  })
  const data = await res.json().catch(() => null)
  if (!res.ok)
    throw new Error((data && data.error) || 'Inscription impossible.')
  return data
}
export async function getSession() {
  if (!isConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}
// Profil de l'enseignant connecté (nom, prénom, matière) depuis ses métadonnées.
export async function getProfile() {
  const { data } = await supabase.auth.getSession()
  const u = data.session?.user
  const m = u?.user_metadata || {}
  return {
    email: u?.email || '',
    prenom: m.prenom || '',
    nom: m.nom || '',
    matiere: m.matiere || '',
  }
}

/* ---------- Admin (protégé par RLS : nécessite une session) ---------- */
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(readableError(error))
  return data
}

async function objetClesForClasse(classe_id) {
  const { data, error } = await supabase.rpc('objet_cles_classe', {
    p_classe_id: classe_id,
  })
  if (error) throw new Error(readableError(error))
  return data || []
}
async function objetClesForDomaine(domaine_id) {
  const { data, error } = await supabase.rpc('objet_cles_domaine', {
    p_domaine_id: domaine_id,
  })
  if (error) throw new Error(readableError(error))
  return data || []
}
async function objetClesForChapitre(chapitre_id) {
  const { data, error } = await supabase
    .from('documents')
    .select('objet_cle')
    .eq('chapitre_id', chapitre_id)
  if (error) throw new Error(readableError(error))
  return (data || []).map((d) => d.objet_cle)
}
async function removeFiles(cles) {
  if (cles && cles.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(cles)
    if (error) throw new Error(readableError(error))
  }
}

export const admin = {
  // Tableau de bord
  listClasses: () => rpc('get_admin_overview'),
  tree: (classe_id) => rpc('get_admin_tree', { p_classe_id: classe_id }),

  // Classes
  async createClasse(libelle, customSlug = null, matiere = null) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) throw new Error('Session expirée. Reconnecte-toi et réessaie.')
    const base = { libelle, owner_id: uid, matiere: matiere || null }

    if (customSlug) {
      const { data, error } = await supabase
        .from('classes')
        .insert({ ...base, slug: customSlug })
        .select()
        .single()
      if (error) {
        if (error.code === '23505')
          throw new Error('Ce code est déjà utilisé par une autre classe.')
        throw new Error(readableError(error))
      }
      return data
    }
    for (let i = 0; i < 5; i++) {
      const slug = randomSlug(libelle)
      const { data, error } = await supabase
        .from('classes')
        .insert({ ...base, slug })
        .select()
        .single()
      if (!error) return data
      if (error.code !== '23505') throw new Error(readableError(error)) // 23505 = slug déjà pris, on réessaie
    }
    throw new Error('Impossible de générer un code unique, réessaie.')
  },
  async renameClasse(id, libelle) {
    const { error } = await supabase
      .from('classes')
      .update({ libelle })
      .eq('id', id)
    if (error) throw new Error(readableError(error))
  },
  async updateSlug(id, slug) {
    const { error } = await supabase
      .from('classes')
      .update({ slug })
      .eq('id', id)
    if (error) {
      if (error.code === '23505')
        throw new Error('Ce code est déjà utilisé par une autre classe.')
      throw new Error(readableError(error))
    }
  },
  async deleteClasse(id) {
    await removeFiles(await objetClesForClasse(id))
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) throw new Error(readableError(error))
  },

  // Grands titres (domaines)
  async createDomaine(classe_id, libelle, description = null) {
    const { data: last } = await supabase
      .from('domaines')
      .select('ordre')
      .eq('classe_id', classe_id)
      .order('ordre', { ascending: false })
      .limit(1)
    const ordre = (last && last[0] ? last[0].ordre : 0) + 1
    const { data, error } = await supabase
      .from('domaines')
      .insert({ classe_id, libelle, description, ordre })
      .select('id')
      .single()
    if (error) throw new Error(readableError(error))
    return data.id
  },
  async updateDomaine(id, fields) {
    const { error } = await supabase
      .from('domaines')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(readableError(error))
  },
  async deleteDomaine(id) {
    await removeFiles(await objetClesForDomaine(id))
    const { error } = await supabase.from('domaines').delete().eq('id', id)
    if (error) throw new Error(readableError(error))
  },

  // Chapitres (rattachés à un grand titre)
  async createChapitre(domaine_id, libelle, description = null) {
    const { data: last } = await supabase
      .from('chapitres')
      .select('ordre')
      .eq('domaine_id', domaine_id)
      .order('ordre', { ascending: false })
      .limit(1)
    const ordre = (last && last[0] ? last[0].ordre : 0) + 1
    const { data, error } = await supabase
      .from('chapitres')
      .insert({ domaine_id, libelle, description, ordre })
      .select('id')
      .single()
    if (error) throw new Error(readableError(error))
    return data.id
  },
  async updateChapitre(id, fields) {
    const { error } = await supabase
      .from('chapitres')
      .update(fields)
      .eq('id', id)
    if (error) throw new Error(readableError(error))
  },
  async renameChapitre(id, libelle) {
    const { error } = await supabase
      .from('chapitres')
      .update({ libelle })
      .eq('id', id)
    if (error) throw new Error(readableError(error))
  },
  async deleteChapitre(id) {
    await removeFiles(await objetClesForChapitre(id))
    const { error } = await supabase.from('chapitres').delete().eq('id', id)
    if (error) throw new Error(readableError(error))
  },

  // Documents
  async renameDocument(id, libelle) {
    const { error } = await supabase
      .from('documents')
      .update({ libelle })
      .eq('id', id)
    if (error) throw new Error(readableError(error))
  },
  async deleteDocument(id) {
    const { data, error: lookupError } = await supabase
      .from('documents')
      .select('objet_cle')
      .eq('id', id)
      .single()
    if (lookupError) throw new Error(readableError(lookupError))
    if (data) await removeFiles([data.objet_cle])
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw new Error(readableError(error))
  },
  // publie_le est géré automatiquement par un trigger en base (1re publication).
  async toggleDocument(id, visible) {
    const { error } = await supabase
      .from('documents')
      .update({ visible: visible === 1 || visible === true })
      .eq('id', id)
    if (error) throw new Error(readableError(error))
  },
}

/* ---------- Upload ---------- */
export async function uploadDocument({
  chapitre_id,
  type,
  libelle,
  file,
  visible = type === 'cours',
}) {
  const validation = validateFile(file)
  if (validation) throw new Error(validation)
  const ext = extOf(file.name)
  const mime = MIME_TYPES[ext]

  // Rangé dans un dossier au nom du propriétaire (cloisonnement multi-enseignants) :
  // "<uid>/<aléatoire>.ext". Le nom reste imprévisible (Règle 3).
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) throw new Error('Session expirée. Reconnecte-toi.')
  const key = `${uid}/${randomKey(ext)}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, {
      contentType: mime,
      upsert: false,
    })
  if (upErr) throw new Error(readableError(upErr))

  const { data, error } = await supabase
    .from('documents')
    .insert({
      chapitre_id,
      libelle: libelle || file.name.replace(/\.[^.]+$/, ''),
      objet_cle: key,
      taille: file.size,
      mime,
      type,
      visible: Boolean(visible),
    })
    .select()
    .single()

  if (error) {
    // Nettoyage si l'insertion échoue après l'upload
    await removeFiles([key])
    throw new Error(readableError(error))
  }
  return data
}
