-- Maintenance window: freeze publication/deletion; capture a database backup first.
-- Explicitly authorized cleanup of legacy TEST announcements with payment history.
begin;
set local lock_timeout = '10s';
lock table public.annuncio in share row exclusive mode;
insert into private.regional_publication_context values(txid_current(),'backfill');

create function private.regional_capture_backup(p_id uuid,p_reason text) returns void language plpgsql security invoker set search_path='' as $$
declare snapshot jsonb; tab text; contents jsonb; source_schema text;
begin
  select jsonb_build_object('base',to_jsonb(a)) into snapshot from public.annuncio a where uuid=p_id;
  foreach tab in array array['annuncio_generico','annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creator','localita_annuncio','contatto_annuncio','link_social_annuncio','media_annuncio','annuncio_salvato','manifestazioni_interesse','segnalazioni'] loop
    source_schema:=case when tab in ('manifestazioni_interesse','segnalazioni') then 'private' else 'public' end;
    if to_regclass(source_schema||'.'||tab) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(s)),''[]''::jsonb) from %I.%I s where uuid_annuncio=$1',source_schema,tab) into contents using p_id;
      snapshot:=snapshot||jsonb_build_object(tab,contents);
    end if;
  end loop;
  snapshot:=snapshot||jsonb_build_object('receipt',(select to_jsonb(s) from private.announcement_submission s where announcement_id=p_id));
  insert into private.regional_publication_backup(announcement_id,reason,snapshot) values(p_id,p_reason,snapshot) on conflict do nothing;
end $$;
revoke all on function private.regional_capture_backup(uuid,text) from public,anon,authenticated,service_role;

do $$ declare a record; g uuid; receipt uuid; receipt_owner uuid; begin
  for a in select uuid from public.annuncio x where x.livello_annuncio='prioritario' or exists(
    select 1 from private.announcement_submission s where (s.announcement_id=x.uuid or s.requested_announcement_id=x.uuid)
      and (s.requested_visibility='prioritario' or s.stripe_checkout_session_id is not null or s.stripe_payment_intent_id is not null or s.paid_at is not null)) order by uuid loop
    perform private.regional_capture_backup(a.uuid,'remove_legacy_test_payment');
    -- Surgical maintenance operation only; no trash release or broad guard bypass.
    update public.annuncio set eliminato_il=null,eliminato_da=null where uuid=a.uuid;
    delete from public.annuncio where uuid=a.uuid;
  end loop;
  -- No guesses about malformed historical region names.
  if exists(select 1 from public.localita_annuncio where regione is null or btrim(regione)='') then raise exception 'REGIONAL_PREFLIGHT_INVALID_LOCATION'; end if;
  for a in select * from public.annuncio where gruppo_pubblicazione is null order by uuid for update loop
    perform private.regional_capture_backup(a.uuid,'regional_split');
    select submission_id,utente_id into receipt,receipt_owner from private.announcement_submission where announcement_id=a.uuid;
    insert into private.regional_publication(submission_id,owner_id,created_at,followers_notified)
      values(receipt,coalesce(a.creato_da,receipt_owner,(select uuid_utente from public.profilo where uuid=a.autore_annuncio)),coalesce(a.creato_il,now()),exists(select 1 from private.annunci_notificati where annuncio=a.uuid)) returning id into g;
    perform private.regional_split_announcement(a.uuid,g);
    -- Published historical copies must not be treated as newly published later.
    if exists(select 1 from private.annunci_notificati where annuncio=a.uuid) then
      insert into private.annunci_notificati select announcement_id from private.regional_publication_item where publication_id=g on conflict do nothing;
    end if;
  end loop;
end $$;

-- Flush deferred activity under the protected backfill context, before removing it.
set constraints all immediate;
delete from private.regional_publication_context where transaction_id=txid_current();
commit;
