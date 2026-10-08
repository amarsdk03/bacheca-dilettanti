begin;

set local lock_timeout = '10s';

-- Special subprofiles already require an admin grant. Verify the shared account
-- only when a new subprofile is actually inserted, in the same transaction.
create function private.verify_new_special_profile_account_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.profilo
  set verificato_il = pg_catalog.now()
  where uuid = new.uuid_profilo and verificato_il is null;
  return new;
end;
$$;

revoke all on function private.verify_new_special_profile_account_v1()
  from public, anon, authenticated, service_role;

create trigger verify_new_service_profile_account
  after insert on public.profilo_servizi_consulenze
  for each row execute function private.verify_new_special_profile_account_v1();

create trigger verify_new_creator_profile_account
  after insert on public.profilo_creator
  for each row execute function private.verify_new_special_profile_account_v1();

-- No backfill: existing special subprofiles and simple access grants do not
-- automatically verify their account.
commit;
