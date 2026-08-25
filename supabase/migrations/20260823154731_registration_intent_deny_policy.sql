-- Remote migration version: 20260823154731.
-- The intent table is server-only. This explicit deny policy documents that
-- contract and keeps the database advisor from treating policy-free RLS as an
-- accidental omission. The service role bypasses RLS and retains its grants.
create policy registration_intent_deny_client_access
  on private.registration_intent
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
