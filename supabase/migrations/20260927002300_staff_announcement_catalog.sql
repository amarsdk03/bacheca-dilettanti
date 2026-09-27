begin;

create or replace function private.staff_step11_detail_is_valid(p_detail jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_travel text;
begin
  if pg_catalog.jsonb_typeof(p_detail) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_detail -> 'categorie_ricercate') is distinct from 'array' then
    return false;
  end if;

  if pg_catalog.jsonb_array_length(p_detail -> 'categorie_ricercate') > 32 then
    return false;
  end if;

  v_travel := nullif(pg_catalog.btrim(p_detail ->> 'disponibilita_spostamento'), '');
  if pg_catalog.length(coalesce(v_travel, '')) > 40
    or (v_travel is not null and v_travel not in ('Si', 'No', 'Da valutare')) then
    return false;
  end if;

  return not exists (
    select 1
    from pg_catalog.jsonb_array_elements_text(p_detail -> 'categorie_ricercate') as chosen(category_key)
    where not exists (
      select 1
      from (values
        ('Calcio 11 (Maschile)', array['Settore Giovanile', 'Serie C', 'Serie D', 'Eccellenza', 'Promozione', 'Prima Categoria', 'Seconda Categoria', 'Terza Categoria']),
        ('Calcio 7 (Maschile)', array['Settore Giovanile C7', 'Open Eccellenza', 'Open Serie A', 'Open Serie B', 'Open Serie C1', 'Open Serie C2', 'Open A', 'Open B', 'Open C', 'Open Divisione Unica']),
        ('Calcio 5 (Maschile)', array['Settore Giovanile C5', 'Serie A', 'Serie A2 Élite', 'Serie A2', 'Serie B', 'Serie C1', 'Serie C2', 'Serie D']),
        ('Calcio 11 (Femminile)', array['Settore Giovanile C11 Femminile', 'Eccellenza Femminile', 'Serie C Femminile', 'Serie B Femminile', 'Serie A Femminile']),
        ('Calcio 7 (Femminile)', array['Settore Giovanile C7 Femminile', 'Open Eccellenza', 'Open Serie A', 'Open Serie B']),
        ('Calcio 5 (Femminile)', array['Settore Giovanile C5 Femminile', 'Serie D', 'Serie C', 'Serie B', 'Serie A'])
      ) as allowed(group_name, categories)
      cross join lateral pg_catalog.unnest(allowed.categories) as category(name)
      where chosen.category_key = allowed.group_name || '::' || category.name
    )
  );
end;
$$;

revoke all on function private.staff_step11_detail_is_valid(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.staff_step11_detail_is_valid(jsonb)
  to service_role;

do $migration$
declare
  v_definition text;
  v_marker constant text := '  v_result := private.publish_announcement_core_v2(';
  v_guard constant text := E'  if p_payload ->> ''announcement_type'' = ''annuncio_staff_sportivo''\n    and not private.staff_step11_detail_is_valid(p_payload -> ''detail'') then\n    raise exception using errcode = ''22023'', message = ''INVALID_STAFF_ANNOUNCEMENT_DETAIL'';\n  end if;\n\n';
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')
  ) into v_definition;
  if v_definition is null then
    raise exception 'Missing public.publish_announcement_v2(uuid,jsonb,text,text,text)';
  end if;
  if pg_catalog.strpos(v_definition, 'private.staff_step11_detail_is_valid') > 0 then
    return;
  end if;
  if pg_catalog.strpos(v_definition, v_marker) = 0 then
    raise exception 'Staff publication guard insertion point not found';
  end if;

  execute pg_catalog.replace(v_definition, v_marker, v_guard || v_marker);
end;
$migration$;

commit;
