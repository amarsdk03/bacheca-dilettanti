-- Keep the old email-confirmation timestamp and reserve verificato_il for
-- an official verification assigned by an administrator.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profilo' and column_name = 'confermato_il'
  ) then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profilo' and column_name = 'verificato_il'
    ) then
      raise exception 'PROFILE_CONFIRMATION_COLUMN_MISSING';
    end if;
    alter table public.profilo rename column verificato_il to confermato_il;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profilo' and column_name = 'verificato_il'
  ) then
    alter table public.profilo add column verificato_il timestamptz;
  end if;
end;
$$;

alter table public.profilo alter column verificato_il drop default;

-- Auth is the source of truth, including for profiles created before this migration.
update public.profilo as profile
set confermato_il = auth_user.email_confirmed_at
from public.utente as account
join auth.users as auth_user on auth_user.id = account.auth_user_uuid
where profile.uuid_utente = account.utente_uuid
  and profile.confermato_il is distinct from auth_user.email_confirmed_at;

create or replace function private.sync_profile_email_confirmation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.uuid_utente is null then
    new.confermato_il := null;
  else
    select auth_user.email_confirmed_at into new.confermato_il
    from public.utente as account
    join auth.users as auth_user on auth_user.id = account.auth_user_uuid
    where account.utente_uuid = new.uuid_utente;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_profile_email_confirmation_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists on_profile_email_confirmation_sync on public.profilo;
create trigger on_profile_email_confirmation_sync
  before insert or update of uuid_utente on public.profilo
  for each row execute function private.sync_profile_email_confirmation_v1();

create or replace function private.sync_auth_profile_email_confirmation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.profilo as profile
    set confermato_il = new.email_confirmed_at
    from public.utente as account
    where profile.uuid_utente = account.utente_uuid
      and account.auth_user_uuid = new.id
      and profile.confermato_il is distinct from new.email_confirmed_at;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_auth_profile_email_confirmation_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists on_auth_profile_email_confirmation_sync on auth.users;
create trigger on_auth_profile_email_confirmation_sync
  after update of email_confirmed_at on auth.users
  for each row execute function private.sync_auth_profile_email_confirmation_v1();

notify pgrst, 'reload schema';
