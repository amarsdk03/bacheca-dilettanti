begin;

-- ultima_modifica_da identifies public.utente, not auth.users.
-- Restore the identity mapping lost in the follow/activity migration.
create or replace function private.stamp_annuncio_visibility_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  auth_id uuid;
  internal_id uuid;
begin
  if new.nascosto is distinct from old.nascosto then
    auth_id := (select auth.uid());
    if auth_id is not null then
      select u.utente_uuid into internal_id
      from public.utente u where u.auth_user_uuid = auth_id;
      if internal_id is null then
        raise exception using errcode = '42501', message = 'AUTH_USER_NOT_PROVISIONED';
      end if;
      new.ultima_modifica_da := internal_id;
    end if;
    -- Technical writers without an Auth identity retain their explicit actor.
    new.ultima_modifica_il := now();
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_annuncio_visibility_update() from public, anon, authenticated, service_role;

commit;
