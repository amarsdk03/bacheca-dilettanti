-- M06 follow-up: only the reviewed, pre-existing eight-argument payment function.
-- Apply once after M06. No table access, grants, replay or removal of old APIs.
begin;
set local search_path=pg_catalog;
set local statement_timeout='15s';
set local lock_timeout='3s';

do $migration$
declare
  target oid := to_regprocedure('public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean)');
  definition text;
  previous_acl text;
  source_hash text;
begin
  if current_user <> 'postgres' then
    raise exception 'ADMIN_M06_LEGACY_PAYMENT_OPERATOR_REQUIRED';
  end if;
  if target is null then
    raise exception 'ADMIN_M06_LEGACY_PAYMENT_NOT_PRESENT';
  end if;
  if not exists(select 1 from pg_attribute where attrelid=to_regclass('public.annuncio')
      and attname='oscurato_da_admin' and atttypid='boolean'::regtype and attnotnull and not attisdropped)
    or not exists(select 1 from pg_proc where oid=to_regprocedure('public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean)')
      and md5(replace(pg_get_functiondef(oid),E'\r\n',E'\n'))='f77948a78239684e1e8ba4333d299fb5')
    or not exists(select 1 from pg_trigger where tgrelid=to_regclass('public.annuncio')
      and tgname='zz_guard_admin_announcement_visibility_v1' and tgenabled='O'
      and tgfoid=to_regprocedure('private.guard_admin_announcement_visibility_v1()')) then
    raise exception 'ADMIN_M06_LEGACY_PAYMENT_DEPENDENCIES_REQUIRED';
  end if;
  select md5(replace(pg_get_functiondef(oid),E'\r\n',E'\n')),proacl::text
    into source_hash,previous_acl from pg_proc where oid=target and prokind='f';
  if source_hash='e23890414fe6633d54cd4cb8694901fe' then
    raise exception 'ADMIN_M06_LEGACY_PAYMENT_ALREADY_FIXED';
  end if;
  if source_hash is distinct from '44155d0a2a904fe2fb0211c1b3f2bf67'
    or not exists(select 1 from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=target
      and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef and l.lanname='plpgsql'
      and p.prorettype='jsonb'::regtype and p.provolatile='v' and not p.proisstrict
      and not p.proretset and p.pronargdefaults=0 and p.proconfig=array['search_path=""']::text[])
    or md5(previous_acl) is distinct from 'db23e67d6fad77fdfa003856d807d6af'
    or (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role','supabase_auth_admin'))<>4
    or exists(select 1 from pg_roles r where r.rolname in ('anon','authenticated','service_role','supabase_auth_admin')
      and has_function_privilege(r.oid,target,'EXECUTE') is distinct from (r.rolname='service_role')) then
    raise exception 'ADMIN_M06_LEGACY_PAYMENT_REVIEW_REQUIRED';
  end if;
  definition:=replace(pg_get_functiondef(target),E'\r\n',E'\n');
  definition:=replace(definition,'nascosto = false,',
    'nascosto = case when oscurato_da_admin then true else false end,');
  definition:=replace(definition,'info_stato_annuncio = ''Pagamento ricevuto. Annuncio in attesa di revisione.'',',
    'info_stato_annuncio = case when oscurato_da_admin then info_stato_annuncio else ''Pagamento ricevuto. Annuncio in attesa di revisione.'' end,');
  execute definition;
  if not exists(select 1 from pg_proc where oid=target and proacl::text is not distinct from previous_acl
    and md5(replace(pg_get_functiondef(oid),E'\r\n',E'\n'))='e23890414fe6633d54cd4cb8694901fe') then
    raise exception 'ADMIN_M06_LEGACY_PAYMENT_RESULT_MISMATCH';
  end if;
end;
$migration$;
commit;
