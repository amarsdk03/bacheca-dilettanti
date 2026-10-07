begin;

alter table public.annuncio_squadra_cerca_giocatore
  add column gruppo_squadra text check (char_length(gruppo_squadra) <= 160);
alter table public.annuncio_squadra_cerca_partita
  add column gruppo_squadra text check (char_length(gruppo_squadra) <= 160);

-- Existing publication guard calls this function; replace its catalogue in place.
create or replace function private.staff_step11_detail_is_valid(p_detail jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
begin
  if pg_catalog.jsonb_typeof(p_detail) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_detail -> 'categorie_ricercate') is distinct from 'array' then
    return false;
  end if;
  if pg_catalog.jsonb_array_length(p_detail -> 'categorie_ricercate') > 32
    or coalesce(p_detail ->> 'disponibilita_spostamento', '') not in ('', 'Si', 'No', 'Da valutare') then
    return false;
  end if;
  if (p_detail -> 'categorie_ricercate') ? 'Qualsiasi'
    and pg_catalog.jsonb_array_length(p_detail -> 'categorie_ricercate') <> 1 then
    return false;
  end if;
  return not exists (
    select 1 from pg_catalog.jsonb_array_elements(p_detail -> 'categorie_ricercate') as chosen(value)
    where pg_catalog.jsonb_typeof(chosen.value) <> 'string'
      or chosen.value #>> '{}' <> all (array[
        'Prime squadre',
        'Settore giovanile',
        'Qualsiasi',
        'Calcio a 11 maschile::Settore giovanile',
        'Calcio a 11 maschile::Prime squadre',
        'Calcio a 11 maschile::Qualsiasi categoria',
        'Calcio a 11 maschile::Serie C',
        'Calcio a 11 maschile::Serie D',
        'Calcio a 11 maschile::Eccellenza',
        'Calcio a 11 maschile::Promozione',
        'Calcio a 11 maschile::Prima Categoria',
        'Calcio a 11 maschile::Seconda Categoria',
        'Calcio a 11 maschile::Terza Categoria',
        'Calcio a 11 maschile::FIGC-LND — Amatori',
        'Calcio a 11 maschile::CSI — Open Eccellenza',
        'Calcio a 11 maschile::CSI — Open A',
        'Calcio a 11 maschile::CSI — Open B',
        'Calcio a 11 maschile::CSI — Master',
        'Calcio a 11 maschile::UISP — Serie A1',
        'Calcio a 11 maschile::UISP — Serie A2',
        'Calcio a 11 maschile::Altra categoria',
        'Calcio a 8 maschile::Settore giovanile',
        'Calcio a 8 maschile::Prime squadre',
        'Calcio a 8 maschile::Qualsiasi categoria',
        'Calcio a 8 maschile::Lega Calcio a 8 — Serie A',
        'Calcio a 8 maschile::Lega Calcio a 8 — Serie A2',
        'Calcio a 8 maschile::Lega Calcio a 8 — Serie B',
        'Calcio a 8 maschile::UISP',
        'Calcio a 8 maschile::AICS',
        'Calcio a 8 maschile::ASI',
        'Calcio a 8 maschile::Altra categoria',
        'Calcio a 7 maschile::Settore giovanile',
        'Calcio a 7 maschile::Prime squadre',
        'Calcio a 7 maschile::Qualsiasi categoria',
        'Calcio a 7 maschile::FIGC-LND — Amatori',
        'Calcio a 7 maschile::CSI — Open / Amatori',
        'Calcio a 7 maschile::CSI — Open Eccellenza',
        'Calcio a 7 maschile::CSI — Open A',
        'Calcio a 7 maschile::CSI — Open B',
        'Calcio a 7 maschile::CSI — Open C',
        'Calcio a 7 maschile::CSI — Open Serie A',
        'Calcio a 7 maschile::CSI — Open Serie B',
        'Calcio a 7 maschile::CSI — Open Serie C',
        'Calcio a 7 maschile::CSI — Open Golden League',
        'Calcio a 7 maschile::CSI — Open Silver League',
        'Calcio a 7 maschile::CSI — Open Bronze League',
        'Calcio a 7 maschile::CSI — Master Senior',
        'Calcio a 7 maschile::Altra categoria',
        'Calcio a 5 maschile::Settore giovanile',
        'Calcio a 5 maschile::Prime squadre',
        'Calcio a 5 maschile::Qualsiasi categoria',
        'Calcio a 5 maschile::FIGC-LND — Serie A',
        'Calcio a 5 maschile::FIGC-LND — Serie A2 Élite',
        'Calcio a 5 maschile::FIGC-LND — Serie A2',
        'Calcio a 5 maschile::FIGC-LND — Serie B',
        'Calcio a 5 maschile::FIGC-LND — Serie C1',
        'Calcio a 5 maschile::FIGC-LND — Serie C2',
        'Calcio a 5 maschile::FIGC-LND — Serie C regionale',
        'Calcio a 5 maschile::FIGC-LND — Serie D',
        'Calcio a 5 maschile::CSI — Open',
        'Calcio a 5 maschile::Altra categoria',
        'Calcio a 11 femminile::Settore giovanile',
        'Calcio a 11 femminile::Prime squadre',
        'Calcio a 11 femminile::Qualsiasi categoria',
        'Calcio a 11 femminile::FIGC — Serie A Women',
        'Calcio a 11 femminile::FIGC — Serie B',
        'Calcio a 11 femminile::FIGC-LND — Serie C',
        'Calcio a 11 femminile::FIGC-LND — Eccellenza',
        'Calcio a 11 femminile::FIGC-LND — Promozione',
        'Calcio a 11 femminile::Altra categoria',
        'Calcio a 8 femminile::Settore giovanile',
        'Calcio a 8 femminile::Prime squadre',
        'Calcio a 8 femminile::Qualsiasi categoria',
        'Calcio a 8 femminile::UISP — Top League',
        'Calcio a 8 femminile::UISP — Fun League',
        'Calcio a 8 femminile::UISP',
        'Calcio a 8 femminile::Altra categoria',
        'Calcio a 7 femminile::Settore giovanile',
        'Calcio a 7 femminile::Prime squadre',
        'Calcio a 7 femminile::Qualsiasi categoria',
        'Calcio a 7 femminile::CSI — Open',
        'Calcio a 7 femminile::CSI — Open Eccellenza',
        'Calcio a 7 femminile::CSI — Open A',
        'Calcio a 7 femminile::CSI — Open B',
        'Calcio a 7 femminile::Altra categoria',
        'Calcio a 5 femminile::Settore giovanile',
        'Calcio a 5 femminile::Prime squadre',
        'Calcio a 5 femminile::Qualsiasi categoria',
        'Calcio a 5 femminile::FIGC-LND — Serie A',
        'Calcio a 5 femminile::FIGC-LND — Serie B',
        'Calcio a 5 femminile::FIGC-LND — Serie C / Campionato regionale',
        'Calcio a 5 femminile::FIGC-LND — Serie D',
        'Calcio a 5 femminile::Altra categoria'
      ]::text[])
  );
end;
$$;

-- Invoked inside the existing definer RPC after its core has authenticated the
-- owner and atomically saved any validated profile update. An exception rolls
-- back the announcement, profile update, receipt and optional content together.
create or replace function private.finalize_announcement_fields_v1(p_result jsonb, p_payload jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_type text := p_payload ->> 'announcement_type';
  v_group text;
begin
  if p_result ->> 'status' is distinct from 'success'
    or coalesce((p_result ->> 'idempotent')::boolean, false) then
    return;
  end if;
  v_id := (p_result ->> 'announcementId')::uuid;
  if v_type in ('annuncio_squadra_cerca_giocatore', 'annuncio_squadra_cerca_partita') then
    if p_payload -> 'detail' ? 'gruppo_squadra'
      and pg_catalog.jsonb_typeof(p_payload -> 'detail' -> 'gruppo_squadra') not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'INVALID_TEAM_ANNOUNCEMENT_GROUP';
    end if;
    v_group := nullif(pg_catalog.btrim(p_payload -> 'detail' ->> 'gruppo_squadra'), '');
    if pg_catalog.char_length(v_group) > 160 then
      raise exception using errcode = '22023', message = 'INVALID_TEAM_ANNOUNCEMENT_GROUP';
    end if;
    if v_type = 'annuncio_squadra_cerca_giocatore' then
      update public.annuncio_squadra_cerca_giocatore set gruppo_squadra = v_group where uuid_annuncio = v_id;
    else
      update public.annuncio_squadra_cerca_partita set gruppo_squadra = v_group where uuid_annuncio = v_id;
    end if;
    if not found then
      raise exception using errcode = 'P0001', message = 'ANNOUNCEMENT_NOT_FOUND';
    end if;
  elsif v_type = 'annuncio_servizi_consulenze' then
    if not exists (
      select 1 from public.annuncio as announcement
      join public.profilo as profile on profile.uuid = announcement.autore_annuncio
      join public.utente as owner on owner.utente_uuid = profile.uuid_utente
      where announcement.uuid = v_id and owner.auth_user_uuid = (select auth.uid())
        and owner.registrato_il is not null
    ) then
      raise exception using errcode = '42501', message = 'PROFILE_ACCESS_DENIED';
    end if;
    if not exists (select 1 from public.localita_annuncio where uuid_annuncio = v_id)
      or exists (
        select 1 from public.localita_annuncio as location
        join public.annuncio as announcement on announcement.uuid = location.uuid_annuncio
        where location.uuid_annuncio = v_id and not exists (
          select 1 from public.localita_profilo as area
          where area.uuid_profilo = announcement.autore_annuncio
            and area.sottoprofilo = 'servizi-consulenze' and area.regione = location.regione
        )
      ) then
      raise exception using errcode = '22023', message = 'PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED';
    end if;
  end if;
end;
$$;

revoke all on function private.finalize_announcement_fields_v1(jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function private.staff_step11_detail_is_valid(jsonb) from public, anon, authenticated, service_role;
grant execute on function private.finalize_announcement_fields_v1(jsonb, jsonb) to service_role;
grant execute on function private.staff_step11_detail_is_valid(jsonb) to service_role;

do $migration$
declare
  v_definition text;
  v_marker text := '  return v_result;';
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')) into v_definition;
  if v_definition is null or pg_catalog.strpos(v_definition, v_marker) = 0 then
    raise exception 'Announcement finalizer insertion point not found';
  end if;
  -- Cover every success return, including the path with no profile update.
  -- Failed and idempotent returns are explicitly ignored by the finalizer.
  execute pg_catalog.replace(v_definition, v_marker,
    '  perform private.finalize_announcement_fields_v1(v_result, p_payload);' || chr(10) || v_marker);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')) into v_definition;
  v_marker := 'private.publish_text_array_is_valid(v_detail -> ''categorie_avversario'', true)';
  if v_definition is null or pg_catalog.strpos(v_definition, v_marker) = 0 then
    raise exception 'Opponent free-text validation insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_marker,
    'private.publish_text_array_is_valid(v_detail -> ''categorie_avversario'', true, 1, 160)');
end;
$migration$;

notify pgrst, 'reload schema';
commit;
