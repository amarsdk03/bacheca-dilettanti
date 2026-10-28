-- Synthetic test fixture: twelve selected FUNCTION definitions and ACLs only.
-- Source: accepted M02 schema-only archive, SHA-256 34e0e7b1a5dea17aa68b8302d5471b2d86674cdf5127a0225be5beed74576687.
-- These are the pre-M06 archive bodies; fixtures apply M06/M06A afterwards.
-- Never execute this fixture on the project or replay it after M07.
CREATE OR REPLACE FUNCTION private.auto_approve_new_announcement_until_v1() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_cutoff constant timestamptz := timestamptz '2026-10-26 00:00:00 Europe/Rome';
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  -- Usare l'ora effettiva: una transazione iniziata prima della scadenza
  -- non deve approvare se viene completata dopo la scadenza.
  if v_now >= v_cutoff then
    return null;
  end if;

  -- Leggere lo stato corrente, non NEW: il trigger differito riceve la riga
  -- originale, ma il wizard puo' averla aggiornata nella stessa transazione.
  -- Il normale trigger del ciclo di vita continua a verificare i pagamenti.
  update public.annuncio
  set stato_annuncio = 'pubblicato',
      info_stato_annuncio = 'Annuncio approvato automaticamente e pubblicato.',
      ultima_modifica_il = v_now
  where uuid = new.uuid
    and stato_annuncio = 'in_revisione';

  return null;
end;
$$;

CREATE OR REPLACE FUNCTION private.notification_display_ref(p_ref jsonb, p_owner_target boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_href text; v_current jsonb; v_label text;
begin
  if p_ref is null or p_ref = 'null'::jsonb then return null; end if;
  if p_ref->>'kind' = 'profilo' then
    v_current := private.notification_profile_ref((p_ref->>'id')::uuid,p_ref->>'type');
    v_label := coalesce(nullif(nullif(btrim(v_current->>'label'), ''), 'Profilo'),
      private.notification_profile_type_label(p_ref->>'type'));
    if v_current is not null then
      v_href := '/dettagli-profilo?id='||(p_ref->>'id')||'&type='||(p_ref->>'type');
    end if;
  else
    v_current := private.notification_target_ref((p_ref->>'id')::uuid,null);
    v_label := coalesce(v_current->>'label', nullif(nullif(btrim(p_ref->>'label'), ''), 'Annuncio'), 'Annuncio non più disponibile');
    if v_current is not null then
      if p_owner_target then v_href := '/il-tuo-profilo?sezione=annunci';
      elsif exists (select 1 from public.annuncio where uuid = (p_ref->>'id')::uuid and stato_annuncio = 'pubblicato' and privato is false and nascosto is false) then
        v_href := '/dettagli-annuncio?id='||(p_ref->>'id');
      end if;
    end if;
  end if;
  return jsonb_build_object('label',v_label,'href',v_href);
end;
$$;

CREATE OR REPLACE FUNCTION private.notification_target_ref(p_announcement uuid, p_profile uuid, p_type text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_announcement record; v_type text; v_author jsonb; v_label text;
begin
  if p_announcement is null then return private.notification_profile_ref(p_profile,p_type); end if;
  select titolo_annuncio, tipologia_annuncio, autore_annuncio into v_announcement from public.annuncio where uuid = p_announcement;
  if not found then return null; end if;
  v_type := case v_announcement.tipologia_annuncio
    when 'annuncio_giocatore' then 'giocatore'
    when 'annuncio_staff_sportivo' then 'staff-sportivo'
    when 'annuncio_arbitro' then 'arbitro'
    when 'annuncio_torneo_evento' then 'torneo-evento'
    when 'annuncio_campo_impianto' then 'campi-impianti-sportivi'
    when 'annuncio_servizi_consulenze' then 'servizi-consulenze'
    when 'annuncio_creators' then 'creators'
    when 'annuncio_squadra_cerca_giocatore' then 'squadra'
    when 'annuncio_squadra_cerca_staff' then 'squadra'
    when 'annuncio_squadra_cerca_partita' then 'squadra'
    when 'annuncio_squadra_cerca_sponsor' then 'squadra'
    else null end;
  v_author := private.notification_profile_ref(v_announcement.autore_annuncio, v_type);
  v_label := coalesce(nullif(nullif(btrim(v_announcement.titolo_annuncio), ''), 'Annuncio'),
    nullif(nullif(btrim(v_author->>'label'), ''), 'Profilo'),
    private.notification_profile_type_label(v_type));
  return jsonb_build_object('id',p_announcement,'kind','annuncio','label',v_label);
end;
$$;

CREATE OR REPLACE FUNCTION private.notify_announcement_v1() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_owner uuid; v_target jsonb; v_first uuid; v_type text;
begin
  select p.uuid_utente into v_owner from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
    where p.uuid=new.autore_annuncio and u.registrato_il is not null;
  v_target := private.notification_target_ref(new.uuid,null);
  v_type := private.announcement_profile_type(new.tipologia_annuncio);
  if v_owner is not null and new.stato_annuncio is not null then
    if tg_op='INSERT' or old.stato_annuncio is distinct from new.stato_annuncio then
      insert into private.notifiche(destinatario,tipo,evento,dati)
      values(v_owner,'stato_annuncio','stato:'||new.uuid||':'||gen_random_uuid(),
        jsonb_build_object('target',v_target,'state',new.stato_annuncio,'info',new.info_stato_annuncio));
    end if;
  end if;
  if new.stato_annuncio='pubblicato' and new.nascosto is false and new.privato is false then
    insert into private.annunci_notificati values(new.uuid) on conflict do nothing returning annuncio into v_first;
    if v_first is not null and v_owner is not null then
      insert into private.notifiche(destinatario,tipo,evento,dati)
      select distinct p.uuid_utente,'annuncio_seguito','pubblicazione:'||new.uuid,
        jsonb_build_object('actor',private.notification_profile_ref(new.autore_annuncio,v_type),'target',v_target)
      from public.profilo_follow f join public.profilo p on p.uuid=f.uuid_profilo_follower
        join public.utente u on u.utente_uuid=p.uuid_utente
      where f.uuid_profilo_seguito=new.autore_annuncio and f.sottoprofilo_seguito=v_type
        and private.notification_profile_ref(f.uuid_profilo_follower,f.sottoprofilo_follower) is not null
        and p.uuid_utente<>v_owner and u.registrato_il is not null on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.prune_revoked_professional_regions_v1() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.profile_type = 'servizi-consulenze' then
    delete from public.localita_profilo
    where uuid_profilo = new.profile_id and sottoprofilo = 'servizi-consulenze'
      and not (regione = any(new.allowed_regions));
    delete from public.localita_annuncio as location
    using public.annuncio as announcement
    where location.uuid_annuncio = announcement.uuid
      and announcement.autore_annuncio = new.profile_id
      and announcement.tipologia_annuncio = 'annuncio_servizi_consulenze'
      and not (location.regione = any(new.allowed_regions));
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_notifications_v1(p_user uuid, p_limit integer DEFAULT 20, p_cursor_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id bigint DEFAULT NULL::bigint) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_items jsonb; v_cursor jsonb; v_count bigint;
begin
  if p_limit not in (0,3,20) or p_limit is null or (p_cursor_date is null) <> (p_cursor_id is null) then
    raise exception 'Invalid notification pagination' using errcode = '22023';
  end if;
  select count(*) into v_count from private.notifiche where destinatario = p_user and letto_il is null;
  with page as (
    select n.* from private.notifiche n where n.destinatario = p_user
      and (p_cursor_date is null or (n.creato_il,n.id) < (p_cursor_date,p_cursor_id))
    order by n.creato_il desc,n.id desc limit p_limit + 1
  ), shown as (select * from page order by creato_il desc,id desc limit p_limit)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id::text,'type',s.tipo,'createdAt',s.creato_il,'readAt',s.letto_il,
    'actor',private.notification_display_ref(s.dati->'actor'),
    'target',private.notification_display_ref(s.dati->'target',s.tipo = 'stato_annuncio'),
    'targetKind',s.dati->'target'->>'kind','state',s.dati->>'state','info',s.dati->>'info',
    'email',i.email,'phone',i.telefono) order by s.creato_il desc,s.id desc),'[]'::jsonb),
    case when (select count(*) from page) > p_limit and p_limit > 0 then
      (select jsonb_build_object('date',creato_il,'id',id::text) from shown order by creato_il,id limit 1) else null end
  into v_items,v_cursor from shown s left join private.manifestazioni_interesse i
    on i.id = s.interesse_id and i.uuid_utente_destinatario = p_user;
  return jsonb_build_object('items',v_items,'nextCursor',v_cursor,'unreadCount',v_count);
end;
$$;

CREATE OR REPLACE FUNCTION public.get_notifications_v2(p_user uuid, p_limit integer DEFAULT 20, p_cursor_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id bigint DEFAULT NULL::bigint, p_type text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_items jsonb; v_cursor jsonb; v_count bigint;
begin
  if p_limit not in (0,3,20) or p_limit is null or (p_cursor_date is null) <> (p_cursor_id is null) then
    raise exception 'Invalid notification pagination' using errcode = '22023';
  end if;
  if p_type is not null and p_type not in ('interesse','follower','annuncio_seguito','stato_annuncio','segnalazione','profilo_speciale','novita') then
    raise exception 'Invalid notification type' using errcode = '22023';
  end if;
  select count(*) into v_count from private.notifiche where destinatario = p_user and letto_il is null;
  with page as (
    select n.* from private.notifiche n where n.destinatario = p_user
      and (p_type is null or n.tipo = p_type)
      and (p_cursor_date is null or (n.creato_il,n.id) < (p_cursor_date,p_cursor_id))
    order by n.creato_il desc,n.id desc limit p_limit + 1
  ), shown as (select * from page order by creato_il desc,id desc limit p_limit)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id::text,'type',s.tipo,'createdAt',s.creato_il,'readAt',s.letto_il,
    'actor',private.notification_display_ref(s.dati->'actor'),
    'target',private.notification_display_ref(s.dati->'target',s.tipo = 'stato_annuncio'),
    'targetKind',s.dati->'target'->>'kind','state',s.dati->>'state','info',s.dati->>'info',
    'email',i.email,'phone',i.telefono) order by s.creato_il desc,s.id desc),'[]'::jsonb),
    case when (select count(*) from page) > p_limit and p_limit > 0 then
      (select jsonb_build_object('date',creato_il,'id',id::text) from shown order by creato_il,id limit 1) else null end
  into v_items,v_cursor from shown s left join private.manifestazioni_interesse i
    on i.id = s.interesse_id and i.uuid_utente_destinatario = p_user;
  return jsonb_build_object('items',v_items,'nextCursor',v_cursor,'unreadCount',v_count);
end;
$$;

CREATE OR REPLACE FUNCTION public.get_owned_priority_checkout_v1(p_announcement_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_auth_user_id uuid;
  v_result jsonb;
begin
  v_auth_user_id := (select auth.uid());
  if v_auth_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select pg_catalog.jsonb_build_object(
    'status', 'ready',
    'announcementId', submission.announcement_id,
    'submissionId', submission.submission_id,
    'checkoutSessionId', submission.stripe_checkout_session_id,
    'checkoutStatus', submission.stripe_checkout_status,
    'paymentStatus', submission.stripe_payment_status,
    'checkoutAttempt', submission.stripe_checkout_attempt,
    'paidAt', submission.paid_at,
    'refundRequiredAt', submission.refund_required_at,
    'refundedAt', submission.refunded_at,
    'announcementStatus', announcement.stato_annuncio
  )
  into v_result
  from private.announcement_submission as submission
  join public.utente as app_user
    on app_user.utente_uuid = submission.utente_id
  join public.annuncio as announcement
    on announcement.uuid = submission.announcement_id
  where submission.announcement_id = p_announcement_id
    and submission.requested_visibility = 'prioritario'
    and app_user.auth_user_uuid = v_auth_user_id;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;

  return v_result;
end;
$$;

CREATE OR REPLACE FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_receipt private.announcement_submission%rowtype;
  v_now timestamptz := pg_catalog.statement_timestamp();
  v_is_anonymous boolean;
  v_effective_paid boolean;
begin
  if p_announcement_id is null
    or p_submission_id is null
    or p_session_id is null
    or p_price_id is null
    or p_checkout_status is null
    or p_payment_status is null
    or p_paid is null
    or p_session_id !~ '^cs_'
    or p_price_id !~ '^price_'
    or not private.publish_text_is_valid(p_session_id, true, 255)
    or not private.publish_text_is_valid(p_price_id, true, 255)
    or not private.publish_text_is_valid(p_checkout_status, true, 80)
    or not private.publish_text_is_valid(p_payment_status, true, 80)
    or (
      p_payment_intent_id is not null
      and (
        p_payment_intent_id !~ '^pi_'
        or not private.publish_text_is_valid(p_payment_intent_id, true, 255)
      )
    ) then
    raise exception using errcode = '22023', message = 'INVALID_CHECKOUT_EVENT';
  end if;

  select *
  into v_receipt
  from private.announcement_submission
  where submission_id = p_submission_id
    and coalesce(announcement_id, requested_announcement_id) = p_announcement_id
    and requested_visibility = 'prioritario'
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'ignored', 'reason', 'not_found');
  end if;

  if v_receipt.stripe_checkout_session_id is not null
    and v_receipt.stripe_checkout_session_id <> p_session_id then
    return pg_catalog.jsonb_build_object('status', 'ignored', 'reason', 'stale_session');
  end if;

  if v_receipt.stripe_price_id is not null
    and v_receipt.stripe_price_id <> p_price_id then
    raise exception using errcode = 'P0001', message = 'PRIORITY_CHECKOUT_NOT_FOUND';
  end if;

  v_effective_paid := v_receipt.paid_at is not null or p_paid;

  select app_user.registrato_il is null
  into v_is_anonymous
  from public.utente as app_user
  where app_user.utente_uuid = v_receipt.utente_id;

  update private.announcement_submission
  set
    stripe_checkout_session_id = p_session_id,
    stripe_price_id = p_price_id,
    stripe_checkout_status = case
      when v_effective_paid then 'complete'
      when v_receipt.stripe_checkout_status = 'async_payment_failed'
        and p_checkout_status = 'complete' then v_receipt.stripe_checkout_status
      else p_checkout_status
    end,
    stripe_payment_status = case
      when v_effective_paid then 'paid'
      else p_payment_status
    end,
    stripe_payment_intent_id = coalesce(v_receipt.stripe_payment_intent_id, p_payment_intent_id),
    paid_at = case when v_effective_paid then coalesce(v_receipt.paid_at, v_now) else null end,
    anonymous_at_publish = case when v_effective_paid then coalesce(v_is_anonymous, false) else false end,
    created_at = case when p_paid and v_receipt.paid_at is null then v_now else created_at end,
    refund_required_at = case
      when p_paid and (
        v_receipt.announcement_id is null
        or exists (
          select 1
          from public.annuncio as rejected_announcement
          where rejected_announcement.uuid = v_receipt.announcement_id
            and rejected_announcement.stato_annuncio = 'rifiutato'
        )
      ) then coalesce(refund_required_at, v_now)
      else refund_required_at
    end
  where submission_id = p_submission_id;

  if p_paid and v_receipt.announcement_id is not null then
    update public.annuncio
    set
      stato_annuncio = 'in_revisione',
      info_stato_annuncio = 'Pagamento ricevuto. Annuncio in attesa di revisione.',
      nascosto = false,
      privato = false,
      ultima_modifica_il = v_now
    where uuid = v_receipt.announcement_id
      and stato_annuncio = 'in_attesa_pagamento';
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'success',
    'paid', v_effective_paid,
    'paymentFailed', not v_effective_paid and (
      p_checkout_status = 'async_payment_failed'
      or v_receipt.stripe_checkout_status = 'async_payment_failed'
    ),
    'announcementAvailable', v_receipt.announcement_id is not null
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_receipt private.announcement_submission%rowtype;
  v_now timestamptz := pg_catalog.statement_timestamp();
  v_is_anonymous boolean;
  v_effective_paid boolean;
begin
  if p_announcement_id is null
    or p_submission_id is null
    or p_session_id is null
    or p_price_id is null
    or p_amount_subtotal is null
    or p_amount_total is null
    or p_checkout_status is null
    or p_payment_status is null
    or p_paid is null
    or p_session_id !~ '^cs_'
    or p_price_id !~ '^price_'
    or not private.publish_text_is_valid(p_session_id, true, 255)
    or not private.publish_text_is_valid(p_price_id, true, 255)
    or not private.publish_text_is_valid(p_checkout_status, true, 80)
    or not private.publish_text_is_valid(p_payment_status, true, 80)
    or p_amount_subtotal < 0
    or p_amount_total not between 0 and p_amount_subtotal
    or (
      p_payment_intent_id is not null
      and (
        p_payment_intent_id !~ '^pi_'
        or not private.publish_text_is_valid(p_payment_intent_id, true, 255)
      )
    ) then
    raise exception using errcode = '22023', message = 'INVALID_CHECKOUT_EVENT';
  end if;

  select *
  into v_receipt
  from private.announcement_submission
  where submission_id = p_submission_id
    and coalesce(announcement_id, requested_announcement_id) = p_announcement_id
    and requested_visibility = 'prioritario'
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'ignored', 'reason', 'not_found');
  end if;

  if v_receipt.stripe_checkout_session_id is not null
    and v_receipt.stripe_checkout_session_id <> p_session_id then
    return pg_catalog.jsonb_build_object('status', 'ignored', 'reason', 'stale_session');
  end if;

  if v_receipt.stripe_price_id is not null
    and v_receipt.stripe_price_id <> p_price_id then
    raise exception using errcode = 'P0001', message = 'PRIORITY_CHECKOUT_NOT_FOUND';
  end if;

  v_effective_paid := v_receipt.paid_at is not null or p_paid;

  select app_user.registrato_il is null
  into v_is_anonymous
  from public.utente as app_user
  where app_user.utente_uuid = v_receipt.utente_id;

  update private.announcement_submission
  set
    stripe_checkout_session_id = p_session_id,
    stripe_price_id = p_price_id,
    stripe_amount_subtotal = p_amount_subtotal,
    stripe_amount_total = p_amount_total,
    stripe_checkout_status = case
      when v_effective_paid then 'complete'
      when v_receipt.stripe_checkout_status = 'async_payment_failed'
        and p_checkout_status = 'complete' then v_receipt.stripe_checkout_status
      else p_checkout_status
    end,
    stripe_payment_status = case
      when v_effective_paid then 'paid'
      else p_payment_status
    end,
    stripe_payment_intent_id = coalesce(v_receipt.stripe_payment_intent_id, p_payment_intent_id),
    paid_at = case when v_effective_paid then coalesce(v_receipt.paid_at, v_now) else null end,
    anonymous_at_publish = case when v_effective_paid then coalesce(v_is_anonymous, false) else false end,
    created_at = case when p_paid and v_receipt.paid_at is null then v_now else created_at end,
    refund_required_at = case
      when p_paid and p_amount_total > 0 and (
        v_receipt.announcement_id is null
        or exists (
          select 1
          from public.annuncio as rejected_announcement
          where rejected_announcement.uuid = v_receipt.announcement_id
            and rejected_announcement.stato_annuncio = 'rifiutato'
        )
      ) then coalesce(refund_required_at, v_now)
      else refund_required_at
    end
  where submission_id = p_submission_id;

  if p_paid and v_receipt.announcement_id is not null then
    update public.annuncio
    set
      stato_annuncio = 'in_revisione',
      info_stato_annuncio = 'Pagamento ricevuto. Annuncio in attesa di revisione.',
      nascosto = false,
      privato = false,
      ultima_modifica_il = v_now
    where uuid = v_receipt.announcement_id
      and stato_annuncio = 'in_attesa_pagamento';
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'success',
    'paid', v_effective_paid,
    'paymentFailed', not v_effective_paid and (
      p_checkout_status = 'async_payment_failed'
      or v_receipt.stripe_checkout_status = 'async_payment_failed'
    ),
    'announcementAvailable', v_receipt.announcement_id is not null
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_attempt integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_updated_submission_id uuid;
begin
  if p_announcement_id is null
    or p_submission_id is null
    or p_session_id is null
    or p_price_id is null
    or p_checkout_status is null
    or p_payment_status is null
    or p_attempt is null
    or p_session_id !~ '^cs_'
    or p_price_id !~ '^price_'
    or not private.publish_text_is_valid(p_session_id, true, 255)
    or not private.publish_text_is_valid(p_price_id, true, 255)
    or not private.publish_text_is_valid(p_checkout_status, true, 80)
    or not private.publish_text_is_valid(p_payment_status, true, 80)
    or p_attempt not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'INVALID_CHECKOUT_SESSION';
  end if;

  update private.announcement_submission
  set
    stripe_checkout_session_id = p_session_id,
    stripe_price_id = p_price_id,
    stripe_checkout_status = p_checkout_status,
    stripe_payment_status = p_payment_status,
    stripe_checkout_attempt = pg_catalog.greatest(stripe_checkout_attempt, p_attempt)
  where submission_id = p_submission_id
    and announcement_id = p_announcement_id
    and requested_visibility = 'prioritario'
    and (
      stripe_checkout_session_id is null
      or stripe_checkout_session_id = p_session_id
      or (paid_at is null and p_attempt > stripe_checkout_attempt)
    )
  returning submission_id into v_updated_submission_id;

  if v_updated_submission_id is null then
    raise exception using errcode = 'P0001', message = 'PRIORITY_CHECKOUT_NOT_FOUND';
  end if;

  return pg_catalog.jsonb_build_object('status', 'success');
end;
$$;

CREATE OR REPLACE FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_attempt integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_updated_submission_id uuid;
begin
  if p_announcement_id is null
    or p_submission_id is null
    or p_session_id is null
    or p_price_id is null
    or p_amount_subtotal is null
    or p_amount_total is null
    or p_checkout_status is null
    or p_payment_status is null
    or p_attempt is null
    or p_session_id !~ '^cs_'
    or p_price_id !~ '^price_'
    or not private.publish_text_is_valid(p_session_id, true, 255)
    or not private.publish_text_is_valid(p_price_id, true, 255)
    or not private.publish_text_is_valid(p_checkout_status, true, 80)
    or not private.publish_text_is_valid(p_payment_status, true, 80)
    or p_amount_subtotal < 0
    or p_amount_total not between 0 and p_amount_subtotal
    or p_attempt not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'INVALID_CHECKOUT_SESSION';
  end if;

  update private.announcement_submission
  set
    stripe_checkout_session_id = p_session_id,
    stripe_price_id = p_price_id,
    stripe_amount_subtotal = p_amount_subtotal,
    stripe_amount_total = p_amount_total,
    stripe_checkout_status = p_checkout_status,
    stripe_payment_status = p_payment_status,
    stripe_checkout_attempt = greatest(stripe_checkout_attempt, p_attempt)
  where submission_id = p_submission_id
    and announcement_id = p_announcement_id
    and requested_visibility = 'prioritario'
    and (
      stripe_checkout_session_id is null
      or stripe_checkout_session_id = p_session_id
      or (paid_at is null and p_attempt > stripe_checkout_attempt)
    )
  returning submission_id into v_updated_submission_id;

  if v_updated_submission_id is null then
    raise exception using errcode = 'P0001', message = 'PRIORITY_CHECKOUT_NOT_FOUND';
  end if;

  return pg_catalog.jsonb_build_object('status', 'success');
end;
$$;

ALTER FUNCTION private.auto_approve_new_announcement_until_v1() OWNER TO postgres;
ALTER FUNCTION private.notification_display_ref(p_ref jsonb, p_owner_target boolean) OWNER TO postgres;
ALTER FUNCTION private.notification_target_ref(p_announcement uuid, p_profile uuid, p_type text) OWNER TO postgres;
ALTER FUNCTION private.notify_announcement_v1() OWNER TO postgres;
ALTER FUNCTION private.prune_revoked_professional_regions_v1() OWNER TO postgres;
ALTER FUNCTION public.get_notifications_v1(p_user uuid, p_limit integer, p_cursor_date timestamp with time zone, p_cursor_id bigint) OWNER TO postgres;
ALTER FUNCTION public.get_notifications_v2(p_user uuid, p_limit integer, p_cursor_date timestamp with time zone, p_cursor_id bigint, p_type text) OWNER TO postgres;
ALTER FUNCTION public.get_owned_priority_checkout_v1(p_announcement_id uuid) OWNER TO postgres;
ALTER FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) OWNER TO postgres;
ALTER FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) OWNER TO postgres;
ALTER FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_attempt integer) OWNER TO postgres;
ALTER FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_attempt integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.auto_approve_new_announcement_until_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.notification_display_ref(p_ref jsonb, p_owner_target boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION private.notification_display_ref(p_ref jsonb, p_owner_target boolean) TO service_role;
REVOKE ALL ON FUNCTION private.notification_target_ref(p_announcement uuid, p_profile uuid, p_type text) FROM PUBLIC;
GRANT ALL ON FUNCTION private.notification_target_ref(p_announcement uuid, p_profile uuid, p_type text) TO service_role;
REVOKE ALL ON FUNCTION private.notify_announcement_v1() FROM PUBLIC;
GRANT ALL ON FUNCTION private.notify_announcement_v1() TO service_role;
REVOKE ALL ON FUNCTION private.prune_revoked_professional_regions_v1() FROM PUBLIC;
GRANT ALL ON FUNCTION private.prune_revoked_professional_regions_v1() TO service_role;
REVOKE ALL ON FUNCTION public.get_notifications_v1(p_user uuid, p_limit integer, p_cursor_date timestamp with time zone, p_cursor_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_notifications_v1(p_user uuid, p_limit integer, p_cursor_date timestamp with time zone, p_cursor_id bigint) TO service_role;
REVOKE ALL ON FUNCTION public.get_notifications_v2(p_user uuid, p_limit integer, p_cursor_date timestamp with time zone, p_cursor_id bigint, p_type text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_notifications_v2(p_user uuid, p_limit integer, p_cursor_date timestamp with time zone, p_cursor_id bigint, p_type text) TO service_role;
REVOKE ALL ON FUNCTION public.get_owned_priority_checkout_v1(p_announcement_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_owned_priority_checkout_v1(p_announcement_id uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) TO service_role;
REVOKE ALL ON FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) TO service_role;
REVOKE ALL ON FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_attempt integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_attempt integer) TO service_role;
REVOKE ALL ON FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_attempt integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_priority_checkout_session_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_amount_subtotal integer, p_amount_total integer, p_checkout_status text, p_payment_status text, p_attempt integer) TO service_role;
