begin;

alter table public.annuncio_campo_impianto
  add column if not exists indirizzo text;

comment on column public.annuncio_campo_impianto.indirizzo is
  'Required structured address for facility announcements. Legacy announcements may remain null.';

create or replace function private.save_facility_announcement_fields_v1(
  p_announcement_id uuid,
  p_detail jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_schedule jsonb;
begin
  if p_detail is null or pg_catalog.jsonb_typeof(p_detail) is distinct from 'object'
    or not private.publish_text_is_valid(p_detail ->> 'indirizzo', true, 160) then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_ANNOUNCEMENT';
  end if;
  if pg_catalog.jsonb_typeof(p_detail -> 'tipologie_sport') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_ANNOUNCEMENT';
  end if;
  if pg_catalog.jsonb_array_length(p_detail -> 'tipologie_sport') <> 1 then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_ANNOUNCEMENT';
  end if;

  v_schedule := p_detail -> 'orari';
  if pg_catalog.jsonb_typeof(v_schedule) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_ANNOUNCEMENT';
  end if;
  if pg_catalog.jsonb_array_length(v_schedule) <> 7 then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_ANNOUNCEMENT';
  end if;

  if (select count(distinct entry.value ->> 'giorno')
      from pg_catalog.jsonb_array_elements(v_schedule) as entry(value)) <> 7
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(v_schedule) as entry(value)
      where not private.publish_object_has_only_keys(
          entry.value,
          array['giorno', 'attivo', 'dalle', 'alle'],
          array['giorno', 'attivo', 'dalle', 'alle']
        )
        or pg_catalog.jsonb_typeof(entry.value) is distinct from 'object'
        or entry.value ->> 'giorno' not in (
          'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'
        )
        or pg_catalog.jsonb_typeof(entry.value -> 'attivo') is distinct from 'boolean'
        or pg_catalog.jsonb_typeof(entry.value -> 'dalle') is distinct from 'string'
        or pg_catalog.jsonb_typeof(entry.value -> 'alle') is distinct from 'string'
        or coalesce(entry.value ->> 'dalle', '') !~ '^$|^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce(entry.value ->> 'alle', '') !~ '^$|^([01][0-9]|2[0-3]):[0-5][0-9]$'
    )
    or not exists (
      select 1 from public.localita_annuncio as location
      where location.uuid_annuncio = p_announcement_id
        and nullif(pg_catalog.btrim(location.regione), '') is not null
        and nullif(pg_catalog.btrim(location.citta), '') is not null
    )
    or (select count(*) from public.localita_annuncio as location
        where location.uuid_annuncio = p_announcement_id) <> 1 then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_ANNOUNCEMENT';
  end if;

  update public.annuncio_campo_impianto
  set indirizzo = pg_catalog.btrim(p_detail ->> 'indirizzo'),
      orari = v_schedule
  where uuid_annuncio = p_announcement_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'ANNOUNCEMENT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.save_facility_announcement_fields_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_facility_announcement_fields_v1(uuid, jsonb)
  to service_role;

do $migration$
declare
  v_definition text;
  v_patched text;
  v_old text;
  v_new text;
  v_anchor integer;
  v_description integer;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')
  ) into v_definition;
  v_old := 'v_detail ->> ''servizi_inclusi''';
  v_new := 'v_detail ->> ''descrizione_aggiuntiva'', true, 5000)';
  v_anchor := pg_catalog.strpos(v_definition, v_old);
  if v_definition is null or v_anchor = 0 then
    raise exception 'Facility optional-description insertion point not found';
  end if;
  v_description := pg_catalog.strpos(pg_catalog.substr(v_definition, v_anchor), v_new);
  if v_description = 0 then
    raise exception 'Facility optional-description insertion point not found';
  end if;
  v_old := v_new;
  v_new := 'v_detail ->> ''descrizione_aggiuntiva'', false, 5000)';
  v_patched := pg_catalog.substr(v_definition, 1, v_anchor + v_description - 2)
    || v_new
    || pg_catalog.substr(v_definition, v_anchor + v_description - 2 + pg_catalog.length(v_old) + 1);
  execute v_patched;

  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')
  ) into v_definition;
  v_old := 'return v_result;';
  v_new := 'if p_payload ->> ''announcement_type'' = ''annuncio_campo_impianto'''
    || pg_catalog.chr(10) || '    and v_result ->> ''status'' = ''success'''
    || pg_catalog.chr(10) || '    and not coalesce((v_result ->> ''idempotent'')::boolean, false) then'
    || pg_catalog.chr(10) || '    perform private.save_facility_announcement_fields_v1('
    || pg_catalog.chr(10) || '      (v_result ->> ''announcementId'')::uuid, p_payload -> ''detail'''
    || pg_catalog.chr(10) || '    );'
    || pg_catalog.chr(10) || '  end if;'
    || pg_catalog.chr(10) || pg_catalog.chr(10) || '  return v_result;';
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Facility announcement writer insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old, v_new);
end;
$migration$;

notify pgrst, 'reload schema';

commit;
