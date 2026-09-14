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

notify pgrst, 'reload schema';
