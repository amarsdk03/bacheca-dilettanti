-- Contact details are private. Only the server can write interests or read
-- them for the future recipient notification center.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.manifestazioni_interesse (
  id bigint generated always as identity primary key,
  uuid_utente_mittente uuid not null references public.utente(utente_uuid) on delete cascade,
  uuid_profilo_mittente uuid not null references public.profilo(uuid) on delete cascade,
  sottoprofilo_mittente text not null,
  id_sottoprofilo_mittente bigint not null,
  uuid_utente_destinatario uuid not null references public.utente(utente_uuid) on delete cascade,
  uuid_annuncio uuid references public.annuncio(uuid) on delete cascade,
  uuid_profilo_destinatario uuid references public.profilo(uuid) on delete cascade,
  sottoprofilo_destinatario text,
  email text,
  telefono text,
  conferma_titolarita boolean not null check (conferma_titolarita is true),
  consenso_condivisione boolean not null check (consenso_condivisione is true),
  versione_consensi text not null check (versione_consensi = '2026-10-05-v1'),
  creato_il timestamptz not null default now(),
  constraint interessi_destinatario_check check (
    num_nonnulls(uuid_annuncio, uuid_profilo_destinatario) = 1
    and ((uuid_profilo_destinatario is not null and sottoprofilo_destinatario is not null)
      or (uuid_annuncio is not null and sottoprofilo_destinatario is null))
  ),
  constraint interessi_no_self_check check (uuid_utente_mittente <> uuid_utente_destinatario),
  constraint interessi_mittente_type_check check (sottoprofilo_mittente in
    ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators')),
  constraint interessi_destinatario_type_check check (sottoprofilo_destinatario is null or sottoprofilo_destinatario in
    ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators')),
  constraint interessi_contatto_check check (num_nonnulls(email, telefono) >= 1),
  constraint interessi_email_check check (email is null or (
    email = lower(btrim(email)) and char_length(email) between 3 and 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  constraint interessi_telefono_check check (telefono is null or (
    telefono = btrim(telefono) and char_length(telefono) between 6 and 40
    and telefono ~ '^[+\d().\s-]+$' and char_length(regexp_replace(telefono, '\D', '', 'g')) between 6 and 20))
);

comment on table private.manifestazioni_interesse is 'Interessi con recapiti condivisi e conferme esplicite, destinati al futuro Centro notifiche.';
comment on column private.manifestazioni_interesse.versione_consensi is '2026-10-05-v1: conferma titolarità/autorizzazione e consenso condivisione; testi in interest-model.ts.';

create index interessi_mittente_giorno_idx on private.manifestazioni_interesse (uuid_utente_mittente, creato_il desc);
create index interessi_mittente_annuncio_idx on private.manifestazioni_interesse (uuid_utente_mittente, uuid_annuncio, creato_il desc) where uuid_annuncio is not null;
create index interessi_mittente_sottoprofilo_idx on private.manifestazioni_interesse (uuid_utente_mittente, uuid_profilo_destinatario, sottoprofilo_destinatario, creato_il desc) where uuid_profilo_destinatario is not null;
create index interessi_destinatario_idx on private.manifestazioni_interesse (uuid_utente_destinatario, creato_il desc);
create index interessi_profilo_mittente_idx on private.manifestazioni_interesse (uuid_profilo_mittente);
create index interessi_annuncio_idx on private.manifestazioni_interesse (uuid_annuncio) where uuid_annuncio is not null;
create index interessi_profilo_destinatario_idx on private.manifestazioni_interesse (uuid_profilo_destinatario) where uuid_profilo_destinatario is not null;

alter table private.manifestazioni_interesse enable row level security;
alter table private.manifestazioni_interesse force row level security;
revoke all on table private.manifestazioni_interesse from public, anon, authenticated;
revoke all on sequence private.manifestazioni_interesse_id_seq from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert on table private.manifestazioni_interesse to service_role;
grant usage, select on sequence private.manifestazioni_interesse_id_seq to service_role;

-- Static allowlist: no user-supplied table identifiers or dynamic SQL.
create function private.interest_subprofile_id(p_profile_uuid uuid, p_type text)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare v_id bigint;
begin
  case p_type
    when 'giocatore' then select id into v_id from public.profilo_giocatore where uuid_profilo = p_profile_uuid and nascosto is false for share;
    when 'squadra' then select id into v_id from public.profilo_squadra where uuid_profilo = p_profile_uuid and nascosto is false for share;
    when 'staff-sportivo' then select id into v_id from public.profilo_staff_sportivo where uuid_profilo = p_profile_uuid and nascosto is false for share;
    when 'arbitro' then select id into v_id from public.profilo_arbitro where uuid_profilo = p_profile_uuid and nascosto is false for share;
    when 'torneo-evento' then select id into v_id from public.profilo_torneo_evento where uuid_profilo = p_profile_uuid and nascosto is false for share;
    when 'campi-impianti-sportivi' then select id into v_id from public.profilo_campi_impianti where uuid_profilo = p_profile_uuid and nascosto is false for share;
    when 'servizi-consulenze' then select id into v_id from public.profilo_servizi_consulenze where uuid_profilo = p_profile_uuid and nascosto is false for share;
    when 'creators' then select id into v_id from public.profilo_creator where uuid_profilo = p_profile_uuid and nascosto is false for share;
    else return null;
  end case;
  return v_id;
end;
$$;
revoke all on function private.interest_subprofile_id(uuid, text) from public, anon, authenticated;
grant execute on function private.interest_subprofile_id(uuid, text) to service_role;

create function public.submit_manifestazione_interesse_v1(
  p_sender_user_uuid uuid,
  p_sender_profile_type text,
  p_target_kind text,
  p_target_uuid uuid,
  p_target_profile_type text,
  p_email text,
  p_phone text,
  p_ownership_consent boolean,
  p_sharing_consent boolean,
  p_consent_version text
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_sender_profile uuid;
  v_sender_child bigint;
  v_recipient_profile uuid;
  v_recipient_user uuid;
  v_last_interest timestamptz;
  v_email text := nullif(pg_catalog.lower(pg_catalog.btrim(p_email)), '');
  v_phone text := nullif(pg_catalog.btrim(p_phone), '');
begin
  if p_sender_user_uuid is null or p_target_uuid is null or p_target_kind is null
    or p_target_kind not in ('profilo', 'annuncio')
    or (p_target_kind = 'annuncio' and p_target_profile_type is not null)
    or p_ownership_consent is distinct from true or p_sharing_consent is distinct from true
    or p_consent_version is distinct from '2026-10-05-v1' then
    raise exception 'Invalid interest parameters or consents.' using errcode = '22023';
  end if;
  if (v_email is null and v_phone is null)
    or (v_email is not null and (pg_catalog.char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'))
    or (v_phone is not null and (pg_catalog.char_length(v_phone) > 40 or v_phone !~ '^[+\d().\s-]+$'
      or pg_catalog.char_length(pg_catalog.regexp_replace(v_phone, '\D', '', 'g')) not between 6 and 20)) then
    raise exception 'Invalid interest contacts.' using errcode = '22023';
  end if;

  -- One lock per app user covers both target cooldowns and the GLOBAL daily
  -- quota, even when simultaneous submissions select different subprofiles.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('interesse:' || p_sender_user_uuid::text, 0));
  v_now := pg_catalog.clock_timestamp();
  v_day_start := pg_catalog.date_trunc('day', v_now at time zone 'Europe/Rome') at time zone 'Europe/Rome';
  v_day_end := (pg_catalog.date_trunc('day', v_now at time zone 'Europe/Rome') + interval '1 day') at time zone 'Europe/Rome';

  select p.uuid into v_sender_profile from public.profilo p join public.utente u on u.utente_uuid = p.uuid_utente
    where u.utente_uuid = p_sender_user_uuid and u.registrato_il is not null and p.nascosto is false for share of p, u;
  if v_sender_profile is null then return pg_catalog.jsonb_build_object('status', 'invalid_sender'); end if;
  v_sender_child := private.interest_subprofile_id(v_sender_profile, p_sender_profile_type);
  if v_sender_child is null then return pg_catalog.jsonb_build_object('status', 'invalid_sender'); end if;

  if p_target_kind = 'annuncio' then
    select autore_annuncio into v_recipient_profile from public.annuncio
      where uuid = p_target_uuid and stato_annuncio = 'pubblicato' and nascosto is false and privato is false for share;
  else
    v_recipient_profile := p_target_uuid;
    if private.interest_subprofile_id(v_recipient_profile, p_target_profile_type) is null then
      return pg_catalog.jsonb_build_object('status', 'invalid_target');
    end if;
  end if;
  select p.uuid_utente into v_recipient_user from public.profilo p join public.utente u on u.utente_uuid = p.uuid_utente
    where p.uuid = v_recipient_profile and p.nascosto is false and u.registrato_il is not null for share of p, u;
  if v_recipient_user is null then return pg_catalog.jsonb_build_object('status', 'invalid_target'); end if;
  if v_recipient_user = p_sender_user_uuid then return pg_catalog.jsonb_build_object('status', 'own_target'); end if;

  select max(creato_il) into v_last_interest from private.manifestazioni_interesse
    where uuid_utente_mittente = p_sender_user_uuid
      and ((p_target_kind = 'annuncio' and uuid_annuncio = p_target_uuid)
        or (p_target_kind = 'profilo' and uuid_profilo_destinatario = p_target_uuid and sottoprofilo_destinatario = p_target_profile_type));
  -- A day is a duration here: 60 x 24 hours, independent of DST/session TZ.
  if v_last_interest + interval '1440 hours' > v_now then
    return pg_catalog.jsonb_build_object('status', 'target_limit', 'retryAt', v_last_interest + interval '1440 hours');
  end if;
  if (select count(*) from private.manifestazioni_interesse
      where uuid_utente_mittente = p_sender_user_uuid and creato_il >= v_day_start and creato_il < v_day_end) >= 10 then
    return pg_catalog.jsonb_build_object('status', 'daily_limit', 'retryAt', v_day_end);
  end if;

  insert into private.manifestazioni_interesse (
    uuid_utente_mittente, uuid_profilo_mittente, sottoprofilo_mittente, id_sottoprofilo_mittente,
    uuid_utente_destinatario, uuid_annuncio, uuid_profilo_destinatario, sottoprofilo_destinatario,
    email, telefono, conferma_titolarita, consenso_condivisione, versione_consensi, creato_il
  ) values (
    p_sender_user_uuid, v_sender_profile, p_sender_profile_type, v_sender_child,
    v_recipient_user, case when p_target_kind = 'annuncio' then p_target_uuid end,
    case when p_target_kind = 'profilo' then p_target_uuid end, p_target_profile_type,
    v_email, v_phone, p_ownership_consent, p_sharing_consent, p_consent_version, v_now
  );
  return pg_catalog.jsonb_build_object('status', 'success');
end;
$$;

revoke all on function public.submit_manifestazione_interesse_v1(uuid, text, text, uuid, text, text, text, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_manifestazione_interesse_v1(uuid, text, text, uuid, text, text, text, boolean, boolean, text) to service_role;
