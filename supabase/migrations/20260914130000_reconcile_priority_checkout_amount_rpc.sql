alter table private.announcement_submission
  add column if not exists stripe_amount_subtotal integer,
  add column if not exists stripe_amount_total integer;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'announcement_submission_stripe_amounts_check'
      and conrelid = 'private.announcement_submission'::regclass
  ) then
    alter table private.announcement_submission
      add constraint announcement_submission_stripe_amounts_check check (
        (stripe_amount_subtotal is null and stripe_amount_total is null)
        or (
          stripe_amount_subtotal >= 0
          and stripe_amount_total between 0 and stripe_amount_subtotal
        )
      );
  end if;
end;
$$;

create or replace function public.record_priority_checkout_session_v1(
  p_announcement_id uuid,
  p_submission_id uuid,
  p_session_id text,
  p_price_id text,
  p_amount_subtotal integer,
  p_amount_total integer,
  p_checkout_status text,
  p_payment_status text,
  p_attempt integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.record_priority_checkout_session_v1(uuid, uuid, text, text, integer, integer, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.record_priority_checkout_session_v1(uuid, uuid, text, text, integer, integer, text, text, integer)
  to service_role;

create or replace function public.record_priority_checkout_event_v1(
  p_announcement_id uuid,
  p_submission_id uuid,
  p_session_id text,
  p_price_id text,
  p_amount_subtotal integer,
  p_amount_total integer,
  p_checkout_status text,
  p_payment_status text,
  p_payment_intent_id text,
  p_paid boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.record_priority_checkout_event_v1(uuid, uuid, text, text, integer, integer, text, text, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.record_priority_checkout_event_v1(uuid, uuid, text, text, integer, integer, text, text, text, boolean)
  to service_role;

create or replace function public.record_priority_refund_v1(
  p_payment_intent_id text,
  p_refund_id text,
  p_refund_status text,
  p_amount integer,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_announcement_id uuid;
  v_receipt private.announcement_submission%rowtype;
begin
  if p_payment_intent_id is null
    or p_refund_id is null
    or p_refund_status is null
    or p_amount is null
    or p_currency is null
    or p_payment_intent_id !~ '^pi_'
    or p_refund_id !~ '^re_'
    or not private.publish_text_is_valid(p_payment_intent_id, true, 255)
    or not private.publish_text_is_valid(p_refund_id, true, 255)
    or not private.publish_text_is_valid(p_refund_status, true, 80)
    or not private.publish_text_is_valid(p_currency, true, 3)
    or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_REFUND_EVENT';
  end if;

  select *
  into v_receipt
  from private.announcement_submission
  where stripe_payment_intent_id = p_payment_intent_id
    and requested_visibility = 'prioritario'
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'ignored', 'reason', 'not_found');
  end if;

  if p_currency <> 'eur' or p_amount <> v_receipt.stripe_amount_total then
    return pg_catalog.jsonb_build_object('status', 'ignored', 'reason', 'not_full_refund');
  end if;

  update private.announcement_submission
  set
    stripe_refund_id = p_refund_id,
    stripe_refund_status = p_refund_status,
    refunded_at = case
      when p_refund_status = 'succeeded' then coalesce(refunded_at, pg_catalog.statement_timestamp())
      else refunded_at
    end
  where stripe_payment_intent_id = p_payment_intent_id
    and requested_visibility = 'prioritario'
  returning announcement_id into v_announcement_id;

  if p_refund_status = 'succeeded' and v_announcement_id is not null then
    update public.annuncio
    set
      livello_annuncio = 'gratuito',
      priorita_attiva = false,
      info_stato_annuncio = case
        when stato_annuncio = 'rifiutato' then 'Annuncio non approvato. Rimborso completato.'
        else info_stato_annuncio
      end,
      ultima_modifica_il = pg_catalog.statement_timestamp()
    where uuid = v_announcement_id;
  end if;

  return pg_catalog.jsonb_build_object('status', 'success');
end;
$$;

revoke all on function public.record_priority_refund_v1(text, text, text, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_priority_refund_v1(text, text, text, integer, text)
  to service_role;

create or replace function private.manage_priority_announcement_lifecycle_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt private.announcement_submission%rowtype;
  v_now timestamptz := pg_catalog.statement_timestamp();
begin
  if tg_op = 'DELETE' then
    update private.announcement_submission
    set refund_required_at = coalesce(refund_required_at, v_now)
    where announcement_id = old.uuid
      and requested_visibility = 'prioritario'
      and paid_at is not null
      and coalesce(stripe_amount_total, 799) > 0
      and refunded_at is null
      and old.priorita_inizio_il is null;
    return old;
  end if;

  if new.stato_annuncio = 'pubblicato'
    and old.stato_annuncio is distinct from new.stato_annuncio
    and new.livello_annuncio = 'prioritario' then
    select *
    into v_receipt
    from private.announcement_submission
    where announcement_id = new.uuid
      and requested_visibility = 'prioritario'
    for update;

    if not found
      or v_receipt.paid_at is null
      or v_receipt.refund_required_at is not null
      or v_receipt.refunded_at is not null then
      raise exception using errcode = '42501', message = 'PRIORITY_PAYMENT_REQUIRED';
    end if;

    new.priorita_attiva := true;
    new.priorita_inizio_il := v_now;
    new.priorita_fine_il := v_now + interval '7 days';
    new.info_stato_annuncio := 'Annuncio pubblicato con priorità per 7 giorni.';
  end if;

  if new.stato_annuncio = 'rifiutato'
    and old.stato_annuncio is distinct from new.stato_annuncio then
    update private.announcement_submission
    set refund_required_at = coalesce(refund_required_at, v_now)
    where announcement_id = new.uuid
      and requested_visibility = 'prioritario'
      and paid_at is not null
      and coalesce(stripe_amount_total, 799) > 0
      and refunded_at is null
      and old.priorita_inizio_il is null;

    new.priorita_attiva := false;
  end if;

  return new;
end;
$$;

revoke all on function private.manage_priority_announcement_lifecycle_v1()
  from public, anon, authenticated, service_role;

comment on column private.announcement_submission.stripe_amount_subtotal is
  'Importo Stripe prima di sconti e tasse, espresso nell''unità minima della valuta.';
comment on column private.announcement_submission.stripe_amount_total is
  'Importo Stripe effettivamente addebitato dopo sconti e tasse, espresso nell''unità minima della valuta.';

notify pgrst, 'reload schema';
