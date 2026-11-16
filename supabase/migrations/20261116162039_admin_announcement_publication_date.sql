begin;

-- Extend the existing atomic writer before regional splitting and moderation.
-- CREATE OR REPLACE preserves the existing owner and restricted execute grants.
do $migration$
declare
  definition text;
  original text;
  anchor text;
begin
  definition := pg_get_functiondef('public.admin_create_announcement_before_direct_v1(uuid,jsonb)'::regprocedure);
  original := definition;
  anchor := 'kind text; ann_type text;';
  if strpos(definition, anchor) = 0 then raise exception 'ADMIN_CREATION_DATE_REVIEW_REQUIRED'; end if;
  definition := replace(definition, anchor, 'publication_time timestamptz := now(); kind text; ann_type text;');

  anchor := 'hash:=encode(sha256(convert_to(p_payload::text,''UTF8'')),''hex'');';
  if strpos(definition, anchor) = 0 then raise exception 'ADMIN_CREATION_DATE_REVIEW_REQUIRED'; end if;
  definition := replace(definition, anchor, $body$
  if p_payload ? 'publication_date' then
    if jsonb_typeof(p_payload->'publication_date') is distinct from 'string'
      or (p_payload->>'publication_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'ADMIN_CREATION_DATE_INVALID' using errcode='22023';
    end if;
    begin
      if (p_payload->>'publication_date')::date < date '1900-01-01'
        or (p_payload->>'publication_date')::date > (now() at time zone 'Europe/Rome')::date then
        raise exception 'ADMIN_CREATION_DATE_INVALID' using errcode='22023';
      end if;
      publication_time := (p_payload->>'publication_date')::date::timestamp at time zone 'Europe/Rome';
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'ADMIN_CREATION_DATE_INVALID' using errcode='22023';
    end;
  end if;
  hash:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
  $body$);

  anchor := 'insert into private.regional_publication(submission_id,owner_id) values(null,v_owner_id)';
  if strpos(definition, anchor) = 0 then raise exception 'ADMIN_CREATION_DATE_REVIEW_REQUIRED'; end if;
  definition := replace(definition, anchor,
    'insert into private.regional_publication(submission_id,owner_id,created_at) values(null,v_owner_id,publication_time)');

  anchor := 'insert into public.annuncio(uuid,autore_annuncio,creato_da,tipologia_annuncio,titolo_annuncio,stato_annuncio,livello_annuncio,nascosto,privato,info_stato_annuncio)';
  if strpos(definition, anchor) = 0 then raise exception 'ADMIN_CREATION_DATE_REVIEW_REQUIRED'; end if;
  definition := replace(definition, anchor,
    'insert into public.annuncio(uuid,creato_il,autore_annuncio,creato_da,tipologia_annuncio,titolo_annuncio,stato_annuncio,livello_annuncio,nascosto,privato,info_stato_annuncio)');
  anchor := 'values(ann_id,v_profile_id,v_owner_id,ann_type,';
  if strpos(definition, anchor) = 0 then raise exception 'ADMIN_CREATION_DATE_REVIEW_REQUIRED'; end if;
  definition := replace(definition, anchor, 'values(ann_id,publication_time,v_profile_id,v_owner_id,ann_type,');
  if definition = original then raise exception 'ADMIN_CREATION_DATE_REVIEW_REQUIRED'; end if;
  execute definition;
end $migration$;

-- New clients with a selected date fail closed until this migration is installed.
create function public.admin_create_announcement_v3(p_submission uuid, p_payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select public.admin_create_announcement_v1(p_submission,p_payload);
$$;
alter function public.admin_create_announcement_v3(uuid,jsonb) owner to postgres;
revoke all on function public.admin_create_announcement_v3(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.admin_create_announcement_v3(uuid,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
