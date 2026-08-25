-- Remote migration version: 20260823154343.
-- Registration is coordinated through a short-lived, server-only intent. The
-- Auth insert and every public profile row are then committed atomically by the
-- database trigger below.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.registration_intent (
  token uuid primary key default gen_random_uuid(),
  normalized_email text not null check (
    normalized_email = lower(btrim(normalized_email))
    and char_length(normalized_email) between 3 and 254
  ),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  constraint registration_intent_valid_lifetime check (expires_at > created_at)
);

alter table private.registration_intent enable row level security;
create index registration_intent_expires_at_idx
  on private.registration_intent (expires_at);

grant usage on schema private to service_role;
grant select, insert, delete on private.registration_intent to service_role;

create or replace function public.prepare_registration(
  p_email text,
  p_payload jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token uuid;
  v_selected jsonb;
  v_profiles jsonb;
  v_primary text;
  v_selected_count integer;
  v_registrable_count integer;
begin
  if p_email is null
     or lower(btrim(p_email)) <> p_email
     or char_length(p_email) not between 3 and 254 then
    raise exception using errcode = '22023', message = 'invalid registration email';
  end if;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
     or p_payload ->> 'version' <> '1' then
    raise exception using errcode = '22023', message = 'invalid registration payload';
  end if;

  v_selected := p_payload -> 'selectedProfileTypes';
  v_profiles := p_payload -> 'profiles';
  v_primary := p_payload ->> 'primaryProfileType';

  if jsonb_typeof(v_selected) <> 'array'
     or jsonb_typeof(v_profiles) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid registration collections';
  end if;

  v_selected_count := jsonb_array_length(v_selected);
  if v_selected_count not between 1 and 5 then
    raise exception using errcode = '22023', message = 'invalid registration profile count';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(v_selected) as selected(profile_type)
    where selected.profile_type not in (
      'giocatore', 'squadra', 'staff-sportivo', 'professionisti-studi',
      'arbitro', 'creators', 'torneo-evento', 'campi-impianti-sportivi'
    )
  ) or (
    select count(distinct selected.profile_type)
    from jsonb_array_elements_text(v_selected) as selected(profile_type)
  ) <> v_selected_count then
    raise exception using errcode = '22023', message = 'invalid or duplicate registration profile type';
  end if;

  if v_primary is null or v_primary not in (
    'giocatore', 'squadra', 'staff-sportivo', 'arbitro',
    'torneo-evento', 'campi-impianti-sportivi'
  ) or not (v_selected ? v_primary) then
    raise exception using errcode = '22023', message = 'invalid primary profile type';
  end if;

  select count(*)::integer
  into v_registrable_count
  from jsonb_array_elements_text(v_selected) as selected(profile_type)
  where selected.profile_type in (
    'giocatore', 'squadra', 'staff-sportivo', 'arbitro',
    'torneo-evento', 'campi-impianti-sportivi'
  );

  if v_registrable_count = 0
     or jsonb_array_length(v_profiles) <> v_registrable_count
     or exists (
       select 1
       from jsonb_array_elements(v_profiles) as profile(value)
       where jsonb_typeof(profile.value) <> 'object'
          or profile.value ->> 'type' not in (
            'giocatore', 'squadra', 'staff-sportivo', 'arbitro',
            'torneo-evento', 'campi-impianti-sportivi'
          )
          or jsonb_typeof(profile.value -> 'draft') <> 'object'
          or jsonb_typeof(profile.value -> 'locations') <> 'array'
     )
     or (
       select count(distinct profile.value ->> 'type')
       from jsonb_array_elements(v_profiles) as profile(value)
     ) <> v_registrable_count
     or exists (
       select selected.profile_type
       from jsonb_array_elements_text(v_selected) as selected(profile_type)
       where selected.profile_type in (
         'giocatore', 'squadra', 'staff-sportivo', 'arbitro',
         'torneo-evento', 'campi-impianti-sportivi'
       )
       except
       select profile.value ->> 'type'
       from jsonb_array_elements(v_profiles) as profile(value)
     ) then
    raise exception using errcode = '22023', message = 'registration profiles do not match selection';
  end if;

  delete from private.registration_intent
  where expires_at <= now();

  insert into private.registration_intent (normalized_email, payload)
  values (p_email, p_payload)
  returning token into v_token;

  return v_token;
end;
$$;

create or replace function public.cancel_registration(p_token uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from private.registration_intent where token = p_token;
$$;

revoke all on function public.prepare_registration(text, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_registration(uuid) from public, anon, authenticated;
grant execute on function public.prepare_registration(text, jsonb) to service_role;
grant execute on function public.cancel_registration(uuid) to service_role;

-- Reconcile the existing Auth data before enforcing the one-to-one ownership
-- model. Orphan public users are intentionally removed; profiles referencing
-- them keep the existing ON DELETE SET NULL behavior.
delete from public.utente as public_user
where not exists (
  select 1 from auth.users as auth_user
  where auth_user.id = public_user.auth_user_uuid
);

insert into public.utente (
  auth_user_uuid,
  indirizzo_email,
  tipologia_utente,
  creato_il,
  ultima_modifica_il
)
select
  auth_user.id,
  lower(auth_user.email),
  'Utente',
  coalesce(auth_user.created_at, now()),
  now()
from auth.users as auth_user
where auth_user.email is not null
  and not exists (
    select 1 from public.utente as public_user
    where public_user.auth_user_uuid = auth_user.id
  );

insert into public.profilo (
  uuid_utente,
  creato_il,
  creato_da,
  ultima_modifica_il,
  ultima_modifica_da,
  nascosto
)
select
  public_user.auth_user_uuid,
  now(),
  public_user.auth_user_uuid,
  now(),
  public_user.auth_user_uuid,
  false
from public.utente as public_user
where not exists (
  select 1 from public.profilo as profile
  where profile.uuid_utente = public_user.auth_user_uuid
);

update public.utente
set
  creato_il = coalesce(creato_il, now()),
  ultima_modifica_il = coalesce(ultima_modifica_il, now());

update public.profilo
set
  creato_il = coalesce(creato_il, now()),
  ultima_modifica_il = coalesce(ultima_modifica_il, now()),
  nascosto = coalesce(nascosto, false);

update public.profilo_giocatore set nascosto = false where nascosto is null;
update public.profilo_squadra set nascosto = false where nascosto is null;
update public.profilo_staff_sportivo set nascosto = false where nascosto is null;
update public.profilo_professionista_studente set nascosto = false where nascosto is null;
update public.profilo_arbitro set nascosto = false where nascosto is null;
update public.profilo_creator set nascosto = false where nascosto is null;
update public.profilo_torneo_evento set nascosto = false where nascosto is null;
update public.profilo_campi_impianti set nascosto = false where nascosto is null;

alter table public.utente
  alter column auth_user_uuid drop default,
  alter column creato_il set not null,
  alter column ultima_modifica_il set not null,
  add constraint utente_auth_user_uuid_fkey
    foreign key (auth_user_uuid) references auth.users(id) on delete cascade;

alter table public.profilo
  alter column creato_il set default now(),
  alter column creato_il set not null,
  alter column ultima_modifica_il set default now(),
  alter column ultima_modifica_il set not null,
  alter column nascosto set default false,
  alter column nascosto set not null,
  add constraint profilo_tipologia_principale_check check (
    tipologia_principale is null or tipologia_principale in (
      'giocatore', 'squadra', 'staff-sportivo', 'professionisti-studi',
      'arbitro', 'creators', 'torneo-evento', 'campi-impianti-sportivi'
    )
  );

alter table public.profilo_giocatore alter column nascosto set not null;
alter table public.profilo_squadra alter column nascosto set not null;
alter table public.profilo_staff_sportivo alter column nascosto set not null;
alter table public.profilo_professionista_studente alter column nascosto set not null;
alter table public.profilo_arbitro alter column nascosto set not null;
alter table public.profilo_creator alter column nascosto set not null;
alter table public.profilo_torneo_evento alter column nascosto set not null;
alter table public.profilo_campi_impianti
  alter column nascosto set not null,
  alter column costo_partenza type numeric(10, 2)
    using costo_partenza::numeric(10, 2),
  add constraint profilo_campi_impianti_costo_partenza_check
    check (costo_partenza is null or costo_partenza >= 0);

alter table public.localita_profilo
  add constraint localita_profilo_sottoprofilo_check check (
    (sottoprofilo is null and id_sottoprofilo is null)
    or (
      sottoprofilo in (
        'giocatore', 'squadra', 'staff-sportivo', 'professionisti-studi',
        'arbitro', 'creators', 'torneo-evento', 'campi-impianti-sportivi'
      )
      and id_sottoprofilo is not null
    )
  );

create unique index profilo_uuid_utente_key
  on public.profilo (uuid_utente);
create unique index profilo_giocatore_uuid_profilo_key
  on public.profilo_giocatore (uuid_profilo);
create unique index profilo_squadra_uuid_profilo_key
  on public.profilo_squadra (uuid_profilo);
create unique index profilo_staff_sportivo_uuid_profilo_key
  on public.profilo_staff_sportivo (uuid_profilo);
create unique index profilo_professionista_studente_uuid_profilo_key
  on public.profilo_professionista_studente (uuid_profilo);
create unique index profilo_arbitro_uuid_profilo_key
  on public.profilo_arbitro (uuid_profilo);
create unique index profilo_creator_uuid_profilo_key
  on public.profilo_creator (uuid_profilo);
create unique index profilo_torneo_evento_uuid_profilo_key
  on public.profilo_torneo_evento (uuid_profilo);
create unique index profilo_campi_impianti_uuid_profilo_key
  on public.profilo_campi_impianti (uuid_profilo);
create unique index localita_profilo_unique_location_idx
  on public.localita_profilo (
    uuid_profilo,
    coalesce(sottoprofilo, ''),
    coalesce(id_sottoprofilo, 0),
    regione,
    coalesce(citta, '')
  );

create index profilo_creato_da_idx on public.profilo (creato_da);
create index profilo_ultima_modifica_da_idx on public.profilo (ultima_modifica_da);
create index profilo_giocatore_sport_principale_idx on public.profilo_giocatore (sport_principale);
create index profilo_squadra_sport_principale_idx on public.profilo_squadra (sport_principale);
create index profilo_staff_sportivo_sport_principale_idx on public.profilo_staff_sportivo (sport_principale);
create index profilo_professionista_studente_sport_principale_idx on public.profilo_professionista_studente (sport_principale);
create index profilo_arbitro_sport_principale_idx on public.profilo_arbitro (sport_principale);
create index profilo_creator_sport_principale_idx on public.profilo_creator (sport_principale);
create index profilo_torneo_evento_sport_principale_idx on public.profilo_torneo_evento (sport_principale);
create index profilo_campi_impianti_sport_principale_idx on public.profilo_campi_impianti (sport_principale);
create index link_social_profilo_uuid_profilo_idx on public.link_social_profilo (uuid_profilo);

create or replace function private.provision_auth_user(
  p_user_id uuid,
  p_email text,
  p_payload jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_primary_type text;
  v_profile jsonb;
  v_draft jsonb;
  v_type text;
  v_subprofile_id bigint;
begin
  if p_user_id is null or p_email is null then
    raise exception using errcode = '22023', message = 'an Auth user id and email are required';
  end if;

  v_primary_type := case when p_payload is null then null else p_payload ->> 'primaryProfileType' end;

  insert into public.utente (
    auth_user_uuid,
    indirizzo_email,
    tipologia_utente,
    creato_il,
    ultima_modifica_il
  )
  values (p_user_id, lower(p_email), 'Utente', now(), now())
  on conflict (auth_user_uuid) do update
  set
    indirizzo_email = excluded.indirizzo_email,
    ultima_modifica_il = now();

  insert into public.profilo (
    uuid_utente,
    creato_il,
    creato_da,
    ultima_modifica_il,
    ultima_modifica_da,
    nascosto,
    tipologia_principale
  )
  values (
    p_user_id,
    now(),
    p_user_id,
    now(),
    p_user_id,
    false,
    v_primary_type
  )
  on conflict (uuid_utente) do update
  set
    ultima_modifica_il = now(),
    ultima_modifica_da = excluded.ultima_modifica_da,
    tipologia_principale = coalesce(excluded.tipologia_principale, public.profilo.tipologia_principale)
  returning uuid into v_profile_id;

  if p_payload is null then
    return;
  end if;

  for v_profile in
    select profile.value
    from jsonb_array_elements(p_payload -> 'profiles') as profile(value)
  loop
    v_type := v_profile ->> 'type';
    v_draft := v_profile -> 'draft';
    v_subprofile_id := null;

    case v_type
      when 'giocatore' then
        insert into public.profilo_giocatore (
          uuid_profilo, sport_principale, nome, cognome, anno_nascita,
          mese_nascita, giorno_nascita, disponibilita, presentazione,
          tipologie_sport, ruoli_sport, piede_principale, altezza, peso,
          storico_carriera, nascosto
        ) values (
          v_profile_id,
          v_draft ->> 'sport_principale',
          v_draft ->> 'nome',
          v_draft ->> 'cognome',
          v_draft ->> 'anno_nascita',
          v_draft ->> 'mese_nascita',
          v_draft ->> 'giorno_nascita',
          v_draft ->> 'disponibilita',
          v_draft ->> 'presentazione',
          array(select jsonb_array_elements_text(coalesce(v_draft -> 'tipologie_sport', '[]'::jsonb))),
          v_draft -> 'ruoli_sport',
          v_draft ->> 'piede_principale',
          v_draft ->> 'altezza',
          v_draft ->> 'peso',
          v_draft -> 'storico_carriera',
          false
        )
        on conflict (uuid_profilo) do update set
          sport_principale = excluded.sport_principale,
          nome = excluded.nome,
          cognome = excluded.cognome,
          anno_nascita = excluded.anno_nascita,
          mese_nascita = excluded.mese_nascita,
          giorno_nascita = excluded.giorno_nascita,
          disponibilita = excluded.disponibilita,
          presentazione = excluded.presentazione,
          tipologie_sport = excluded.tipologie_sport,
          ruoli_sport = excluded.ruoli_sport,
          piede_principale = excluded.piede_principale,
          altezza = excluded.altezza,
          peso = excluded.peso,
          storico_carriera = excluded.storico_carriera
        returning id into v_subprofile_id;

      when 'squadra' then
        insert into public.profilo_squadra (
          uuid_profilo, sport_principale, nome_societa, tipologie_sport,
          sede_principale, presentazione, nascosto
        ) values (
          v_profile_id,
          v_draft ->> 'sport_principale',
          v_draft ->> 'nome_societa',
          array(select jsonb_array_elements_text(coalesce(v_draft -> 'tipologie_sport', '[]'::jsonb))),
          v_draft ->> 'sede_principale',
          v_draft ->> 'presentazione',
          false
        )
        on conflict (uuid_profilo) do update set
          sport_principale = excluded.sport_principale,
          nome_societa = excluded.nome_societa,
          tipologie_sport = excluded.tipologie_sport,
          sede_principale = excluded.sede_principale,
          presentazione = excluded.presentazione
        returning id into v_subprofile_id;

      when 'staff-sportivo' then
        insert into public.profilo_staff_sportivo (
          uuid_profilo, sport_principale, nome, cognome, anno_nascita,
          mese_nascita, giorno_nascita, disponibilita, presentazione,
          figure_professionali, storico_esperienze, nascosto
        ) values (
          v_profile_id,
          v_draft ->> 'sport_principale',
          v_draft ->> 'nome',
          v_draft ->> 'cognome',
          v_draft ->> 'anno_nascita',
          v_draft ->> 'mese_nascita',
          v_draft ->> 'giorno_nascita',
          v_draft ->> 'disponibilita',
          v_draft ->> 'presentazione',
          array(select jsonb_array_elements_text(coalesce(v_draft -> 'figure_professionali', '[]'::jsonb))),
          v_draft -> 'storico_esperienze',
          false
        )
        on conflict (uuid_profilo) do update set
          sport_principale = excluded.sport_principale,
          nome = excluded.nome,
          cognome = excluded.cognome,
          anno_nascita = excluded.anno_nascita,
          mese_nascita = excluded.mese_nascita,
          giorno_nascita = excluded.giorno_nascita,
          disponibilita = excluded.disponibilita,
          presentazione = excluded.presentazione,
          figure_professionali = excluded.figure_professionali,
          storico_esperienze = excluded.storico_esperienze
        returning id into v_subprofile_id;

      when 'arbitro' then
        insert into public.profilo_arbitro (
          uuid_profilo, sport_principale, nome, cognome, anno_nascita,
          mese_nascita, giorno_nascita, disponibilita, presentazione,
          storico_esperienze, nascosto
        ) values (
          v_profile_id,
          v_draft ->> 'sport_principale',
          v_draft ->> 'nome',
          v_draft ->> 'cognome',
          v_draft ->> 'anno_nascita',
          v_draft ->> 'mese_nascita',
          v_draft ->> 'giorno_nascita',
          v_draft ->> 'disponibilita',
          v_draft ->> 'presentazione',
          v_draft -> 'storico_esperienze',
          false
        )
        on conflict (uuid_profilo) do update set
          sport_principale = excluded.sport_principale,
          nome = excluded.nome,
          cognome = excluded.cognome,
          anno_nascita = excluded.anno_nascita,
          mese_nascita = excluded.mese_nascita,
          giorno_nascita = excluded.giorno_nascita,
          disponibilita = excluded.disponibilita,
          presentazione = excluded.presentazione,
          storico_esperienze = excluded.storico_esperienze
        returning id into v_subprofile_id;

      when 'torneo-evento' then
        insert into public.profilo_torneo_evento (
          uuid_profilo, sport_principale, nome_organizzazione,
          tipologie_sport, sede_principale, presentazione, nascosto
        ) values (
          v_profile_id,
          v_draft ->> 'sport_principale',
          v_draft ->> 'nome_organizzazione',
          array(select jsonb_array_elements_text(coalesce(v_draft -> 'tipologie_sport', '[]'::jsonb))),
          v_draft ->> 'sede_principale',
          v_draft ->> 'presentazione',
          false
        )
        on conflict (uuid_profilo) do update set
          sport_principale = excluded.sport_principale,
          nome_organizzazione = excluded.nome_organizzazione,
          tipologie_sport = excluded.tipologie_sport,
          sede_principale = excluded.sede_principale,
          presentazione = excluded.presentazione
        returning id into v_subprofile_id;

      when 'campi-impianti-sportivi' then
        insert into public.profilo_campi_impianti (
          uuid_profilo, sport_principale, nome_organizzazione,
          tipologie_sport, sede_principale, presentazione, orari,
          costo_partenza, servizi_inclusi, info_aggiuntive, nascosto
        ) values (
          v_profile_id,
          v_draft ->> 'sport_principale',
          v_draft ->> 'nome_organizzazione',
          array(select jsonb_array_elements_text(coalesce(v_draft -> 'tipologie_sport', '[]'::jsonb))),
          v_draft ->> 'sede_principale',
          v_draft ->> 'presentazione',
          v_draft -> 'orari',
          (v_draft ->> 'costo_partenza')::numeric(10, 2),
          v_draft ->> 'servizi_inclusi',
          v_draft ->> 'info_aggiuntive',
          false
        )
        on conflict (uuid_profilo) do update set
          sport_principale = excluded.sport_principale,
          nome_organizzazione = excluded.nome_organizzazione,
          tipologie_sport = excluded.tipologie_sport,
          sede_principale = excluded.sede_principale,
          presentazione = excluded.presentazione,
          orari = excluded.orari,
          costo_partenza = excluded.costo_partenza,
          servizi_inclusi = excluded.servizi_inclusi,
          info_aggiuntive = excluded.info_aggiuntive
        returning id into v_subprofile_id;

      else
        raise exception using errcode = '22023', message = 'unsupported registration profile type';
    end case;

    delete from public.localita_profilo
    where uuid_profilo = v_profile_id
      and sottoprofilo = v_type;

    insert into public.localita_profilo (
      uuid_profilo,
      sottoprofilo,
      id_sottoprofilo,
      regione,
      citta
    )
    select
      v_profile_id,
      v_type,
      v_subprofile_id,
      location.value ->> 'regione',
      location.value ->> 'citta'
    from jsonb_array_elements(v_profile -> 'locations') as location(value);
  end loop;
end;
$$;

revoke all on function private.provision_auth_user(uuid, text, jsonb) from public, anon, authenticated, service_role;

create or replace function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent_text text;
  v_intent_token uuid;
  v_payload jsonb;
begin
  if new.email is null then
    return new;
  end if;

  v_intent_text := new.raw_user_meta_data ->> 'registration_intent';

  if v_intent_text is not null then
    if v_intent_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'invalid registration intent';
    end if;

    v_intent_token := v_intent_text::uuid;

    delete from private.registration_intent
    where token = v_intent_token
      and expires_at > now()
      and normalized_email = lower(new.email)
    returning payload into v_payload;

    if v_payload is null then
      raise exception using errcode = '22023', message = 'registration intent is missing, expired, or belongs to another email';
    end if;
  end if;

  perform private.provision_auth_user(new.id, new.email, v_payload);

  if v_intent_text is not null then
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'registration_intent'
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_auth_user_created() from public, anon, authenticated, service_role;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_auth_user_created();

create or replace function private.handle_auth_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.utente
    set indirizzo_email = lower(new.email), ultima_modifica_il = now()
    where auth_user_uuid = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_auth_user_email_updated() from public, anon, authenticated, service_role;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function private.handle_auth_user_email_updated();

-- Public profile data is readable only by its owner for now. All writes are
-- performed by the registration trigger through the server-only role.
revoke all on table public.utente from anon, authenticated;
revoke all on table public.profilo from anon, authenticated;
revoke all on table public.profilo_giocatore from anon, authenticated;
revoke all on table public.profilo_squadra from anon, authenticated;
revoke all on table public.profilo_staff_sportivo from anon, authenticated;
revoke all on table public.profilo_professionista_studente from anon, authenticated;
revoke all on table public.profilo_arbitro from anon, authenticated;
revoke all on table public.profilo_creator from anon, authenticated;
revoke all on table public.profilo_torneo_evento from anon, authenticated;
revoke all on table public.profilo_campi_impianti from anon, authenticated;
revoke all on table public.localita_profilo from anon, authenticated;
revoke all on table public.link_social_profilo from anon, authenticated;

grant select on table public.utente to authenticated;
grant select on table public.profilo to authenticated;
grant select on table public.profilo_giocatore to authenticated;
grant select on table public.profilo_squadra to authenticated;
grant select on table public.profilo_staff_sportivo to authenticated;
grant select on table public.profilo_professionista_studente to authenticated;
grant select on table public.profilo_arbitro to authenticated;
grant select on table public.profilo_creator to authenticated;
grant select on table public.profilo_torneo_evento to authenticated;
grant select on table public.profilo_campi_impianti to authenticated;
grant select on table public.localita_profilo to authenticated;
grant select on table public.link_social_profilo to authenticated;

grant all on table public.utente to service_role;
grant all on table public.profilo to service_role;
grant all on table public.profilo_giocatore to service_role;
grant all on table public.profilo_squadra to service_role;
grant all on table public.profilo_staff_sportivo to service_role;
grant all on table public.profilo_professionista_studente to service_role;
grant all on table public.profilo_arbitro to service_role;
grant all on table public.profilo_creator to service_role;
grant all on table public.profilo_torneo_evento to service_role;
grant all on table public.profilo_campi_impianti to service_role;
grant all on table public.localita_profilo to service_role;
grant all on table public.link_social_profilo to service_role;

grant usage, select on sequence public.profilo_giocatore_id_seq to service_role;
grant usage, select on sequence public.profilo_squadra_id_seq to service_role;
grant usage, select on sequence public.profilo_staff_sportivo_id_seq to service_role;
grant usage, select on sequence public.profilo_professionisti_studenti_id_seq to service_role;
grant usage, select on sequence public.profilo_arbitro_id_seq to service_role;
grant usage, select on sequence public.profilo_creators_id_seq to service_role;
grant usage, select on sequence public.profilo_torneo_evento_id_seq to service_role;
grant usage, select on sequence public.profilo_campi_impianti_id_seq to service_role;
grant usage, select on sequence public.localita_profilo_id_seq to service_role;
grant usage, select on sequence public.link_social_id_seq to service_role;

create policy utente_select_own
  on public.utente
  for select
  to authenticated
  using (auth_user_uuid = (select auth.uid()));

create policy profilo_select_own
  on public.profilo
  for select
  to authenticated
  using (uuid_utente = (select auth.uid()));

create policy profilo_giocatore_select_own
  on public.profilo_giocatore
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_giocatore.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy profilo_squadra_select_own
  on public.profilo_squadra
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_squadra.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy profilo_staff_sportivo_select_own
  on public.profilo_staff_sportivo
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_staff_sportivo.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy profilo_professionista_studente_select_own
  on public.profilo_professionista_studente
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_professionista_studente.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy profilo_arbitro_select_own
  on public.profilo_arbitro
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_arbitro.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy profilo_creator_select_own
  on public.profilo_creator
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_creator.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy profilo_torneo_evento_select_own
  on public.profilo_torneo_evento
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_torneo_evento.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy profilo_campi_impianti_select_own
  on public.profilo_campi_impianti
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = profilo_campi_impianti.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy localita_profilo_select_own
  on public.localita_profilo
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = localita_profilo.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));

create policy link_social_profilo_select_own
  on public.link_social_profilo
  for select
  to authenticated
  using (exists (
    select 1 from public.profilo
    where profilo.uuid = link_social_profilo.uuid_profilo
      and profilo.uuid_utente = (select auth.uid())
  ));
