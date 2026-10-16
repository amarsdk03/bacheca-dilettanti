-- Apply before deploying the new profile fields. No browser write access is added.
begin;
set local lock_timeout = '10s';

alter table public.profilo_squadra
  add column torneo_attuale_id bigint references public.profilo_torneo_evento(id) on delete set null,
  add column torneo_attuale_nome text;
alter table public.profilo_giocatore
  add column squadra_attuale_id bigint references public.profilo_squadra(id) on delete set null,
  add column squadra_attuale_profilo_id uuid,
  add column squadra_attuale_nome text,
  add column squadra_attuale_categoria text,
  add column squadra_attuale_torneo text,
  add column squadra_attuale_dal text check (squadra_attuale_dal is null or squadra_attuale_dal ~ '^(19|20)[0-9]{2}$');
create index profilo_squadra_torneo_attuale_idx on public.profilo_squadra(torneo_attuale_id) where torneo_attuale_id is not null;
create index profilo_giocatore_squadra_attuale_idx on public.profilo_giocatore(squadra_attuale_id) where squadra_attuale_id is not null;

alter function private.team_category_is_valid_v1(text) rename to team_category_before_tournaments_v1;
create function private.team_category_is_valid_v1(p_value text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select private.team_category_before_tournaments_v1(p_value)
    or coalesce(p_value ~ '^Calcio a (11|8|7|5) (maschile|femminile)::Tornei$', false);
$$;

create function private.current_category_label_v1(p_category text, p_tournament text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case when p_category like '%::Tornei' and nullif(btrim(p_tournament),'') is not null then btrim(p_tournament)
    else replace(coalesce(p_category,''),'::',' — ') end;
$$;

-- This helper runs after the existing ownership-checked writer, in its transaction.
create function private.save_current_team_fields_v1(p_profile uuid, p_type text, p_draft jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_old public.profilo_giocatore; v_team record; v_tournament record;
  v_id bigint; v_name text; v_category text; v_tournament_name text; v_from text; v_history jsonb; v_archived jsonb;
begin
  if p_type = 'squadra' then
    if not (p_draft ? 'torneo_attuale_id' or p_draft ? 'torneo_attuale_nome') then return; end if;
    v_category:=p_draft->>'categoria_attuale';
    if not private.team_category_is_valid_v1(v_category) then raise exception 'TEAM_FIRST_TEAM_CATEGORY_REQUIRED' using errcode='22023'; end if;
    v_name := nullif(btrim(p_draft->>'torneo_attuale_nome'),'');
    v_id := nullif(p_draft->>'torneo_attuale_id','')::bigint;
    if (p_draft->>'categoria_attuale') not like '%::Tornei' then v_name := null; v_id := null; end if;
    if v_id is not null then
      select t.nome_organizzazione into v_tournament from public.profilo_torneo_evento t
        join public.profilo p on p.uuid=t.uuid_profilo
        where t.id=v_id and not t.nascosto and not p.nascosto and p.uuid_utente is not null for share of t,p;
      if not found then raise exception 'CURRENT_TOURNAMENT_UNAVAILABLE' using errcode='22023'; end if;
      v_name := v_tournament.nome_organizzazione;
    end if;
    if char_length(v_name)>160 then raise exception 'INVALID_CURRENT_TOURNAMENT' using errcode='22023'; end if;
    update public.profilo_squadra set categoria_attuale=v_category, torneo_attuale_id=v_id, torneo_attuale_nome=v_name where uuid_profilo=p_profile;
  elsif p_type = 'giocatore' then
    if not (p_draft ? 'squadra_attuale_nome' or p_draft ? 'squadra_attuale_id') then return; end if;
    select * into v_old from public.profilo_giocatore where uuid_profilo=p_profile for update;
    if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
    v_id := nullif(p_draft->>'squadra_attuale_id','')::bigint;
    v_name := nullif(btrim(p_draft->>'squadra_attuale_nome'),'');
    v_category := nullif(btrim(p_draft->>'categoria_attuale'),'');
    v_from := nullif(btrim(p_draft->>'squadra_attuale_dal'),'');
    if v_old.disponibilita = 'svincolato' then v_id:=null; v_name:=null; v_category:=null; v_from:=null; end if;
    if v_id is not null then
      select t.uuid_profilo, t.nome_societa, t.nominativo_anonimo, t.categoria_attuale, t.torneo_attuale_nome into v_team
        from public.profilo_squadra t join public.profilo p on p.uuid=t.uuid_profilo
        where t.id=v_id and not t.nascosto and not p.nascosto and p.uuid_utente is not null for share of t,p;
      if not found then raise exception 'CURRENT_TEAM_UNAVAILABLE' using errcode='22023'; end if;
      v_name:=private.public_profile_name_v1('squadra',v_team.nominativo_anonimo,v_team.nome_societa);
      v_category:=v_team.categoria_attuale; v_tournament_name:=v_team.torneo_attuale_nome;
    elsif v_name is not distinct from v_old.squadra_attuale_nome and v_category is not distinct from v_old.squadra_attuale_categoria then
      v_tournament_name:=v_old.squadra_attuale_torneo;
    end if;
    if char_length(v_name)>160 or (v_from is not null and (v_from !~ '^(19|20)[0-9]{2}$' or v_from::int > extract(year from now() at time zone 'Europe/Rome'))) then
      raise exception 'INVALID_CURRENT_TEAM' using errcode='22023';
    end if;
    v_history:=coalesce(v_old.storico_carriera,'[]'::jsonb);
    if v_old.squadra_attuale_nome is not null and (
      v_name is distinct from v_old.squadra_attuale_nome or v_id is distinct from v_old.squadra_attuale_id
    ) then
      v_archived:=jsonb_build_object('id',gen_random_uuid()::text,'titolo',v_old.squadra_attuale_nome,
        'ente',private.current_category_label_v1(v_old.squadra_attuale_categoria,v_old.squadra_attuale_torneo),
        'periodoDa',coalesce(v_old.squadra_attuale_dal,''),'periodoA',extract(year from now() at time zone 'Europe/Rome')::int::text,
        'descrizione','','stato','conseguito','squadraProfiloId',v_old.squadra_attuale_profilo_id,'squadraIstanzaId',v_old.squadra_attuale_id);
      v_history:=jsonb_build_array(v_archived)||v_history;
    end if;
    -- Adopt an identical pre-existing open experience rather than showing it twice.
    if v_name is not null then
      if v_from is null then
        select nullif(e->>'periodoDa','') into v_from from jsonb_array_elements(v_history) e
          where e->>'periodoA'='oggi' and e->>'titolo'=v_name
          and e->>'ente'=private.current_category_label_v1(v_category,v_tournament_name) limit 1;
      end if;
      select coalesce(jsonb_agg(e),'[]'::jsonb) into v_history from jsonb_array_elements(v_history) e
        where not (coalesce(e->>'periodoA','')='oggi' and coalesce(e->>'titolo','')=v_name
          and coalesce(e->>'ente','')=private.current_category_label_v1(v_category,v_tournament_name));
    end if;
    update public.profilo_giocatore set squadra_attuale_id=v_id,
      squadra_attuale_profilo_id=case when v_id is not null then v_team.uuid_profilo else null end,
      squadra_attuale_nome=v_name, squadra_attuale_categoria=v_category, squadra_attuale_torneo=v_tournament_name,
      squadra_attuale_dal=case when v_name is not null then v_from else null end,
      categoria_attuale=v_category, storico_carriera=v_history where uuid_profilo=p_profile;
  end if;
end;
$$;

-- Refresh dependent snapshots before update/delete, including manual-name fallbacks.
create function private.sync_current_team_dependents_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_name text; v_hidden boolean;
begin
  if tg_table_name='profilo_squadra' then
    if tg_op='DELETE' then
      update public.profilo_giocatore set squadra_attuale_id=null, squadra_attuale_profilo_id=null where squadra_attuale_id=old.id;
      return old;
    end if;
    v_name:=private.public_profile_name_v1('squadra',new.nominativo_anonimo,new.nome_societa);
    v_hidden:=new.nascosto;
    update public.profilo_giocatore set squadra_attuale_nome=v_name,
      squadra_attuale_categoria=new.categoria_attuale, categoria_attuale=new.categoria_attuale,
      squadra_attuale_torneo=new.torneo_attuale_nome,
      squadra_attuale_id=case when v_hidden then null else new.id end,
      squadra_attuale_profilo_id=case when v_hidden then null else new.uuid_profilo end
      where squadra_attuale_id=old.id;
  else
    if tg_op='DELETE' then
      update public.profilo_squadra set torneo_attuale_id=null where torneo_attuale_id=old.id;
      return old;
    end if;
    update public.profilo_squadra set torneo_attuale_nome=new.nome_organizzazione,
      torneo_attuale_id=case when new.nascosto then null else new.id end where torneo_attuale_id=old.id;
  end if;
  return new;
end;
$$;
create trigger sync_current_team_dependents before update of nome_societa,nominativo_anonimo,categoria_attuale,torneo_attuale_nome,nascosto or delete
  on public.profilo_squadra for each row execute function private.sync_current_team_dependents_v1();
create trigger sync_current_tournament_dependents before update of nome_organizzazione,nascosto or delete
  on public.profilo_torneo_evento for each row execute function private.sync_current_team_dependents_v1();

create function private.detach_hidden_base_current_teams_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.nascosto and not old.nascosto then
    update public.profilo_giocatore set squadra_attuale_id=null,squadra_attuale_profilo_id=null where squadra_attuale_id in
      (select id from public.profilo_squadra where uuid_profilo=new.uuid);
    update public.profilo_squadra set torneo_attuale_id=null where torneo_attuale_id in
      (select id from public.profilo_torneo_evento where uuid_profilo=new.uuid);
  end if;
  return new;
end;
$$;
create trigger detach_hidden_base_current_teams before update of nascosto on public.profilo
  for each row execute function private.detach_hidden_base_current_teams_v1();

-- Every new instance starts with its own explicit avatar choice.
create function private.clean_subprofile_instance_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_type text:=tg_argv[0];
begin
  if tg_op='DELETE' then
    delete from public.localita_profilo where uuid_profilo=old.uuid_profilo and sottoprofilo=v_type;
    delete from public.link_social_profilo where uuid_profilo=old.uuid_profilo and sottoprofilo=v_type;
    delete from public.media_profilo where uuid_profilo=old.uuid_profilo and
      (sottoprofilo=v_type or (v_type='giocatore' and formato_media='video_highlights'));
    return old;
  end if;
  insert into public.media_profilo(uuid_profilo,sottoprofilo,formato_media,link_media)
    values(new.uuid_profilo,v_type,'foto_profilo','') on conflict do nothing;
  return new;
end;
$$;

create function private.active_subprofile_instance_v1(p_profile uuid,p_type text)
returns bigint language sql stable security invoker set search_path = '' as $$
  select id from (
    select id,'giocatore' t,uuid_profilo from public.profilo_giocatore union all
    select id,'squadra',uuid_profilo from public.profilo_squadra union all
    select id,'staff-sportivo',uuid_profilo from public.profilo_staff_sportivo union all
    select id,'arbitro',uuid_profilo from public.profilo_arbitro union all
    select id,'torneo-evento',uuid_profilo from public.profilo_torneo_evento union all
    select id,'campi-impianti-sportivi',uuid_profilo from public.profilo_campi_impianti union all
    select id,'servizi-consulenze',uuid_profilo from public.profilo_servizi_consulenze union all
    select id,'creators',uuid_profilo from public.profilo_creator
  ) p where p.uuid_profilo=p_profile and p.t=p_type;
$$;
delete from public.localita_profilo r where r.sottoprofilo is not null and
  (private.active_subprofile_instance_v1(r.uuid_profilo,r.sottoprofilo) is null or
   (r.id_sottoprofilo is not null and r.id_sottoprofilo is distinct from private.active_subprofile_instance_v1(r.uuid_profilo,r.sottoprofilo)));
delete from public.link_social_profilo r where r.sottoprofilo is not null and
  (private.active_subprofile_instance_v1(r.uuid_profilo,r.sottoprofilo) is null or
   (r.id_sottoprofilo is not null and r.id_sottoprofilo is distinct from private.active_subprofile_instance_v1(r.uuid_profilo,r.sottoprofilo)));
delete from public.media_profilo r where (r.sottoprofilo is not null and private.active_subprofile_instance_v1(r.uuid_profilo,r.sottoprofilo) is null)
  or (r.formato_media='video_highlights' and private.active_subprofile_instance_v1(r.uuid_profilo,'giocatore') is null);

do $triggers$
declare v_pair text[];
begin
  foreach v_pair slice 1 in array array[
    ['profilo_giocatore','giocatore'],['profilo_squadra','squadra'],['profilo_staff_sportivo','staff-sportivo'],
    ['profilo_arbitro','arbitro'],['profilo_torneo_evento','torneo-evento'],['profilo_campi_impianti','campi-impianti-sportivi'],
    ['profilo_servizi_consulenze','servizi-consulenze'],['profilo_creator','creators']
  ] loop
    execute format('create trigger clean_subprofile_instance before delete on public.%I for each row execute function private.clean_subprofile_instance_v1(%L)',v_pair[1],v_pair[2]);
    execute format('create trigger initialize_subprofile_avatar after insert on public.%I for each row execute function private.clean_subprofile_instance_v1(%L)',v_pair[1],v_pair[2]);
  end loop;
end;
$triggers$;

create function private.finalize_current_team_fields_v1(p_result jsonb,p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_profile uuid; v_draft jsonb;
begin
  if p_result->>'status' is distinct from 'success' or coalesce((p_result->>'idempotent')::boolean,false) then return; end if;
  v_draft:=case when jsonb_typeof(p_payload->'profile_draft')='object' then p_payload->'profile_draft' else p_payload->'profile_update'->'draft' end;
  if jsonb_typeof(v_draft) is distinct from 'object' then return; end if;
  select autore_annuncio into v_profile from public.annuncio where uuid=(p_result->>'announcementId')::uuid;
  perform private.save_current_team_fields_v1(v_profile,p_payload->>'profile_type',v_draft);
end;
$$;

create function private.finalize_registration_current_teams_v1(p_user uuid,p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_profile uuid; v_entry jsonb;
begin
  if p_payload is null then return; end if;
  select p.uuid into v_profile from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
    where u.auth_user_uuid=p_user and u.registrato_il is not null;
  if v_profile is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  for v_entry in select value from jsonb_array_elements(p_payload->'profiles')
    order by case value->>'type' when 'squadra' then 0 else 1 end loop
    perform private.save_current_team_fields_v1(v_profile,v_entry->>'type',v_entry->'draft');
  end loop;
end;
$$;

do $writers$
declare v_def text; v_anchor text;
begin
  select pg_get_functiondef('private.save_owned_subprofile_internal_v1(uuid,text,jsonb,jsonb)'::regprocedure) into v_def;
  v_anchor:='  return v_result;';
  if strpos(v_def,v_anchor)=0 then raise exception 'Owned writer insertion point missing'; end if;
  execute replace(v_def,v_anchor,'  perform private.save_current_team_fields_v1(v_profile_id,p_profile_type,p_draft);'||chr(10)||v_anchor);
  select pg_get_functiondef('public.publish_announcement_v2(uuid,jsonb,text,text,text)'::regprocedure) into v_def;
  if strpos(v_def,v_anchor)=0 then raise exception 'Publication insertion point missing'; end if;
  execute replace(v_def,v_anchor,'  perform private.finalize_current_team_fields_v1(v_result,p_payload);'||chr(10)||v_anchor);
  select pg_get_functiondef('private.provision_auth_user(uuid,text,jsonb)'::regprocedure) into v_def;
  v_anchor:='perform private.provision_auth_user_with_consents_v1(p_user_id, p_email, p_payload);';
  if strpos(v_def,v_anchor)=0 then raise exception 'Registration insertion point missing'; end if;
  execute replace(v_def,v_anchor,v_anchor||chr(10)||'  perform private.finalize_registration_current_teams_v1(p_user_id,p_payload);');
end;
$writers$;

revoke all on function private.team_category_is_valid_v1(text),private.current_category_label_v1(text,text),
  private.save_current_team_fields_v1(uuid,text,jsonb),private.sync_current_team_dependents_v1(),
  private.detach_hidden_base_current_teams_v1(),private.clean_subprofile_instance_v1(),
  private.active_subprofile_instance_v1(uuid,text),private.finalize_current_team_fields_v1(jsonb,jsonb),
  private.finalize_registration_current_teams_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.team_category_is_valid_v1(text),private.current_category_label_v1(text,text),
  private.save_current_team_fields_v1(uuid,text,jsonb),private.sync_current_team_dependents_v1(),
  private.detach_hidden_base_current_teams_v1(),private.clean_subprofile_instance_v1(),
  private.active_subprofile_instance_v1(uuid,text),private.finalize_current_team_fields_v1(jsonb,jsonb),
  private.finalize_registration_current_teams_v1(uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
