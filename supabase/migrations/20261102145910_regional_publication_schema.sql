-- Expand first. Install compatible Web before the backfill/activation migration.
begin;
set local lock_timeout = '10s';

create table private.regional_publication (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid unique,
  owner_id uuid references public.utente(utente_uuid) on delete set null,
  created_at timestamptz not null default now(),
  followers_notified boolean not null default false
);
create index regional_publication_owner_idx on private.regional_publication(owner_id);
create table private.regional_publication_item (
  publication_id uuid not null references private.regional_publication(id) on delete cascade,
  announcement_id uuid not null unique, -- Permanent receipt, deliberately survives deletion.
  region text,
  primary key(publication_id,announcement_id),
  unique nulls not distinct(publication_id,region)
);
create table private.regional_publication_context (
  transaction_id bigint primary key,
  mode text not null check(mode in ('publish','backfill'))
);
create table private.regional_publication_release (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into private.regional_publication_release values(true,false);
create table private.regional_publication_backup (
  announcement_id uuid primary key,
  captured_at timestamptz not null default now(),
  reason text not null,
  snapshot jsonb not null
);
do $$ declare tab text; begin
  foreach tab in array array['regional_publication','regional_publication_item','regional_publication_context','regional_publication_release','regional_publication_backup'] loop
    execute format('alter table private.%I enable row level security',tab);
    execute format('revoke all on private.%I from public,anon,authenticated,service_role',tab);
  end loop;
end $$;

alter table public.annuncio add column gruppo_pubblicazione uuid references private.regional_publication(id), add column regione_pubblicazione text;
alter table public.annuncio add constraint annuncio_publication_region_valid check(regione_pubblicazione is null or regione_pubblicazione=any(array[
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige','Umbria','Valle d''Aosta','Veneto']));
create index annuncio_publication_idx on public.annuncio(gruppo_pubblicazione);
create unique index annuncio_publication_region_idx on public.annuncio(gruppo_pubblicazione,regione_pubblicazione) nulls not distinct where gruppo_pubblicazione is not null;
create index if not exists media_annuncio_path_idx on public.media_annuncio(link_media);

-- Reuse the installed writer verbatim, including all earlier validation/snapshot fixes.
alter function public.publish_announcement_v2(uuid,jsonb,text,text,text) rename to publish_single_announcement_v2;
alter function public.publish_single_announcement_v2(uuid,jsonb,text,text,text) set schema private;
revoke all on function private.publish_single_announcement_v2(uuid,jsonb,text,text,text) from public,anon,authenticated,service_role;

create function private.regional_emit_notification(p_id uuid,p_insert boolean,p_previous text)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.annuncio; recipient uuid; target jsonb; first_id uuid; first_group uuid;
begin
  select * into a from public.annuncio where uuid=p_id;
  if not found or a.eliminato_il is not null then return; end if;
  select p.uuid_utente into recipient from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
    where p.uuid=a.autore_annuncio and u.registrato_il is not null;
  target:=private.notification_target_ref(a.uuid,null);
  if recipient is not null and a.stato_annuncio is not null and (p_insert or p_previous is distinct from a.stato_annuncio) then
    insert into private.notifiche(destinatario,tipo,evento,dati) values(recipient,'stato_annuncio','stato:'||a.uuid||':'||gen_random_uuid(),
      jsonb_build_object('target',target,'state',a.stato_annuncio,'info',a.info_stato_annuncio));
  end if;
  if a.stato_annuncio='pubblicato' and a.nascosto is false and a.privato is false then
    insert into private.annunci_notificati values(a.uuid) on conflict do nothing returning annuncio into first_id;
    if first_id is null then return; end if;
    if a.gruppo_pubblicazione is not null then
      update private.regional_publication set followers_notified=true where id=a.gruppo_pubblicazione and not followers_notified returning id into first_group;
      if first_group is null then return; end if;
    end if;
    if recipient is not null then
      insert into private.notifiche(destinatario,tipo,evento,dati)
      select distinct p.uuid_utente,'annuncio_seguito','pubblicazione:'||coalesce(a.gruppo_pubblicazione,a.uuid),
        jsonb_build_object('actor',private.notification_profile_ref(a.autore_annuncio),'target',target)
      from public.profilo_follow f join public.profilo p on p.uuid=f.uuid_profilo_follower join public.utente u on u.utente_uuid=p.uuid_utente
      where f.uuid_profilo_seguito=a.autore_annuncio and p.uuid_utente<>recipient and u.registrato_il is not null on conflict do nothing;
    end if;
  end if;
end $$;
create or replace function private.notify_announcement_v1() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if exists(select 1 from private.regional_publication_context where transaction_id=txid_current()) then return new; end if;
  perform private.regional_emit_notification(new.uuid,tg_op='INSERT',case when tg_op='UPDATE' then old.stato_annuncio end);
  return new;
end $$;
-- Trigger entry point is definer: regular owner updates must not need private table grants.
alter function private.notify_announcement_v1() security definer;
alter function private.notify_announcement_v1() owner to postgres;

-- Do not reinterpret a backfill as fresh activity or temporary automatic approval.
do $$ declare fn regprocedure; definition text; name text; begin
  foreach name in array array['private.track_announcement_activity()','public.auto_approve_new_announcement_until_v1()','private.auto_approve_new_announcement_until_v1()'] loop
    fn:=to_regprocedure(name);
    if fn is not null then
      definition:=pg_get_functiondef(fn);
      definition:=regexp_replace(definition,'\m[Bb][Ee][Gg][Ii][Nn]\M',
        'begin if exists(select 1 from private.regional_publication_context where transaction_id=txid_current() and mode=''backfill'') then return null; end if;');
      execute definition;
      execute format('alter function %s security definer',fn);
      execute format('alter function %s owner to postgres',fn);
    end if;
  end loop;
end $$;

-- All row copies use an explicit table allowlist and discard generated identities.
create function private.regional_copy_rows(p_table text,p_source uuid,p_target uuid,p_region text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare cols text; filter_sql text;
begin
  if p_table<>all(array['annuncio_generico','annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creator','localita_annuncio','contatto_annuncio','link_social_annuncio','media_annuncio']) then raise exception 'INVALID_COPY_TABLE'; end if;
  if to_regclass('public.'||p_table) is null then return; end if;
  select string_agg(quote_ident(attname),',' order by attnum) into cols from pg_attribute
    where attrelid=to_regclass('public.'||p_table) and attnum>0 and not attisdropped and attname<>'id' and attidentity='' and attgenerated='';
  filter_sql:=case when p_table='localita_annuncio' then ' and btrim(s.regione)=$3' else '' end;
  execute format('insert into public.%1$I(%2$s) select %2$s from (select (jsonb_populate_record(null::public.%1$I,to_jsonb(s)||jsonb_build_object(''uuid_annuncio'',$2))).* from public.%1$I s where s.uuid_annuncio=$1%3$s) copied',p_table,cols,filter_sql)
    using p_source,p_target,p_region;
end $$;

create function private.regional_split_announcement(p_source uuid,p_group uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.annuncio; regions text[]; region text; target uuid; first_region text; cols text; tab text; original_trash timestamptz; original_trash_actor uuid;
begin
  select * into strict a from public.annuncio where uuid=p_source for update;
  original_trash:=a.eliminato_il; original_trash_actor:=a.eliminato_da;
  select array_agg(distinct btrim(regione) order by btrim(regione)) into regions from public.localita_annuncio where uuid_annuncio=p_source and nullif(btrim(regione),'') is not null;
  if a.tipologia_annuncio='annuncio_squadra_cerca_sponsor' then regions:=null; end if;
  first_region:=regions[1];
  -- Preserve frozen records without inserting children under a trashed parent.
  update public.annuncio set eliminato_il=null,eliminato_da=null,gruppo_pubblicazione=p_group,regione_pubblicazione=first_region where uuid=p_source;
  insert into private.regional_publication_item values(p_group,p_source,first_region);
  select string_agg(quote_ident(attname),',' order by attnum) into cols from pg_attribute where attrelid='public.annuncio'::regclass and attnum>0 and not attisdropped and attidentity='' and attgenerated='';
  foreach region in array coalesce(regions[2:],array[]::text[]) loop
    target:=gen_random_uuid();
    execute format('insert into public.annuncio(%1$s) select %1$s from jsonb_populate_record(null::public.annuncio,$1)',cols)
      using to_jsonb(a)||jsonb_build_object('uuid',target,'gruppo_pubblicazione',p_group,'regione_pubblicazione',region,'eliminato_il',null,'eliminato_da',null);
    foreach tab in array array['annuncio_generico','annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creator','localita_annuncio','contatto_annuncio','link_social_annuncio','media_annuncio'] loop
      perform private.regional_copy_rows(tab,p_source,target,region);
    end loop;
    update public.annuncio set eliminato_il=original_trash,eliminato_da=original_trash_actor where uuid=target;
    insert into private.regional_publication_item values(p_group,target,region);
  end loop;
  delete from public.localita_annuncio where uuid_annuncio=p_source and (first_region is null or btrim(regione) is distinct from first_region);
  update public.annuncio set eliminato_il=original_trash,eliminato_da=original_trash_actor where uuid=p_source;
end $$;

create function private.regional_publication_result(p_group uuid,p_retry boolean) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('status',case when count(a.uuid)=0 then 'consumed' else 'success' end,'publicationId',p_group,
    'announcementId',(array_agg(a.uuid order by i.region nulls last) filter(where a.uuid is not null))[1],
    'announcements',coalesce(jsonb_agg(jsonb_build_object('id',a.uuid,'region',i.region,'status',a.stato_annuncio) order by i.region nulls last) filter(where a.uuid is not null),'[]'::jsonb),'idempotent',p_retry)
  from private.regional_publication_item i left join public.annuncio a on a.uuid=i.announcement_id and a.eliminato_il is null where i.publication_id=p_group;
$$;

create function public.publish_announcement_v3(p_submission_id uuid,p_payload jsonb,p_terms_version text,p_privacy_version text,p_visibility text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g private.regional_publication; result jsonb; source uuid; a public.annuncio; member record;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if not (select enabled from private.regional_publication_release where singleton) then raise exception 'REGIONAL_PUBLICATION_NOT_ENABLED'; end if;
  if p_submission_id is null or p_visibility is distinct from 'gratuito' then raise exception 'INVALID_PUBLISH_PAYLOAD'; end if;
  perform pg_advisory_xact_lock(hashtextextended('publish-submission:'||p_submission_id,0));
  select * into g from private.regional_publication where submission_id=p_submission_id;
  if found then
    if not exists(select 1 from public.utente where utente_uuid=g.owner_id and auth_user_uuid=auth.uid()) then raise exception 'SUBMISSION_ID_CONFLICT' using errcode='42501'; end if;
    result:=private.regional_publication_result(g.id,true);
    if result->>'status'='consumed' then raise exception 'SUBMISSION_ALREADY_CONSUMED'; end if;
    return result;
  end if;
  -- A legacy deleted receipt must never recreate an announcement.
  insert into private.regional_publication(submission_id) values(p_submission_id) returning * into g;
  insert into private.regional_publication_context values(txid_current(),'publish');
  result:=private.publish_single_announcement_v2(p_submission_id,p_payload,p_terms_version,p_privacy_version,p_visibility);
  if result->>'status' is distinct from 'success' then
    delete from private.regional_publication_context where transaction_id=txid_current();
    delete from private.regional_publication where id=g.id;
    return result;
  end if;
  source:=(result->>'announcementId')::uuid;
  select * into strict a from public.annuncio where uuid=source for update;
  if a.gruppo_pubblicazione is not null then raise exception 'PUBLISH_RECEIPT_CONFLICT'; end if;
  update private.regional_publication set owner_id=coalesce(a.creato_da,
    (select utente_id from private.announcement_submission where submission_id=p_submission_id),
    (select uuid_utente from public.profilo where uuid=a.autore_annuncio)),created_at=coalesce(a.creato_il,now()) where id=g.id;
  perform private.regional_split_announcement(source,g.id);
  delete from private.regional_publication_context where transaction_id=txid_current();
  for member in select announcement_id from private.regional_publication_item where publication_id=g.id order by region nulls last loop
    perform private.regional_emit_notification(member.announcement_id,true,null);
  end loop;
  return private.regional_publication_result(g.id,false);
end $$;

-- Preserve old callers while the compatible Web release is being deployed.
create function public.publish_announcement_v2(p_submission_id uuid,p_payload jsonb,p_terms_version text,p_privacy_version text,p_visibility text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if (select enabled from private.regional_publication_release where singleton) then
    return public.publish_announcement_v3(p_submission_id,p_payload,p_terms_version,p_privacy_version,p_visibility);
  end if;
  return private.publish_single_announcement_v2(p_submission_id,p_payload,p_terms_version,p_privacy_version,p_visibility);
end $$;

create function public.get_owned_regional_publication_v1(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g uuid;
begin
  select p.id into g from private.regional_publication p join public.utente u on u.utente_uuid=p.owner_id where p.id=p_id and u.auth_user_uuid=auth.uid();
  if g is null then return null; end if;
  return private.regional_publication_result(g,true);
end $$;

create function public.latest_regional_announcement_ids_v1() returns table(id uuid) language sql stable security invoker set search_path='' as $$
  select uuid from (
    select distinct on(coalesce(gruppo_pubblicazione,uuid)) uuid,creato_il,coalesce(gruppo_pubblicazione,uuid) as publication
    from public.annuncio where stato_annuncio='pubblicato' and nascosto is false and privato is false and eliminato_il is null
      and tipologia_annuncio in ('annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creators')
    order by coalesce(gruppo_pubblicazione,uuid),regione_pubblicazione nulls last,uuid
  ) representatives order by creato_il desc nulls last,uuid desc limit 6;
$$;
revoke all on function public.latest_regional_announcement_ids_v1() from public,anon,authenticated;
grant execute on function public.latest_regional_announcement_ids_v1() to service_role;

-- A revoked professional region now represents a whole independent listing.
-- Retain its location/history under administrative hold, instead of producing
-- a public listing without an area. Ungrouped legacy listings keep prior behavior.
do $$ declare definition text; marker text := 'delete from public.localita_annuncio as location'; begin
  if to_regprocedure('private.prune_revoked_professional_regions_v1()') is not null then
    definition:=pg_get_functiondef('private.prune_revoked_professional_regions_v1()'::regprocedure);
    if strpos(definition,marker)=0 then raise exception 'REGIONAL_PROFESSIONAL_PRUNE_REVIEW_REQUIRED'; end if;
    definition:=replace(definition,marker,
      'update public.annuncio set nascosto=true,oscurato_da_admin=true
       where eliminato_il is null and gruppo_pubblicazione is not null
         and autore_annuncio=new.profile_id and tipologia_annuncio=''annuncio_servizi_consulenze''
         and regione_pubblicazione is not null and not(regione_pubblicazione=any(new.allowed_regions));
       '||marker);
    definition:=replace(definition,'where announcement.eliminato_il is null and location.uuid_annuncio = announcement.uuid',
      'where announcement.gruppo_pubblicazione is null and announcement.eliminato_il is null and location.uuid_annuncio = announcement.uuid');
    if strpos(definition,'where announcement.gruppo_pubblicazione is null')=0 then raise exception 'REGIONAL_PROFESSIONAL_TRASH_GUARD_REVIEW_REQUIRED'; end if;
    execute definition;
    alter function private.prune_revoked_professional_regions_v1() security definer;
    alter function private.prune_revoked_professional_regions_v1() owner to postgres;
  end if;
end $$;

-- Only backed-up paid TEST records are eligible; live/shared images are excluded.
create function public.regional_legacy_image_cleanup_candidates_v1() returns table(path text)
language sql stable security definer set search_path='' as $$
  select distinct media->>'link_media'
  from private.regional_publication_backup b cross join lateral jsonb_array_elements(coalesce(b.snapshot->'media_annuncio','[]'::jsonb)) media
  where b.reason='remove_legacy_test_payment' and nullif(media->>'link_media','') is not null
    and not exists(select 1 from public.media_annuncio m where m.link_media=media->>'link_media');
$$;
revoke all on function public.regional_legacy_image_cleanup_candidates_v1() from public,anon,authenticated;
grant execute on function public.regional_legacy_image_cleanup_candidates_v1() to service_role;
alter function public.publish_announcement_v2(uuid,jsonb,text,text,text) owner to postgres;
alter function public.publish_announcement_v3(uuid,jsonb,text,text,text) owner to postgres;
alter function public.get_owned_regional_publication_v1(uuid) owner to postgres;
alter function public.regional_legacy_image_cleanup_candidates_v1() owner to postgres;
do $$ declare fn regprocedure; begin
  for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'regional_%' loop
    execute format('alter function %s owner to postgres',fn);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',fn);
  end loop;
end $$;
revoke all on function private.notify_announcement_v1() from public,anon,authenticated,service_role;
revoke all on function public.publish_announcement_v2(uuid,jsonb,text,text,text),public.publish_announcement_v3(uuid,jsonb,text,text,text),public.get_owned_regional_publication_v1(uuid) from public,anon,service_role;
grant execute on function public.publish_announcement_v2(uuid,jsonb,text,text,text),public.publish_announcement_v3(uuid,jsonb,text,text,text),public.get_owned_regional_publication_v1(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
