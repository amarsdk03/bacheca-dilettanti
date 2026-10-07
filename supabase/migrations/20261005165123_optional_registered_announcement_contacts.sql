begin;

alter table public.contatto_annuncio
  add column referente text;

do $migration$
declare
  v_definition text;
  v_old_keys constant text := 'array[''email'', ''phone'']';
  v_new_keys constant text := 'array[''email'', ''phone'', ''contactRole'']';
  v_old_shape constant text := 'or pg_catalog.jsonb_typeof(p_payload -> ''contacts'' -> ''phone'') not in (''string'', ''null'') then';
  v_new_shape constant text := 'or pg_catalog.jsonb_typeof(p_payload -> ''contacts'' -> ''phone'') not in (''string'', ''null'')'
    || chr(10) || '    or pg_catalog.jsonb_typeof(p_payload -> ''contacts'' -> ''contactRole'') not in (''string'', ''null'') then';
  v_old_required_contact constant text := 'if (v_contact_email is null and v_contact_phone is null)'
    || chr(10) || '    or (';
  v_new_required_contact constant text := 'if (';
  v_old_phone_normalization constant text := 'v_contact_phone := nullif(pg_catalog.btrim(p_payload -> ''contacts'' ->> ''phone''), '''');';
  v_new_phone_normalization constant text := 'v_contact_phone := nullif(pg_catalog.btrim(p_payload -> ''contacts'' ->> ''phone''), '''');'
    || chr(10) || '  v_contact_role := nullif(pg_catalog.btrim(p_payload -> ''contacts'' ->> ''contactRole''), '''');'
    || chr(10) || '  if not private.publish_text_is_valid(v_contact_role, false, 120) then'
    || chr(10) || '    raise exception using errcode = ''22023'', message = ''INVALID_PUBLISH_PAYLOAD'';'
    || chr(10) || '  end if;'
    || chr(10) || '  if v_contact_role is not null and v_contact_email is null and v_contact_phone is null then'
    || chr(10) || '    raise exception using errcode = ''22023'', message = ''INVALID_PUBLISH_PAYLOAD'';'
    || chr(10) || '  end if;';
  v_old_phone_insert constant text := 'insert into public.contatto_annuncio (uuid_annuncio, tipo, valore)'
    || chr(10) || '    values (v_announcement_id, ''telefono'', v_contact_phone);';
  v_new_phone_insert constant text := 'insert into public.contatto_annuncio (uuid_annuncio, tipo, valore, referente)'
    || chr(10) || '    values (v_announcement_id, ''telefono'', v_contact_phone, v_contact_role);';
  v_old_email_insert constant text := 'insert into public.contatto_annuncio (uuid_annuncio, tipo, valore)'
    || chr(10) || '    values (v_announcement_id, ''email'', v_contact_email);';
  v_new_email_insert constant text := 'insert into public.contatto_annuncio (uuid_annuncio, tipo, valore, referente)'
    || chr(10) || '    values (v_announcement_id, ''email'', v_contact_email, v_contact_role);';
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')
  ) into v_definition;

  if v_definition is null then
    raise exception 'Missing public.publish_announcement_core_v1(uuid,jsonb,text,text)';
  end if;

  if pg_catalog.strpos(v_definition, 'v_contact_role text;') > 0 then
    return;
  end if;

  v_definition := pg_catalog.replace(v_definition, 'v_contact_phone text;', 'v_contact_phone text;' || chr(10) || '  v_contact_role text;');
  v_definition := pg_catalog.replace(v_definition, v_old_keys, v_new_keys);
  v_definition := pg_catalog.replace(v_definition, v_old_shape, v_new_shape);
  v_definition := pg_catalog.replace(v_definition, v_old_required_contact, v_new_required_contact);
  v_definition := pg_catalog.replace(v_definition, v_old_phone_normalization, v_new_phone_normalization);
  v_definition := pg_catalog.replace(v_definition, v_old_phone_insert, v_new_phone_insert);
  v_definition := pg_catalog.replace(v_definition, v_old_email_insert, v_new_email_insert);

  if pg_catalog.strpos(v_definition, 'v_contact_role text;') = 0
    or pg_catalog.strpos(v_definition, v_new_keys) = 0
    or pg_catalog.strpos(v_definition, 'contactRole'') not in (''string'', ''null'')') = 0
    or pg_catalog.strpos(v_definition, 'v_contact_role := nullif') = 0
    or pg_catalog.strpos(v_definition, v_old_required_contact) > 0
    or (pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, 'v_contact_role);', ''))) / pg_catalog.length('v_contact_role);') < 2 then
    raise exception 'Unable to safely extend announcement contacts validation and storage';
  end if;

  v_definition := pg_catalog.replace(
    v_definition,
    '  v_is_anonymous := v_registered_at is null;',
    '  v_is_anonymous := v_registered_at is null;' || chr(10) || chr(10)
      || '  if v_is_anonymous and v_contact_email is null and v_contact_phone is null then' || chr(10)
      || '    raise exception using errcode = ''22023'', message = ''INVALID_PUBLISH_PAYLOAD'';' || chr(10)
      || '  end if;'
  );
  execute v_definition;
end;
$migration$;

notify pgrst, 'reload schema';

commit;
