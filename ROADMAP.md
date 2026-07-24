# Feuille de route — idées à traiter plus tard

La V1 vise un usage mono-enseignant (une enseignante, sa matière). Les points
ci-dessous sont notés pour une évolution ultérieure, à ne pas implémenter en V1.

## Multi-enseignants / multi-matières
- [ ] Inscription en libre-service des enseignants (création de compte autonome).
- [ ] Champ **matière** renseigné à l'inscription, affiché en tête de l'espace élève.
- [ ] Gérer le cas de **plusieurs matières** pour un même élève / une même classe.

## Espace d'édition de classe enrichi (admin)
- [x] Grand **titre / domaine** au-dessus des chapitres (hiérarchie 3 niveaux).
- [x] Ajout des **chapitres un par un** dans chaque grand titre.
- [x] Zone de **glisser-déposer** intégrée sous chaque chapitre.
- [~] **Descriptions facultatives** : supportées en base et affichées côté élève,
      mais pas encore de champ de saisie dans l'interface (à ajouter).
- [ ] **Réordonnancement** manuel des grands titres / chapitres (glisser).

## Déjà en place (rappel)
- [x] Cloisonnement par propriétaire (owner_id + RLS) — chaque prof ne voit que ses classes.
- [x] Carte de classe cliquable pour ouvrir la gestion.
- [x] Code de classe copiable + aperçu élève.
- [x] Vue élève à deux colonnes (menu chapitres + contenu), mobile-first.
