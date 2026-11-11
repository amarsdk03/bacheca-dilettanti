begin;

-- Preparation/export metadata is private; it never changes the original import.
create table private.announcement_whatsapp_v1 (
  announcement_id uuid primary key references public.annuncio(uuid) on delete cascade,
  known_website boolean not null default false,
  message_text text not null default '' check(length(message_text)<=50000),
  message_url text check(length(message_url)<=2048),
  template_version text not null default '' check(length(template_version)<=120),
  content_fingerprint text,
  version bigint not null default 0 check(version>=0 and version<=9007199254740991),
  updated_by uuid, updated_at timestamptz
);
alter table private.announcement_whatsapp_v1 owner to postgres;
alter table private.announcement_whatsapp_v1 enable row level security;
revoke all on private.announcement_whatsapp_v1 from public,anon,authenticated,service_role;

create function private.track_announcement_whatsapp_origin_v1() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  insert into private.announcement_whatsapp_v1(announcement_id,known_website) values(new.uuid,true) on conflict do nothing;
  return new;
end $$;
create trigger track_announcement_whatsapp_origin_v1 after insert on public.annuncio
for each row execute function private.track_announcement_whatsapp_origin_v1();

create function private.announcement_whatsapp_status_v1(p_id uuid) returns text
language sql stable security invoker set search_path='' as $$
  select case when private.admin_creation_origin_v1(p_id)->>'kind'='whatsapp' then 'imported'
    when w.message_url is not null then 'exported'
    when w.known_website or private.admin_creation_origin_v1(p_id)->>'kind'='manual' then 'website'
    else 'unknown' end
  from (select 1) seed left join private.announcement_whatsapp_v1 w on w.announcement_id=p_id;
$$;

-- Keep old callers/retries byte-for-byte compatible when approval is not requested.
alter function public.admin_create_announcement_v1(uuid,jsonb) rename to admin_create_announcement_before_direct_v1;
create function public.admin_create_announcement_v1(p_submission uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; item jsonb; moderation jsonb; snapshot jsonb; normalized jsonb;
begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  if p_payload ? 'approve_immediately' and jsonb_typeof(p_payload->'approve_immediately') is distinct from 'boolean' then
    raise exception 'ADMIN_CREATION_INVALID' using errcode='22023';
  end if;
  normalized:=case when p_payload->'approve_immediately'='true'::jsonb then p_payload else p_payload-'approve_immediately' end;
  result:=public.admin_create_announcement_before_direct_v1(p_submission,normalized);
  if normalized->'approve_immediately'='true'::jsonb and result->'idempotent'='false'::jsonb then
    for item in select value from jsonb_array_elements(result->'announcements') loop
      snapshot:=private.admin_announcement_snapshot_v1((item->>'id')::uuid);
      moderation:=private.moderate_admin_announcement_v1((item->>'id')::uuid,'approve',
        'content-v1:'||encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),null);
      if moderation->>'status' is distinct from 'ok' then raise exception 'ADMIN_DIRECT_APPROVAL_FAILED' using errcode='22023'; end if;
    end loop;
    result:=private.regional_publication_result((result->>'publicationId')::uuid,false);
  end if;
  return result;
end $$;

-- Versioned entry point makes new clients fail closed against an older schema.
create function public.admin_create_announcement_v2(p_submission uuid,p_payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select public.admin_create_announcement_v1(p_submission,p_payload); $$;
create function public.admin_get_creation_capabilities_v1() returns boolean
language plpgsql stable security definer set search_path='' as $$ begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1(); return true;
end $$;

alter function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) rename to admin_audit_payload_before_whatsapp_v1;
create function private.admin_audit_payload_valid_v1(p_action text,p_outcome text,p_reason text,p_failure_code text,p_changes jsonb,p_details jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$ begin
  if p_action is distinct from 'announcement.whatsapp_export' then
    return private.admin_audit_payload_before_whatsapp_v1(p_action,p_outcome,p_reason,p_failure_code,p_changes,p_details);
  end if;
  if p_outcome='failure' then return private.admin_audit_payload_before_whatsapp_v1('announcement.approve',p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  return p_outcome='success' and p_reason is null and p_failure_code is null and p_changes='{}'::jsonb
    and jsonb_typeof(p_details)='object' and p_details ? 'confirmed'
    and jsonb_typeof(p_details->'confirmed')='boolean' and (select count(*) from jsonb_object_keys(p_details))=1;
end $$;
alter table private.admin_audit_event_v1 drop constraint admin_audit_payload_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_payload_v1 check(private.admin_audit_payload_valid_v1(action,outcome,reason,failure_code,changes,details) is true);
do $$ declare d text; begin
  d:=pg_get_functiondef('private.admin_list_audit_events_bridge_v1(jsonb)'::regprocedure);
  if strpos(d,'''announcement.create''')=0 then raise exception 'ADMIN_AUDIT_READ_REVIEW_REQUIRED'; end if;
  execute replace(d,'''announcement.create''','''announcement.create'',''announcement.whatsapp_export''');
end $$;

create function private.announcement_whatsapp_eligible_v1(p_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select coalesce(a.stato_annuncio in ('pubblicato','in_revisione') and a.nascosto is false and a.privato is false and a.eliminato_il is null,false)
  from public.annuncio a where a.uuid=p_id;
$$;

create function public.admin_get_announcement_whatsapp_v1(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w private.announcement_whatsapp_v1; detail jsonb;
begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  detail:=private.get_admin_announcement_v1(p_id);
  if detail is null then return jsonb_build_object('status','not_found'); end if;
  if private.announcement_whatsapp_eligible_v1(p_id) is distinct from true then return jsonb_build_object('status','not_allowed'); end if;
  select * into w from private.announcement_whatsapp_v1 where announcement_id=p_id;
  return jsonb_build_object('status','ok','detail',detail,'export',jsonb_build_object(
    'text',coalesce(w.message_text,''),'url',coalesce(w.message_url,''),'version',coalesce(w.version,0),
    'templateVersion',coalesce(w.template_version,''),'contentFingerprint',w.content_fingerprint));
end $$;

create function public.admin_save_announcement_whatsapp_v1(p_id uuid,p_text text,p_url text,p_template_version text,p_version bigint,p_fingerprint text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor record; w private.announcement_whatsapp_v1; detail jsonb; link text:=nullif(btrim(p_url),'');
begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  select * into actor from private.require_admin_context_v1();
  if p_text is null or btrim(p_text)='' or length(p_text)>50000 or p_version is null or p_version<0 or p_version>9007199254740990
    or p_template_version is null or p_template_version !~ '^[0-9]{4}-[0-9]{2}-v[0-9]{1,4}$'
    or p_url is null or length(p_url)>2048 or p_fingerprint is null or p_fingerprint !~ '^content-v1:[0-9a-f]{64}$'
    or (link is not null and link !~ '^https://([a-zA-Z0-9-]+\.)*(whatsapp\.com|wa\.me)(/[^[:space:]]*)?$') then
    return jsonb_build_object('status','invalid');
  end if;
  perform 1 from public.annuncio where uuid=p_id for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if private.announcement_whatsapp_eligible_v1(p_id) is distinct from true then return jsonb_build_object('status','not_allowed'); end if;
  detail:=private.get_admin_announcement_v1(p_id);
  if detail->>'contentFingerprint' is distinct from p_fingerprint then return jsonb_build_object('status','conflict'); end if;
  insert into private.announcement_whatsapp_v1(announcement_id) values(p_id) on conflict do nothing;
  select * into w from private.announcement_whatsapp_v1 where announcement_id=p_id for update;
  if w.message_text=p_text and w.message_url is not distinct from link and w.template_version=p_template_version and w.content_fingerprint=p_fingerprint then
    return jsonb_build_object('status','ok');
  end if;
  if w.version<>p_version then return jsonb_build_object('status','conflict'); end if;
  update private.announcement_whatsapp_v1 set message_text=p_text,message_url=link,template_version=p_template_version,
    content_fingerprint=p_fingerprint,version=version+1,updated_by=actor.auth_user_uuid,updated_at=statement_timestamp() where announcement_id=p_id;
  perform private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'announcement.whatsapp_export','announcement',p_id,'success',gen_random_uuid(),null,null,'{}',jsonb_build_object('confirmed',link is not null));
  return jsonb_build_object('status','ok');
end $$;

alter function private.list_admin_announcements_v1(jsonb) rename to list_admin_announcements_before_whatsapp_v1;
create function private.list_admin_announcements_v1(p_query jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
  result:=private.list_admin_announcements_before_whatsapp_v1(p_query);
  return jsonb_set(result,'{items}',coalesce((select jsonb_agg(v||jsonb_build_object('whatsappStatus',private.announcement_whatsapp_status_v1((v->>'id')::uuid),'whatsappAvailable',true)) from jsonb_array_elements(result->'items') v),'[]'));
end $$;
alter function private.get_admin_announcement_v1(uuid) rename to get_admin_announcement_before_whatsapp_v1;
create function private.get_admin_announcement_v1(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
  result:=private.get_admin_announcement_before_whatsapp_v1(p_id); if result is null then return null; end if;
  return jsonb_set(result,'{summary}',result->'summary'||jsonb_build_object('whatsappStatus',private.announcement_whatsapp_status_v1(p_id),'whatsappAvailable',true));
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
    (n.nspname='private' and p.proname in ('track_announcement_whatsapp_origin_v1','announcement_whatsapp_status_v1','announcement_whatsapp_eligible_v1','admin_audit_payload_valid_v1','admin_audit_payload_before_whatsapp_v1','list_admin_announcements_v1','get_admin_announcement_v1')) or
    (n.nspname='public' and p.proname in ('admin_create_announcement_v1','admin_create_announcement_v2','admin_get_creation_capabilities_v1','admin_create_announcement_before_direct_v1','admin_get_announcement_whatsapp_v1','admin_save_announcement_whatsapp_v1')) loop
    execute format('alter function %s owner to postgres',f.signature);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  end loop;
end $$;
grant execute on function private.list_admin_announcements_v1(jsonb),private.get_admin_announcement_v1(uuid),public.admin_create_announcement_v1(uuid,jsonb),public.admin_create_announcement_v2(uuid,jsonb),public.admin_get_creation_capabilities_v1(),public.admin_get_announcement_whatsapp_v1(uuid),public.admin_save_announcement_whatsapp_v1(uuid,text,text,text,bigint,text) to authenticated;
commit;
