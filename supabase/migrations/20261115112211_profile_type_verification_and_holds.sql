begin;
set local lock_timeout='10s';

-- One durable moderation identity per account-profile/type, including anonymous
-- publishing profiles. Deleting/recreating a child must not clear an Admin hold.
create table public.profile_type_state (
  profile_id uuid not null references public.profilo(uuid) on delete cascade,
  profile_type text not null check(profile_type in ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators')),
  verified_at timestamptz check(verified_at is null or isfinite(verified_at)),
  verification_revoked boolean not null default false,
  admin_hidden boolean not null default false,
  version integer not null default 0 check(version>=0),
  updated_at timestamptz not null default statement_timestamp(),
  primary key(profile_id,profile_type)
);
alter table public.profile_type_state enable row level security;
revoke all on public.profile_type_state from public,anon,authenticated,service_role;
grant select on public.profile_type_state to service_role,authenticated;
-- Boolean ownership check for restrictive policies, without granting anon access
-- to account tables or relying on their owner-only SELECT policies.
create function private.profile_owned_by_current_user_v1(p_id uuid,p_creator uuid default null) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.utente u where u.auth_user_uuid=(select auth.uid()) and
    (u.utente_uuid=p_creator or exists(select 1 from public.profilo p where p.uuid=p_id and p.uuid_utente=u.utente_uuid)));
$$;
create policy profile_type_state_owner_read on public.profile_type_state for select to authenticated using (
  private.profile_owned_by_current_user_v1(profile_id)
);
create index profile_type_state_moderated_idx on public.profile_type_state(profile_type,profile_id) where admin_hidden;

create function private.profile_type_for_announcement_v1(p_type text) returns text
language sql immutable security invoker set search_path='' as $$
  select case p_type when 'annuncio_giocatore' then 'giocatore'
    when 'annuncio_squadra_cerca_giocatore' then 'squadra' when 'annuncio_squadra_cerca_staff' then 'squadra'
    when 'annuncio_squadra_cerca_partita' then 'squadra' when 'annuncio_squadra_cerca_sponsor' then 'squadra'
    when 'annuncio_staff_sportivo' then 'staff-sportivo' when 'annuncio_arbitro' then 'arbitro'
    when 'annuncio_torneo_evento' then 'torneo-evento' when 'annuncio_campo_impianto' then 'campi-impianti-sportivi'
    when 'annuncio_servizi_consulenze' then 'servizi-consulenze' when 'annuncio_creators' then 'creators' when 'annuncio_creator' then 'creators' end;
$$;
create function private.profile_is_admin_hidden_v1(p_id uuid,p_type text) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((select admin_hidden from public.profile_type_state where profile_id=p_id and profile_type=p_type),false);
$$;

-- Backfill deliberately unverified, including pre-existing special profiles.
-- No inference from email confirmation or the former account-wide badge.
do $$ declare t record; begin
  for t in select * from (values ('giocatore','profilo_giocatore'),('squadra','profilo_squadra'),('staff-sportivo','profilo_staff_sportivo'),
    ('arbitro','profilo_arbitro'),('torneo-evento','profilo_torneo_evento'),('campi-impianti-sportivi','profilo_campi_impianti'),
    ('servizi-consulenze','profilo_servizi_consulenze'),('creators','profilo_creator')) x(kind,tab) loop
    execute format('insert into public.profile_type_state(profile_id,profile_type,verification_revoked) select uuid_profilo,%L,true from public.%I on conflict do nothing',t.kind,t.tab);
  end loop;
end $$;
drop trigger if exists verify_new_service_profile_account on public.profilo_servizi_consulenze;
drop trigger if exists verify_new_creator_profile_account on public.profilo_creator;
drop function if exists private.verify_new_special_profile_account_v1();
update public.profilo set verificato_il=null where verificato_il is not null;
-- The existing profile_activity_change constraint trigger is initially deferred.
-- Run pending constraint events before ALTER TABLE (55006 otherwise). This
-- changes timing only in this transaction and keeps triggers/validation active.
set constraints all immediate;
comment on column public.profilo.verificato_il is 'Deprecated; official verification belongs to profile_type_state.verified_at. Never use for badges.';
alter table public.profilo add constraint profile_legacy_verification_unused check(verificato_il is null);

create function private.sync_profile_type_state_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare pid uuid:=case when tg_op='DELETE' then old.uuid_profilo else new.uuid_profilo end;
begin
  if tg_op='INSERT' then
    insert into public.profile_type_state(profile_id,profile_type,verified_at)
      values(pid,tg_argv[0],case when tg_argv[0] in ('servizi-consulenze','creators') then statement_timestamp() end)
      on conflict(profile_id,profile_type) do update set verified_at=case when not profile_type_state.verification_revoked and excluded.profile_type in ('servizi-consulenze','creators') then excluded.verified_at else profile_type_state.verified_at end,
        version=profile_type_state.version+1,updated_at=statement_timestamp();
  elsif tg_op='UPDATE' then
    if new.uuid_profilo is distinct from old.uuid_profilo then raise exception 'PROFILE_ID_IMMUTABLE' using errcode='22023'; end if;
    update public.profile_type_state set version=version+1,updated_at=statement_timestamp() where profile_id=pid and profile_type=tg_argv[0];
  else
    update public.profile_type_state set verified_at=null,version=version+1,updated_at=statement_timestamp() where profile_id=pid and profile_type=tg_argv[0];
  end if;
  return coalesce(new,old);
end $$;

alter table public.annuncio add column profile_admin_hidden boolean not null default false;
comment on column public.annuncio.profile_admin_hidden is 'Derived hold from author/type. Independent from privacy, review and individual Admin moderation.';
create index annuncio_profile_moderation_idx on public.annuncio(autore_annuncio,tipologia_annuncio);
create function private.stamp_announcement_profile_hold_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare held boolean; begin
  select admin_hidden into held from public.profile_type_state
    where profile_id=new.autore_annuncio and profile_type=private.profile_type_for_announcement_v1(new.tipologia_annuncio) for share;
  new.profile_admin_hidden:=coalesce(held,false);
  return new;
end $$;
create trigger zzz_stamp_profile_hold before insert or update on public.annuncio for each row execute function private.stamp_announcement_profile_hold_v1();
create function private.propagate_profile_hold_v1() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if new.admin_hidden is distinct from old.admin_hidden then
    update public.annuncio set profile_admin_hidden=new.admin_hidden
      where autore_annuncio=new.profile_id and private.profile_type_for_announcement_v1(tipologia_annuncio)=new.profile_type
        and profile_admin_hidden is distinct from new.admin_hidden;
  end if;
  return new;
end $$;
create trigger propagate_profile_hold after update of admin_hidden on public.profile_type_state for each row execute function private.propagate_profile_hold_v1();

-- Restrictive policies complement existing policies, preserving owner access.
create policy announcement_profile_hold_read on public.annuncio as restrictive for select to anon,authenticated using (
  not profile_admin_hidden or private.profile_owned_by_current_user_v1(autore_annuncio,creato_da)
);
do $$ declare t record; begin
  for t in select * from (values ('giocatore','profilo_giocatore'),('squadra','profilo_squadra'),('staff-sportivo','profilo_staff_sportivo'),
    ('arbitro','profilo_arbitro'),('torneo-evento','profilo_torneo_evento'),('campi-impianti-sportivi','profilo_campi_impianti'),
    ('servizi-consulenze','profilo_servizi_consulenze'),('creators','profilo_creator')) x(kind,tab) loop
    execute format('create trigger sync_type_moderation after insert or update or delete on public.%I for each row execute function private.sync_profile_type_state_v1(%L)',t.tab,t.kind);
    execute format('create policy profile_admin_hold_read on public.%I as restrictive for select to anon,authenticated using (not private.profile_is_admin_hidden_v1(uuid_profilo,%L) or private.profile_owned_by_current_user_v1(uuid_profilo))',t.tab,t.kind);
  end loop;
end $$;
revoke all on function private.profile_owned_by_current_user_v1(uuid,uuid),private.profile_type_for_announcement_v1(text),private.profile_is_admin_hidden_v1(uuid,text),private.sync_profile_type_state_v1(),private.stamp_announcement_profile_hold_v1(),private.propagate_profile_hold_v1() from public,anon,authenticated,service_role;
grant execute on function private.profile_owned_by_current_user_v1(uuid,uuid),private.profile_is_admin_hidden_v1(uuid,text) to anon,authenticated,service_role;

-- Existing definer interactions must also enforce the durable hold.
do $$ declare d text; begin
  d:=pg_get_functiondef('private.interest_subprofile_id(uuid,text)'::regprocedure);
  if strpos(d,'begin')=0 then raise exception 'INTEREST_REVIEW_REQUIRED'; end if;
  execute replace(d,'begin','begin
    if private.profile_is_admin_hidden_v1(p_profile_uuid,p_type) then raise exception ''PROFILE_NOT_FOUND'' using errcode=''22023''; end if;');
  d:=pg_get_functiondef('public.submit_manifestazione_interesse_v1(uuid,text,text,uuid,text,text,text,boolean,boolean,text)'::regprocedure);
  if d is not null then
    execute replace(d,'stato_annuncio = ''pubblicato'' and nascosto is false','stato_annuncio = ''pubblicato'' and profile_admin_hidden is false and nascosto is false');
  end if;
  d:=pg_get_functiondef('public.set_profile_follow_v2(uuid,uuid,text,text,boolean)'::regprocedure);
  execute replace(replace(d,'begin','begin
    if p_followed and private.profile_is_admin_hidden_v1(p_target,p_target_type) then raise exception ''FOLLOW_PROFILE_UNAVAILABLE'' using errcode=''22023''; end if;'),
    'if private.notification_profile_ref(v_own,p_source_type) is null','if private.profile_is_admin_hidden_v1(v_own,p_source_type) or private.notification_profile_ref(v_own,p_source_type) is null');
  d:=pg_get_functiondef('private.regional_emit_notification(uuid,boolean,text)'::regprocedure);
  execute replace(d,'a.nascosto is false','a.nascosto is false and a.profile_admin_hidden is false');
  d:=pg_get_functiondef('public.latest_regional_announcement_ids_v1()'::regprocedure);
  execute replace(d,'nascosto is false','nascosto is false and profile_admin_hidden is false');
end $$;
notify pgrst,'reload schema';
commit;
