// =====================================================================
//  Edge Function « inscription » — création d'un compte enseignant
//  gardée par un code d'invitation.
//
//  Déploiement (tableau de bord Supabase → Edge Functions → Deploy) :
//   - Nom de la fonction : inscription
//   - Coller ce fichier
//   - IMPORTANT : décocher « Verify JWT » (l'appel est public, gardé par le code)
//
//  Aucune clé à configurer : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
//  sont fournies automatiquement à la fonction par Supabase.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  try {
    const { email, password, code, prenom, nom, matiere } = await req.json()
    if (!email || !password || !code) return json({ error: 'Champs manquants.' }, 400)
    if (String(password).length < 8) return json({ error: 'Mot de passe trop court (8 caractères minimum).' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 1. Vérifier le code d'invitation
    const { data: invit, error: e1 } = await admin
      .from('invitations').select('id, used').eq('code', String(code).trim()).maybeSingle()
    if (e1) return json({ error: 'Erreur serveur.' }, 500)
    if (!invit || invit.used) return json({ error: "Code d'invitation invalide ou déjà utilisé." }, 403)

    // 2. Créer le compte (email confirmé d'office)
    const { error: e2 } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        prenom: prenom ? String(prenom).trim() : null,
        nom: nom ? String(nom).trim() : null,
        matiere: matiere ? String(matiere).trim() : null,
      },
    })
    if (e2) {
      const msg = /registered|already|exists/i.test(e2.message)
        ? 'Un compte existe déjà pour cet e-mail.'
        : e2.message
      return json({ error: msg }, 400)
    }

    // 3. Marquer le code consommé
    await admin.from('invitations')
      .update({ used: true, used_by: String(email).trim(), used_at: new Date().toISOString() })
      .eq('id', invit.id)

    return json({ ok: true }, 200)
  } catch (_e) {
    return json({ error: 'Requête invalide.' }, 400)
  }
})
