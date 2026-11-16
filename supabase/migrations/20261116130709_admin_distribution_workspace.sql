begin;
set local lock_timeout='10s';

do $$ begin
  if to_regclass('private.announcement_whatsapp_v1') is null
    or to_regclass('public.profile_type_state') is null
    or to_regprocedure('private.admin_list_audit_events_bridge_v1(jsonb)') is null
    or to_regprocedure('private.admin_creation_origin_v1(uuid)') is null then
    raise exception 'ADMIN_DISTRIBUTION_PREREQUISITES_REQUIRED';
  end if;
end $$;

create table private.distribution_channel_v1 (
  id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 120),
  channel_key text not null unique check(channel_key ~ '^[A-Za-z0-9_-]{5,200}$'),
  url text not null, region text, active boolean not null default true, version integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table private.distribution_record_v1 (
  id uuid primary key default gen_random_uuid(), publication_key text not null,
  announcement_id uuid references public.annuncio(uuid) on delete set null,
  channel_id uuid references private.distribution_channel_v1(id), legacy_id uuid unique,
  title text not null default '', message_text text not null default '' check(length(message_text)<=50000),
  message_url text, template_version text not null default '', source_hash text,
  confirmed boolean not null default false, manual boolean not null default false,
  superseded boolean not null default false, version integer not null default 0,
  posted_at timestamptz, updated_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(not manual or (confirmed and message_url is null)),
  check(confirmed=(manual or message_url is not null)), check(channel_id is not null or legacy_id is not null)
);
create unique index distribution_current_channel_idx on private.distribution_record_v1(publication_key,channel_id) where not superseded and channel_id is not null;
create index distribution_record_publication_idx on private.distribution_record_v1(publication_key);
create index distribution_record_announcement_idx on private.distribution_record_v1(announcement_id);
create index distribution_record_history_idx on private.distribution_record_v1(updated_at desc,id desc);
create index distribution_record_channel_idx on private.distribution_record_v1(channel_id,updated_at desc);
create table private.distribution_revision_v1 (
  record_id uuid not null references private.distribution_record_v1(id), version integer not null,
  snapshot jsonb not null, created_at timestamptz not null default now(), primary key(record_id,version)
);
create table private.distribution_receipt_v1 (
  request_id uuid primary key, actor_id uuid not null, input_hash text not null, result jsonb not null, created_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['distribution_channel_v1','distribution_record_v1','distribution_revision_v1','distribution_receipt_v1'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on private.%I from public,anon,authenticated,service_role',t);
  end loop;
end $$;

create function private.distribution_key_v1(p_id uuid) returns text language sql stable security invoker set search_path='' as $$
  select case when a.gruppo_pubblicazione is null then 'announcement:'||a.uuid else 'publication:'||a.gruppo_pubblicazione end from public.annuncio a where a.uuid=p_id;
$$;
create function private.distribution_public_v1(p_id uuid) returns boolean language sql stable security invoker set search_path='' as $$
  select coalesce(a.stato_annuncio='pubblicato' and not a.privato and not a.nascosto and not a.profile_admin_hidden and a.eliminato_il is null
    and (a.tipologia_annuncio<>'annuncio_servizi_consulenze' or exists(select 1 from public.localita_annuncio l where l.uuid_annuncio=a.uuid)),false)
  from public.annuncio a where a.uuid=p_id;
$$;
create function private.distribution_detail_v1(p_id uuid,p_channel uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare k text:=private.distribution_key_v1(p_id); chosen uuid; region_name text; d jsonb; loc jsonb; begin
  select region into region_name from private.distribution_channel_v1 where id=p_channel;
  select a.uuid into chosen from public.annuncio a where private.distribution_key_v1(a.uuid)=k and private.distribution_public_v1(a.uuid)
    and (region_name is null or exists(select 1 from public.localita_annuncio l where l.uuid_annuncio=a.uuid and l.regione=region_name))
    order by a.creato_il asc nulls last,a.uuid limit 1;
  if chosen is null then return null; end if;
  d:=private.get_admin_announcement_v1(chosen);
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id::text,'region',l.regione,'city',l.citta) order by l.regione,l.citta,l.id),'[]') into loc
  from (select distinct on(l.regione,coalesce(l.citta,'')) l.id,l.regione,l.citta from public.localita_annuncio l join public.annuncio a on a.uuid=l.uuid_annuncio
    where private.distribution_key_v1(a.uuid)=k and private.distribution_public_v1(a.uuid) and (region_name is null or l.regione=region_name)
    order by l.regione,coalesce(l.citta,''),l.id) l;
  return jsonb_set(d,'{locations}',loc);
end $$;
-- Hash only message inputs, not administrative timestamps, signed URLs or row IDs.
create function private.distribution_hash_v1(d jsonb) returns text language sql immutable security invoker set search_path='' as $$
  select case when d is null then null else encode(sha256(convert_to(jsonb_build_object(
    'announcementId',d#>'{summary,id}','title',d#>'{summary,title}','type',d#>'{summary,type}','author',d#>'{summary,author}', 'content',d->'content',
    'locations',(select coalesce(jsonb_agg(x-'id' order by (x-'id')::text),'[]') from jsonb_array_elements(d->'locations') x),
    'contacts',(select coalesce(jsonb_agg(x-'id' order by (x-'id')::text),'[]') from jsonb_array_elements(d->'contacts') x)
  )::text,'UTF8')),'hex') end;
$$;
create function private.distribution_source_v1(p_id uuid,p_channel uuid) returns boolean language sql stable security invoker set search_path='' as $$
  select exists(select 1 from public.annuncio a join private.distribution_channel_v1 c on c.id=p_channel
    where private.distribution_key_v1(a.uuid)=private.distribution_key_v1(p_id)
      and private.admin_creation_origin_v1(a.uuid)->>'kind'='whatsapp'
      and (private.admin_creation_origin_v1(a.uuid)->>'messageUrl') ~ ('^https://(www\.)?whatsapp\.com/channel/'||c.channel_key||'(/|\?|$)'));
$$;
create function private.distribution_state_v1(p_id uuid,p_channel uuid,p_record uuid) returns text language plpgsql stable security invoker set search_path='' as $$
declare r private.distribution_record_v1; d jsonb; begin
  if p_record is null then return case when private.distribution_source_v1(p_id,p_channel) then 'source' else 'unprepared' end; end if;
  select * into r from private.distribution_record_v1 where id=p_record;
  if r.channel_id is null then return 'unassigned'; end if;
  d:=private.distribution_detail_v1(p_id,p_channel);
  if d is null then return 'unavailable'; end if;
  if not r.confirmed then return 'draft'; end if;
  return case when r.source_hash is distinct from private.distribution_hash_v1(d) then 'stale' else 'published' end;
end $$;

-- Preserve every legacy export; unknown destinations remain explicitly unassigned.
insert into private.distribution_record_v1(publication_key,announcement_id,legacy_id,title,message_text,message_url,template_version,confirmed,posted_at,updated_by,created_at,updated_at)
select private.distribution_key_v1(w.announcement_id),w.announcement_id,w.announcement_id,coalesce(a.titolo_annuncio,''),w.message_text,w.message_url,w.template_version,
  w.message_url is not null,case when w.message_url is not null then w.updated_at end,w.updated_by,coalesce(w.updated_at,now()),coalesce(w.updated_at,now())
from private.announcement_whatsapp_v1 w join public.annuncio a on a.uuid=w.announcement_id where w.message_text<>'' or w.message_url is not null;
insert into private.distribution_revision_v1(record_id,version,snapshot) select id,version,to_jsonb(r) from private.distribution_record_v1 r;

create function private.distribution_record_item_v1(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',r.id,'announcementId',r.announcement_id,'publicationKey',r.publication_key,'channelId',r.channel_id,
    'channelName',c.name,'channelActive',coalesce(c.active,false),'title',r.title,'text',r.message_text,'url',coalesce(r.message_url,''),
    'templateVersion',r.template_version,'sourceHash',r.source_hash,'confirmed',r.confirmed,'manual',r.manual,'superseded',r.superseded,
    'version',r.version,'postedAt',r.posted_at,'updatedAt',r.updated_at,'updatedBy',coalesce(a.email,r.updated_by::text),
    'state',private.distribution_state_v1(r.announcement_id,r.channel_id,r.id))
  from private.distribution_record_v1 r left join private.distribution_channel_v1 c on c.id=r.channel_id left join auth.users a on a.id=r.updated_by where r.id=p_id;
$$;
create function private.distribution_channel_item_v1(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',id,'name',name,'url',url,'region',region,'active',active,'version',version) from private.distribution_channel_v1 where id=p_id;
$$;

create function private.admin_distribution_read_v1(p_op text,q jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb; more boolean; n integer; d jsonb; v_record private.distribution_record_v1; c uuid; a uuid; k text; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  if jsonb_typeof(q) is distinct from 'object' or length(q::text)>4000 then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  if p_op='detail' then
    if exists(select 1 from jsonb_each(q) x where x.key not in ('announcementId','channelId','recordId') or jsonb_typeof(x.value)<>'string')
      or coalesce(q->>'announcementId',q->>'recordId') is null then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    a:=(q->>'announcementId')::uuid; c:=nullif(q->>'channelId','')::uuid;
    if q->>'recordId' is not null then select * into v_record from private.distribution_record_v1 where id=(q->>'recordId')::uuid; if not found then return null; end if; a:=v_record.announcement_id; c:=coalesce(c,v_record.channel_id); end if;
    if v_record.channel_id is not null and c<>v_record.channel_id then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    k:=private.distribution_key_v1(a);
    if c is not null and not exists(select 1 from private.distribution_channel_v1 where id=c) then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    if v_record.id is null and c is not null then select * into v_record from private.distribution_record_v1 where publication_key=k and channel_id=c and not superseded; end if;
    if v_record.id is null then select * into v_record from private.distribution_record_v1 where publication_key=k and channel_id is null order by updated_at desc,id limit 1; end if;
    d:=private.distribution_detail_v1(a,c);
    if d is null and v_record.id is null then return null; end if;
    return jsonb_build_object('detail',d,'sourceHash',private.distribution_hash_v1(d),'record',case when v_record.id is not null then private.distribution_record_item_v1(v_record.id) else null end,
      'sourceHere',private.distribution_source_v1(a,c),'history',coalesce((select jsonb_agg(jsonb_build_object('version',version,'createdAt',created_at,'text',snapshot->>'message_text','url',snapshot->>'message_url','confirmed',snapshot->'confirmed','manual',snapshot->'manual') order by version desc) from (select * from private.distribution_revision_v1 where record_id=v_record.id order by version desc limit 30) h),'[]'));
  end if;
  if p_op='choices' then
    if exists(select 1 from jsonb_each(q) x where x.key<>'announcementId' or jsonb_typeof(x.value)<>'string') then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    a:=(q->>'announcementId')::uuid;
    return coalesce((select jsonb_agg(private.distribution_channel_item_v1(c.id) order by c.region nulls first,c.name,c.id) from private.distribution_channel_v1 c where c.active
      and (a is null or exists(select 1 from public.annuncio ad where private.distribution_key_v1(ad.uuid)=private.distribution_key_v1(a) and private.distribution_public_v1(ad.uuid)
        and (c.region is null or exists(select 1 from public.localita_annuncio l where l.uuid_annuncio=ad.uuid and l.regione=c.region))))),'[]');
  end if;
  for k in select jsonb_object_keys(q) loop
    if k not in ('view','search','channel','region','type','state','from','to','offset') then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  end loop;
  if coalesce(q->>'offset','0')!~'^(0|[1-9][0-9]{0,5})$' or length(coalesce(q->>'search',''))>200 then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  n:=coalesce((q->>'offset')::integer,0); if n%30<>0 then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  if coalesce(q->>'from','')<>'' and coalesce(q->>'to','')<>'' and q->>'from'>q->>'to' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  if p_op='channels' then
    with rows as (select id,row_number() over(order by active desc,name,id) pos from private.distribution_channel_v1
      where (coalesce(q->>'search','')='' or position(lower(q->>'search') in lower(name))>0 or id::text=q->>'search')
      and (coalesce(q->>'region','')='' or region=q->>'region')
      and (coalesce(q->>'state','all')='all' or active=(q->>'state'='active')) order by active desc,name,id limit 31 offset n)
    select coalesce(jsonb_agg(private.distribution_channel_item_v1(id) order by pos) filter(where pos<=n+30),'[]'),coalesce(bool_or(pos>n+30),false) into items,more from rows;
  elsif p_op='publications' then
    with rows as (select r.id,row_number() over(order by r.updated_at desc,r.id desc) pos from private.distribution_record_v1 r left join private.distribution_channel_v1 c on c.id=r.channel_id
      where (coalesce(q->>'search','')='' or position(lower(q->>'search') in lower(r.title))>0 or r.announcement_id::text=q->>'search' or r.id::text=q->>'search')
        and (coalesce(q->>'channel','')='' or r.channel_id::text=q->>'channel') and (coalesce(q->>'region','')='' or c.region=q->>'region')
        and (coalesce(q->>'state','all')='all' or private.distribution_state_v1(r.announcement_id,r.channel_id,r.id)=q->>'state')
        and (coalesce(q->>'from','')='' or r.updated_at>=((q->>'from')::date::timestamp at time zone 'Europe/Rome'))
        and (coalesce(q->>'to','')='' or r.updated_at<(((q->>'to')::date+1)::timestamp at time zone 'Europe/Rome'))
      order by r.updated_at desc,r.id desc limit 31 offset n)
    select coalesce(jsonb_agg(private.distribution_record_item_v1(id) order by pos) filter(where pos<=n+30),'[]'),coalesce(bool_or(pos>n+30),false) into items,more from rows;
  elsif p_op='queue' then
    with pubs as materialized (
      select distinct on(private.distribution_key_v1(a.uuid)) a.uuid,a.creato_il,private.distribution_key_v1(a.uuid) pk,a.tipologia_annuncio,a.titolo_annuncio
      from public.annuncio a where private.distribution_public_v1(a.uuid)
        and (coalesce(q->>'search','')='' or a.uuid::text=q->>'search' or position(lower(q->>'search') in lower(coalesce(a.titolo_annuncio,'')))>0)
        and (coalesce(q->>'type','')='' or a.tipologia_annuncio=q->>'type')
      order by private.distribution_key_v1(a.uuid),a.creato_il asc nulls last,a.uuid
    ), pairs as materialized (
      select p.*,c.id cid,c.name cname,c.region,r.id rid,private.distribution_state_v1(p.uuid,c.id,r.id) state
      from pubs p join private.distribution_channel_v1 c on c.active left join private.distribution_record_v1 r on r.publication_key=p.pk and r.channel_id=c.id and not r.superseded
      where (coalesce(q->>'channel','')='' or c.id::text=q->>'channel')
        and (coalesce(q->>'region','')='' or exists(select 1 from public.localita_annuncio l join public.annuncio a on a.uuid=l.uuid_annuncio where private.distribution_key_v1(a.uuid)=p.pk and private.distribution_public_v1(a.uuid) and l.regione=q->>'region'))
        and (c.region is null or exists(select 1 from public.localita_annuncio l join public.annuncio a on a.uuid=l.uuid_annuncio where private.distribution_key_v1(a.uuid)=p.pk and private.distribution_public_v1(a.uuid) and l.regione=c.region))
    ), grouped as (
      select pk,min(uuid::text)::uuid aid,min(creato_il) created,jsonb_agg(jsonb_build_object('channelId',cid,'name',cname,'state',state,'recordId',rid) order by cname,cid) destinations
      from pairs where (coalesce(q->>'state','pending')='all' or (coalesce(q->>'state','pending')='pending' and state in ('unprepared','draft','stale')) or state=q->>'state') group by pk
    ), bounded as (select *,row_number() over(order by created asc nulls last,pk) pos from grouped order by created asc nulls last,pk limit 31 offset n)
    select coalesce(jsonb_agg(jsonb_build_object('id',pk,'announcementId',aid,'title',coalesce(private.get_admin_announcement_v1(aid)#>>'{summary,displayTitle}',nullif(private.get_admin_announcement_v1(aid)#>>'{summary,title}',''),'Annuncio senza titolo'),
      'type',private.get_admin_announcement_v1(aid)#>>'{summary,type}','createdAt',created,
      'origin',private.announcement_whatsapp_status_v1(aid),'destinations',destinations,
      'regions',coalesce((select jsonb_agg(distinct l.regione) from public.annuncio a join public.localita_annuncio l on l.uuid_annuncio=a.uuid where private.distribution_key_v1(a.uuid)=pk and private.distribution_public_v1(a.uuid)),'[]'),
      'unassigned',exists(select 1 from private.distribution_record_v1 r where r.publication_key=pk and r.channel_id is null)) order by pos) filter(where pos<=n+30),'[]'),coalesce(bool_or(pos>n+30),false) into items,more from bounded;
  else raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  return jsonb_build_object('items',items,'hasMore',more);
end $$;

create function private.admin_distribution_write_v1(p_op text,q jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<dist_write>>
declare actor record; request_id uuid; ih text; receipt private.distribution_receipt_v1; ch private.distribution_channel_v1; r private.distribution_record_v1;
  rid uuid; aid uuid; cid uuid; pk text; d jsonb; sh text; txt text; link text; manual boolean; confirmed boolean; result jsonb; title text; before_r jsonb; channel_key text;
begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  select * into strict actor from private.require_admin_context_v1();
  if jsonb_typeof(q) is distinct from 'object' or length(q::text)>60000 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if exists(select 1 from jsonb_each(q) x where
    (p_op='channel_save' and x.key not in ('requestId','id','name','url','region','active','version'))
    or (p_op='save' and x.key not in ('requestId','announcementId','channelId','recordId','text','url','manual','templateVersion','sourceHash','version','repost','revoke'))
    or (x.key in ('manual','repost','revoke','active') and jsonb_typeof(x.value)<>'boolean')
    or (x.key='version' and (jsonb_typeof(x.value)<>'number' or x.value::text!~'^(0|[1-9][0-9]{0,9})$'))
    or (x.key not in ('manual','repost','revoke','active','version','region') and jsonb_typeof(x.value)<>'string')
    or (x.key='region' and jsonb_typeof(x.value) not in ('string','null')))
    then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  request_id:=(q->>'requestId')::uuid; if request_id is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  ih:=encode(sha256(convert_to(p_op||q::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(request_id::text,1));
  select * into receipt from private.distribution_receipt_v1 where distribution_receipt_v1.request_id=dist_write.request_id;
  if found then if receipt.actor_id<>actor.auth_user_uuid or receipt.input_hash<>ih then return jsonb_build_object('status','conflict'); end if; return receipt.result; end if;
  if p_op='channel_save' then
    cid:=nullif(q->>'id','')::uuid;
    title:=btrim(q->>'name'); link:=q->>'url';
    channel_key:=substring(link from '^https://(?:www\.)?whatsapp\.com/channel/([A-Za-z0-9_-]{5,200})/?$');
    if title is null or length(title) not between 1 and 120 or channel_key is null or jsonb_typeof(q->'active') is distinct from 'boolean'
      or (q->>'region' is not null and q->>'region' not in ('Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige','Umbria','Valle d''Aosta','Veneto')) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended('distribution-channels',1));
    if exists(select 1 from private.distribution_channel_v1 c where c.channel_key=dist_write.channel_key and c.id is distinct from cid) then return jsonb_build_object('status','conflict'); end if;
    if (q->>'active')::boolean and (select count(*) from private.distribution_channel_v1 where active and id is distinct from cid)>=200 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
    if cid is null then
      insert into private.distribution_channel_v1(name,url,channel_key,region,active) values(title,'https://www.whatsapp.com/channel/'||channel_key,channel_key,q->>'region',(q->>'active')::boolean) returning id into cid;
    else
      select * into ch from private.distribution_channel_v1 where id=cid for update;
      if not found then return jsonb_build_object('status','not_found'); end if;
      if ch.version is distinct from (q->>'version')::integer then return jsonb_build_object('status','conflict'); end if;
      if ch.channel_key<>channel_key and exists(select 1 from private.distribution_record_v1 where channel_id=cid) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
      update private.distribution_channel_v1 set name=title,url='https://www.whatsapp.com/channel/'||dist_write.channel_key,channel_key=dist_write.channel_key,region=q->>'region',active=(q->>'active')::boolean,version=version+1,updated_at=statement_timestamp() where id=cid;
    end if;
    perform private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'distribution.channel_save','distribution_channel',cid,'success',request_id,null,null,'{}','{}');
    result:=jsonb_build_object('status','ok','id',cid);
  elsif p_op='save' then
    aid:=(q->>'announcementId')::uuid; cid:=(q->>'channelId')::uuid; rid:=nullif(q->>'recordId','')::uuid;
    if rid is not null then select * into r from private.distribution_record_v1 where id=rid; if not found then return jsonb_build_object('status','not_found'); end if; aid:=r.announcement_id; end if;
    pk:=private.distribution_key_v1(aid); if pk is null then return jsonb_build_object('status','not_found'); end if;
    perform pg_advisory_xact_lock(hashtextextended(pk,1));
    -- Child writers lock their parent through admin_lock_parent_v1. Lock every
    -- regional copy before checking public availability and message inputs.
    perform 1 from public.annuncio a where private.distribution_key_v1(a.uuid)=pk order by a.uuid for update nowait;
    select * into ch from private.distribution_channel_v1 where id=cid for share;
    if not found or not ch.active then return jsonb_build_object('status','not_allowed'); end if;
    if rid is not null then
      select * into r from private.distribution_record_v1 where id=rid for update;
      if r.version is distinct from (q->>'version')::integer or r.superseded or r.publication_key<>pk or (r.channel_id is not null and r.channel_id<>cid) then return jsonb_build_object('status','conflict'); end if;
    elsif exists(select 1 from private.distribution_record_v1 where publication_key=pk and channel_id=cid and not superseded) then return jsonb_build_object('status','conflict'); end if;
    d:=private.distribution_detail_v1(aid,cid); sh:=private.distribution_hash_v1(d);
    if d is null then return jsonb_build_object('status','not_allowed'); end if;
    if sh is distinct from q->>'sourceHash' then return jsonb_build_object('status','conflict'); end if;
    if private.distribution_source_v1(aid,cid) and r.id is null and coalesce(q->>'repost','false')<>'true' then return jsonb_build_object('status','source_exists'); end if;
    txt:=q->>'text'; manual:=coalesce((q->>'manual')::boolean,false); link:=case when manual then null else nullif(btrim(q->>'url'),'') end;
    confirmed:=manual or link is not null;
    if txt is null or length(btrim(txt))=0 or length(txt)>50000 or coalesce(q->>'templateVersion','')!~'^[0-9]{4}-[0-9]{2}-v[0-9]{1,4}$'
      or (link is not null and (length(link)>2048 or link !~ ('^https://(www\.)?whatsapp\.com/channel/'||ch.channel_key||'/[A-Za-z0-9_-]+/?$'))) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
    if r.id is not null and r.confirmed and not confirmed and coalesce(q->>'repost','false')<>'true' and coalesce(q->>'revoke','false')<>'true' then return jsonb_build_object('status','confirmation_required'); end if;
    if r.id is not null and r.channel_id is null and exists(select 1 from private.distribution_record_v1 where publication_key=pk and channel_id=cid and not superseded) then return jsonb_build_object('status','conflict'); end if;
    if r.id is not null and coalesce(q->>'repost','false')='true' then
      update private.distribution_record_v1 set superseded=true,version=version+1,updated_at=statement_timestamp(),updated_by=actor.auth_user_uuid where id=r.id;
      insert into private.distribution_revision_v1(record_id,version,snapshot) select id,version,to_jsonb(old_record) from private.distribution_record_v1 old_record where id=r.id;
      rid:=null;
    end if;
    if rid is null then
      insert into private.distribution_record_v1(publication_key,announcement_id,channel_id,title) values(pk,(d#>>'{summary,id}')::uuid,cid,coalesce(d#>>'{summary,displayTitle}',d#>>'{summary,title}','Annuncio')) returning id into rid;
    end if;
    update private.distribution_record_v1 set channel_id=cid,message_text=txt,message_url=link,template_version=q->>'templateVersion',source_hash=sh,
      title=coalesce(d#>>'{summary,displayTitle}',nullif(d#>>'{summary,title}',''),'Annuncio senza titolo'), confirmed=dist_write.confirmed,manual=dist_write.manual,
      posted_at=case when dist_write.confirmed then coalesce(case when r.confirmed and coalesce(q->>'repost','false')<>'true' then r.posted_at end,statement_timestamp()) end,
      version=version+1,updated_at=statement_timestamp(),updated_by=actor.auth_user_uuid where id=rid;
    insert into private.distribution_revision_v1(record_id,version,snapshot) select id,version,to_jsonb(x) from private.distribution_record_v1 x where id=rid;
    perform private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'distribution.save','distribution',rid,'success',request_id,null,null,'{}','{}');
    result:=jsonb_build_object('status','ok','id',rid);
  else raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  insert into private.distribution_receipt_v1(request_id,actor_id,input_hash,result) values(request_id,actor.auth_user_uuid,ih,result);
  return result;
end $$;

create function public.admin_distribution_read_v1(p_operation text,p_query jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.admin_distribution_read_v1(p_operation,p_query); $$;
create function public.admin_distribution_write_v1(p_operation text,p_input jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_distribution_write_v1(p_operation,p_input); $$;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='private' and (p.proname like 'distribution_%_v1' or p.proname like 'admin_distribution_%_v1')) or (n.nspname='public' and p.proname in ('admin_distribution_read_v1','admin_distribution_write_v1')) loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f);
  end loop;
end $$;
grant execute on function private.admin_distribution_read_v1(text,jsonb),private.admin_distribution_write_v1(text,jsonb),public.admin_distribution_read_v1(text,jsonb),public.admin_distribution_write_v1(text,jsonb) to authenticated;

-- Preserve existing origin semantics; any recorded manual confirmation counts.
create or replace function private.announcement_whatsapp_status_v1(p_id uuid) returns text language sql stable security invoker set search_path='' as $$
  select case when private.admin_creation_origin_v1(p_id)->>'kind'='whatsapp' then 'imported'
    when exists(select 1 from private.distribution_record_v1 r where r.publication_key=private.distribution_key_v1(p_id) and r.confirmed) then 'exported'
    when w.known_website or private.admin_creation_origin_v1(p_id)->>'kind'='manual' then 'website' else 'unknown' end
  from (select 1) seed left join private.announcement_whatsapp_v1 w on w.announcement_id=p_id;
$$;

-- Audit payloads never include message text, contact details or destination URLs.
alter function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) rename to admin_audit_payload_before_distribution_v1;
create function private.admin_audit_payload_valid_v1(p_action text,p_outcome text,p_reason text,p_failure_code text,p_changes jsonb,p_details jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$ begin
  if p_action not in ('distribution.save','distribution.channel_save') then return private.admin_audit_payload_before_distribution_v1(p_action,p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  if p_outcome='failure' then return private.admin_audit_payload_before_distribution_v1('announcement.approve',p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  return p_outcome='success' and p_reason is null and p_failure_code is null and p_changes='{}'::jsonb and p_details='{}'::jsonb;
end $$;
alter table private.admin_audit_event_v1 drop constraint admin_audit_payload_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_payload_v1 check(private.admin_audit_payload_valid_v1(action,outcome,reason,failure_code,changes,details) is true);
do $$ declare d text; begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conrelid='private.admin_audit_event_v1'::regclass and conname='admin_audit_resource_v1';
  alter table private.admin_audit_event_v1 drop constraint admin_audit_resource_v1;
  execute 'alter table private.admin_audit_event_v1 add constraint admin_audit_resource_v1 check(case when action=''distribution.save'' then resource_type=''distribution'' and (outcome=''failure'' or resource_uuid is not null) when action=''distribution.channel_save'' then resource_type=''distribution_channel'' and (outcome=''failure'' or resource_uuid is not null) else '||substring(d from 8 for length(d)-8)||' end)';
  d:=pg_get_functiondef('private.admin_list_audit_events_bridge_v1(jsonb)'::regprocedure);
  if strpos(d,'''profile.show''')=0 then raise exception 'ADMIN_PROFILES_REQUIRED'; end if;
  execute replace(d,'''profile.show''','''profile.show'',''distribution.save'',''distribution.channel_save''');
  d:=pg_get_functiondef('private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)'::regprocedure);
  execute replace(d,'else ''announcement''','when p_action=''distribution.save'' then ''distribution'' when p_action=''distribution.channel_save'' then ''distribution_channel'' else ''announcement''');
end $$;
revoke all on function private.admin_audit_payload_before_distribution_v1(text,text,text,text,jsonb,jsonb),private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;

-- Old deployments may still save their single export. Keep those writes visible
-- as unassigned records, but reject writes to an export already assigned here.
create function private.sync_legacy_distribution_v1() returns trigger language plpgsql security definer set search_path='' as $$ begin
  if new.message_text='' and new.message_url is null then return new; end if;
  if exists(select 1 from private.distribution_record_v1 where legacy_id=new.announcement_id and channel_id is not null) then raise exception 'DISTRIBUTION_RELOAD_REQUIRED' using errcode='22023'; end if;
  insert into private.distribution_record_v1(publication_key,announcement_id,legacy_id,title,message_text,message_url,template_version,confirmed,posted_at,updated_by,updated_at)
  select private.distribution_key_v1(new.announcement_id),new.announcement_id,new.announcement_id,coalesce(a.titolo_annuncio,''),new.message_text,new.message_url,new.template_version,new.message_url is not null,
    case when new.message_url is not null then new.updated_at end,new.updated_by,coalesce(new.updated_at,now()) from public.annuncio a where a.uuid=new.announcement_id
  on conflict(legacy_id) do update set message_text=excluded.message_text,message_url=excluded.message_url,template_version=excluded.template_version,confirmed=excluded.confirmed,posted_at=excluded.posted_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at,version=distribution_record_v1.version+1;
  insert into private.distribution_revision_v1(record_id,version,snapshot) select id,version,to_jsonb(r) from private.distribution_record_v1 r where legacy_id=new.announcement_id;
  return new;
end $$;
revoke all on function private.sync_legacy_distribution_v1() from public,anon,authenticated,service_role;
create trigger sync_legacy_distribution after insert or update on private.announcement_whatsapp_v1 for each row execute function private.sync_legacy_distribution_v1();

notify pgrst, 'reload schema';
commit;
