alter table public.annuncio
  add column priorita_attiva boolean not null default false,
  add column priorita_inizio_il timestamptz,
  add column priorita_fine_il timestamptz;

alter table public.annuncio
  add constraint annuncio_priorita_periodo_check check (
    priorita_fine_il is null
    or (priorita_inizio_il is not null and priorita_fine_il > priorita_inizio_il)
  ),
  add constraint annuncio_priorita_attiva_check check (
    not priorita_attiva
    or (
      livello_annuncio = 'prioritario'
      and priorita_inizio_il is not null
      and priorita_fine_il is not null
      and stato_annuncio = 'pubblicato'
    )
  );

alter table private.announcement_submission
  add column requested_visibility text not null default 'gratuito',
  add column requested_announcement_id uuid,
  add column stripe_checkout_session_id text,
  add column stripe_payment_intent_id text,
  add column stripe_price_id text,
  add column stripe_amount_subtotal integer,
  add column stripe_amount_total integer,
  add column stripe_checkout_status text,
  add column stripe_payment_status text,
  add column stripe_checkout_attempt integer not null default 0,
  add column paid_at timestamptz,
  add column refund_required_at timestamptz,
  add column stripe_refund_id text,
  add column stripe_refund_status text,
  add column refunded_at timestamptz;

alter table private.announcement_submission
  add constraint announcement_submission_visibility_check check (
    requested_visibility in ('gratuito', 'prioritario')
  ),
  add constraint announcement_submission_checkout_attempt_check check (
    stripe_checkout_attempt between 0 and 1000
  ),
  add constraint announcement_submission_stripe_amounts_check check (
    (stripe_amount_subtotal is null and stripe_amount_total is null)
    or (
      stripe_amount_subtotal >= 0
      and stripe_amount_total between 0 and stripe_amount_subtotal
    )
  ),
  add constraint announcement_submission_paid_checkout_check check (
    paid_at is null
    or (
      requested_visibility = 'prioritario'
      and stripe_checkout_session_id is not null
      and stripe_payment_status = 'paid'
      and stripe_amount_subtotal is not null
      and stripe_amount_total is not null
    )
  );

create unique index announcement_submission_stripe_session_uidx
  on private.announcement_submission (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index announcement_submission_payment_intent_uidx
  on private.announcement_submission (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index announcement_submission_refund_required_idx
  on private.announcement_submission (refund_required_at)
  where refund_required_at is not null and refunded_at is null;

create index annuncio_public_priority_order_idx
  on public.annuncio (priorita_attiva desc, creato_il desc, uuid desc)
  where stato_annuncio = 'pubblicato' and nascosto = false and privato = false;

create or replace function public.publish_announcement_v2(
  p_submission_id uuid,
  p_payload jsonb,
  p_terms_version text,
  p_privacy_version text,
  p_visibility text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_announcement_id uuid;
  v_existing_visibility text;
  v_existing_paid_at timestamptz;
  v_is_retry boolean;
  v_legacy_payload jsonb;
begin
  if p_visibility is null
    or p_visibility not in ('gratuito', 'prioritario')
    or p_payload is null
    or pg_catalog.jsonb_typeof(p_payload) <> 'object'
    or not private.publish_object_has_only_keys(
      p_payload,
      array[
        'profile_type', 'announcement_type', 'profile_draft',
        'profile_locations', 'profile_update', 'detail',
        'announcement_locations', 'contacts', 'extras'
      ],
      array[
        'profile_type', 'announcement_type', 'profile_draft',
        'profile_locations', 'profile_update', 'detail',
        'announcement_locations', 'contacts', 'extras'
      ]
    )
    or pg_catalog.jsonb_typeof(p_payload -> 'extras') <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  v_legacy_payload := (p_payload - 'extras')
    || pg_catalog.jsonb_build_object('premium', p_payload -> 'extras');

  v_result := public.publish_announcement_v1(
    p_submission_id,
    v_legacy_payload,
    p_terms_version,
    p_privacy_version
  );

  if v_result ->> 'status' <> 'success' then
    return v_result;
  end if;

  v_announcement_id := (v_result ->> 'announcementId')::uuid;
  v_is_retry := coalesce((v_result ->> 'idempotent')::boolean, false);

  select requested_visibility, paid_at
  into v_existing_visibility, v_existing_paid_at
  from private.announcement_submission
  where submission_id = p_submission_id
    and announcement_id = v_announcement_id
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'PUBLISH_RECEIPT_NOT_FOUND';
  end if;

  if v_is_retry and v_existing_visibility is distinct from p_visibility then
    raise exception using errcode = '22023', message = 'SUBMISSION_VISIBILITY_CONFLICT';
  end if;

  if not v_is_retry then
    update private.announcement_submission
    set
      requested_visibility = p_visibility,
      requested_announcement_id = v_announcement_id,
      anonymous_at_publish = case
        when p_visibility = 'prioritario' then false
        else anonymous_at_publish
      end
    where submission_id = p_submission_id;

    if p_visibility = 'prioritario' then
      update public.annuncio
      set
        livello_annuncio = 'prioritario',
        stato_annuncio = 'in_attesa_pagamento',
        info_stato_annuncio = 'Bozza salvata. Completa il pagamento per inviarla in revisione.',
        nascosto = true,
        privato = true,
        priorita_attiva = false,
        priorita_inizio_il = null,
        priorita_fine_il = null,
        ultima_modifica_il = pg_catalog.statement_timestamp()
      where uuid = v_announcement_id;
    end if;
  end if;

  return v_result || pg_catalog.jsonb_build_object(
    'paymentRequired', p_visibility = 'prioritario' and v_existing_paid_at is null
  );
end;
$$;

revoke all on function public.publish_announcement_v2(uuid, jsonb, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_announcement_v2(uuid, jsonb, text, text, text)
  to authenticated;

create or replace function public.get_owned_priority_checkout_v1(
  p_announcement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.get_owned_priority_checkout_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_owned_priority_checkout_v1(uuid)
  to authenticated;

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
      and coalesce(stripe_amount_total, 790) > 0
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
      and coalesce(stripe_amount_total, 790) > 0
      and refunded_at is null
      and old.priorita_inizio_il is null;

    new.priorita_attiva := false;
  end if;

  return new;
end;
$$;

revoke all on function private.manage_priority_announcement_lifecycle_v1()
  from public, anon, authenticated, service_role;

create trigger manage_priority_announcement_lifecycle_v1
before update or delete on public.annuncio
for each row execute function private.manage_priority_announcement_lifecycle_v1();

create or replace function private.expire_priority_announcements_v1()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  update public.annuncio
  set
    livello_annuncio = 'gratuito',
    priorita_attiva = false,
    info_stato_annuncio = 'Il periodo prioritario di 7 giorni è terminato.',
    ultima_modifica_il = pg_catalog.statement_timestamp()
  where priorita_attiva
    and priorita_fine_il <= pg_catalog.statement_timestamp();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.expire_priority_announcements_v1()
  from public, anon, authenticated, service_role;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-priority-announcements',
  '* * * * *',
  $cron$select private.expire_priority_announcements_v1();$cron$
);

comment on column public.annuncio.priorita_inizio_il is
  'Inizio dei 7 giorni prioritari, impostato quando un annuncio pagato viene approvato.';
comment on column private.announcement_submission.refund_required_at is
  'Segnala un pagamento da rimborsare manualmente perché l’annuncio è stato rifiutato o eliminato prima dell’attivazione.';
