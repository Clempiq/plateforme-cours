-- =====================================================================
--  Plateforme de partage de cours — Base Supabase (PostgreSQL)
--  Hiérarchie : classes → domaines (grands titres) → chapitres → documents
--  Multi-enseignants (owner_id + RLS). Script COMPLET et idempotent.
--  À coller dans Supabase → SQL Editor → Run (base neuve).
-- =====================================================================

-- ========== 1. Type de document ==========
do $$ begin
  if not exists (select 1 from pg_type where typname = 'type_document') then
    create type type_document as enum ('cours','controle','correction');
  end if;
end $$;

-- ========== 2. Tables ==========
create table if not exists classes (
  id       bigint generated always as identity primary key,
  libelle  text not null,
  slug     text not null unique,
  owner_id uuid references auth.users(id) default auth.uid(),
  cree_le  timestamptz not null default now()
);

create table if not exists domaines (
  id          bigint generated always as identity primary key,
  classe_id   bigint not null references classes(id) on delete cascade,
  libelle     text not null,
  description text,
  ordre       int not null default 0,
  cree_le     timestamptz not null default now()
);

create table if not exists chapitres (
  id          bigint generated always as identity primary key,
  domaine_id  bigint not null references domaines(id) on delete cascade,
  libelle     text not null,
  description text,
  ordre       int not null default 0,
  cree_le     timestamptz not null default now()
);

create table if not exists documents (
  id           bigint generated always as identity primary key,
  chapitre_id  bigint not null references chapitres(id) on delete cascade,
  libelle      text not null,
  objet_cle    text not null,
  taille       bigint not null default 0,
  mime         text not null default '',
  type         type_document not null,
  visible      boolean not null default false,
  depose_le    timestamptz not null default now(),
  publie_le    timestamptz
);

create index if not exists idx_domaines_classe    on domaines(classe_id);
create index if not exists idx_chapitres_domaine  on chapitres(domaine_id);
create index if not exists idx_documents_chapitre on documents(chapitre_id);
create index if not exists idx_documents_visible  on documents(visible);

-- ========== 3. Horodatage auto de la 1re publication ==========
create or replace function trg_documents_publie_le() returns trigger as $$
begin
  if new.visible = true and new.publie_le is null then new.publie_le := now(); end if;
  return new;
end $$ language plpgsql;
drop trigger if exists set_publie_le on documents;
create trigger set_publie_le before insert or update on documents
  for each row execute function trg_documents_publie_le();

-- ========== 4. RLS par propriétaire ==========
alter table classes   enable row level security;
alter table domaines  enable row level security;
alter table chapitres enable row level security;
alter table documents enable row level security;

drop policy if exists "ens classes"   on classes;
create policy "ens classes" on classes for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "ens domaines" on domaines;
create policy "ens domaines" on domaines for all to authenticated
  using (exists (select 1 from classes c where c.id = domaines.classe_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from classes c where c.id = domaines.classe_id and c.owner_id = auth.uid()));

drop policy if exists "ens chapitres" on chapitres;
create policy "ens chapitres" on chapitres for all to authenticated
  using (exists (select 1 from domaines dm join classes c on c.id = dm.classe_id
                   where dm.id = chapitres.domaine_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from domaines dm join classes c on c.id = dm.classe_id
                   where dm.id = chapitres.domaine_id and c.owner_id = auth.uid()));

drop policy if exists "ens documents" on documents;
create policy "ens documents" on documents for all to authenticated
  using (exists (select 1 from chapitres ch join domaines dm on dm.id = ch.domaine_id
                   join classes c on c.id = dm.classe_id
                   where ch.id = documents.chapitre_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from chapitres ch join domaines dm on dm.id = ch.domaine_id
                   join classes c on c.id = dm.classe_id
                   where ch.id = documents.chapitre_id and c.owner_id = auth.uid()));

-- ========== 5. Lecture publique filtrée (Règle 1) ==========
create or replace function get_classe_publique(p_slug text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'classe', jsonb_build_object('libelle', c.libelle, 'slug', c.slug),
    'domaines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', dm.id, 'libelle', dm.libelle, 'description', dm.description,
        'chapitres', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ch.id, 'libelle', ch.libelle, 'description', ch.description,
            'documents', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', d.id, 'libelle', d.libelle, 'taille', d.taille,
                'mime', d.mime, 'type', d.type, 'depose_le', d.depose_le, 'objet_cle', d.objet_cle
              ) order by d.type, d.libelle)
              from documents d where d.chapitre_id = ch.id and d.visible = true
            ), '[]'::jsonb)
          ) order by ch.ordre, ch.cree_le)
          from chapitres ch where ch.domaine_id = dm.id
        ), '[]'::jsonb)
      ) order by dm.ordre, dm.cree_le)
      from domaines dm where dm.classe_id = c.id
    ), '[]'::jsonb)
  )
  from classes c where c.slug = p_slug;
$$;
grant execute on function get_classe_publique(text) to anon, authenticated;

-- ========== 6. Fonctions du tableau de bord ==========
create or replace function get_admin_overview()
returns jsonb language sql security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'libelle', c.libelle, 'slug', c.slug,
    'nb_chapitres', (select count(*) from chapitres ch join domaines dm on dm.id = ch.domaine_id where dm.classe_id = c.id),
    'nb_masques',   (select count(*) from documents d join chapitres ch on ch.id = d.chapitre_id
                       join domaines dm on dm.id = ch.domaine_id where dm.classe_id = c.id and d.visible = false)
  ) order by c.cree_le desc), '[]'::jsonb) from classes c;
$$;

create or replace function get_admin_tree(p_classe_id bigint)
returns jsonb language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'classe', (select jsonb_build_object('id', c.id, 'libelle', c.libelle, 'slug', c.slug) from classes c where c.id = p_classe_id),
    'domaines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', dm.id, 'libelle', dm.libelle, 'description', dm.description, 'ordre', dm.ordre,
        'chapitres', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ch.id, 'libelle', ch.libelle, 'description', ch.description, 'ordre', ch.ordre,
            'nb_masques', (select count(*) from documents d where d.chapitre_id = ch.id and d.visible = false),
            'documents', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', d.id, 'libelle', d.libelle, 'taille', d.taille, 'mime', d.mime,
                'type', d.type, 'visible', d.visible, 'depose_le', d.depose_le, 'publie_le', d.publie_le, 'objet_cle', d.objet_cle
              ) order by d.type, d.libelle)
              from documents d where d.chapitre_id = ch.id
            ), '[]'::jsonb)
          ) order by ch.ordre, ch.cree_le)
          from chapitres ch where ch.domaine_id = dm.id
        ), '[]'::jsonb)
      ) order by dm.ordre, dm.cree_le)
      from domaines dm where dm.classe_id = p_classe_id
    ), '[]'::jsonb)
  );
$$;
grant execute on function get_admin_overview() to authenticated;
grant execute on function get_admin_tree(bigint) to authenticated;

-- Clés d'objets pour supprimer les fichiers d'une classe / d'un domaine
create or replace function objet_cles_classe(p_classe_id bigint)
returns setof text language sql security invoker set search_path = public as $$
  select d.objet_cle from documents d join chapitres ch on ch.id = d.chapitre_id
    join domaines dm on dm.id = ch.domaine_id where dm.classe_id = p_classe_id;
$$;
create or replace function objet_cles_domaine(p_domaine_id bigint)
returns setof text language sql security invoker set search_path = public as $$
  select d.objet_cle from documents d join chapitres ch on ch.id = d.chapitre_id where ch.domaine_id = p_domaine_id;
$$;
grant execute on function objet_cles_classe(bigint)  to authenticated;
grant execute on function objet_cles_domaine(bigint) to authenticated;

-- ========== 7. Bucket de stockage privé ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents','documents', false, 52428800,
  array['application/pdf','image/png','image/jpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','video/mp4'])
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ens storage select" on storage.objects;
drop policy if exists "ens storage insert" on storage.objects;
drop policy if exists "ens storage update" on storage.objects;
drop policy if exists "ens storage delete" on storage.objects;
create policy "ens storage select" on storage.objects for select to authenticated
  using (bucket_id='documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ens storage insert" on storage.objects for insert to authenticated
  with check (bucket_id='documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ens storage update" on storage.objects for update to authenticated
  using (bucket_id='documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ens storage delete" on storage.objects for delete to authenticated
  using (bucket_id='documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Lecture publique d'un fichier : uniquement si le document est visible.
-- La vérification passe par une fonction security definer : un élève (anon)
-- n'a pas le droit de lire la table documents, donc une sous-requête directe
-- dans la politique échouerait toujours et bloquerait tous les fichiers.
-- La fonction ne répond que oui/non pour une clé précise : rien ne fuit.
create or replace function public.document_est_visible(p_cle text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from documents where objet_cle = p_cle and visible = true
  );
$$;
grant execute on function public.document_est_visible(text) to anon;

drop policy if exists "public read visible docs" on storage.objects;
create policy "public read visible docs" on storage.objects
for select to anon
using (bucket_id = 'documents' and public.document_est_visible(name));

-- =====================================================================
--  Note : plus de jeu de test ici. Les classes/domaines/chapitres se
--  créent depuis l'espace enseignante (chaque classe reçoit alors son
--  propriétaire automatiquement).
-- =====================================================================
