-- Step 13: read-only Home aggregates, no UI or financial integration.
begin;
set local lock_timeout = '10s';

do $$
declare v_table text; v_columns text[]; v_column text;
begin
  if to_regprocedure('private.require_admin_context_v1()') is null or
     to_regprocedure('public.admin_list_audit_events_v1(jsonb)') is null then
    raise exception 'ADMIN_HOME_PREREQUISITES_REQUIRED';
  end if;
  for v_table,v_columns in select * from (values
    ('utente',array['utente_uuid','tipologia_utente','registrato_il']),
    ('profilo',array['uuid','uuid_utente','nascosto','tipologia_principale']),
    ('annuncio',array['uuid','eliminato_il','stato_annuncio','tipologia_annuncio','creato_il'])
  ) as required(table_name,column_names) loop
    foreach v_column in array v_columns loop
      if not exists(select 1 from pg_attribute where attrelid=to_regclass('public.'||v_table)
        and attname=v_column and attnum>0 and not attisdropped) then
        raise exception 'ADMIN_HOME_SCHEMA_REQUIRED: %.%',v_table,v_column;
      end if;
    end loop;
  end loop;
end $$;

create function private.admin_get_home_summary_bridge_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_users bigint; v_announcements bigint; v_pending bigint;
begin
  if current_setting('role',true) is distinct from 'authenticated' then
    raise exception using errcode='42501',message='ADMIN_ACCESS_DENIED';
  end if;
  perform private.require_admin_context_v1();
  select count(*) into v_users from public.utente
    where tipologia_utente collate "C"='Utente' and registrato_il is not null;
  select count(*),count(*) filter(where stato_annuncio collate "C"='in_revisione') into v_announcements,v_pending
    from public.annuncio where eliminato_il is null;
  return jsonb_build_object('asOf',to_char(statement_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'users',v_users,'announcements',v_announcements,'pending',v_pending,'profits',jsonb_build_object('available',false));
end $$;

create function private.admin_get_home_chart_bridge_v1(p_metric text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_now timestamptz:=statement_timestamp(); v_month timestamp; v_first timestamp;
  v_population bigint; v_missing bigint; v_future bigint; v_distribution_total bigint;
  v_series jsonb; v_distribution jsonb; v_age jsonb; v_result jsonb;
  v_profile_types text[]:=array['giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators'];
  v_announcement_types text[]:=array['annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff',
    'annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro',
    'annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creators'];
begin
  if current_setting('role',true) is distinct from 'authenticated' then
    raise exception using errcode='42501',message='ADMIN_ACCESS_DENIED';
  end if;
  perform private.require_admin_context_v1();
  if p_metric is null or p_metric collate "C" not in ('users','announcements','pending','profits') then
    raise exception using errcode='22023',message='INVALID_METRIC';
  end if;
  v_result:=jsonb_build_object('metric',p_metric,'asOf',to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'timezone','Europe/Rome');
  -- Even this unavailable result requires a current human Admin session.
  if p_metric='profits' then return v_result||jsonb_build_object('available',false); end if;
  v_month:=date_trunc('month',v_now at time zone 'Europe/Rome');
  v_first:=v_month-interval '11 months';

  if p_metric='users' then
    select count(*),count(*) filter(where not isfinite(registrato_il)),
      count(*) filter(where isfinite(registrato_il) and registrato_il>v_now)
      into v_population,v_missing,v_future from public.utente
      where tipologia_utente collate "C"='Utente' and registrato_il is not null;

    with months as (select generate_series(v_first,v_month,interval '1 month') m), monthly as (
      select date_trunc('month',registrato_il at time zone 'Europe/Rome') m,count(*) n from public.utente
      where tipologia_utente collate "C"='Utente' and registrato_il is not null and isfinite(registrato_il)
        and registrato_il >= (v_first at time zone 'Europe/Rome') and registrato_il<=v_now group by 1
    ) select jsonb_agg(jsonb_build_object('month',to_char(months.m,'YYYY-MM'),'count',coalesce(monthly.n,0)) order by months.m)
      into v_series from months left join monthly using(m);

    -- One base profile per row, regardless of how many subprofiles it has.
    with grouped as (
      select case when p.tipologia_principale is null or btrim(p.tipologia_principale)='' then 'unspecified'
        when p.tipologia_principale collate "C"=any(v_profile_types) then p.tipologia_principale else 'other' end key,count(*) n
      from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
      where p.nascosto is false and u.tipologia_utente collate "C"='Utente' and u.registrato_il is not null group by 1
    ) select coalesce(jsonb_agg(jsonb_build_object('key',key,'count',n) order by key collate "C"),'[]'::jsonb),coalesce(sum(n),0)
      into v_distribution,v_distribution_total from grouped;
  else
    select count(*),count(*) filter(where creato_il is null or not isfinite(creato_il)),
      count(*) filter(where isfinite(creato_il) and creato_il>v_now)
      into v_population,v_missing,v_future from public.annuncio
      where eliminato_il is null and (p_metric='announcements' or stato_annuncio collate "C"='in_revisione');
    v_distribution_total:=v_population;
    if p_metric='announcements' then
      with months as (select generate_series(v_first,v_month,interval '1 month') m), monthly as (
        select date_trunc('month',creato_il at time zone 'Europe/Rome') m,count(*) n from public.annuncio
        where eliminato_il is null and isfinite(creato_il) and creato_il >= (v_first at time zone 'Europe/Rome') and creato_il<=v_now group by 1
      ) select jsonb_agg(jsonb_build_object('month',to_char(months.m,'YYYY-MM'),'count',coalesce(monthly.n,0)) order by months.m)
        into v_series from months left join monthly using(m);
      with grouped as (
        select case when stato_annuncio is null or btrim(stato_annuncio)='' then 'unspecified'
          when stato_annuncio collate "C" in ('pubblicato','in_revisione','rifiutato','in_attesa_pagamento') then stato_annuncio else 'other' end key,count(*) n
        from public.annuncio where eliminato_il is null group by 1
      ) select coalesce(jsonb_agg(jsonb_build_object('key',key,'count',n) order by key collate "C"),'[]'::jsonb) into v_distribution from grouped;
    else
      with buckets as (select * from (values ('0_2',1),('3_7',2),('8_30',3),('over_30',4),('unknown',5)) b(key,position)),
      grouped as (
        select case when creato_il is null or not isfinite(creato_il) or creato_il>v_now then 'unknown'
          when (v_now at time zone 'Europe/Rome')::date-(creato_il at time zone 'Europe/Rome')::date<=2 then '0_2'
          when (v_now at time zone 'Europe/Rome')::date-(creato_il at time zone 'Europe/Rome')::date<=7 then '3_7'
          when (v_now at time zone 'Europe/Rome')::date-(creato_il at time zone 'Europe/Rome')::date<=30 then '8_30'
          else 'over_30' end key,count(*) n from public.annuncio
        where eliminato_il is null and stato_annuncio collate "C"='in_revisione' group by 1
      ) select jsonb_agg(jsonb_build_object('key',b.key,'count',coalesce(g.n,0)) order by b.position)
        into v_age from buckets b left join grouped g using(key);
      with grouped as (
        select case when tipologia_annuncio is null or btrim(tipologia_annuncio)='' then 'unspecified'
          when tipologia_annuncio collate "C"=any(v_announcement_types) then tipologia_annuncio else 'other' end key,count(*) n
        from public.annuncio where eliminato_il is null and stato_annuncio collate "C"='in_revisione' group by 1
      ) select coalesce(jsonb_agg(jsonb_build_object('key',key,'count',n) order by key collate "C"),'[]'::jsonb) into v_distribution from grouped;
    end if;
  end if;
  v_result:=v_result||jsonb_build_object('available',true,'population',v_population,
    'excludedDates',jsonb_build_object('missingOrNonFinite',v_missing,'future',v_future),
    'distributionTotal',v_distribution_total,'distribution',v_distribution);
  if p_metric='pending' then return v_result||jsonb_build_object('age',v_age); end if;
  return v_result||jsonb_build_object('series',v_series,'period',jsonb_build_object(
    'from',to_char(v_first at time zone 'Europe/Rome' at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'to',to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')));
end $$;

create function public.admin_get_home_summary_v1()
returns jsonb language sql stable security invoker set search_path='' as $$ select private.admin_get_home_summary_bridge_v1(); $$;
create function public.admin_get_home_chart_v1(p_metric text)
returns jsonb language sql stable security invoker set search_path='' as $$ select private.admin_get_home_chart_bridge_v1(p_metric); $$;

alter function private.admin_get_home_summary_bridge_v1() owner to postgres;
alter function private.admin_get_home_chart_bridge_v1(text) owner to postgres;
alter function public.admin_get_home_summary_v1() owner to postgres;
alter function public.admin_get_home_chart_v1(text) owner to postgres;
revoke all on function private.admin_get_home_summary_bridge_v1(),private.admin_get_home_chart_bridge_v1(text),
  public.admin_get_home_summary_v1(),public.admin_get_home_chart_v1(text) from public,anon,authenticated,service_role;
grant execute on function private.admin_get_home_summary_bridge_v1(),private.admin_get_home_chart_bridge_v1(text),
  public.admin_get_home_summary_v1(),public.admin_get_home_chart_v1(text) to authenticated;
comment on function public.admin_get_home_summary_v1() is 'Exact registered Utente accounts, non-trashed announcements and pending count. No financial source.';
comment on function public.admin_get_home_chart_v1(text) is 'One selected Home aggregate. Europe/Rome calendar, currently retained records, no immutable historical backlog.';
notify pgrst,'reload schema';
commit;
