-- Avoid reading an unassigned RECORD when a player has no selected current team.
begin;

create or replace function private.save_current_team_fields_v1(p_profile uuid, p_type text, p_draft jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_old public.profilo_giocatore;
  v_tournament record;
  v_team_profile_id uuid;
  v_team_name text;
  v_team_is_anonymous boolean;
  v_team_category text;
  v_team_tournament_name text;
  v_id bigint;
  v_name text;
  v_category text;
  v_tournament_name text;
  v_from text;
  v_history jsonb;
  v_archived jsonb;
begin
  if p_type = 'squadra' then
    if not (p_draft ? 'torneo_attuale_id' or p_draft ? 'torneo_attuale_nome') then return; end if;
    v_category := p_draft->>'categoria_attuale';
    if not private.team_category_is_valid_v1(v_category) then
      raise exception 'TEAM_FIRST_TEAM_CATEGORY_REQUIRED' using errcode = '22023';
    end if;
    v_name := nullif(btrim(p_draft->>'torneo_attuale_nome'), '');
    v_id := nullif(p_draft->>'torneo_attuale_id', '')::bigint;
    if (p_draft->>'categoria_attuale') not like '%::Tornei' then
      v_name := null;
      v_id := null;
    end if;
    if v_id is not null then
      select t.nome_organizzazione into v_tournament
      from public.profilo_torneo_evento t
      join public.profilo p on p.uuid = t.uuid_profilo
      where t.id = v_id and not t.nascosto and not p.nascosto and p.uuid_utente is not null
      for share of t, p;
      if not found then raise exception 'CURRENT_TOURNAMENT_UNAVAILABLE' using errcode = '22023'; end if;
      v_name := v_tournament.nome_organizzazione;
    end if;
    if char_length(v_name) > 160 then
      raise exception 'INVALID_CURRENT_TOURNAMENT' using errcode = '22023';
    end if;
    update public.profilo_squadra
      set categoria_attuale = v_category, torneo_attuale_id = v_id, torneo_attuale_nome = v_name
      where uuid_profilo = p_profile;
  elsif p_type = 'giocatore' then
    if not (p_draft ? 'squadra_attuale_nome' or p_draft ? 'squadra_attuale_id') then return; end if;
    select * into v_old from public.profilo_giocatore where uuid_profilo = p_profile for update;
    if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

    v_id := nullif(p_draft->>'squadra_attuale_id', '')::bigint;
    v_name := nullif(btrim(p_draft->>'squadra_attuale_nome'), '');
    v_category := nullif(btrim(p_draft->>'categoria_attuale'), '');
    v_from := nullif(btrim(p_draft->>'squadra_attuale_dal'), '');
    if v_old.disponibilita = 'svincolato' then
      v_id := null;
      v_name := null;
      v_category := null;
      v_from := null;
    end if;

    if v_id is not null then
      select t.uuid_profilo, t.nome_societa, t.nominativo_anonimo, t.categoria_attuale, t.torneo_attuale_nome
        into v_team_profile_id, v_team_name, v_team_is_anonymous, v_team_category, v_team_tournament_name
      from public.profilo_squadra t
      join public.profilo p on p.uuid = t.uuid_profilo
      where t.id = v_id and not t.nascosto and not p.nascosto and p.uuid_utente is not null
      for share of t, p;
      if not found then raise exception 'CURRENT_TEAM_UNAVAILABLE' using errcode = '22023'; end if;

      v_name := private.public_profile_name_v1('squadra', v_team_is_anonymous, v_team_name);
      v_category := v_team_category;
      v_tournament_name := v_team_tournament_name;
    elsif v_name is not distinct from v_old.squadra_attuale_nome
      and v_category is not distinct from v_old.squadra_attuale_categoria then
      v_tournament_name := v_old.squadra_attuale_torneo;
    end if;

    if char_length(v_name) > 160 or (v_from is not null and (
      v_from !~ '^(19|20)[0-9]{2}$'
      or v_from::int > extract(year from now() at time zone 'Europe/Rome')
    )) then
      raise exception 'INVALID_CURRENT_TEAM' using errcode = '22023';
    end if;

    v_history := coalesce(v_old.storico_carriera, '[]'::jsonb);
    if v_old.squadra_attuale_nome is not null and (
      v_name is distinct from v_old.squadra_attuale_nome or v_id is distinct from v_old.squadra_attuale_id
    ) then
      v_archived := jsonb_build_object(
        'id', gen_random_uuid()::text,
        'titolo', v_old.squadra_attuale_nome,
        'ente', private.current_category_label_v1(v_old.squadra_attuale_categoria, v_old.squadra_attuale_torneo),
        'periodoDa', coalesce(v_old.squadra_attuale_dal, ''),
        'periodoA', extract(year from now() at time zone 'Europe/Rome')::int::text,
        'descrizione', '',
        'stato', 'conseguito',
        'squadraProfiloId', v_old.squadra_attuale_profilo_id,
        'squadraIstanzaId', v_old.squadra_attuale_id
      );
      v_history := jsonb_build_array(v_archived) || v_history;
    end if;

    -- Adopt an identical pre-existing open experience rather than showing it twice.
    if v_name is not null then
      if v_from is null then
        select nullif(e->>'periodoDa', '') into v_from
        from jsonb_array_elements(v_history) e
        where e->>'periodoA' = 'oggi' and e->>'titolo' = v_name
          and e->>'ente' = private.current_category_label_v1(v_category, v_tournament_name)
        limit 1;
      end if;
      select coalesce(jsonb_agg(e), '[]'::jsonb) into v_history
      from jsonb_array_elements(v_history) e
      where not (
        coalesce(e->>'periodoA', '') = 'oggi'
        and coalesce(e->>'titolo', '') = v_name
        and coalesce(e->>'ente', '') = private.current_category_label_v1(v_category, v_tournament_name)
      );
    end if;

    update public.profilo_giocatore set
      squadra_attuale_id = v_id,
      squadra_attuale_profilo_id = v_team_profile_id,
      squadra_attuale_nome = v_name,
      squadra_attuale_categoria = v_category,
      squadra_attuale_torneo = v_tournament_name,
      squadra_attuale_dal = case when v_name is not null then v_from else null end,
      categoria_attuale = v_category,
      storico_carriera = v_history
    where uuid_profilo = p_profile;
  end if;
end;
$$;

commit;
