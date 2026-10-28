-- Source-side SELECTs only. Never read auth account/session/refresh-token rows.
-- Run by the exporter with default_transaction_read_only=on and ON_ERROR_STOP.
select jsonb_build_object(
  'server_version_num', current_setting('server_version_num')::integer,
  'captured_at', statement_timestamp(),
  'schemas', (select jsonb_agg(nspname order by nspname)
    from pg_catalog.pg_namespace where nspname !~ '^pg_' and nspname <> 'information_schema'),
  'extensions', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', e.extname, 'version', e.extversion, 'schema', n.nspname) order by e.extname), '[]'::jsonb)
    from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid=e.extnamespace),
  'admin_foundation',
    to_regprocedure('public.admin_get_context_v1()') is not null
    and to_regprocedure('private.require_admin_context_v1()') is not null
    and to_regclass('private.admin_session_policy_v1') is not null,
  'auth_columns', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', c.relname, 'column', a.attname, 'type', pg_catalog.format_type(a.atttypid,a.atttypmod))
    order by c.relname,a.attnum), '[]'::jsonb)
    from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='auth' and c.relname in ('users','sessions','refresh_tokens')
      and a.attnum>0 and not a.attisdropped),
  'managed_triggers', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'table', c.relname, 'name', t.tgname,
    'function_schema', fn.nspname, 'enabled', t.tgenabled,
    'definition', pg_catalog.pg_get_triggerdef(t.oid,false) || ';',
    'function_definition', pg_catalog.pg_get_functiondef(f.oid))
    order by n.nspname,c.relname,t.tgname), '[]'::jsonb)
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_proc f on f.oid=t.tgfoid
    join pg_catalog.pg_namespace fn on fn.oid=f.pronamespace
    where not t.tgisinternal and n.nspname in ('auth','storage')),
  'managed_schema_acl', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema',n.nspname,'owner',pg_catalog.pg_get_userbyid(n.nspowner),'acl',n.nspacl)
    order by n.nspname), '[]'::jsonb)
    from pg_catalog.pg_namespace n where n.nspname in ('auth','storage')),
  'managed_policies', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'table', c.relname, 'name', p.polname,
    'definition', pg_catalog.format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
      p.polname,n.nspname,c.relname,case when p.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end,
      case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE'
        when 'd' then 'DELETE' else 'ALL' end,
      (select string_agg(case when r=0 then 'PUBLIC' else quote_ident(pg_catalog.pg_get_userbyid(r)) end, ', ' order by r)
        from unnest(p.polroles) r),
      case when p.polqual is null then '' else ' USING (' || pg_catalog.pg_get_expr(p.polqual,p.polrelid) || ')' end,
      case when p.polwithcheck is null then '' else ' WITH CHECK (' || pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid) || ')' end))
    order by n.nspname,c.relname,p.polname), '[]'::jsonb)
    from pg_catalog.pg_policy p join pg_catalog.pg_class c on c.oid=p.polrelid
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in ('auth','storage')),
  'managed_acl', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema',n.nspname,'table',c.relname,'owner',pg_catalog.pg_get_userbyid(c.relowner),'acl',c.relacl,
    'column_acl',(select coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'acl',a.attacl)), '[]'::jsonb)
      from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attnum>0 and a.attacl is not null))
    order by n.nspname,c.relname), '[]'::jsonb)
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('auth','storage') and c.relkind in ('r','p','v')),
  'application_functions', (select coalesce(jsonb_agg(jsonb_build_object(
    'schema',n.nspname,'name',p.proname,'arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
    'owner',pg_catalog.pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'acl',p.proacl)
    order by n.nspname,p.proname,p.oid), '[]'::jsonb)
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prokind in ('f','p'))
);
