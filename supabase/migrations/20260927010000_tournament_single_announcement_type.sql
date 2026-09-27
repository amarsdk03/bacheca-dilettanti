begin;

create or replace function private.tournament_step12_detail_is_valid(p_detail jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if pg_catalog.jsonb_typeof(p_detail) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_detail -> 'tipologie_sport') is distinct from 'array' then
    return false;
  end if;

  if pg_catalog.jsonb_array_length(p_detail -> 'tipologie_sport') <> 1 then
    return false;
  end if;

  return p_detail -> 'tipologie_sport' ->> 0 in ('Calcio 11', 'Calcio 8', 'Calcio 7', 'Calcio 5');
end;
$$;

revoke all on function private.tournament_step12_detail_is_valid(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.tournament_step12_detail_is_valid(jsonb)
  to service_role;

do $migration$
declare
  v_definition text;
  v_marker constant text := '  v_result := private.publish_announcement_core_v2(';
  v_guard constant text := E'  if p_payload ->> ''announcement_type'' = ''annuncio_torneo_evento''\n    and not private.tournament_step12_detail_is_valid(p_payload -> ''detail'') then\n    raise exception using errcode = ''22023'', message = ''INVALID_TOURNAMENT_ANNOUNCEMENT_DETAIL'';\n  end if;\n\n';
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')
  ) into v_definition;
  if v_definition is null then
    raise exception 'Missing public.publish_announcement_v2(uuid,jsonb,text,text,text)';
  end if;
  if pg_catalog.strpos(v_definition, 'private.tournament_step12_detail_is_valid') > 0 then
    return;
  end if;
  if pg_catalog.strpos(v_definition, v_marker) = 0 then
    raise exception 'Tournament publication guard insertion point not found';
  end if;

  execute pg_catalog.replace(v_definition, v_marker, v_guard || v_marker);
end;
$migration$;

commit;
