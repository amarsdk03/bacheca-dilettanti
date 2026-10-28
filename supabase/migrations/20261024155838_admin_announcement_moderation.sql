-- Step 09. Prepared for isolated validation; never an instruction to apply remotely.
begin;

do $$ begin
  if pg_catalog.to_regprocedure('private.admin_announcement_snapshot_v1(uuid)') is null
    or pg_catalog.to_regprocedure('private.append_admin_audit_event_v1(uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb)') is null
    or pg_catalog.to_regclass('private.announcement_submission') is null then
    raise exception 'ADMIN_MODERATION_DEPENDENCIES_REQUIRED';
  end if;
end $$;

alter table public.annuncio add column oscurato_da_admin boolean not null default false;
comment on column public.annuncio.oscurato_da_admin is 'Administrative hold. Owners cannot clear this flag or make the row visible while held.';

-- Invoker is intentional: distinguish the trusted private procedure from a
-- direct owner or service-role table write. No caller-controlled GUC bypass.
create function private.guard_admin_announcement_visibility_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if (tg_op='INSERT' and new.oscurato_da_admin) or
    (tg_op='UPDATE' and new.oscurato_da_admin is distinct from old.oscurato_da_admin) then
    if current_user <> 'postgres' then
      raise exception using errcode='42501',message='ADMIN_VISIBILITY_HOLD_PROTECTED';
    end if;
  end if;
  if new.oscurato_da_admin and new.nascosto is distinct from true then
    raise exception using errcode='42501',message='ADMIN_ANNOUNCEMENT_HIDDEN';
  end if;
  return new;
end $$;
create trigger zz_guard_admin_announcement_visibility_v1 before insert or update on public.annuncio
for each row execute function private.guard_admin_announcement_visibility_v1();

-- Every child writer participates, including privileged publication functions.
-- No child locks are taken by the moderation reader. NOWAIT avoids cycles with
-- writers that already hold a child row or a receipt. Cascade delete may have
-- removed its parent already; that case must continue to work.
create function private.lock_announcement_child_parent_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_old uuid; v_new uuid; v_id uuid;
begin
  if tg_op <> 'INSERT' then v_old:=old.uuid_annuncio; end if;
  if tg_op <> 'DELETE' then v_new:=new.uuid_annuncio; end if;
  for v_id in select distinct x from unnest(array[v_old,v_new]) x where x is not null order by x loop
    perform 1 from public.annuncio where uuid=v_id for update nowait;
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
do $$ declare v_table text; begin
  foreach v_table in array array['annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff',
    'annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro',
    'annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creator',
    'localita_annuncio','contatto_annuncio','link_social_annuncio','media_annuncio'] loop
    execute pg_catalog.format('create trigger admin_lock_parent_v1 before insert or update or delete on public.%I for each row execute function private.lock_announcement_child_parent_v1()',v_table);
  end loop;
end $$;

-- Match JavaScript's UTF-16 bounds, while reason limits remain code points.
create function private.admin_utf16_length_v1(p_value text)
returns integer language sql immutable strict security invoker set search_path='' as $$
  select char_length(p_value)+char_length(regexp_replace(p_value,U&'[^\+010000-\+10FFFF]','','g'));
$$;
-- Keep the existing projector's shape/anonymity behavior, bounding values before
-- JSON crosses into JS. Oversized text/numbers become explicit incomplete data.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('private.admin_announcement_field_v1(jsonb,text,text)'::regprocedure);
  if strpos(definition,'v_out:=p_value;')=0 or strpos(definition,'pg_catalog.left(p_value#>>''{}'',5000)')=0 then
    raise exception 'ADMIN_MODERATION_FIELD_PROJECTOR_REVIEW_REQUIRED';
  end if;
  definition:=replace(definition,'pg_catalog.length(','private.admin_utf16_length_v1(');
  definition:=replace(definition,'v_out:=pg_catalog.to_jsonb(pg_catalog.left(p_value#>>''{}'',5000));','v_out:=''null''::jsonb;');
  definition:=replace(definition,'v_out:=p_value;','v_out:=p_value; if p_kind=''number'' and abs((p_value#>>''{}'')::numeric)>1.7976931348623157e308::numeric then v_out:=''null''::jsonb; v_bad:=true; end if;');
  execute definition;
end $$;

-- A deliberately conservative URL review gate. No remote fetch or URL decoding.
-- Renderers retain their independent WHATWG URL validation. Conservative rejects
-- (e.g. encoded/Unicode hostnames) require correction before approval/show.
create function private.admin_review_url_valid_v1(p_value text)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare v text:=btrim(p_value); m text[]; host text; label text; address inet;
begin
  if p_value is null or private.admin_utf16_length_v1(p_value)>2048 or p_value ~ '[[:cntrl:]]'
    or strpos(p_value,chr(92))>0 then return false; end if;
  m:=regexp_match(v,'^https?://(\[[^]]+\]|[A-Za-z0-9_.-]+)(:([0-9]+))?([/?#]|$)','i');
  if m is null then return false; end if;
  if m[3] is not null and (length(m[3])>5 or m[3]::integer>65535) then return false; end if;
  host:=m[1];
  if left(host,1)='[' then
    if substring(host from 2 for length(host)-2) !~ '^[0-9A-Fa-f:.]+$' then return false; end if;
    begin address:=substring(host from 2 for length(host)-2)::inet;
      return family(address)=6;
    exception when invalid_text_representation then return false; end;
  end if;
  if host ~ '(^|\.)([0-9]+|0[xX][0-9A-Fa-f]+)\.?$' then
    begin address:=host::inet;
      return family(address)=4 and host=host(address);
    exception when invalid_text_representation then return false; end;
  end if;
  if length(host)>253 then return false; end if;
  foreach label in array string_to_array(rtrim(host,'.'),'.') loop
    if length(label)=0 or length(label)>63 then return false; end if;
  end loop;
  return true;
end $$;

-- Additional semantic checks formerly applied only by the server DTO parser.
-- Work on the projected bounded data, but the fingerprint always covers ALL raw
-- rows. These issues are also returned to the UI, never accepted from it.
create function private.admin_review_issues_v1(p_detail jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare issues jsonb:=p_detail->'issues'; row jsonb; field text; kind text; value jsonb;
  s text; days text[]; invalid boolean;
begin
  for row in select x.value from jsonb_array_elements(p_detail->'contacts') x loop
    s:=btrim(row->>'value');
    if not coalesce(case row->>'kind'
      when 'email' then private.admin_utf16_length_v1(s)<=254 and s ~ '^[^@\s?&#]+@[^@\s?&#]+\.[^@\s?&#]+$'
      when 'telefono' then length(s)<=40 and s ~ '^[+0-9().\s-]+$' and length(regexp_replace(s,'[^0-9]','','g')) between 6 and 20
      else false end,false) then issues:=issues||'"INVALID_CONTACT"'::jsonb; end if;
  end loop;
  for row in select x.value from jsonb_array_elements((p_detail->'links')||(p_detail->'media')) x loop
    if not private.admin_review_url_valid_v1(row->>'value') then issues:=issues||'"UNSAFE_LINK"'::jsonb; end if;
  end loop;
  for field,kind in select f.key,f.value from jsonb_each_text(coalesce(private.admin_announcement_detail_spec_v1(p_detail#>>'{summary,type}'),'{}')) f loop
    value:=p_detail#>array['content','fields',field]; invalid:=false;
    if value='null'::jsonb then continue; end if;
    if kind='text' then invalid:=char_length(value#>>'{}')>5000;
    elsif kind='history' then
      for row in select x.value from jsonb_array_elements(value) x loop
        invalid:=invalid or coalesce((row->>'periodoDa')<>'' and (row->>'periodoDa') !~ '^(19|20)[0-9]{2}$',false)
          or coalesce((row->>'periodoA')<>'' and (row->>'periodoA')<>'oggi' and (row->>'periodoA') !~ '^(19|20)[0-9]{2}$',false)
          or coalesce((row->>'stato')<>'' and (row->>'stato') not in ('non-specificare','in-corso','conseguito'),false);
      end loop;
    elsif kind='schedule' then
      days:=array[]::text[];
      for row in select x.value from jsonb_array_elements(value) x loop
        s:=row->>'giorno';
        invalid:=invalid or s is null or s not in ('lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica')
          or s=any(days) or row->>'attivo' is null
          or coalesce((row->>'dalle')<>'' and (row->>'dalle') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',false)
          or coalesce((row->>'alle')<>'' and (row->>'alle') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',false);
        days:=array_append(days,s);
      end loop;
    end if;
    if invalid then issues:=issues||jsonb_build_array('INVALID_FIELD:'||field); end if;
  end loop;
  return (select coalesce(jsonb_agg(distinct v),'[]') from jsonb_array_elements(issues) v);
end $$;

create function private.admin_moderation_capabilities_v1(p_snapshot jsonb,p_detail jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare b jsonb:=p_snapshot->'base'; status text:=b->>'stato_annuncio'; complete boolean;
  operation text; reason text; caps jsonb:='{}';
begin
  complete:=(p_detail->>'complete')::boolean;
  foreach operation in array array['approve','reject','hide','show'] loop
    reason:=null;
    if operation in ('approve','reject') and status is distinct from 'in_revisione' then reason:='REVIEW_REQUIRED';
    elsif operation='hide' and b->'nascosto'='true'::jsonb then reason:='ALREADY_HIDDEN';
    elsif operation='show' and b->'nascosto' is distinct from 'true'::jsonb then reason:='NOT_HIDDEN';
    elsif operation='show' and (status is null or status not in ('in_revisione','pubblicato','rifiutato')) then reason:='PAYMENT_OR_STATE_PENDING';
    elsif operation in ('approve','show') then
      if not complete then reason:='INCOMPLETE_CONTENT';
      elsif nullif(btrim(b->>'titolo_annuncio'),'') is null then reason:='TITLE_REQUIRED';
      elsif b->>'tipologia_annuncio'='annuncio_servizi_consulenze' and jsonb_array_length(p_snapshot->'locations')=0 then reason:='REGIONS_REQUIRED';
      elsif operation='approve' and b->>'livello_annuncio'='prioritario' and not exists (
        select 1 from private.announcement_submission s where s.announcement_id=(b->>'uuid')::uuid
          and s.requested_visibility='prioritario' and s.paid_at is not null and s.refund_required_at is null and s.refunded_at is null
      ) then reason:='PAYMENT_REQUIRED';
      end if;
    end if;
    caps:=caps||jsonb_build_object(operation,jsonb_build_object('allowed',reason is null,'reason',reason));
  end loop;
  return caps;
end $$;

create function private.project_admin_announcement_v1(v_snapshot jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare result jsonb; b jsonb; v_type text; v_spec jsonb; v_fields jsonb:='{}'; v_issues jsonb:='[]';
  v_key text; v_kind text; v_projected jsonb; v_name_field text; v_collection text; v_rows jsonb; v_limit integer;
  v_collections jsonb:='{}'; v_row jsonb; v_item jsonb; v_count integer;
begin
  b:=v_snapshot->'base'; v_type:=b->>'tipologia_annuncio'; v_spec:=private.admin_announcement_detail_spec_v1(v_type);
  if v_spec is null then v_issues:=v_issues||'"UNSUPPORTED_TYPE"'::jsonb;
  elsif v_snapshot->'detail'='null'::jsonb then v_issues:=v_issues||'"DETAIL_MISSING"'::jsonb;
  end if;
  for v_key,v_kind in select key,value from pg_catalog.jsonb_each_text(coalesce(v_spec,'{}')) loop
    v_name_field:=case when v_type='annuncio_staff_sportivo' and v_key='lista_esperienze' then 'titolo' else 'ente' end;
    v_projected:=private.admin_announcement_field_v1(v_snapshot->'detail'->v_key,v_kind,v_name_field);
    v_fields:=v_fields||pg_catalog.jsonb_build_object(v_key,v_projected->'value');
    if (v_projected->>'invalid')::boolean then v_issues:=v_issues||pg_catalog.jsonb_build_array('INVALID_FIELD:'||v_key); end if;
  end loop;
  foreach v_collection in array array['locations','contacts','links','media'] loop
    v_rows:='[]'; v_count:=0; v_limit:=case when v_collection='locations' then 100 else 30 end;
    for v_row in select value from pg_catalog.jsonb_array_elements(v_snapshot->v_collection) loop
      v_count:=v_count+1;
      if v_count>v_limit then v_issues:=v_issues||pg_catalog.jsonb_build_array('COLLECTION_TRUNCATED:'||v_collection); exit; end if;
      v_item:=pg_catalog.jsonb_build_object('id',v_row->>'id');
      if v_collection='locations' then v_item:=v_item||pg_catalog.jsonb_build_object('region',v_row->'regione','city',v_row->'citta');
      elsif v_collection='contacts' then v_item:=v_item||pg_catalog.jsonb_build_object('kind',v_row->'tipo','value',v_row->'valore','referent',v_row->'referente');
      elsif v_collection='links' then v_item:=v_item||pg_catalog.jsonb_build_object('platform',v_row->'piattaforma','value',v_row->'sublink');
      else v_item:=v_item||pg_catalog.jsonb_build_object('mimeType',v_row->'formato_media','value',v_row->'link_media'); end if;
      v_rows:=v_rows||pg_catalog.jsonb_build_array(v_item);
    end loop;
    v_collections:=v_collections||pg_catalog.jsonb_build_object(v_collection,v_rows);
  end loop;
  result:=v_collections||pg_catalog.jsonb_build_object(
    'summary',pg_catalog.jsonb_build_object('id',b->'uuid','title',b->'titolo_annuncio','type',v_type,'status',b->'stato_annuncio',
      'hidden',b->'nascosto','private',b->'privato','creatorId',b->'creato_da',
      'createdAt',pg_catalog.to_char((b->>'creato_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt',pg_catalog.to_char((b->>'ultima_modifica_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'rowFingerprint',pg_catalog.md5(b::text),'author',private.admin_announcement_author_v1((b->>'autore_annuncio')::uuid,v_type)),
    'metadata',pg_catalog.jsonb_build_object('moderationInfo',b->'info_stato_annuncio','level',b->'livello_annuncio','priorityActive',b->'priorita_attiva',
      'priorityStartsAt',pg_catalog.to_char((b->>'priorita_inizio_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'priorityEndsAt',pg_catalog.to_char((b->>'priorita_fine_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'updatedById',b->'ultima_modifica_da'),
    'content',pg_catalog.jsonb_build_object('type',case when v_spec is null then 'unsupported' else v_type end,'fields',v_fields),
    'contentFingerprint','content-v1:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_snapshot::text,'UTF8')),'hex'),
    'complete',pg_catalog.jsonb_array_length(v_issues)=0,'issues',v_issues);
  v_issues:=private.admin_review_issues_v1(result);
  result:=result||jsonb_build_object('issues',v_issues,'complete',jsonb_array_length(v_issues)=0);
  return result||jsonb_build_object('moderation',jsonb_build_object('adminHidden',b->'oscurato_da_admin','capabilities',private.admin_moderation_capabilities_v1(v_snapshot,result)));
end;
$$;

create or replace function private.get_admin_announcement_v1(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare snapshot jsonb;
begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception using errcode='42501',message='ADMIN_ACCESS_DENIED'; end if;
  perform private.require_admin_context_v1();
  if p_id is null then raise exception using errcode='22023',message='ADMIN_ANNOUNCEMENT_ID_INVALID'; end if;
  snapshot:=private.admin_announcement_snapshot_v1(p_id);
  if snapshot is null then return null; end if;
  return private.project_admin_announcement_v1(snapshot);
end;
$$;

-- The public API remains an invoker wrapper. The private operation owns the
-- minimum elevated access, verifies exact human Admin, then locks and rechecks.
create function private.moderate_admin_announcement_v1(p_id uuid,p_operation text,p_fingerprint text,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path='' set timezone='UTC' as $$
declare actor record; snapshot jsonb; detail jsonb; b jsonb; fingerprint text;
  reason text:=nullif(btrim(p_reason),''); event_id uuid; correlation uuid:=gen_random_uuid(); changes jsonb;
begin
  if current_setting('role',true) is distinct from 'authenticated' then
    raise exception using errcode='42501',message='ADMIN_ACCESS_DENIED';
  end if;
  select * into actor from private.require_admin_context_v1();
  if p_id is null or p_operation is null or p_operation collate "C" not in ('approve','reject','hide','show')
    or p_fingerprint is null or p_fingerprint !~ '^content-v1:[0-9a-f]{64}$'
    or (p_operation in ('reject','hide') and (reason is null or reason !~ '[^[:space:]]'))
    or char_length(reason)>1000 or (p_operation in ('approve','show') and reason is not null) then
    return jsonb_build_object('status','invalid','correlationId',correlation);
  end if;
  begin
    perform 1 from private.announcement_submission where announcement_id=p_id order by submission_id for update nowait;
    perform 1 from public.annuncio where uuid=p_id for update nowait;
    if not found then return jsonb_build_object('status','not_found','correlationId',correlation); end if;
    -- A separate volatile statement after the locks obtains the current snapshot.
    snapshot:=private.admin_announcement_snapshot_v1(p_id); b:=snapshot->'base';
    fingerprint:='content-v1:'||encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
    if fingerprint<>p_fingerprint then return jsonb_build_object('status','conflict','correlationId',correlation); end if;
    detail:=private.project_admin_announcement_v1(snapshot);
    if not (detail#>>array['moderation','capabilities',p_operation,'allowed'])::boolean then
      return jsonb_build_object('status','not_allowed','reason',detail#>>array['moderation','capabilities',p_operation,'reason'],'correlationId',correlation);
    end if;
    if p_operation in ('approve','reject') then
      changes:=jsonb_build_object('status',jsonb_build_object('before',b->'stato_annuncio','after',case when p_operation='approve' then 'pubblicato' else 'rifiutato' end));
      update public.annuncio set stato_annuncio=case when p_operation='approve' then 'pubblicato' else 'rifiutato' end,
        info_stato_annuncio=case when p_operation='approve' then 'Annuncio approvato.' else 'Annuncio non approvato. Motivo: '||reason end,
        ultima_modifica_da=actor.utente_uuid,ultima_modifica_il=statement_timestamp() where uuid=p_id;
    else
      changes:=jsonb_build_object('hidden',jsonb_build_object('before',b->'nascosto','after',p_operation='hide'));
      update public.annuncio set nascosto=p_operation='hide',oscurato_da_admin=p_operation='hide',
        info_stato_annuncio=case when p_operation='hide' then 'Annuncio oscurato. Motivo: '||reason else 'Oscuramento rimosso. Lo stato di moderazione rimane invariato.' end,
        ultima_modifica_da=actor.utente_uuid,ultima_modifica_il=statement_timestamp() where uuid=p_id;
    end if;
    event_id:=private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'announcement.'||p_operation,
      'announcement',p_id,'success',correlation,reason,null,changes,'{}');
    return jsonb_build_object('status','ok','id',p_id,'eventId',event_id,'correlationId',correlation);
  exception
    when lock_not_available or deadlock_detected or serialization_failure then
      return jsonb_build_object('status','conflict','correlationId',correlation);
    when insufficient_privilege then
      if sqlerrm='PRIORITY_PAYMENT_REQUIRED' then return jsonb_build_object('status','not_allowed','reason','PAYMENT_REQUIRED','correlationId',correlation); end if;
      return jsonb_build_object('status','unavailable','correlationId',correlation);
    when others then
      -- Subtransaction rollback includes mutation, priority, notifications, audit.
      -- Never serialize SQL exception messages or original data to the client.
      return jsonb_build_object('status','unavailable','correlationId',correlation);
  end;
end $$;
create function public.admin_moderate_announcement_v1(p_id uuid,p_operation text,p_fingerprint text,p_reason text default null)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.moderate_admin_announcement_v1(p_id,p_operation,p_fingerprint,p_reason);
$$;

-- Payment completion must preserve a hold, including inconsistent legacy pending
-- rows that were visible before hide. Otherwise the hold guard would roll back a
-- legitimate payment event. Preserve the rest of the existing payment function.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean)'::regprocedure);
  if strpos(definition,'nascosto = false,')=0 then raise exception 'ADMIN_MODERATION_PAYMENT_FUNCTION_REVIEW_REQUIRED'; end if;
  definition:=replace(definition,'nascosto = false,','nascosto = case when oscurato_da_admin then true else false end,');
  if strpos(definition,'info_stato_annuncio = ''Pagamento ricevuto. Annuncio in attesa di revisione.'',')=0 then raise exception 'ADMIN_MODERATION_PAYMENT_INFO_REVIEW_REQUIRED'; end if;
  definition:=replace(definition,'info_stato_annuncio = ''Pagamento ricevuto. Annuncio in attesa di revisione.'',',
    'info_stato_annuncio = case when oscurato_da_admin then info_stato_annuncio else ''Pagamento ricevuto. Annuncio in attesa di revisione.'' end,');
  execute definition;
end $$;

do $$ declare signature regprocedure; begin
  foreach signature in array array[
    'private.guard_admin_announcement_visibility_v1()'::regprocedure,
    'private.lock_announcement_child_parent_v1()'::regprocedure,
    'private.admin_utf16_length_v1(text)'::regprocedure,
    'private.admin_review_url_valid_v1(text)'::regprocedure,
    'private.admin_review_issues_v1(jsonb)'::regprocedure,
    'private.admin_moderation_capabilities_v1(jsonb,jsonb)'::regprocedure,
    'private.project_admin_announcement_v1(jsonb)'::regprocedure,
    'private.moderate_admin_announcement_v1(uuid,text,text,text)'::regprocedure,
    'public.admin_moderate_announcement_v1(uuid,text,text,text)'::regprocedure] loop
    execute format('alter function %s owner to postgres',signature);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',signature);
  end loop;
end $$;
grant execute on function private.moderate_admin_announcement_v1(uuid,text,text,text),public.admin_moderate_announcement_v1(uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
