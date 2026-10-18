# Version 1.1 — 18 octobre 2026

Cette version conserve le partage de cours sans compte élève et la publication manuelle des contrôles et corrections.

## Pour les élèves

- Accueil repensé et accès par code ou lien complet.
- Recherche sans distinction d’accents, sur les titres, chapitres et grands titres ; combinaison de plusieurs mots.
- Filtres cours / contrôles / corrections, tri par date d’ajout ou titre.
- Repères personnels « Lu » et « À revoir », stockés uniquement dans le navigateur, avec effacement possible.
- Raccourcis de classes ajoutés volontairement à l’accueil.
- Sélecteur de chapitre sur mobile, messages de chargement, d’erreur et listes vides.

## Pour les enseignants

- Tableau de bord, recherche par classe/matière, partage par lien, code ou QR.
- Éditeur de brouillon, descriptions et consignes, réorganisation des grands titres et chapitres.
- Formulaires et confirmations accessibles au clavier avec modales natives.
- Validation des fichiers avant l’envoi et confirmation de publication des contrôles **et** corrections.
- Correction : le statut choisi pour un nouveau document est transmis à son insertion. Un cours marqué masqué reste masqué dès son premier enregistrement.
- Reprise de l’enregistrement après les écritures confirmées ; les nouveaux éléments déjà créés ne sont pas recréés au prochain essai.
- Messages explicites en cas d’échec partiel. L’enregistrement reste une suite d’opérations, pas une transaction globale ; une réponse réseau perdue après une écriture serveur reste un cas à réconcilier manuellement.
- Parcours de connexion, invitation et récupération de mot de passe clarifiés.

## Découverte, accès et exploitation

- Démonstration élève et enseignant avec supports fictifs. Les fichiers déposés en démo restent dans l’onglet et ne sont pas envoyés au serveur.
- Aide intégrée ; aucun compte élève ni suivi de lecture envoyé au serveur.
- Liens de fichiers signés pour 5 minutes. Un fichier déjà téléchargé ou un ancien lien encore valide ne peut pas être révoqué par l’interface.
- Chargement séparé des pages, suppression du chargement de police depuis Google Fonts.
- Tests de recherche, filtres, validation, ordre, publication et reprise après erreurs.

## Périmètre de données

Cette livraison ne modifie ni les politiques RLS, ni les comptes, ni la fonction d’inscription déployée dans Supabase. Les champs `description` et `ordre` existaient déjà. Le schéma SQL historique du dépôt n’est pas une migration de cette version et ne doit pas être réappliqué sur la base existante.

Les tests automatisés utilisent des services simulés. La démonstration vérifie l’interface et la logique, pas les autorisations réelles de la base. Les opérations authentifiées de production nécessitent un compte de test pour une validation complète.

## Références de conception

- [EEF — Using Digital Technology to Improve Learning](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/digital) : partir du besoin pédagogique avant d’ajouter de la technologie.
- [W3C — Labeling Controls](https://www.w3.org/WAI/tutorials/forms/labels/) : libellés explicites des formulaires.
- [W3C — Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) : cibles utilisables au pointeur et sur petit écran.

Ces recommandations ont guidé les choix de conception ; elles ne constituent pas une mesure d’efficacité pédagogique ni une certification d’accessibilité.
