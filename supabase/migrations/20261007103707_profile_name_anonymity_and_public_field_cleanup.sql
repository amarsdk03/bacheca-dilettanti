begin;

alter table public.profilo_giocatore add column nominativo_anonimo boolean not null default false;
alter table public.profilo_squadra add column nominativo_anonimo boolean not null default false;
alter table public.profilo_staff_sportivo add column nominativo_anonimo boolean not null default false;
alter table public.profilo_arbitro add column nominativo_anonimo boolean not null default false;

-- Internal writers run within the existing ownership-checked transactions.
create function private.save_profile_name_anonymity_v1(p_profile_id uuid, p_profile_type text, p_draft jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_enabled boolean;
begin
  if p_profile_type not in ('giocatore', 'squadra', 'staff-sportivo', 'arbitro') then return; end if;
  if p_draft is null or pg_catalog.jsonb_typeof(p_draft) is distinct from 'object'
    or (p_draft ? 'nominativo_anonimo' and pg_catalog.jsonb_typeof(p_draft -> 'nominativo_anonimo') is distinct from 'boolean') then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_NAME_ANONYMITY';
  end if;
  v_enabled := coalesce((p_draft ->> 'nominativo_anonimo')::boolean, false);
  case p_profile_type
    when 'giocatore' then update public.profilo_giocatore set nominativo_anonimo = v_enabled where uuid_profilo = p_profile_id;
    when 'squadra' then update public.profilo_squadra set nominativo_anonimo = v_enabled where uuid_profilo = p_profile_id;
    when 'staff-sportivo' then update public.profilo_staff_sportivo set nominativo_anonimo = v_enabled, storico_esperienze = '[]'::jsonb where uuid_profilo = p_profile_id;
    when 'arbitro' then update public.profilo_arbitro set nominativo_anonimo = v_enabled where uuid_profilo = p_profile_id;
  end case;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
end;
$$;

-- Registered profile updates use the owned writer; anonymous profiles also
-- need this sidecar. A publication without a draft retains the saved preference.
create function private.finalize_profile_name_anonymity_v1(p_result jsonb, p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_profile_id uuid; v_draft jsonb;
begin
  if p_result ->> 'status' is distinct from 'success'
    or coalesce((p_result ->> 'idempotent')::boolean, false) then return; end if;
  if pg_catalog.jsonb_typeof(p_payload -> 'profile_draft') = 'object' then
    v_draft := p_payload -> 'profile_draft';
  elsif pg_catalog.jsonb_typeof(p_payload -> 'profile_update' -> 'draft') = 'object' then
    v_draft := p_payload -> 'profile_update' -> 'draft';
  else
    return;
  end if;
  select autore_annuncio into v_profile_id from public.annuncio where uuid = (p_result ->> 'announcementId')::uuid;
  if v_profile_id is null then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  perform private.save_profile_name_anonymity_v1(v_profile_id, p_payload ->> 'profile_type', v_draft);
end;
$$;

create function private.public_profile_name_v1(p_type text, p_anonymous boolean, p_name text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case when p_anonymous then case p_type
    when 'giocatore' then 'Giocatore anonimo'
    when 'squadra' then 'Squadra anonima'
    when 'staff-sportivo' then 'Staff sportivo anonimo'
    when 'arbitro' then 'Arbitro anonimo'
    else p_name end
  else p_name end;
$$;

-- Current qualifications are already stored separately. Never concatenate the
-- old storico_esperienze field into new announcement snapshots.
create or replace function private.snapshot_staff_step10_v1(p_submission_id uuid, p_profile_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.annuncio_staff_sportivo as target
  set disponibile_remoto = staff.disponibile_remoto,
      lista_esperienze = staff.lista_esperienze,
      qualifiche_licenze = staff.qualifiche_licenze
  from private.announcement_submission as submission,
       public.annuncio as announcement,
       public.profilo_staff_sportivo as staff
  where submission.submission_id = p_submission_id
    and announcement.uuid = submission.announcement_id
    and target.uuid_annuncio = announcement.uuid
    and announcement.autore_annuncio = p_profile_id
    and staff.uuid_profilo = p_profile_id;
end;
$$;

-- Re-resolve profile labels at read time: changing the preference must also
-- protect names stored in earlier notifications. Missing/hidden profiles use
-- a generic label instead of potentially identifying snapshots.
create or replace function private.notification_display_ref(p_ref jsonb, p_owner_target boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_href text; v_current jsonb; v_label text;
begin
  if p_ref is null or p_ref = 'null'::jsonb then return null; end if;
  v_label := p_ref ->> 'label';
  if p_ref ->> 'kind' = 'profilo' then
    v_current := private.notification_profile_ref((p_ref ->> 'id')::uuid, p_ref ->> 'type');
    v_label := coalesce(v_current ->> 'label', private.public_profile_name_v1(p_ref ->> 'type', true, 'Profilo'));
    if v_current is not null then
      v_href := '/dettagli-profilo?id=' || (p_ref ->> 'id') || '&type=' || (p_ref ->> 'type');
    end if;
  elsif exists (select 1 from public.annuncio where uuid = (p_ref ->> 'id')::uuid) then
    if p_owner_target then v_href := '/il-tuo-profilo?sezione=annunci';
    elsif exists (select 1 from public.annuncio where uuid = (p_ref ->> 'id')::uuid and stato_annuncio = 'pubblicato' and privato is false) then
      v_href := '/dettagli-annuncio?id=' || (p_ref ->> 'id');
    end if;
  end if;
  return jsonb_build_object('label', v_label, 'href', v_href);
end;
$$;

-- Extend the installed definitions without discarding previous migrations.
do $migration$
declare v_definition text; v_anchor text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_owned_subprofile_internal_v1(uuid,text,jsonb,jsonb)')) into v_definition;
  v_anchor := '  return v_result;';
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Owned profile anonymity insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_anchor,
    '  perform private.save_profile_name_anonymity_v1(v_profile_id, p_profile_type, p_draft);' || chr(10) || v_anchor);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')) into v_definition;
  v_anchor := '  perform private.finalize_updated_profile_fields_v1(v_result, p_payload);';
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Publication anonymity insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_anchor,
    '  perform private.finalize_profile_name_anonymity_v1(v_result, p_payload);' || chr(10) || v_anchor);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.notification_profile_ref(uuid,text)')) into v_definition;
  v_anchor := $$  return jsonb_build_object('id',p_id,'type',v_type,'kind','profilo','label',v_label);$$;
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Notification anonymity insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_anchor,
    $$  v_label := private.public_profile_name_v1(v_type, coalesce((v_detail ->> 'nominativo_anonimo')::boolean, false), v_label);$$ || chr(10) || v_anchor);
end;
$migration$;

revoke all on function private.save_profile_name_anonymity_v1(uuid,text,jsonb),
  private.finalize_profile_name_anonymity_v1(jsonb,jsonb), private.public_profile_name_v1(text,boolean,text)
  from public, anon, authenticated, service_role;
grant execute on function private.save_profile_name_anonymity_v1(uuid,text,jsonb),
  private.finalize_profile_name_anonymity_v1(jsonb,jsonb), private.public_profile_name_v1(text,boolean,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
