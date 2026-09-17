-- Store reports outside the exposed API schema. Writes are accepted only
-- through the service-role RPC below, which also enforces the 24-hour quota.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.segnalazioni (
  id bigint generated always as identity primary key,
  uuid_annuncio uuid references public.annuncio(uuid) on delete cascade,
  uuid_profilo uuid references public.profilo(uuid) on delete cascade,
  uuid_utente_segnalatore uuid references public.utente(utente_uuid) on delete set null,
  chiave_anonima_hash text,
  motivazione text,
  creato_il timestamptz not null default now(),
  constraint segnalazioni_target_check check (
    pg_catalog.num_nonnulls(uuid_annuncio, uuid_profilo) = 1
  ),
  constraint segnalazioni_identity_check check (
    pg_catalog.num_nonnulls(uuid_utente_segnalatore, chiave_anonima_hash) <= 1
  ),
  constraint segnalazioni_chiave_anonima_hash_check check (
    chiave_anonima_hash is null
    or chiave_anonima_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint segnalazioni_motivazione_check check (
    motivazione is null
    or (
      motivazione = pg_catalog.btrim(motivazione)
      and pg_catalog.char_length(motivazione) between 1 and 300
    )
  )
);

comment on table private.segnalazioni is
  'Segnalazioni inviate sui singoli annunci e profili pubblici.';
comment on column private.segnalazioni.uuid_utente_segnalatore is
  'UUID interno dell utente autenticato; NULL per le segnalazioni anonime o se l utente viene eliminato.';
comment on column private.segnalazioni.chiave_anonima_hash is
  'Digest SHA-256 dello pseudonimo anonimo conservato nel cookie HttpOnly.';

-- Foreign-key indexes keep target/user deletions efficient.
create index segnalazioni_uuid_annuncio_idx
  on private.segnalazioni (uuid_annuncio);
create index segnalazioni_uuid_profilo_idx
  on private.segnalazioni (uuid_profilo);
create index segnalazioni_uuid_utente_segnalatore_idx
  on private.segnalazioni (uuid_utente_segnalatore);

-- These partial indexes cover every quota lookup without retaining raw
-- anonymous identifiers.
create index segnalazioni_utente_annuncio_quota_idx
  on private.segnalazioni (uuid_utente_segnalatore, uuid_annuncio, creato_il desc)
  where uuid_utente_segnalatore is not null and uuid_annuncio is not null;
create index segnalazioni_utente_profilo_quota_idx
  on private.segnalazioni (uuid_utente_segnalatore, uuid_profilo, creato_il desc)
  where uuid_utente_segnalatore is not null and uuid_profilo is not null;
create index segnalazioni_anonimo_annuncio_quota_idx
  on private.segnalazioni (chiave_anonima_hash, uuid_annuncio, creato_il desc)
  where chiave_anonima_hash is not null and uuid_annuncio is not null;
create index segnalazioni_anonimo_profilo_quota_idx
  on private.segnalazioni (chiave_anonima_hash, uuid_profilo, creato_il desc)
  where chiave_anonima_hash is not null and uuid_profilo is not null;

alter table private.segnalazioni enable row level security;
alter table private.segnalazioni force row level security;

revoke all on table private.segnalazioni from public, anon, authenticated;
revoke all on sequence private.segnalazioni_id_seq from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert on table private.segnalazioni to service_role;
grant usage, select on sequence private.segnalazioni_id_seq to service_role;

create or replace function public.submit_segnalazione_v1(
  p_target_kind text,
  p_target_uuid uuid,
  p_reporter_user_uuid uuid,
  p_anonymous_key_hash text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_identity_key text;
  v_last_report timestamptz;
begin
  if p_target_kind is null or p_target_kind not in ('annuncio', 'profilo') then
    raise exception 'Invalid report target kind.' using errcode = '22023';
  end if;

  if p_target_uuid is null then
    raise exception 'Invalid report target.' using errcode = '22023';
  end if;

  if pg_catalog.num_nonnulls(p_reporter_user_uuid, p_anonymous_key_hash) <> 1 then
    raise exception 'Invalid reporter identity.' using errcode = '22023';
  end if;

  if p_anonymous_key_hash is not null
    and p_anonymous_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid anonymous reporter hash.' using errcode = '22023';
  end if;

  if v_reason is not null and pg_catalog.char_length(v_reason) > 300 then
    raise exception 'Report reason is too long.' using errcode = '22023';
  end if;

  if p_target_kind = 'annuncio' then
    if not exists (
      select 1
      from public.annuncio
      where uuid = p_target_uuid
        and stato_annuncio = 'pubblicato'
        and nascosto is false
        and privato is false
    ) then
      return pg_catalog.jsonb_build_object('status', 'invalid_target');
    end if;
  elsif not exists (
    select 1
    from public.profilo
    where uuid = p_target_uuid
      and nascosto is false
      and uuid_utente is not null
  ) then
    return pg_catalog.jsonb_build_object('status', 'invalid_target');
  end if;

  if p_reporter_user_uuid is not null and not exists (
    select 1 from public.utente where utente_uuid = p_reporter_user_uuid
  ) then
    raise exception 'Invalid reporter user.' using errcode = '22023';
  end if;

  v_identity_key := case
    when p_reporter_user_uuid is not null then 'utente:' || p_reporter_user_uuid::text
    else 'anonimo:' || p_anonymous_key_hash
  end;

  -- Serialize reports for the same identity and target so concurrent requests
  -- cannot bypass the 24-hour quota.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'segnalazione:' || p_target_kind || ':' || p_target_uuid::text || ':' || v_identity_key,
      0
    )
  );

  if p_target_kind = 'annuncio' and p_reporter_user_uuid is not null then
    select creato_il into v_last_report
    from private.segnalazioni
    where uuid_annuncio = p_target_uuid
      and uuid_utente_segnalatore = p_reporter_user_uuid
    order by creato_il desc
    limit 1;
  elsif p_target_kind = 'annuncio' then
    select creato_il into v_last_report
    from private.segnalazioni
    where uuid_annuncio = p_target_uuid
      and chiave_anonima_hash = p_anonymous_key_hash
    order by creato_il desc
    limit 1;
  elsif p_reporter_user_uuid is not null then
    select creato_il into v_last_report
    from private.segnalazioni
    where uuid_profilo = p_target_uuid
      and uuid_utente_segnalatore = p_reporter_user_uuid
    order by creato_il desc
    limit 1;
  else
    select creato_il into v_last_report
    from private.segnalazioni
    where uuid_profilo = p_target_uuid
      and chiave_anonima_hash = p_anonymous_key_hash
    order by creato_il desc
    limit 1;
  end if;

  if v_last_report is not null and v_last_report + interval '24 hours' > v_now then
    return pg_catalog.jsonb_build_object(
      'status', 'rate_limited',
      'retryAt', v_last_report + interval '24 hours'
    );
  end if;

  insert into private.segnalazioni (
    uuid_annuncio,
    uuid_profilo,
    uuid_utente_segnalatore,
    chiave_anonima_hash,
    motivazione,
    creato_il
  ) values (
    case when p_target_kind = 'annuncio' then p_target_uuid end,
    case when p_target_kind = 'profilo' then p_target_uuid end,
    p_reporter_user_uuid,
    p_anonymous_key_hash,
    v_reason,
    v_now
  );

  return pg_catalog.jsonb_build_object('status', 'success');
end;
$$;

comment on function public.submit_segnalazione_v1(text, uuid, uuid, text, text) is
  'Inserisce una segnalazione e applica una quota di 24 ore per identita e bersaglio.';

revoke all on function public.submit_segnalazione_v1(text, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_segnalazione_v1(text, uuid, uuid, text, text)
  to service_role;
