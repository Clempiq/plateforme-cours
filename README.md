# 📚 Plateforme de partage de cours (Physique-Chimie)

> Une plateforme qui permet à une enseignante de partager ses cours avec ses élèves en un lien, et de publier les sujets de contrôle seulement le jour J.

Application web permettant à une enseignante de mettre ses supports pédagogiques à disposition de ses élèves, organisés par classe et par chapitre, **sans aucun compte élève**. Sa particularité : une **visibilité différée** qui garde les sujets de contrôle et leurs corrigés invisibles jusqu'à publication manuelle, une contrainte de sécurité qui structure toute l'architecture.

**Site :** https://plateforme-cours-vert.vercel.app/ · **Démo élève :** `/#/demo` · **Démo enseignant :** `/#/demo/enseignant` · **Accès enseignant :** `/#/admin`

La version 1.1 ajoute une interface responsive, des repères de révision locaux, des filtres, des consignes de chapitre, la réorganisation du plan et une reprise des enregistrements interrompus. Voir [CHANGELOG.md](./CHANGELOG.md) pour le périmètre et les limites de validation.

---

## 🎯 Le problème

Le projet est né d'un besoin réel : ma sœur, professeure de physique-chimie, voulait mettre ses supports à disposition de ses élèves sans leur imposer de compte, tout en gardant ses sujets de contrôle et leurs corrigés secrets jusqu'au bon moment. Les outils existants (ENT, Drive) étaient soit trop lourds pour les élèves, soit trop risqués pour les contrôles.

**Pour qui :**
- **L'enseignante**, qui veut organiser ses documents par classe et par chapitre, et décider précisément quand chaque document devient visible.
- **Les élèves**, qui doivent retrouver un cours en quelques secondes sur leur téléphone, sans inscription.

---

## ✨ Fonctionnalités

**Côté élève** (public, mobile-first)
- Accès par simple URL de classe, sans inscription
- Chapitres dépliables, documents regroupés par type (cours / contrôle / correction)
- Visualisation des PDF et images en ligne, téléchargement
- Recherche par nom dans la classe

**Côté enseignante** (espace protégé)
- Gestion des classes et chapitres (créer, renommer, ordonner, supprimer)
- Dépôt par glisser-déposer avec typage du document
- **Interrupteur Publier / Masquer** sur chaque document, avec confirmation pour les contrôles
- Compteur de documents masqués par chapitre, distinction visuelle publié / masqué
- Bascules indépendantes : on publie le contrôle le jour de l'épreuve, la correction plus tard

---

## 🔒 Sécurité de la visibilité différée

Un sujet de contrôle non encore passé est une donnée sensible : sa fuite compromettrait toute une classe. La protection ne repose pas sur l'interface mais sur **trois garanties côté serveur** :

1. **Filtrage en base (Row Level Security).** L'API publique ne renvoie que les lignes `visible = true`. Un document masqué n'est jamais transmis au navigateur : ni son fichier, ni son libellé, ni son existence. Le filtre est appliqué par PostgreSQL, pas par le client.
2. **Fichiers en stockage privé.** Le bucket est privé ; un élève n'obtient un nouveau lien signé que pour un document visible. Les nouveaux liens expirent après 5 minutes. Masquer un document empêche de générer de nouveaux liens ; les liens déjà émis restent valides jusqu’à leur expiration et les copies téléchargées restent sur les appareils.
3. **Noms de fichiers aléatoires.** Chaque objet est stocké sous une clé imprévisible ; le nom lisible n'existe qu'en base.

> La clé Supabase embarquée dans le front est une clé **publishable, publique par conception** : la sécurité repose entièrement sur les politiques RLS, jamais sur le secret de la clé. La clé `service_role` n'est utilisée nulle part côté client.

Le détail des tables, politiques RLS, fonctions et politiques de stockage se trouve dans [`supabase/schema.sql`](./supabase/schema.sql).

---

## 🏗️ Architecture

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  React (Vite + Tailwind)│        │            Supabase          │
│  build statique / Vercel │──────▶│  PostgreSQL + Row Level Sec. │
│                         │  RLS   │  Auth (compte enseignante)   │
│  - vue élève (public)   │◀──────│  Storage privé (fichiers)    │
│  - espace admin (auth)  │ signed │  API REST auto + RPC         │
└─────────────────────────┘  URLs  └──────────────────────────────┘
             ▲
             │  GitHub Actions (cron tous les 2 jours) → ping anti-mise-en-pause
```

- **Lecture publique** via une fonction PostgreSQL `get_classe_publique(slug)` (`security definer`) qui renvoie la classe, ses chapitres et **uniquement les documents visibles**, sans permettre de lister les autres.
- **Espace enseignante** authentifié (Supabase Auth) ; toutes les écritures passent les politiques RLS `authenticated`.
- **Horodatage de publication** posé automatiquement par un trigger à la première mise en visibilité, jamais effacé ensuite.

---

## 🛠️ Stack technique

| Couche | Technologies |
|---|---|
| Front-end | React 18, Vite, Tailwind CSS, React Router (HashRouter) |
| Back-end | Supabase : PostgreSQL, Row Level Security, Auth, Storage, PostgREST |
| Hébergement | Vercel (front statique), Supabase (données) |
| Automatisation | GitHub Actions (cron anti-pause) |

Aucun serveur à administrer, déploiement continu par `git push`, coût nul en offres gratuites.

---

## 🚀 Démarrer en local

```bash
npm install
cp .env.example .env      # renseigner les 2 variables Supabase
npm run dev               # http://localhost:5173
npm run build             # build de production dans dist/
npm test                  # tests de recherche, publication et reprise d’enregistrement
```

Variables d'environnement (voir `.env.example`) :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_KEY` | Clé publishable (publique) |

Le fichier [`supabase/schema.sql`](./supabase/schema.sql) est une référence historique. Il ne contient pas toutes les évolutions de la base déployée (notamment invitations et matière). Ne pas le réappliquer sur une base existante. Cette version du front ne requiert aucune migration de données.

---

## 📦 Déploiement

Import du dépôt dans Vercel (framework Vite détecté automatiquement), ajout des deux variables d'environnement, déploiement. La tâche `.github/workflows/ping-supabase.yml` maintient le projet Supabase actif.

---

## 📌 Statut

✅ **En production, utilisée par une vraie enseignante et ses classes.** Version 1.1 livrée le 18 octobre 2026 (voir [CHANGELOG.md](./CHANGELOG.md)). Les évolutions envisagées (multi-enseignants, multi-matières, interface de gestion des invitations) sont suivies dans [ROADMAP.md](./ROADMAP.md).

---

## 💡 Ce que j'ai appris

- **Partir d'un utilisateur réel** : recueillir le besoin, livrer une V1 courte, puis itérer sur ses retours (V1.1 : filtres, repères de révision, réorganisation du plan).
- **Faire d'une contrainte métier une exigence d'architecture** : la confidentialité des contrôles est garantie côté serveur (RLS, stockage privé, liens signés), pas par l'interface.
- **Cadrer le périmètre** : une feuille de route qui distingue clairement la V1 de ce qui est reporté.
- **Documenter les limites honnêtement** : ce qui ne peut pas être révoqué (fichier déjà téléchargé) est écrit noir sur blanc.

---

## 📝 Licence

Projet personnel. Réutilisation libre à des fins pédagogiques.
