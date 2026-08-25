-- Rate-limit OTP requests made by the anonymous announcement publishing flow.
-- Only a SHA-256 digest of the normalized email address is retained.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.publish_email_otp_request (
  email_hash text not null,
  requested_at timestamptz not null default now(),
  constraint publish_email_otp_request_pkey primary key (email_hash, requested_at),
  constraint publish_email_otp_request_email_hash_check check (
    email_hash ~ '^[0-9a-f]{64}$'
  )
);

create index publish_email_otp_request_requested_at_idx
  on private.publish_email_otp_request (requested_at);

alter table private.publish_email_otp_request enable row level security;
alter table private.publish_email_otp_request force row level security;

revoke all on table private.publish_email_otp_request from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, delete on table private.publish_email_otp_request to service_role;

create or replace function public.consume_publish_email_otp_request_v1(
  p_email_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_first_request timestamptz;
  v_last_request timestamptz;
  v_request_count bigint;
begin
  if p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid email hash.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('publish-email-otp:' || p_email_hash, 0)
  );

  v_now := pg_catalog.clock_timestamp();

  delete from private.publish_email_otp_request
  where requested_at <= v_now - interval '24 hours';

  select
    pg_catalog.count(*),
    pg_catalog.min(requested_at),
    pg_catalog.max(requested_at)
  into
    v_request_count,
    v_first_request,
    v_last_request
  from private.publish_email_otp_request
  where email_hash = p_email_hash;

  if v_request_count >= 5 and v_first_request is not null then
    return pg_catalog.jsonb_build_object(
      'status', 'rate_limited',
      'limit', 'daily',
      'retryAt', v_first_request + interval '24 hours'
    );
  end if;

  if v_last_request is not null and v_last_request + interval '60 seconds' > v_now then
    return pg_catalog.jsonb_build_object(
      'status', 'rate_limited',
      'limit', 'cooldown',
      'retryAt', v_last_request + interval '60 seconds'
    );
  end if;

  insert into private.publish_email_otp_request (email_hash, requested_at)
  values (p_email_hash, v_now);

  return pg_catalog.jsonb_build_object(
    'status', 'allowed',
    'retryAt', v_now + interval '60 seconds'
  );
end;
$$;

revoke all on function public.consume_publish_email_otp_request_v1(text)
  from public, anon, authenticated;
grant execute on function public.consume_publish_email_otp_request_v1(text)
  to service_role;
