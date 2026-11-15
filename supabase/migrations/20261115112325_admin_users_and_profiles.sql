begin;
set local lock_timeout='10s';

-- Fixed table catalog. Raw child rows stay private; DTOs below are allowlisted.
do $$ declare sql text; begin
  select string_agg(format('select uuid_profilo,%L::text,to_jsonb(s) from public.%I s',kind,tab),' union all ')
  into sql from (values ('giocatore','profilo_giocatore'),('squadra','profilo_squadra'),('staff-sportivo','profilo_staff_sportivo'),
    ('arbitro','profilo_arbitro'),('torneo-evento','profilo_torneo_evento'),('campi-impianti-sportivi','profilo_campi_impianti'),
    ('servizi-consulenze','profilo_servizi_consulenze'),('creators','profilo_creator')) x(kind,tab);
  execute 'create function private.admin_profile_rows_v1() returns table(profile_id uuid,profile_type text,child jsonb) language sql stable security invoker set search_path='''' as '||quote_literal(sql);
end $$;

create function private.admin_people_query_v1(p_query jsonb,p_kind text) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare q jsonb:=coalesce(p_query,'{}'); k text; v text; n integer; begin
  if jsonb_typeof(q)<>'object' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  for k in select jsonb_object_keys(q) loop
    if k<>all(case when p_kind='users' then array['search','offset','registration','confirmation','from','to'] else array['search','offset','type','region','verification','visibility','ownership','user'] end)
      or (k<>'offset' and jsonb_typeof(q->k)<>'string') or (k='offset' and (jsonb_typeof(q->k)<>'number' or (q->>k)!~'^(0|[1-9][0-9]{0,6})$')) then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  end loop;
  n:=coalesce((q->>'offset')::integer,0);
  if n>999990 or n%30<>0 or length(coalesce(q->>'search',''))>200 or length(coalesce(q->>'region',''))>100
    or coalesce(q->>'registration','all') not in ('all','complete','incomplete') or coalesce(q->>'confirmation','all') not in ('all','confirmed','unconfirmed')
    or coalesce(q->>'verification','all') not in ('all','verified','unverified') or coalesce(q->>'visibility','all') not in ('all','public','private','obscured')
    or coalesce(q->>'ownership','all') not in ('all','linked','unlinked')
    or coalesce(q->>'type','all') not in ('all','giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators')
    or (coalesce(q->>'user','')<>'' and (q->>'user')!~'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$') then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  foreach k in array array['from','to'] loop
    v:=coalesce(q->>k,'');
    if v<>'' then begin
      if v!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or v<'0001-01-01' or to_char(v::date,'YYYY-MM-DD')<>v then raise exception 'date'; end if;
    exception when others then raise exception 'INVALID_QUERY' using errcode='22023'; end; end if;
  end loop;
  if coalesce(q->>'from','')<>'' and coalesce(q->>'to','')<>'' and q->>'from'>q->>'to' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  return q||jsonb_build_object('search',lower(btrim(coalesce(q->>'search',''))),'offset',n);
end $$;

create function private.admin_profile_item_v1(p_id uuid,p_type text,p_detail boolean default false) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',p.uuid::text||':'||r.profile_type,'profileId',p.uuid,'type',r.profile_type,
    'name',coalesce(nullif(btrim(coalesce(r.child->>'nome_societa',r.child->>'nome_organizzazione',r.child->>'nome_creator',concat_ws(' ',r.child->>'nome',r.child->>'cognome'))),''),'Profilo senza nome'),
    'userId',p.uuid_utente,'email',coalesce(a.email,u.indirizzo_email),'verifiedAt',s.verified_at,'adminHidden',s.admin_hidden,'version',s.version,
    'visibility',case when s.admin_hidden then 'obscured' when p.nascosto or coalesce((r.child->>'nascosto')::boolean,true) or p.uuid_utente is null then 'private' else 'public' end,
    'locations',coalesce((select jsonb_agg(jsonb_build_object('region',l.regione,'city',l.citta) order by l.id) from public.localita_profilo l where l.uuid_profilo=p.uuid and l.sottoprofilo=r.profile_type and (l.id_sottoprofilo is null or l.id_sottoprofilo=(r.child->>'id')::bigint)),'[]'))
    ||case when p_detail then jsonb_build_object('fields',coalesce((select jsonb_object_agg(key,value) from jsonb_each(r.child) where key=any(array[
      'nome','cognome','nome_societa','nome_organizzazione','nome_creator','nominativo_anonimo','anno_nascita','mese_nascita','giorno_nascita','sport_principale','tipologie_sport','presentazione',
      'disponibilita','ruoli_sport','categoria_attuale','genere','nazionalita','altezza','peso','piede_principale','squadra_attuale_nome','squadra_attuale_categoria','squadra_attuale_torneo','squadra_attuale_dal',
      'storico_carriera','figure_professionali','lista_esperienze','qualifiche_licenze','tipologia_contenuti','specializzazioni','presentazione_servizi','sede_professionista',
      'contatto_email','contatto_telefono','indirizzo','orari','costo_partenza','servizi_inclusi','info_aggiuntive','torneo_attuale_nome'])),'{}'),
      'announcementCount',(select count(*) from public.annuncio x where x.autore_annuncio=p.uuid and private.profile_type_for_announcement_v1(x.tipologia_annuncio)=r.profile_type and x.eliminato_il is null)) else '{}'::jsonb end
  from private.admin_profile_rows_v1() r join public.profilo p on p.uuid=r.profile_id
  join public.profile_type_state s on s.profile_id=r.profile_id and s.profile_type=r.profile_type
  left join public.utente u on u.utente_uuid=p.uuid_utente left join auth.users a on a.id=u.auth_user_uuid
  where r.profile_id=p_id and r.profile_type=p_type and (u.utente_uuid is null or u.tipologia_utente='Utente');
$$;

create function private.admin_people_read_v1(p_kind text,p_query jsonb,p_id uuid default null,p_type text default null) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare q jsonb; result jsonb; items jsonb; more boolean; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  q:=private.admin_people_query_v1(p_query,p_kind);
  if p_kind='profiles' then
    if p_id is not null then return private.admin_profile_item_v1(p_id,p_type,true); end if;
    with candidates as materialized (
      select p.uuid,r.profile_type,p.creato_il from private.admin_profile_rows_v1() r
      join public.profilo p on p.uuid=r.profile_id join public.profile_type_state s on s.profile_id=r.profile_id and s.profile_type=r.profile_type
      left join public.utente u on u.utente_uuid=p.uuid_utente left join auth.users a on a.id=u.auth_user_uuid
      where (u.utente_uuid is null or u.tipologia_utente='Utente')
        and (coalesce(q->>'type','all')='all' or r.profile_type=q->>'type')
        and (coalesce(q->>'user','')='' or p.uuid_utente::text=q->>'user')
        and (coalesce(q->>'ownership','all')='all' or (q->>'ownership'='linked')=(p.uuid_utente is not null))
        and (coalesce(q->>'verification','all')='all' or (q->>'verification'='verified')=(s.verified_at is not null))
        and (coalesce(q->>'visibility','all')='all' or q->>'visibility'=case when s.admin_hidden then 'obscured' when p.nascosto or coalesce((r.child->>'nascosto')::boolean,true) or p.uuid_utente is null then 'private' else 'public' end)
        and (coalesce(q->>'region','')='' or exists(select 1 from public.localita_profilo l where l.uuid_profilo=p.uuid and l.sottoprofilo=r.profile_type and l.regione=q->>'region'))
        and (q->>'search'='' or p.uuid::text=q->>'search' or p.uuid_utente::text=q->>'search'
          or position(q->>'search' in lower(coalesce(a.email,u.indirizzo_email,'')))>0
          or position(q->>'search' in lower(concat_ws(' ',r.child->>'nome',r.child->>'cognome',r.child->>'nome_societa',r.child->>'nome_organizzazione',r.child->>'nome_creator')))>0)
      order by p.creato_il desc,p.uuid desc,r.profile_type limit 31 offset (q->>'offset')::integer
    ), projected as (select row_number() over(order by creato_il desc,uuid desc,profile_type) n,private.admin_profile_item_v1(uuid,profile_type) item from candidates)
    select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
  else
    with candidates as materialized (
      select u.*,a.email auth_email,a.email_confirmed_at from public.utente u left join auth.users a on a.id=u.auth_user_uuid
      where u.tipologia_utente='Utente' and (p_id is null or u.utente_uuid=p_id) and (p_id is not null or (
        (coalesce(q->>'registration','all')='all' or (q->>'registration'='complete')=(u.registrato_il is not null))
        and (coalesce(q->>'confirmation','all')='all' or (q->>'confirmation'='confirmed')=(a.email_confirmed_at is not null))
        and (coalesce(q->>'from','')='' or u.creato_il>=((q->>'from')::date::timestamp at time zone 'Europe/Rome'))
        and (coalesce(q->>'to','')='' or u.creato_il<(((q->>'to')::date+1)::timestamp at time zone 'Europe/Rome'))
        and (q->>'search'='' or u.utente_uuid::text=q->>'search' or u.auth_user_uuid::text=q->>'search'
          or position(q->>'search' in lower(coalesce(a.email,u.indirizzo_email,'')))>0 or position(q->>'search' in coalesce(u.num_telefono,''))>0)))
      order by u.creato_il desc,u.utente_uuid desc limit 31 offset case when p_id is not null then 0 else (q->>'offset')::integer end
    ), projected as (
      select row_number() over(order by creato_il desc,utente_uuid desc) n,jsonb_build_object('id',utente_uuid,'email',coalesce(auth_email,indirizzo_email),
        'createdAt',creato_il,'registeredAt',registrato_il,'confirmedAt',email_confirmed_at,
        'profileCount',(select count(*) from private.admin_profile_rows_v1() r join public.profilo p on p.uuid=r.profile_id where p.uuid_utente=c.utente_uuid))
        ||case when p_id is not null then jsonb_build_object('authId',auth_user_uuid,'phone',num_telefono,'newsletter',consenso_newsletter,'newsletterUpdatedAt',consenso_newsletter_aggiornato_il,
          'legalAcceptedAt',informative_accettate_il,'termsVersion',versione_termini,'privacyVersion',versione_privacy,'cookieVersion',versione_cookie_policy,
          'profiles',coalesce((select jsonb_agg(private.admin_profile_item_v1(r.profile_id,r.profile_type) order by r.profile_type) from private.admin_profile_rows_v1() r join public.profilo p on p.uuid=r.profile_id where p.uuid_utente=c.utente_uuid),'[]')) else '{}'::jsonb end item
      from candidates c
    ) select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
    if p_id is not null then return items->0; end if;
  end if;
  return jsonb_build_object('items',items,'hasMore',more);
end $$;

alter function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) rename to admin_audit_payload_before_profiles_v1;
create function private.admin_audit_payload_valid_v1(p_action text,p_outcome text,p_reason text,p_failure_code text,p_changes jsonb,p_details jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$ declare k text; begin
  if p_action not in ('profile.verify','profile.unverify','profile.hide','profile.show') then return private.admin_audit_payload_before_profiles_v1(p_action,p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  if p_outcome='failure' then return private.admin_audit_payload_before_profiles_v1('announcement.approve',p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  k:=case when p_action in ('profile.verify','profile.unverify') then 'verified' else 'hidden' end;
  return p_outcome='success' and p_failure_code is null and (case when p_action in ('profile.hide','profile.unverify') then length(btrim(p_reason)) between 1 and 1000 else p_reason is null end)
    and jsonb_typeof(p_changes)='object' and (select count(*) from jsonb_object_keys(p_changes))=1 and jsonb_typeof(p_changes->k)='object'
    and (select count(*) from jsonb_object_keys(p_changes->k))=2 and jsonb_typeof(p_changes#>array[k,'before'])='boolean' and jsonb_typeof(p_changes#>array[k,'after'])='boolean'
    and p_changes#>array[k,'before']<>p_changes#>array[k,'after']
    and jsonb_typeof(p_details)='object' and (select count(*) from jsonb_object_keys(p_details))=1
    and p_details->>'profile_type' in ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators');
end $$;
alter table private.admin_audit_event_v1 drop constraint admin_audit_payload_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_payload_v1 check(private.admin_audit_payload_valid_v1(action,outcome,reason,failure_code,changes,details) is true);
alter table private.admin_audit_event_v1 drop constraint admin_audit_resource_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_resource_v1 check (
  case when action in ('auth.login','auth.logout','auth.access_denied') then resource_type='session' and (outcome='failure' or resource_uuid is not null)
    when action='announcement.export' then resource_type='announcement_export' and resource_uuid is null
    when action='report.update' then resource_type='report' and (outcome='failure' or resource_uuid is not null)
    when action='invitation.consider' then resource_type='invitation' and (outcome='failure' or resource_uuid is not null)
    when action in ('profile.verify','profile.unverify','profile.hide','profile.show') then resource_type='profile' and (outcome='failure' or resource_uuid is not null)
    else resource_type='announcement' and (outcome='failure' or resource_uuid is not null) end);
do $$ declare d text; begin
  d:=pg_get_functiondef('private.admin_list_audit_events_bridge_v1(jsonb)'::regprocedure);
  if strpos(d,'''invitation.consider''')=0 then raise exception 'ADMIN_INVITATIONS_REQUIRED'; end if;
  execute replace(d,'''invitation.consider''','''invitation.consider'',''profile.verify'',''profile.unverify'',''profile.hide'',''profile.show''');
  d:=pg_get_functiondef('private.admin_get_audit_event_bridge_v1(uuid)'::regprocedure);
  execute replace(replace(d,'''considered''','''considered'',''verified'''),'''reason'',e.reason','''profileType'',case when e.resource_type=''profile'' then e.details->''profile_type'' else null end,''reason'',e.reason');
  d:=pg_get_functiondef('private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)'::regprocedure);
  execute replace(d,'''invitation'' else ''announcement''','''invitation'' when p_action in (''profile.verify'',''profile.unverify'',''profile.hide'',''profile.show'') then ''profile'' else ''announcement''');
end $$;

create function private.admin_moderate_profile_v1(p_id uuid,p_type text,p_operation text,p_version integer,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor record; s public.profile_type_state; event_id uuid; k text; before_value boolean; after_value boolean; reason text:=nullif(btrim(p_reason),''); begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  select * into strict actor from private.require_admin_context_v1();
  if p_operation is null or p_operation not in ('verify','unverify','hide','show') or p_version is null or p_version<0
    or (p_operation in ('hide','unverify') and reason is null) or length(reason)>1000 or (p_operation in ('verify','show') and reason is not null) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  select * into s from public.profile_type_state where profile_id=p_id and profile_type=p_type for update;
  if not found or private.admin_profile_item_v1(p_id,p_type) is null then return jsonb_build_object('status','not_found'); end if;
  if s.version<>p_version then return jsonb_build_object('status','conflict'); end if;
  k:=case when p_operation in ('verify','unverify') then 'verified' else 'hidden' end;
  before_value:=case when k='verified' then s.verified_at is not null else s.admin_hidden end;
  after_value:=p_operation in ('verify','hide');
  if before_value=after_value then return jsonb_build_object('status','ok','id',p_id,'changed',false); end if;
  update public.profile_type_state set verified_at=case when k='verified' then case when after_value then statement_timestamp() end else verified_at end,
    verification_revoked=case when k='verified' then not after_value else verification_revoked end,
    admin_hidden=case when k='hidden' then after_value else admin_hidden end,version=version+1,updated_at=statement_timestamp() where profile_id=p_id and profile_type=p_type;
  event_id:=private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'profile.'||p_operation,'profile',p_id,'success',gen_random_uuid(),reason,null,
    jsonb_build_object(k,jsonb_build_object('before',before_value,'after',after_value)),jsonb_build_object('profile_type',p_type));
  return jsonb_build_object('status','ok','id',p_id,'changed',true,'eventId',event_id);
end $$;

-- Adapt existing announcement projections, keeping fingerprints over real data.
alter function private.project_admin_announcement_v1(jsonb) rename to project_admin_announcement_before_profile_hold_v1;
create function private.project_admin_announcement_v1(v_snapshot jsonb) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r jsonb:=private.project_admin_announcement_before_profile_hold_v1(v_snapshot); held boolean:=coalesce((v_snapshot#>>'{base,profile_admin_hidden}')::boolean,false); begin
  r:=jsonb_set(r,'{moderation,profileHidden}',to_jsonb(held));
  if held then
    r:=jsonb_set(r,'{summary,hidden}','true');
    r:=jsonb_set(r,'{moderation,capabilities,approve}',jsonb_build_object('allowed',false,'reason','PROFILE_HIDDEN'));
    r:=jsonb_set(r,'{moderation,capabilities,show}',jsonb_build_object('allowed',false,'reason','PROFILE_HIDDEN'));
  end if;
  return r;
end $$;
do $$ declare d text; target regprocedure:='private.list_admin_announcements_v1(jsonb)'::regprocedure; begin
  -- Invalidate cached call plans that could still reference the renamed projector.
  execute pg_get_functiondef('private.get_admin_announcement_v1(uuid)'::regprocedure);
  execute pg_get_functiondef('private.moderate_admin_announcement_v1(uuid,text,text,text)'::regprocedure);
  -- Creation and WhatsApp migrations wrap/rename the original reader. Patch the
  -- query at the end of that known chain, retaining both enrichment wrappers.
  loop
    d:=pg_get_functiondef(target);
    exit when d ~ '''hidden''[[:space:]]*,[[:space:]]*a[.]nascosto';
    if target='private.list_admin_announcements_v1(jsonb)'::regprocedure
      and strpos(d,'private.list_admin_announcements_before_whatsapp_v1(')>0 then
      target:='private.list_admin_announcements_before_whatsapp_v1(jsonb)'::regprocedure;
    elsif strpos(d,'private.list_admin_announcements_before_create_v1(')>0
      and target is distinct from to_regprocedure('private.list_admin_announcements_before_create_v1(jsonb)') then
      target:='private.list_admin_announcements_before_create_v1(jsonb)'::regprocedure;
    else raise exception 'ANNOUNCEMENT_LIST_REVIEW_REQUIRED'; end if;
  end loop;
  if d !~* 'a[.]nascosto[[:space:]]+is[[:space:]]+false' or d !~* 'a[.]nascosto[[:space:]]+is[[:space:]]+true' then
    raise exception 'ANNOUNCEMENT_LIST_FILTER_REVIEW_REQUIRED';
  end if;
  execute regexp_replace(regexp_replace(regexp_replace(d,
    '''hidden''[[:space:]]*,[[:space:]]*a[.]nascosto','''hidden'',(a.nascosto or a.profile_admin_hidden)','g'),
    'a[.]nascosto[[:space:]]+is[[:space:]]+false','a.nascosto is false and a.profile_admin_hidden is false','gi'),
    'a[.]nascosto[[:space:]]+is[[:space:]]+true','(a.nascosto is true or a.profile_admin_hidden is true)','gi');
end $$;

create function public.admin_list_users_v1(p_query jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.admin_people_read_v1('users',p_query); $$;
create function public.admin_get_user_v1(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_people_read_v1('users','{}',p_id); $$;
create function public.admin_list_profiles_v1(p_query jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.admin_people_read_v1('profiles',p_query); $$;
create function public.admin_get_profile_v1(p_id uuid,p_type text) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_people_read_v1('profiles','{}',p_id,p_type); $$;
create function public.admin_moderate_profile_v1(p_id uuid,p_type text,p_operation text,p_version integer,p_reason text default null) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_moderate_profile_v1(p_id,p_type,p_operation,p_version,p_reason); $$;
revoke all on function private.admin_profile_rows_v1(),private.admin_people_query_v1(jsonb,text),private.admin_profile_item_v1(uuid,text,boolean),private.admin_audit_payload_before_profiles_v1(text,text,text,text,jsonb,jsonb),private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb),private.project_admin_announcement_before_profile_hold_v1(jsonb),private.project_admin_announcement_v1(jsonb) from public,anon,authenticated,service_role;
revoke all on function private.admin_people_read_v1(text,jsonb,uuid,text),private.admin_moderate_profile_v1(uuid,text,text,integer,text),public.admin_list_users_v1(jsonb),public.admin_get_user_v1(uuid),public.admin_list_profiles_v1(jsonb),public.admin_get_profile_v1(uuid,text),public.admin_moderate_profile_v1(uuid,text,text,integer,text) from public,anon,authenticated,service_role;
grant execute on function private.admin_people_read_v1(text,jsonb,uuid,text),private.admin_moderate_profile_v1(uuid,text,text,integer,text),public.admin_list_users_v1(jsonb),public.admin_get_user_v1(uuid),public.admin_list_profiles_v1(jsonb),public.admin_get_profile_v1(uuid,text),public.admin_moderate_profile_v1(uuid,text,text,integer,text) to authenticated;
create index utente_admin_directory_idx on public.utente(creato_il desc,utente_uuid desc) where tipologia_utente='Utente';
notify pgrst,'reload schema';
commit;
