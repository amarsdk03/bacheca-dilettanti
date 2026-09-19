-- Apply after the existing account/profile migrations, before deploying the UI.
-- Writes go through authenticated Server Actions; direct clients can only read
-- their own saved announcements and the follow relationships they participate in.
begin;

create table public.profilo_follow (
  uuid_profilo_follower uuid not null references public.profilo(uuid) on delete cascade,
  uuid_profilo_seguito uuid not null references public.profilo(uuid) on delete cascade,
  creato_il timestamptz not null default now(),
  primary key (uuid_profilo_follower, uuid_profilo_seguito),
  constraint profilo_follow_no_self check (uuid_profilo_follower <> uuid_profilo_seguito)
);

create index profilo_follow_following_date_idx
  on public.profilo_follow (uuid_profilo_follower, creato_il desc, uuid_profilo_seguito desc);
create index profilo_follow_followers_date_idx
  on public.profilo_follow (uuid_profilo_seguito, creato_il desc, uuid_profilo_follower desc);

create table public.annuncio_salvato (
  uuid_utente uuid not null references public.utente(utente_uuid) on delete cascade,
  uuid_annuncio uuid not null references public.annuncio(uuid) on delete cascade,
  salvato_il timestamptz not null default now(),
  primary key (uuid_utente, uuid_annuncio)
);

create index annuncio_salvato_user_date_idx
  on public.annuncio_salvato (uuid_utente, salvato_il desc, uuid_annuncio desc);
create index annuncio_salvato_announcement_idx
  on public.annuncio_salvato (uuid_annuncio);

alter table public.profilo_follow enable row level security;
alter table public.profilo_follow force row level security;
alter table public.annuncio_salvato enable row level security;
alter table public.annuncio_salvato force row level security;

revoke all on table public.profilo_follow, public.annuncio_salvato
  from public, anon, authenticated, service_role;
grant select on table public.profilo_follow, public.annuncio_salvato to authenticated;
grant select, insert, delete on table public.profilo_follow, public.annuncio_salvato to service_role;

create policy profilo_follow_select_participant
  on public.profilo_follow for select to authenticated
  using (
    uuid_profilo_follower in (
      select p.uuid from public.profilo p
      join public.utente u on u.utente_uuid = p.uuid_utente
      where u.auth_user_uuid = (select auth.uid()) and u.registrato_il is not null
    )
    or uuid_profilo_seguito in (
      select p.uuid from public.profilo p
      join public.utente u on u.utente_uuid = p.uuid_utente
      where u.auth_user_uuid = (select auth.uid()) and u.registrato_il is not null
    )
  );

create policy annuncio_salvato_select_owned
  on public.annuncio_salvato for select to authenticated
  using (
    uuid_utente in (
      select u.utente_uuid from public.utente u
      where u.auth_user_uuid = (select auth.uid()) and u.registrato_il is not null
    )
  );

comment on table public.profilo_follow is 'Account-level follows. Mutations are authorized by server-only actions.';
comment on table public.annuncio_salvato is 'Private bookmarks. Hidden announcements retain their original saved timestamp.';

commit;
