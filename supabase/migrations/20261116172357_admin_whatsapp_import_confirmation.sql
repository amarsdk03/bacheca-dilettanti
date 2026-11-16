begin;
set local lock_timeout='10s';

-- Only future imports populate these fields; existing records are untouched.
alter table private.admin_creation_submission_v1 add column source_channel_id uuid references private.distribution_channel_v1(id);
alter table private.distribution_record_v1 add column origin_import boolean not null default false;

create function private.require_whatsapp_import_channel_v1(p_region text) returns uuid
language plpgsql volatile security invoker set search_path='' as $$
declare channel uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('distribution-channels',1));
  begin
    select id into strict channel from private.distribution_channel_v1 where active and region=p_region for share;
  exception when no_data_found or too_many_rows then
    raise exception 'ADMIN_CREATION_SOURCE_CHANNEL_UNAVAILABLE' using errcode='22023';
  end;
  return channel;
end $$;
revoke all on function private.require_whatsapp_import_channel_v1(text) from public,anon,authenticated,service_role;

create function public.admin_resolve_whatsapp_import_channel_v1(p_region text) returns uuid
language plpgsql volatile security definer set search_path='' as $$ begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  return private.require_whatsapp_import_channel_v1(p_region);
end $$;
alter function public.admin_resolve_whatsapp_import_channel_v1(text) owner to postgres;
revoke all on function public.admin_resolve_whatsapp_import_channel_v1(text) from public,anon,authenticated,service_role;
grant execute on function public.admin_resolve_whatsapp_import_channel_v1(text) to authenticated;

-- Extend the original atomic writer. Its receipt check stays BEFORE channel
-- validation, so retries do not recreate the confirmation or require an active channel.
do $migration$
declare definition text; anchor text;
begin
  if to_regprocedure('public.admin_create_announcement_v3(uuid,jsonb)') is null then
    raise exception 'ADMIN_CREATION_PUBLICATION_DATE_MIGRATION_REQUIRED';
  end if;
  definition:=pg_get_functiondef('public.admin_create_announcement_before_direct_v1(uuid,jsonb)'::regprocedure);
  anchor:='kind text; ann_type text;';
  if strpos(definition,anchor)=0 then raise exception 'ADMIN_IMPORT_CONFIRMATION_REVIEW_REQUIRED'; end if;
  definition:=replace(definition,anchor,'origin_channel uuid; origin_record uuid; kind text; ann_type text;');
  anchor:='if p_payload->>''author_mode''=''registered'' then';
  if strpos(definition,anchor)=0 then raise exception 'ADMIN_IMPORT_CONFIRMATION_REVIEW_REQUIRED'; end if;
  definition:=replace(definition,anchor,$body$
  if source='whatsapp' and nullif(btrim(p_payload->>'message_url'),'') is null then
    origin_channel:=private.require_whatsapp_import_channel_v1(p_payload->>'source_region');
  end if;
  if p_payload->>'author_mode'='registered' then
  $body$);
  anchor:='result:=private.regional_publication_result(group_id,false);';
  if strpos(definition,anchor)=0 then raise exception 'ADMIN_IMPORT_CONFIRMATION_REVIEW_REQUIRED'; end if;
  definition:=replace(definition,anchor,$body$
  if origin_channel is not null then
    update private.admin_creation_submission_v1 set source_channel_id=origin_channel
      where actor_auth_uuid=actor.auth_user_uuid and submission_uuid=p_submission;
    insert into private.distribution_record_v1(publication_key,announcement_id,channel_id,title,message_text,template_version,source_hash,
      confirmed,manual,posted_at,updated_by,origin_import)
    values(private.distribution_key_v1(ann_id),ann_id,origin_channel,coalesce(p_payload->>'announcement_title',''),p_payload->>'original_text','2026-11-v1',
      private.distribution_hash_v1(private.distribution_detail_v1(ann_id,origin_channel)),true,true,statement_timestamp(),actor.auth_user_uuid,true)
    returning id into origin_record;
    insert into private.distribution_revision_v1(record_id,version,snapshot)
      select id,version,to_jsonb(r) from private.distribution_record_v1 r where id=origin_record;
    perform private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'distribution.save','distribution',origin_record,'success',correlation,null,null,'{}','{}');
  end if;
  result:=private.regional_publication_result(group_id,false);
  $body$);
  execute definition;
end $migration$;

create function public.admin_create_announcement_v4(p_submission uuid,p_payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select public.admin_create_announcement_v1(p_submission,p_payload); $$;
alter function public.admin_create_announcement_v4(uuid,jsonb) owner to postgres;
revoke all on function public.admin_create_announcement_v4(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.admin_create_announcement_v4(uuid,jsonb) to authenticated;

-- Origin is independent of the announcement's target regions or moderation.
create or replace function private.distribution_source_v1(p_id uuid,p_channel uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.annuncio a join private.distribution_channel_v1 c on c.id=p_channel
    join private.regional_publication_item i on i.announcement_id=a.uuid
    join private.admin_creation_submission_v1 s on s.publication_uuid=i.publication_id
    where private.distribution_key_v1(a.uuid)=private.distribution_key_v1(p_id) and s.source='whatsapp'
      and (s.source_channel_id=c.id or s.message_url ~ ('^https://(www\.)?whatsapp\.com/channel/'||c.channel_key||'(/|\?|$)')));
$$;

-- A retained import confirmation is historical evidence, not a fresh export.
do $migration$
declare definition text; anchor text;
begin
  definition:=pg_get_functiondef('private.distribution_state_v1(uuid,uuid,uuid)'::regprocedure);
  anchor:='if r.channel_id is null then return ''unassigned''; end if;';
  if strpos(definition,anchor)=0 then raise exception 'ADMIN_IMPORT_CONFIRMATION_REVIEW_REQUIRED'; end if;
  execute replace(definition,anchor,anchor||' if r.origin_import and r.confirmed then return ''source''; end if;');
  definition:=pg_get_functiondef('private.admin_distribution_read_v1(text,jsonb)'::regprocedure);
  anchor:='k:=private.distribution_key_v1(a);';
  if strpos(definition,anchor)=0 then raise exception 'ADMIN_IMPORT_CONFIRMATION_REVIEW_REQUIRED'; end if;
  execute replace(definition,anchor,anchor||$body$
    if c is null and v_record.id is null then
      select r.* into v_record from private.distribution_record_v1 r where r.publication_key=k and not r.superseded
        and exists(select 1 from private.regional_publication_item i join private.admin_creation_submission_v1 s on s.publication_uuid=i.publication_id
          where i.announcement_id=a and s.source_channel_id=r.channel_id)
        order by r.created_at,r.id limit 1;
      if found then c:=v_record.channel_id; end if;
    end if;
  $body$);
end $migration$;

notify pgrst,'reload schema';
commit;
