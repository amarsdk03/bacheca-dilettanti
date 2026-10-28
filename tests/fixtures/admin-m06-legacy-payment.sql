-- Legacy eight-argument function extracted schema-only from the verified M02 backup.
-- No rows, credentials or unrelated dump contents. Original canonical MD5: 44155d0a2a904fe2fb0211c1b3f2bf67.
CREATE FUNCTION public.record_priority_checkout_event_v1(p_announcement_id uuid, p_submission_id uuid, p_session_id text, p_price_id text, p_checkout_status text, p_payment_status text, p_payment_intent_id text, p_paid boolean) RETURNS jsonb
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
REVOKE ALL ON FUNCTION public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean) TO service_role;
