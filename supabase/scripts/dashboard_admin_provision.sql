-- Manual operator script. Use only after migration + integration checks on an
-- authorized target. Create the dedicated Auth user in Supabase first, without
-- a registration intent or role metadata, and confirm its email.
-- Replace NULL below with THAT Auth UUID, never utente.utente_uuid.
begin;
do $provision$
declare
  v_auth_user_id uuid := null;
  v_internal_id uuid;
  v_account public.utente%rowtype;
begin
  if v_auth_user_id is null then raise exception 'ADMIN_AUTH_UUID_REQUIRED'; end if;
  perform 1 from auth.users a where a.id = v_auth_user_id
    and a.email_confirmed_at is not null and a.email is not null and a.deleted_at is null
    and not coalesce(a.is_anonymous, false)
    and (a.banned_until is null or a.banned_until <= pg_catalog.statement_timestamp()) for update;
  if not found then raise exception 'ADMIN_AUTH_IDENTITY_NOT_READY'; end if;
  select * into v_account from public.utente u where u.auth_user_uuid = v_auth_user_id for update;
  if found then
    if v_account.registrato_il is not null
      or (v_account.tipologia_utente collate "C" is distinct from 'Utente'
        and v_account.tipologia_utente collate "C" is distinct from 'Admin')
      or exists (select 1 from public.profilo p where p.uuid_utente = v_account.utente_uuid)
      or exists (select 1 from public.annuncio a where a.creato_da = v_account.utente_uuid) then
      raise exception 'ADMIN_REQUIRES_DEDICATED_ACCOUNT';
    end if;
    update public.utente set tipologia_utente = 'Admin', ultima_modifica_il = now()
      where utente_uuid = v_account.utente_uuid returning utente_uuid into v_internal_id;
  else
    insert into public.utente (auth_user_uuid, indirizzo_email, tipologia_utente, registrato_il)
      select a.id, pg_catalog.lower(pg_catalog.btrim(a.email)), 'Admin', null
        from auth.users a where a.id = v_auth_user_id returning utente_uuid into v_internal_id;
  end if;
  raise notice 'Dedicated Admin provisioned: application UUID %', v_internal_id;
end;
$provision$;
commit;
