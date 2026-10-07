begin;

alter table public.profilo_giocatore
  add column if not exists highlights_privati boolean not null default false;

comment on column public.profilo_giocatore.highlights_privati is
  'Il giocatore rende disponibili i video highlights solamente tramite contatto privato.';

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'profilo_giocatore_highlights_options_exclusive'
      and conrelid = 'public.profilo_giocatore'::regclass
  ) then
    alter table public.profilo_giocatore
      add constraint profilo_giocatore_highlights_options_exclusive
      check (not (highlights_privati and richiede_caricamento_highlights));
  end if;
end;
$$;

create or replace function private.public_profile_name_v1(p_type text, p_anonymous boolean, p_name text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case when p_anonymous then case p_type
    when 'giocatore' then 'Giocatore'
    when 'squadra' then 'Squadra'
    when 'staff-sportivo' then 'Staff sportivo'
    when 'arbitro' then 'Arbitro'
    else p_name end
  else p_name end;
$$;

-- Keep the previous writer compatible when moving from private videos to an
-- upload request: both flags change atomically before the CHECK is evaluated.
create or replace function private.save_player_highlights_request_for_profile_v1(
  p_profile_id uuid, p_profile_type text, p_requested boolean
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_profile_type <> 'giocatore' then
    if coalesce(p_requested, false) then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
    end if;
    return;
  end if;
  if p_profile_id is null then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;
  update public.profilo_giocatore
  set richiede_caricamento_highlights = coalesce(p_requested, false),
      highlights_privati = case when coalesce(p_requested, false) then false else highlights_privati end
  where uuid_profilo = p_profile_id;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  if coalesce(p_requested, false) then
    delete from public.media_profilo where uuid_profilo = p_profile_id and formato_media = 'video_highlights';
  end if;
end;
$$;

-- Invoked only inside the existing ownership-checked profile/publication RPCs.
create or replace function private.save_player_highlights_settings_v1(
  p_profile_id uuid, p_profile_type text, p_draft jsonb
)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_private boolean; v_requested boolean;
begin
  if p_profile_type <> 'giocatore' then return; end if;
  if p_profile_id is null or p_draft is null
    or pg_catalog.jsonb_typeof(p_draft) is distinct from 'object'
    or (p_draft ? 'highlights_privati' and pg_catalog.jsonb_typeof(p_draft -> 'highlights_privati') is distinct from 'boolean')
    or (p_draft ? 'richiede_caricamento_highlights' and pg_catalog.jsonb_typeof(p_draft -> 'richiede_caricamento_highlights') is distinct from 'boolean') then
    raise exception using errcode = '22023', message = 'INVALID_PLAYER_HIGHLIGHTS_SETTINGS';
  end if;
  v_private := coalesce((p_draft ->> 'highlights_privati')::boolean, false);
  v_requested := coalesce((p_draft ->> 'richiede_caricamento_highlights')::boolean, false);
  if v_private and v_requested then
    raise exception using errcode = '22023', message = 'INVALID_PLAYER_HIGHLIGHTS_SETTINGS';
  end if;
  update public.profilo_giocatore
  set highlights_privati = v_private, richiede_caricamento_highlights = v_requested
  where uuid_profilo = p_profile_id;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  if v_private or v_requested then
    delete from public.media_profilo where uuid_profilo = p_profile_id and formato_media = 'video_highlights';
  end if;
end;
$$;

create or replace function private.finalize_player_highlights_visibility_v1(p_result jsonb, p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_profile_id uuid; v_draft jsonb;
begin
  if p_payload ->> 'profile_type' is distinct from 'giocatore'
    or p_result ->> 'status' is distinct from 'success'
    or coalesce((p_result ->> 'idempotent')::boolean, false) then return; end if;
  if pg_catalog.jsonb_typeof(p_payload -> 'profile_draft') = 'object' then
    v_draft := p_payload -> 'profile_draft';
  elsif pg_catalog.jsonb_typeof(p_payload -> 'profile_update' -> 'draft') = 'object' then
    v_draft := p_payload -> 'profile_update' -> 'draft';
  else return;
  end if;
  select autore_annuncio into v_profile_id from public.annuncio where uuid = (p_result ->> 'announcementId')::uuid;
  if v_profile_id is null then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  perform private.save_player_highlights_settings_v1(v_profile_id, 'giocatore', v_draft);
end;
$$;

-- Extend installed writers without losing prior ownership, anonymity, contacts,
-- region restrictions or idempotency handling.
do $migration$
declare v_definition text; v_anchor text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_owned_subprofile_internal_v1(uuid,text,jsonb,jsonb)')) into v_definition;
  v_anchor := '  return v_result;';
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Player highlights profile writer insertion point not found';
  end if;
  if pg_catalog.strpos(v_definition, 'perform private.save_player_highlights_settings_v1(') = 0 then
    execute pg_catalog.replace(v_definition, v_anchor,
      '  perform private.save_player_highlights_settings_v1(v_profile_id, p_profile_type, p_draft);' || chr(10) || v_anchor);
  end if;

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')) into v_definition;
  v_anchor := '  perform private.finalize_updated_profile_fields_v1(v_result, p_payload);';
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Player highlights publication insertion point not found';
  end if;
  if pg_catalog.strpos(v_definition, 'perform private.finalize_player_highlights_visibility_v1(') = 0 then
    execute pg_catalog.replace(v_definition, v_anchor,
      '  perform private.finalize_player_highlights_visibility_v1(v_result, p_payload);' || chr(10) || v_anchor);
  end if;
end;
$migration$;

revoke all on function private.save_player_highlights_settings_v1(uuid,text,jsonb),
  private.finalize_player_highlights_visibility_v1(jsonb,jsonb),
  private.save_player_highlights_request_for_profile_v1(uuid,text,boolean),
  private.public_profile_name_v1(text,boolean,text)
  from public, anon, authenticated, service_role;
grant execute on function private.save_player_highlights_settings_v1(uuid,text,jsonb),
  private.finalize_player_highlights_visibility_v1(jsonb,jsonb),
  private.save_player_highlights_request_for_profile_v1(uuid,text,boolean),
  private.public_profile_name_v1(text,boolean,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
