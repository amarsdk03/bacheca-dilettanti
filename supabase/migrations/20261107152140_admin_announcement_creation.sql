-- Admin creates on behalf of an author. Never impersonate an Auth user or relax
-- the dedicated-Admin ownership guard. Apply before deploying the Admin writer.
begin;
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('private.require_admin_context_v1()') is null
    or to_regprocedure('private.regional_split_announcement(uuid,uuid)') is null
    or to_regprocedure('private.create_anonymous_publish_profile(text,jsonb,jsonb)') is null
    or to_regprocedure('private.project_admin_announcement_v1(jsonb)') is null
    or to_regprocedure('private.assert_updated_profile_fields_v1(uuid,text)') is null then
    raise exception 'ADMIN_CREATION_PREREQUISITES_REQUIRED';
  end if;
end $$;

create table private.admin_creation_submission_v1 (
  actor_auth_uuid uuid not null, submission_uuid uuid not null,
  publication_uuid uuid not null unique references private.regional_publication(id),
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
  source text not null check(source in ('manual','whatsapp')),
  message_url text, original_text text, reference_email text,
  authorized_at timestamptz not null default statement_timestamp(),
  primary key(actor_auth_uuid,submission_uuid),
  check(coalesce(length(original_text),0)<=50000 and coalesce(length(message_url),0)<=2048 and coalesce(length(reference_email),0)<=254),
  check(source='whatsapp' or (message_url is null and original_text is null))
);
alter table private.admin_creation_submission_v1 enable row level security;
revoke all on private.admin_creation_submission_v1 from public,anon,authenticated,service_role;

-- Extend the explicit audit allowlist without changing earlier event contracts.
alter function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) rename to admin_audit_payload_before_create_v1;
do $$ declare d text; begin
  d:=pg_get_functiondef('private.admin_audit_payload_before_create_v1(text,text,text,text,jsonb,jsonb)'::regprocedure);
  execute replace(replace(d,'not between 1 and 6','not between 1 and 7'),
    '''visibility'',''created_at''','''visibility'',''created_at'',''from_whatsapp''');
  d:=pg_get_functiondef('private.export_admin_announcements_v1(jsonb,jsonb)'::regprocedure);
  execute replace(d,'''visibility'',''created_at''','''visibility'',''created_at'',''from_whatsapp''');
end $$;
create function private.admin_audit_payload_valid_v1(p_action text,p_outcome text,p_reason text,p_failure_code text,p_changes jsonb,p_details jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
begin
  if p_action is distinct from 'announcement.create' then
    return private.admin_audit_payload_before_create_v1(p_action,p_outcome,p_reason,p_failure_code,p_changes,p_details);
  end if;
  if p_outcome='failure' then
    return private.admin_audit_payload_before_create_v1('announcement.approve',p_outcome,p_reason,p_failure_code,p_changes,p_details);
  end if;
  return p_outcome='success' and p_reason is null and p_failure_code is null and p_changes='{}'::jsonb
    and jsonb_typeof(p_details)='object' and p_details ?& array['publication_id','announcement_count','authorized']
    and not exists(select 1 from jsonb_object_keys(p_details) k where k not in ('publication_id','announcement_count','authorized'))
    and coalesce(p_details->>'publication_id','') ~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
    and coalesce(p_details->>'announcement_count','') ~ '^([1-9]|1[0-9]|20)$' and p_details->'authorized'='true'::jsonb;
end $$;
-- The existing check constraint depends on the old function OID, not its name.
alter table private.admin_audit_event_v1 drop constraint admin_audit_payload_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_payload_v1 check(private.admin_audit_payload_valid_v1(action,outcome,reason,failure_code,changes,details) is true);
do $$ declare d text; begin
  d:=pg_get_functiondef('private.admin_list_audit_events_bridge_v1(jsonb)'::regprocedure);
  if strpos(d,'''announcement.trash'',''announcement.restore'',''announcement.export'') or')=0 then raise exception 'ADMIN_AUDIT_READ_REVIEW_REQUIRED'; end if;
  execute replace(d,'''announcement.trash'',''announcement.restore'',''announcement.export'') or','''announcement.trash'',''announcement.restore'',''announcement.export'',''announcement.create'') or');
end $$;

create function private.admin_author_profiles_v1(p_user uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare p public.profilo; entry record; d jsonb; list jsonb:='[]'; loc jsonb; allowed jsonb; name text;
begin
  select * into p from public.profilo where uuid_utente=p_user and not nascosto;
  if not found then return list; end if;
  for entry in select * from (values
    ('giocatore','profilo_giocatore'),('squadra','profilo_squadra'),('staff-sportivo','profilo_staff_sportivo'),('arbitro','profilo_arbitro'),
    ('torneo-evento','profilo_torneo_evento'),('campi-impianti-sportivi','profilo_campi_impianti'),('servizi-consulenze','profilo_servizi_consulenze'),('creators','profilo_creator')) t(kind,tab) loop
    execute format('select to_jsonb(s) from public.%I s where uuid_profilo=$1 and nascosto is false',entry.tab) into d using p.uuid;
    if d is null then continue; end if;
    allowed:=null;
    if entry.kind in ('servizi-consulenze','creators') then
      select to_jsonb(allowed_regions) into allowed from public.restricted_profile_access where profile_id=p.uuid and profile_type=entry.kind;
      if not found then continue; end if;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('regione',regione,'citta',citta) order by id),'[]') into loc
      from public.localita_profilo where uuid_profilo=p.uuid and sottoprofilo=entry.kind and (id_sottoprofilo is null or id_sottoprofilo=(d->>'id')::bigint);
    name:=coalesce(d->>'nome_societa',d->>'nome_organizzazione',d->>'nome_creator',nullif(btrim(concat_ws(' ',d->>'nome',d->>'cognome')),''),'Profilo');
    list:=list||jsonb_build_array(jsonb_build_object('id',p.uuid::text||':'||entry.kind,'type',entry.kind,'name',name,
      'region',coalesce(loc->0->>'regione',''),'city',coalesce(loc->0->>'citta',''),'facts',entry.kind,
      'sports',coalesce(d->'tipologie_sport','[]'),'draft',d,'locations',loc,'allowedRegions',allowed));
  end loop;
  return list;
end $$;
create function public.admin_search_announcement_authors_v1(p_query text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; q text:=btrim(p_query);
begin
  perform private.require_admin_context_v1();
  if q is null or length(q)<2 or length(q)>254 then return '[]'; end if;
  select coalesce(jsonb_agg(item),'[]') into result from (
    select jsonb_build_object('id',u.utente_uuid,'name',coalesce(nullif(u.indirizzo_email,''),u.utente_uuid::text),'email',coalesce(u.indirizzo_email,''),'profiles',private.admin_author_profiles_v1(u.utente_uuid)) item
    from public.utente u where u.tipologia_utente='Utente' and u.registrato_il is not null and (
      position(lower(q) in lower(coalesce(u.indirizzo_email,'')))>0 or u.utente_uuid::text=q or exists(select 1 from public.profilo p where p.uuid_utente=u.utente_uuid and p.uuid::text=q and not p.nascosto) or
      exists(select 1 from public.profilo p where p.uuid_utente=u.utente_uuid and not p.nascosto and position(lower(q) in lower(private.admin_author_profiles_v1(u.utente_uuid)::text))>0))
    order by u.indirizzo_email nulls last,u.utente_uuid limit 20
  ) rows;
  return result;
end $$;

create function public.admin_get_announcement_submission_v1(p_submission uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor record; receipt private.admin_creation_submission_v1;
begin
  select * into strict actor from private.require_admin_context_v1();
  select * into receipt from private.admin_creation_submission_v1 where actor_auth_uuid=actor.auth_user_uuid and submission_uuid=p_submission;
  if not found then return null; end if;
  return private.regional_publication_result(receipt.publication_uuid,true);
end $$;

-- Only a fixed list of content tables; values are typed through PostgreSQL's row
-- types, and generated/default columns are omitted rather than filled with NULL.
create function private.admin_insert_announcement_detail_v1(p_table text,p_values jsonb)
returns void language plpgsql volatile security invoker set search_path='' as $$
declare cols text;
begin
  if p_table<>all(array['annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creator']) then raise exception 'INVALID_DETAIL_TABLE'; end if;
  select string_agg(quote_ident(attname),',' order by attnum) into cols from pg_attribute
    where attrelid=to_regclass('public.'||p_table) and attnum>0 and not attisdropped and attidentity='' and attgenerated='' and p_values ? attname;
  if cols is null then raise exception 'DETAIL_MISSING'; end if;
  execute format('insert into public.%1$I(%2$s) select %2$s from jsonb_populate_record(null::public.%1$I,$1)',p_table,cols) using p_values;
end $$;

-- Suppress automatic approval/activity only inside the trusted Admin creation
create function private.admin_apply_anonymous_profile_v1(p_type text,p_id uuid,p_draft jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare tab text; cols text;
begin
  tab:=case p_type when 'giocatore' then 'profilo_giocatore' when 'squadra' then 'profilo_squadra'
    when 'staff-sportivo' then 'profilo_staff_sportivo' when 'arbitro' then 'profilo_arbitro'
    when 'torneo-evento' then 'profilo_torneo_evento' when 'campi-impianti-sportivi' then 'profilo_campi_impianti' end;
  if tab is null or not exists(select 1 from public.profilo where uuid=p_id and uuid_utente is null) then raise exception 'ADMIN_CREATION_AUTHOR_INVALID' using errcode='22023'; end if;
  select string_agg(quote_ident(attname),',' order by attnum) into cols from pg_attribute
    where attrelid=to_regclass('public.'||tab) and attnum>0 and not attisdropped and p_draft ? attname
      and attname=any(array['nome','cognome','nome_societa','nome_organizzazione','sport_principale','anno_nascita','mese_nascita','giorno_nascita','genere','nazionalita',
      'nominativo_anonimo','disponibilita','presentazione','tipologie_sport','ruoli_sport','piede_principale','altezza','peso','storico_carriera','video_highlights',
      'highlights_privati','richiede_caricamento_highlights','categoria_attuale','torneo_attuale_nome','squadra_attuale_nome','squadra_attuale_id','squadra_attuale_profilo_id','squadra_attuale_categoria','squadra_attuale_torneo','squadra_attuale_dal',
      'figure_professionali','lista_esperienze','qualifiche_licenze','disponibile_remoto','sede_principale','indirizzo','costo_partenza','info_aggiuntive']);
  if cols is null then raise exception 'INVALID_PROFILE_PAYLOAD' using errcode='22023'; end if;
  execute format('update public.%1$I set (%2$s)=(select %2$s from jsonb_populate_record(null::public.%1$I,$1)) where uuid_profilo=$2 and not nascosto',tab,cols) using p_draft,p_id;
end $$;

-- Suppress automatic approval/activity only inside the trusted Admin creation
-- transaction. No caller-controlled flag, no global switch or trigger disabling.
alter table private.regional_publication_context drop constraint regional_publication_context_mode_check;
alter table private.regional_publication_context add constraint regional_publication_context_mode_check check(mode in ('publish','backfill','admin_create'));
do $$ declare fn regprocedure; name text; d text; begin
  foreach name in array array['public.auto_approve_new_announcement_until_v1()','private.auto_approve_new_announcement_until_v1()','private.track_announcement_activity()'] loop
    fn:=to_regprocedure(name); if fn is null then continue; end if;
    d:=pg_get_functiondef(fn);
    execute replace(d,'mode=''backfill''','mode in (''backfill'',''admin_create'')');
  end loop;
end $$;

create function public.admin_create_announcement_v1(p_submission uuid,p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' set timezone='UTC' as $$
declare actor record; receipt private.admin_creation_submission_v1; hash text; v_profile_id uuid; v_owner_id uuid;
  kind text; ann_type text; tab text; group_id uuid; ann_id uuid:=gen_random_uuid(); correlation uuid:=gen_random_uuid();
  profile_row jsonb; detail jsonb; item jsonb; value jsonb; result jsonb; source text; ann_locations jsonb; review jsonb;
begin
  select * into strict actor from private.require_admin_context_v1();
  if p_submission is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>512000 or p_payload->'authorized' is distinct from 'true'::jsonb then raise exception 'ADMIN_CREATION_INVALID' using errcode='22023'; end if;
  hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('admin-create:'||actor.auth_user_uuid||':'||p_submission,0));
  select * into receipt from private.admin_creation_submission_v1 where actor_auth_uuid=actor.auth_user_uuid and submission_uuid=p_submission;
  if found then
    if receipt.payload_hash<>hash then raise exception 'ADMIN_CREATION_CONFLICT' using errcode='40001'; end if;
    return private.regional_publication_result(receipt.publication_uuid,true);
  end if;
  kind:=p_payload->>'profile_type'; ann_type:=p_payload->>'announcement_type';
  tab:=case ann_type when 'annuncio_creators' then 'annuncio_creator' else ann_type end;
  if kind not in ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators') or kind is null or
    not (case kind when 'squadra' then ann_type in ('annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor')
      when 'staff-sportivo' then ann_type='annuncio_staff_sportivo' when 'torneo-evento' then ann_type='annuncio_torneo_evento'
      when 'campi-impianti-sportivi' then ann_type='annuncio_campo_impianto' when 'servizi-consulenze' then ann_type='annuncio_servizi_consulenze'
      when 'creators' then ann_type='annuncio_creators' else ann_type='annuncio_'||kind end) then raise exception 'ADMIN_CREATION_TYPE_INVALID' using errcode='22023'; end if;
  source:=coalesce(p_payload->>'source','manual');
  if source not in ('manual','whatsapp') or (source='whatsapp' and nullif(btrim(p_payload->>'original_text'),'') is null) or
    coalesce(length(p_payload->>'announcement_title'),0)>50 or coalesce(length(p_payload->>'original_text'),0)>50000 or
    coalesce(length(p_payload->>'message_url'),0)>2048 or coalesce(length(p_payload->>'reference_email'),0)>254 then raise exception 'ADMIN_CREATION_INVALID' using errcode='22023'; end if;
  if nullif(p_payload->>'message_url','') is not null and (p_payload->>'message_url') !~ '^https://([a-zA-Z0-9-]+\.)*(whatsapp\.com|wa\.me)(/[^[:space:]]*)?$' then raise exception 'ADMIN_CREATION_SOURCE_INVALID' using errcode='22023'; end if;
  if p_payload->>'author_mode'='registered' then
    v_profile_id:=(p_payload->>'profile_id')::uuid;
    select p.uuid_utente into v_owner_id from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
      where p.uuid=v_profile_id and not p.nascosto and u.tipologia_utente='Utente' and u.registrato_il is not null for share of p,u;
    if not found then raise exception 'ADMIN_CREATION_AUTHOR_INVALID' using errcode='22023'; end if;
    select v into profile_row from jsonb_array_elements(private.admin_author_profiles_v1(v_owner_id)) v where v->>'type'=kind;
    if profile_row is null then raise exception 'PROFILE_NOT_ENABLED' using errcode='22023'; end if;
    profile_row:=profile_row->'draft';
  elsif p_payload->>'author_mode'='unregistered' then
    if kind in ('servizi-consulenze','creators') then raise exception 'PROFILE_ACCESS_DENIED' using errcode='42501'; end if;
    v_profile_id:=private.create_anonymous_publish_profile(kind,p_payload->'profile_draft',p_payload->'profile_locations');
    perform private.admin_apply_anonymous_profile_v1(kind,v_profile_id,p_payload->'profile_draft');
    update public.profilo set confermato_il=null,verificato_il=null where uuid=v_profile_id;
    perform private.sync_profile_social_links_v1(v_profile_id,kind,p_payload->'profile_social_links');
    profile_row:=p_payload->'profile_draft'; v_owner_id:=null;
  else raise exception 'ADMIN_CREATION_AUTHOR_INVALID' using errcode='22023'; end if;
  perform private.assert_required_subprofile_fields_v1(v_profile_id,kind);
  perform private.assert_updated_profile_fields_v1(v_profile_id,kind);
  detail:=p_payload->'detail'; ann_locations:=p_payload->'announcement_locations';
  if jsonb_typeof(detail) is distinct from 'object' or (ann_type<>'annuncio_squadra_cerca_sponsor' and not private.publish_locations_are_valid(ann_locations)) or (ann_type='annuncio_squadra_cerca_sponsor' and ann_locations is distinct from '[]'::jsonb) then raise exception 'INVALID_PUBLISH_PAYLOAD' using errcode='22023'; end if;
  if ann_type='annuncio_squadra_cerca_sponsor' and ann_locations<>'[]'::jsonb then raise exception 'INVALID_PUBLISH_PAYLOAD'; end if;
  if ann_type='annuncio_campo_impianto' and (jsonb_array_length(ann_locations)<>1 or nullif(btrim(ann_locations->0->>'citta'),'') is null) then raise exception 'INVALID_FACILITY_LOCATION' using errcode='22023'; end if;
  if ann_type in ('annuncio_campo_impianto','annuncio_torneo_evento') and (jsonb_typeof(detail->'tipologie_sport') is distinct from 'array' or jsonb_array_length(detail->'tipologie_sport')<>1) then raise exception 'INVALID_SPORT_SELECTION' using errcode='22023'; end if;
  if (case ann_type
    when 'annuncio_giocatore' then not coalesce(private.publish_text_array_is_valid(detail->'categorie_ricercate',true),false)
    when 'annuncio_squadra_cerca_giocatore' then not coalesce(private.publish_text_array_is_valid(detail->'ruoli_principali',true),false)
    when 'annuncio_squadra_cerca_staff' then not coalesce(private.publish_text_array_is_valid(detail->'figure_ricercate',true),false) or not coalesce(private.publish_text_is_valid(detail->>'requisiti',true,5000),false)
    when 'annuncio_squadra_cerca_partita' then not coalesce(private.publish_text_is_valid(detail->>'categorie_avversario',true,160),false)
    when 'annuncio_squadra_cerca_sponsor' then not coalesce(private.publish_text_is_valid(detail->>'categoria_settore',true,160),false) or not coalesce(private.publish_text_is_valid(detail->>'offerta_fornita',true,5000),false)
    when 'annuncio_servizi_consulenze' then not coalesce(private.publish_text_array_is_valid(detail->'figura_professionale',true),false) or not coalesce(private.publish_text_is_valid(detail->>'presentazione_servizi',true,5000),false)
    when 'annuncio_staff_sportivo' then not coalesce(private.publish_text_array_is_valid(detail->'tipologie_sport',true),false)
    when 'annuncio_arbitro' then not coalesce(private.publish_text_array_is_valid(detail->'tipologie_sport',true),false)
    when 'annuncio_torneo_evento' then not coalesce(private.publish_text_array_is_valid(detail->'tipologie_sport',true),false) or not coalesce(private.publish_text_is_valid(detail->>'nome_evento',true,160),false)
    when 'annuncio_campo_impianto' then not coalesce(private.publish_text_array_is_valid(detail->'tipologie_sport',true),false) or not coalesce(private.publish_text_is_valid(detail->>'indirizzo',true,160),false)
    else false end) then raise exception 'INVALID_ANNOUNCEMENT_DETAIL' using errcode='22023'; end if;
  if kind='servizi-consulenze' and exists(select 1 from jsonb_array_elements(ann_locations) loc where not exists(select 1 from public.restricted_profile_access a where a.profile_id=v_profile_id and a.profile_type=kind and loc->>'regione'=any(a.allowed_regions))) then raise exception 'PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED' using errcode='42501'; end if;
  insert into private.regional_publication(submission_id,owner_id) values(null,v_owner_id) returning id into group_id;
  insert into private.regional_publication_context values(txid_current(),'admin_create');
  insert into public.annuncio(uuid,autore_annuncio,creato_da,tipologia_annuncio,titolo_annuncio,stato_annuncio,livello_annuncio,nascosto,privato,info_stato_annuncio)
    values(ann_id,v_profile_id,v_owner_id,ann_type,nullif(btrim(p_payload->>'announcement_title'),''),'in_revisione','gratuito',false,false,'Inserito dalla dashboard. In attesa di revisione.');
  if kind in ('giocatore','squadra') then detail:=detail||jsonb_build_object('tipologie_sport',profile_row->'tipologie_sport'); end if;
  if kind='giocatore' then detail:=detail||jsonb_build_object('ruoli_principali',profile_row#>'{ruoli_sport,principali}','ruoli_secondari',profile_row#>'{ruoli_sport,specifici}'); end if;
  if kind in ('staff-sportivo','arbitro') then detail:=detail||jsonb_build_object('figure_professionali',coalesce(profile_row->'figure_professionali','[]'),'lista_esperienze',coalesce(profile_row->'lista_esperienze','[]'),'qualifiche_licenze',coalesce(profile_row->'qualifiche_licenze','[]'),'disponibilita_occupazione',profile_row->'disponibilita'); end if;
  perform private.admin_insert_announcement_detail_v1(tab,detail||jsonb_build_object('uuid_annuncio',ann_id));
  for item in select v from jsonb_array_elements(ann_locations) v loop
    insert into public.localita_annuncio(uuid_annuncio,regione,citta) values(ann_id,item->>'regione',nullif(item->>'citta',''));
  end loop;
  if p_payload#>>'{contacts,email}'<>'' then insert into public.contatto_annuncio(uuid_annuncio,tipo,valore,referente) values(ann_id,'email',p_payload#>>'{contacts,email}',nullif(p_payload#>>'{contacts,contactRole}','')); end if;
  if p_payload#>>'{contacts,phone}'<>'' then insert into public.contatto_annuncio(uuid_annuncio,tipo,valore,referente) values(ann_id,'telefono',p_payload#>>'{contacts,phone}',nullif(p_payload#>>'{contacts,contactRole}','')); end if;
  if p_payload->>'author_mode'='unregistered' and not exists(select 1 from public.contatto_annuncio where uuid_annuncio=ann_id) then raise exception 'CONTACT_REQUIRED' using errcode='22023'; end if;
  if nullif(p_payload#>>'{extras,generic_link}','') is not null then
    if not private.admin_review_url_valid_v1(p_payload#>>'{extras,generic_link}') then raise exception 'INVALID_LINK' using errcode='22023'; end if;
    insert into public.link_social_annuncio(uuid_annuncio,piattaforma,sublink) values(ann_id,'website',p_payload#>>'{extras,generic_link}');
  end if;
  if nullif(p_payload#>>'{extras,image_path}','') is not null then
    if not private.admin_announcement_image_path_valid_v1(p_payload#>>'{extras,image_path}',p_payload#>>'{extras,image_mime}') or
      split_part(p_payload#>>'{extras,image_path}','/',1)<>actor.auth_user_uuid::text or split_part(p_payload#>>'{extras,image_path}','/',2)<>p_submission::text then raise exception 'INVALID_IMAGE_PATH' using errcode='22023'; end if;
    insert into public.media_annuncio(uuid_annuncio,formato_media,link_media) values(ann_id,p_payload#>>'{extras,image_mime}',p_payload#>>'{extras,image_path}');
  end if;
  review:=private.project_admin_announcement_v1(private.admin_announcement_snapshot_v1(ann_id));
  if (review->>'complete')::boolean is distinct from true then raise exception 'ADMIN_CREATION_INCOMPLETE' using errcode='22023'; end if;
  perform private.regional_split_announcement(ann_id,group_id);
  delete from private.regional_publication_context where transaction_id=txid_current();
  insert into private.admin_creation_submission_v1(actor_auth_uuid,submission_uuid,publication_uuid,payload_hash,source,message_url,original_text,reference_email)
    values(actor.auth_user_uuid,p_submission,group_id,hash,source,case when source='whatsapp' then nullif(p_payload->>'message_url','') end,case when source='whatsapp' then p_payload->>'original_text' end,nullif(p_payload->>'reference_email',''));
  result:=private.regional_publication_result(group_id,false);
  perform private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'announcement.create','announcement',(result->>'announcementId')::uuid,'success',correlation,null,null,'{}',
    jsonb_build_object('publication_id',group_id,'announcement_count',jsonb_array_length(result->'announcements'),'authorized',true));
  return result;
end $$;

create function private.admin_creation_origin_v1(p_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('kind',s.source,'messageUrl',s.message_url,'rawText',s.original_text)
  from private.regional_publication_item i join private.admin_creation_submission_v1 s on s.publication_uuid=i.publication_id where i.announcement_id=p_id;
$$;
alter function private.list_admin_announcements_v1(jsonb) rename to list_admin_announcements_before_create_v1;
create function private.list_admin_announcements_v1(p_query jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
  result:=private.list_admin_announcements_before_create_v1(p_query);
  return jsonb_set(result,'{items}',coalesce((select jsonb_agg(v||jsonb_build_object('fromWhatsApp',case when private.admin_creation_origin_v1((v->>'id')::uuid) is null then null else private.admin_creation_origin_v1((v->>'id')::uuid)->>'kind'='whatsapp' end)) from jsonb_array_elements(result->'items') v),'[]'));
end $$;
alter function private.get_admin_announcement_v1(uuid) rename to get_admin_announcement_before_create_v1;
create function private.get_admin_announcement_v1(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; origin jsonb; begin
  result:=private.get_admin_announcement_before_create_v1(p_id); if result is null then return null; end if;
  origin:=private.admin_creation_origin_v1(p_id);
  return jsonb_set(result,'{summary}',result->'summary'||jsonb_build_object('fromWhatsApp',case when origin is null then null else origin->>'kind'='whatsapp' end))||jsonb_build_object('origin',origin);
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
    (n.nspname='private' and p.proname in ('admin_author_profiles_v1','admin_apply_anonymous_profile_v1','admin_insert_announcement_detail_v1','admin_creation_origin_v1','admin_audit_payload_valid_v1','list_admin_announcements_v1','get_admin_announcement_v1')) or
    (n.nspname='public' and p.proname in ('admin_search_announcement_authors_v1','admin_get_announcement_submission_v1','admin_create_announcement_v1')) loop
    execute format('alter function %s owner to postgres',f.signature);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  end loop;
end $$;
grant execute on function private.list_admin_announcements_v1(jsonb),private.get_admin_announcement_v1(uuid),public.admin_search_announcement_authors_v1(text),public.admin_get_announcement_submission_v1(uuid),public.admin_create_announcement_v1(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
