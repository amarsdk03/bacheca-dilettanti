begin;
set local lock_timeout='10s';

alter function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) rename to admin_audit_payload_before_invites_v1;
create function private.admin_audit_payload_valid_v1(p_action text,p_outcome text,p_reason text,p_failure_code text,p_changes jsonb,p_details jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$ begin
  if p_action is distinct from 'invitation.consider' then return private.admin_audit_payload_before_invites_v1(p_action,p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  if p_outcome='failure' then return private.admin_audit_payload_before_invites_v1('announcement.approve',p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  return p_outcome='success' and p_reason is null and p_failure_code is null and p_details='{}'::jsonb
    and jsonb_typeof(p_changes)='object' and (select count(*) from jsonb_object_keys(p_changes))=1
    and jsonb_typeof(p_changes->'considered')='object' and (select count(*) from jsonb_object_keys(p_changes->'considered'))=2
    and jsonb_typeof(p_changes#>'{considered,before}')='boolean' and jsonb_typeof(p_changes#>'{considered,after}')='boolean'
    and p_changes#>'{considered,before}'<>p_changes#>'{considered,after}';
end $$;
alter table private.admin_audit_event_v1 drop constraint admin_audit_payload_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_payload_v1 check(private.admin_audit_payload_valid_v1(action,outcome,reason,failure_code,changes,details) is true);
alter table private.admin_audit_event_v1 drop constraint admin_audit_resource_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_resource_v1 check (
  case when action in ('auth.login','auth.logout','auth.access_denied') then resource_type='session' and (outcome='failure' or resource_uuid is not null)
    when action='announcement.export' then resource_type='announcement_export' and resource_uuid is null
    when action='report.update' then resource_type='report' and (outcome='failure' or resource_uuid is not null)
    when action='invitation.consider' then resource_type='invitation' and (outcome='failure' or resource_uuid is not null)
    else resource_type='announcement' and (outcome='failure' or resource_uuid is not null) end);
do $$ declare d text; begin
  d:=pg_get_functiondef('private.admin_list_audit_events_bridge_v1(jsonb)'::regprocedure);
  if strpos(d,'''report.update''')=0 then raise exception 'ADMIN_REPORT_MIGRATION_REQUIRED'; end if;
  execute replace(d,'''report.update''','''report.update'',''invitation.consider''');
  d:=pg_get_functiondef('private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)'::regprocedure);
  if strpos(d,'''report.update''')=0 then raise exception 'ADMIN_REPORT_AUDIT_BRIDGE_REQUIRED'; end if;
  execute replace(d,'''report'' else ''announcement''','''report'' when p_action = ''invitation.consider'' then ''invitation'' else ''announcement''');
end $$;
create index invito_admin_pending_idx on public.invito(uuid_invitante,confermato_il desc,invito_uuid desc) where confermato_il is not null and considerato=false;

create function private.admin_invitations_v1(p_query jsonb,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q jsonb; items jsonb; more boolean; owner_row jsonb; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  q:=private.admin_community_query_v1(p_query,'invitations');
  if p_id is not null then
    select jsonb_build_object('id',u.utente_uuid,'email',u.indirizzo_email,'code',u.codice_invito,'total',count(i.invito_uuid),'pending',count(i.invito_uuid) filter(where not i.considerato))
    into owner_row from public.utente u left join public.invito i on i.uuid_invitante=u.utente_uuid and i.confermato_il is not null
    where u.utente_uuid=p_id and u.registrato_il is not null and u.codice_invito is not null group by u.utente_uuid;
    if owner_row is null then return null; end if;
    with candidates as materialized (
      select i.*,u.indirizzo_email from public.invito i join public.utente u on u.utente_uuid=i.uuid_invitato
      where i.uuid_invitante=p_id and i.confermato_il is not null
      order by i.confermato_il desc,i.invito_uuid desc limit 31 offset (q->>'offset')::integer
    ), projected as (
      select row_number() over(order by confermato_il desc,invito_uuid desc) n,jsonb_build_object('id',invito_uuid,'email',indirizzo_email,'registeredAt',registrato_il,'confirmedAt',confermato_il,'considered',considerato) item from candidates
    ) select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
    return jsonb_build_object('owner',owner_row,'items',items,'hasMore',more);
  end if;
  with candidates as materialized (
    select u.utente_uuid,u.indirizzo_email,u.codice_invito,count(i.invito_uuid)::integer total,count(i.invito_uuid) filter(where not i.considerato)::integer pending
    from public.utente u left join public.invito i on i.uuid_invitante=u.utente_uuid and i.confermato_il is not null
    where u.registrato_il is not null and u.codice_invito is not null and
      (q->>'search'='' or position(q->>'search' in lower(coalesce(u.indirizzo_email,'')))>0 or lower(u.codice_invito)=q->>'search' or u.utente_uuid::text=q->>'search')
    group by u.utente_uuid having not coalesce((q->>'pending')::boolean,false) or count(i.invito_uuid) filter(where not i.considerato)>0
    order by lower(u.indirizzo_email) nulls last,u.utente_uuid limit 31 offset (q->>'offset')::integer
  ), projected as (
    select row_number() over(order by lower(indirizzo_email) nulls last,utente_uuid) n,jsonb_build_object('id',utente_uuid,'email',indirizzo_email,'code',codice_invito,'total',total,'pending',pending) item from candidates
  ) select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
  return jsonb_build_object('items',items,'hasMore',more);
end $$;

create function private.admin_consider_invitation_v1(p_id uuid,p_considered boolean,p_expected boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor record; i public.invito; event_id uuid; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  select * into strict actor from private.require_admin_context_v1();
  if p_considered is null or p_expected is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  select * into i from public.invito where invito_uuid=p_id for update;
  if not found or i.confermato_il is null then return jsonb_build_object('status','not_found'); end if;
  if i.considerato=p_considered then return jsonb_build_object('status','ok','id',p_id,'changed',false); end if;
  if i.considerato<>p_expected then return jsonb_build_object('status','conflict'); end if;
  update public.invito set considerato=p_considered where invito_uuid=p_id;
  event_id:=private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'invitation.consider','invitation',p_id,'success',gen_random_uuid(),null,null,
    jsonb_build_object('considered',jsonb_build_object('before',i.considerato,'after',p_considered)),'{}');
  return jsonb_build_object('status','ok','id',p_id,'changed',true,'eventId',event_id);
end $$;
create function public.admin_list_invitation_codes_v1(p_query jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.admin_invitations_v1(p_query); $$;
create function public.admin_get_invitation_code_v1(p_id uuid,p_query jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.admin_invitations_v1(p_query,p_id); $$;
create function public.admin_consider_invitation_v1(p_id uuid,p_considered boolean,p_expected boolean) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_consider_invitation_v1(p_id,p_considered,p_expected); $$;
revoke all on function private.admin_audit_payload_before_invites_v1(text,text,text,text,jsonb,jsonb),private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.admin_invitations_v1(jsonb,uuid),private.admin_consider_invitation_v1(uuid,boolean,boolean),public.admin_list_invitation_codes_v1(jsonb),public.admin_get_invitation_code_v1(uuid,jsonb),public.admin_consider_invitation_v1(uuid,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function private.admin_invitations_v1(jsonb,uuid),private.admin_consider_invitation_v1(uuid,boolean,boolean),public.admin_list_invitation_codes_v1(jsonb),public.admin_get_invitation_code_v1(uuid,jsonb),public.admin_consider_invitation_v1(uuid,boolean,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
