-- Store one account image and one optional image for each active subprofile.

alter table public.media_profilo
  add column if not exists sottoprofilo text,
  add column if not exists storage_path text;

alter table public.media_profilo
  drop constraint if exists media_profilo_sottoprofilo_check;

alter table public.media_profilo
  add constraint media_profilo_sottoprofilo_check
  check (
    sottoprofilo is null
    or sottoprofilo in (
      'giocatore',
      'squadra',
      'staff-sportivo',
      'professionisti-studi',
      'arbitro',
      'creators',
      'torneo-evento',
      'campi-impianti-sportivi'
    )
  );

create unique index if not exists media_profilo_foto_principale_uidx
  on public.media_profilo (uuid_profilo)
  where formato_media = 'foto_profilo' and sottoprofilo is null;

create unique index if not exists media_profilo_foto_sottoprofilo_uidx
  on public.media_profilo (uuid_profilo, sottoprofilo)
  where formato_media = 'foto_profilo' and sottoprofilo is not null;

create index if not exists media_profilo_foto_lookup_idx
  on public.media_profilo (uuid_profilo, sottoprofilo)
  where formato_media = 'foto_profilo';

comment on column public.media_profilo.sottoprofilo is
  'Tipologia del sottoprofilo; NULL identifica la foto principale dell account';
comment on column public.media_profilo.storage_path is
  'Percorso dell oggetto gestito in Supabase Storage, quando applicabile';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'immagini_profili',
  'immagini_profili',
  true,
  2097152,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads and deletes are performed with the server-only service role. Public
-- bucket access is read-only unless a future migration adds object policies.
drop policy if exists immagini_profili_insert_own on storage.objects;
drop policy if exists immagini_profili_update_own on storage.objects;
drop policy if exists immagini_profili_delete_own on storage.objects;
