-- =====================================================================
--  Plateforme de partage de cours — Base Supabase (PostgreSQL)
--  Script COMPLET et idempotent : peut être ré-exécuté sans casse.
--  À coller dans Supabase → SQL Editor → Run.
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
  cree_le  timestamptz not null default now()
);

create table if not exists chapitres (
  id         bigint generated always as identity primary key,
  classe_id  bigint not null references classes(id) on delete cascade,
  libelle    text not null,
  ordre      int not null default 0,
  cree_le    timestamptz not null default now()
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

create index if not exists idx_chapitres_classe   on chapitres(classe_id);
create index if not exists idx_documents_chapitre on documents(chapitre_id);
create index if not exists idx_documents_visible  on documents(visible);

-- ========== 3. Horodatage auto de la 1re publication (F-23) ==========
create or replace function trg_documents_publie_le() returns trigger as $$
begin
  if new.visible = true and new.publie_le is null then
    new.publie_le := now();
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists set_publie_le on documents;
create trigger set_publie_le before insert or update on documents
  for each row execute function trg_documents_publie_le();

-- ========== 4. RLS des tables ==========
alter table classes   enable row level security;
alter table chapitres enable row level security;
alter table documents enable row level security;

drop policy if exists "ens classes"   on classes;
drop policy if exists "ens chapitres" on chapitres;
drop policy if exists "ens documents" on documents;
create policy "ens classes"   on classes   for all to authenticated using (true) with check (true);
create policy "ens chapitres" on chapitres for all to authenticated using (true) with check (true);
create policy "ens documents" on documents for all to authenticated using (true) with check (true);
-- Aucune politique pour "anon" : le public passe uniquement par les fonctions ci-dessous.

-- ========== 5. Lecture publique filtrée (Règle 1) ==========
create or replace function get_classe_publique(p_slug text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'classe', jsonb_build_object('libelle', c.libelle, 'slug', c.slug),
    'chapitres', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', ch.id, 'libelle', ch.libelle,
                 'documents', coalesce((
                     select jsonb_agg(jsonb_build_object(
                              'id', d.id, 'libelle', d.libelle, 'taille', d.taille,
                              'mime', d.mime, 'type', d.type, 'depose_le', d.depose_le,
                              'objet_cle', d.objet_cle
                            ) order by d.type, d.libelle)
                     from documents d where d.chapitre_id = ch.id and d.visible = true
                   ), '[]'::jsonb)
               ) order by ch.ordre, ch.cree_le)
        from chapitres ch where ch.classe_id = c.id
      ), '[]'::jsonb)
  )
  from classes c where c.slug = p_slug;
$$;
grant execute on function get_classe_publique(text) to anon, authenticated;

-- ========== 6. Fonctions du tableau de bord enseignante ==========
create or replace function get_admin_overview()
returns jsonb language sql security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'libelle', c.libelle, 'slug', c.slug,
    'nb_chapitres', (select count(*) from chapitres ch where ch.classe_id = c.id),
    'nb_masques',   (select count(*) from documents d join chapitres ch on ch.id = d.chapitre_id
                       where ch.classe_id = c.id and d.visible = false)
  ) order by c.cree_le desc), '[]'::jsonb) from classes c;
$$;

create or replace function get_admin_tree(p_classe_id bigint)
returns jsonb language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'classe', (select jsonb_build_object('id', c.id, 'libelle', c.libelle, 'slug', c.slug)
                 from classes c where c.id = p_classe_id),
    'chapitres', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ch.id, 'libelle', ch.libelle, 'ordre', ch.ordre,
        'nb_masques', (select count(*) from documents d where d.chapitre_id = ch.id and d.visible = false),
        'documents', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', d.id, 'libelle', d.libelle, 'taille', d.taille, 'mime', d.mime,
            'type', d.type, 'visible', d.visible, 'depose_le', d.depose_le,
            'publie_le', d.publie_le, 'objet_cle', d.objet_cle
          ) order by d.type, d.libelle)
          from documents d where d.chapitre_id = ch.id
        ), '[]'::jsonb)
      ) order by ch.ordre, ch.cree_le)
      from chapitres ch where ch.classe_id = p_classe_id
    ), '[]'::jsonb)
  );
$$;
grant execute on function get_admin_overview() to authenticated;
grant execute on function get_admin_tree(bigint) to authenticated;

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

-- Enseignante connectée : accès complet au bucket.
drop policy if exists "ens storage select" on storage.objects;
drop policy if exists "ens storage insert" on storage.objects;
drop policy if exists "ens storage update" on storage.objects;
drop policy if exists "ens storage delete" on storage.objects;
create policy "ens storage select" on storage.objects for select to authenticated using (bucket_id = 'documents');
create policy "ens storage insert" on storage.objects for insert to authenticated with check (bucket_id = 'documents');
create policy "ens storage update" on storage.objects for update to authenticated using (bucket_id = 'documents');
create policy "ens storage delete" on storage.objects for delete to authenticated using (bucket_id = 'documents');

-- Élève : lecture du fichier UNIQUEMENT si le document est visible (Règle 2).
drop policy if exists "public read visible docs" on storage.objects;
create policy "public read visible docs" on storage.objects
for select to anon using (
  bucket_id = 'documents'
  and exists (select 1 from public.documents d
              where d.objet_cle = storage.objects.name and d.visible = true)
);

-- ========== 8. Jeu de données de test (facultatif) ==========
insert into classes (libelle, slug) values
  ('3e B',   '3eb-a7f3k9m2'),
  ('2nde 4', '2nde4-p8q1z5x7')
on conflict (slug) do nothing;

insert into chapitres (classe_id, libelle, ordre)
select (select id from classes where slug='3eb-a7f3k9m2'), 'Chapitre 1 — Les états de la matière', 1
where not exists (select 1 from chapitres where libelle like 'Chapitre 1 — Les états%');
insert into chapitres (classe_id, libelle, ordre)
select (select id from classes where slug='3eb-a7f3k9m2'), 'Chapitre 2 — Les circuits électriques', 2
where not exists (select 1 from chapitres where libelle like 'Chapitre 2 — Les circuits%');

-- Note : ces documents de démonstration n'ont pas de fichier réel dans le
-- Storage ; ils servent à vérifier le listing et les bascules de visibilité.
insert into documents (chapitre_id, libelle, objet_cle, taille, mime, type, visible)
select (select id from chapitres where libelle like 'Chapitre 1 — Les états%'), v.libelle, v.cle, v.taille, 'application/pdf', v.type::type_document, v.visible
from (values
  ('Cours — États de la matière',        'demo1.pdf', 248000, 'cours',      true),
  ('Contrôle n°1 — États de la matière', 'demo2.pdf', 152000, 'controle',   false),
  ('Correction — Contrôle n°1',          'demo3.pdf', 160000, 'correction', false)
) as v(libelle, cle, taille, type, visible)
where not exists (select 1 from documents where objet_cle = v.cle);
