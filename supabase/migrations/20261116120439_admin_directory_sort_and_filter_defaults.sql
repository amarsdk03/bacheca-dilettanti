begin;
set local lock_timeout='10s';

-- Incremental replacement: existing RPC guards and grants are preserved.
create or replace function private.admin_people_query_v1(p_query jsonb,p_kind text) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare q jsonb:=coalesce(p_query,'{}'); k text; v text; n integer; begin
  if jsonb_typeof(q)<>'object' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  for k in select jsonb_object_keys(q) loop
    if k<>all(case when p_kind='users' then array['search','offset','registration','confirmation','from','to'] else array['search','offset','type','region','verification','visibility','ownership','user','sort'] end)
      or (k<>'offset' and jsonb_typeof(q->k)<>'string') or (k='offset' and (jsonb_typeof(q->k)<>'number' or (q->>k)!~'^(0|[1-9][0-9]{0,6})$')) then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  end loop;
  n:=coalesce((q->>'offset')::integer,0);
  if n>999990 or n%30<>0 or length(coalesce(q->>'search',''))>200 or length(coalesce(q->>'region',''))>100
    or coalesce(q->>'registration','all') not in ('all','complete','incomplete') or coalesce(q->>'confirmation','all') not in ('all','confirmed','unconfirmed')
    or coalesce(q->>'verification','all') not in ('all','verified','unverified') or coalesce(q->>'visibility','all') not in ('all','public','private','obscured')
    or coalesce(q->>'sort','newest') not in ('newest','oldest','announcements','followers')
    or coalesce(q->>'ownership','all') not in ('all','linked','unlinked')
    or coalesce(q->>'type','all') not in ('all','giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators')
    or (coalesce(q->>'user','')<>'' and (q->>'user')!~'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$') then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  foreach k in array array['from','to'] loop
    v:=coalesce(q->>k,'');
    if v<>'' then begin
      if v!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or v<'0001-01-01' or to_char(v::date,'YYYY-MM-DD')<>v then raise exception 'date'; end if;
    exception when others then raise exception 'INVALID_QUERY' using errcode='22023'; end; end if;
  end loop;
  if coalesce(q->>'from','')<>'' and coalesce(q->>'to','')<>'' and q->>'from'>q->>'to' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  return q||jsonb_build_object('search',lower(btrim(coalesce(q->>'search',''))),'offset',n);
end $$;

create or replace function private.admin_profile_metrics_v1(p_id uuid,p_type text) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'publicAnnouncementCount',(select count(distinct coalesce(x.gruppo_pubblicazione,x.uuid)) from public.annuncio x
      where x.autore_annuncio=p_id and private.profile_type_for_announcement_v1(x.tipologia_annuncio)=p_type
      and x.eliminato_il is null and not x.profile_admin_hidden and x.stato_annuncio='pubblicato' and not x.nascosto and not x.privato
      and (x.tipologia_annuncio<>'annuncio_servizi_consulenze' or exists(select 1 from public.localita_annuncio l where l.uuid_annuncio=x.uuid))),
    'followerCount',(select count(*) from public.profilo_follow f where f.uuid_profilo_seguito=p_id and f.sottoprofilo_seguito=p_type));
$$;
revoke all on function private.admin_profile_metrics_v1(uuid,text) from public,anon,authenticated,service_role;

create or replace function private.admin_profile_item_v1(p_id uuid,p_type text,p_detail boolean default false) returns jsonb
language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',p.uuid::text||':'||r.profile_type,'profileId',p.uuid,'type',r.profile_type,
    'name',coalesce(nullif(btrim(coalesce(r.child->>'nome_societa',r.child->>'nome_organizzazione',r.child->>'nome_creator',concat_ws(' ',r.child->>'nome',r.child->>'cognome'))),''),'Profilo senza nome'),
    'userId',p.uuid_utente,'email',coalesce(a.email,u.indirizzo_email),'verifiedAt',s.verified_at,'adminHidden',s.admin_hidden,'version',s.version,
    'visibility',case when s.admin_hidden then 'obscured' when p.nascosto or coalesce((r.child->>'nascosto')::boolean,true) or p.uuid_utente is null then 'private' else 'public' end,
    'locations',coalesce((select jsonb_agg(jsonb_build_object('region',l.regione,'city',l.citta) order by l.id) from public.localita_profilo l where l.uuid_profilo=p.uuid and l.sottoprofilo=r.profile_type and (l.id_sottoprofilo is null or l.id_sottoprofilo=(r.child->>'id')::bigint)),'[]'))
    ||case when p_detail then jsonb_build_object('fields',coalesce((select jsonb_object_agg(key,value) from jsonb_each(r.child) where key=any(array[
      'nome','cognome','nome_societa','nome_organizzazione','nome_creator','nominativo_anonimo','anno_nascita','mese_nascita','giorno_nascita','sport_principale','tipologie_sport','presentazione',
      'disponibilita','ruoli_sport','categoria_attuale','genere','nazionalita','altezza','peso','piede_principale','squadra_attuale_nome','squadra_attuale_categoria','squadra_attuale_torneo','squadra_attuale_dal',
      'storico_carriera','figure_professionali','lista_esperienze','qualifiche_licenze','tipologia_contenuti','specializzazioni','presentazione_servizi','sede_professionista',
      'contatto_email','contatto_telefono','indirizzo','orari','costo_partenza','servizi_inclusi','info_aggiuntive','torneo_attuale_nome'])),'{}'),
      'announcementCount',(select count(*) from public.annuncio x where x.autore_annuncio=p.uuid and private.profile_type_for_announcement_v1(x.tipologia_annuncio)=r.profile_type and x.eliminato_il is null)) ||private.admin_profile_metrics_v1(p_id,p_type) else '{}'::jsonb end
  from private.admin_profile_rows_v1() r join public.profilo p on p.uuid=r.profile_id
  join public.profile_type_state s on s.profile_id=r.profile_id and s.profile_type=r.profile_type
  left join public.utente u on u.utente_uuid=p.uuid_utente left join auth.users a on a.id=u.auth_user_uuid
  where r.profile_id=p_id and r.profile_type=p_type and (u.utente_uuid is null or u.tipologia_utente='Utente');
$$;

create or replace function private.admin_people_read_v1(p_kind text,p_query jsonb,p_id uuid default null,p_type text default null) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare q jsonb; result jsonb; items jsonb; more boolean; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  q:=private.admin_people_query_v1(p_query,p_kind);
  if p_kind='profiles' then
    if p_id is not null then return private.admin_profile_item_v1(p_id,p_type,true); end if;
    with candidates as materialized (
      select p.uuid,r.profile_type,p.creato_il,
        case q->>'sort' when 'announcements' then (private.admin_profile_metrics_v1(p.uuid,r.profile_type)->>'publicAnnouncementCount')::bigint
          when 'followers' then (private.admin_profile_metrics_v1(p.uuid,r.profile_type)->>'followerCount')::bigint else 0 end score from private.admin_profile_rows_v1() r
      join public.profilo p on p.uuid=r.profile_id join public.profile_type_state s on s.profile_id=r.profile_id and s.profile_type=r.profile_type
      left join public.utente u on u.utente_uuid=p.uuid_utente left join auth.users a on a.id=u.auth_user_uuid
      where (u.utente_uuid is null or u.tipologia_utente='Utente')
        and (coalesce(q->>'type','all')='all' or r.profile_type=q->>'type')
        and (coalesce(q->>'user','')='' or p.uuid_utente::text=q->>'user')
        and (coalesce(q->>'ownership','all')='all' or (q->>'ownership'='linked')=(p.uuid_utente is not null))
        and (coalesce(q->>'verification','all')='all' or (q->>'verification'='verified')=(s.verified_at is not null))
        and (coalesce(q->>'visibility','all')='all' or q->>'visibility'=case when s.admin_hidden then 'obscured' when p.nascosto or coalesce((r.child->>'nascosto')::boolean,true) or p.uuid_utente is null then 'private' else 'public' end)
        and (coalesce(q->>'region','')='' or exists(select 1 from public.localita_profilo l where l.uuid_profilo=p.uuid and l.sottoprofilo=r.profile_type and l.regione=q->>'region'))
        and (q->>'search'='' or p.uuid::text=q->>'search' or p.uuid_utente::text=q->>'search'
          or position(q->>'search' in lower(coalesce(a.email,u.indirizzo_email,'')))>0
          or position(q->>'search' in lower(concat_ws(' ',r.child->>'nome',r.child->>'cognome',r.child->>'nome_societa',r.child->>'nome_organizzazione',r.child->>'nome_creator')))>0)
      order by case when q->>'sort'='oldest' then p.creato_il end asc, score desc,p.creato_il desc,p.uuid desc,r.profile_type limit 31 offset (q->>'offset')::integer
    ), projected as (select row_number() over(order by case when q->>'sort'='oldest' then creato_il end asc,score desc,creato_il desc,uuid desc,profile_type) n,private.admin_profile_item_v1(uuid,profile_type) item from candidates)
    select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
  else
    with candidates as materialized (
      select u.*,a.email auth_email,a.email_confirmed_at from public.utente u left join auth.users a on a.id=u.auth_user_uuid
      where u.tipologia_utente='Utente' and (p_id is null or u.utente_uuid=p_id) and (p_id is not null or (
        (coalesce(q->>'registration','all')='all' or (q->>'registration'='complete')=(u.registrato_il is not null))
        and (coalesce(q->>'confirmation','all')='all' or (q->>'confirmation'='confirmed')=(a.email_confirmed_at is not null))
        and (coalesce(q->>'from','')='' or u.creato_il>=((q->>'from')::date::timestamp at time zone 'Europe/Rome'))
        and (coalesce(q->>'to','')='' or u.creato_il<(((q->>'to')::date+1)::timestamp at time zone 'Europe/Rome'))
        and (q->>'search'='' or u.utente_uuid::text=q->>'search' or u.auth_user_uuid::text=q->>'search'
          or position(q->>'search' in lower(coalesce(a.email,u.indirizzo_email,'')))>0 or position(q->>'search' in coalesce(u.num_telefono,''))>0)))
      order by u.creato_il desc,u.utente_uuid desc limit 31 offset case when p_id is not null then 0 else (q->>'offset')::integer end
    ), projected as (
      select row_number() over(order by creato_il desc,utente_uuid desc) n,jsonb_build_object('id',utente_uuid,'email',coalesce(auth_email,indirizzo_email),
        'createdAt',creato_il,'registeredAt',registrato_il,'confirmedAt',email_confirmed_at,
        'profileCount',(select count(*) from private.admin_profile_rows_v1() r join public.profilo p on p.uuid=r.profile_id where p.uuid_utente=c.utente_uuid))
        ||case when p_id is not null then jsonb_build_object('authId',auth_user_uuid,'phone',num_telefono,'newsletter',consenso_newsletter,'newsletterUpdatedAt',consenso_newsletter_aggiornato_il,
          'legalAcceptedAt',informative_accettate_il,'termsVersion',versione_termini,'privacyVersion',versione_privacy,'cookieVersion',versione_cookie_policy,
          'profiles',coalesce((select jsonb_agg(private.admin_profile_item_v1(r.profile_id,r.profile_type) order by r.profile_type) from private.admin_profile_rows_v1() r join public.profilo p on p.uuid=r.profile_id where p.uuid_utente=c.utente_uuid),'[]')) else '{}'::jsonb end item
      from candidates c
    ) select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
    if p_id is not null then return items->0; end if;
  end if;
  return jsonb_build_object('items',items,'hasMore',more);
end $$;

create or replace function private.admin_community_query_v1(p_query jsonb,p_kind text) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare q jsonb:=coalesce(p_query,'{}'); k text; v text; n integer; begin
  if jsonb_typeof(q) is distinct from 'object' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  for k in select jsonb_object_keys(q) loop
    if k not in ('search','status','target','from','to','offset','pending') or
      (k='pending' and p_kind<>'invitations') or (k in ('status','target','from','to') and p_kind<>'reports') then
      raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    if k='offset' then
      if jsonb_typeof(q->k)<>'number' or (q->>k)!~'^(0|[1-9][0-9]{0,6})$' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    elsif k='pending' then
      if jsonb_typeof(q->k)<>'boolean' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    elsif jsonb_typeof(q->k)<>'string' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  end loop;
  n:=coalesce((q->>'offset')::integer,0);
  if n>1000000 or char_length(coalesce(q->>'search',''))>200 or
    coalesce(q->>'status','all') not in ('active','all','open','working','resolved','archived') or
    coalesce(q->>'target','all') not in ('all','annuncio','profilo') then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  foreach k in array array['from','to'] loop
    v:=coalesce(q->>k,'');
    if v<>'' then
      begin
        if v!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or v<'0001-01-01' or to_char(v::date,'YYYY-MM-DD')<>v then raise exception 'date'; end if;
      exception when others then raise exception 'INVALID_QUERY' using errcode='22023'; end;
    end if;
  end loop;
  if coalesce(q->>'from','')<>'' and coalesce(q->>'to','')<>'' and q->>'from'>q->>'to' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  return q||jsonb_build_object('search',lower(btrim(coalesce(q->>'search',''))),'offset',n);
end $$;

create or replace function private.admin_reports_v1(p_query jsonb,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q jsonb; items jsonb; more boolean; result jsonb; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  q:=private.admin_community_query_v1(p_query,'reports');
  with candidates as materialized (
    select s.*,u.indirizzo_email reporter_email,editor.indirizzo_email editor_email,
      case when s.uuid_annuncio is not null then 'annuncio' else 'profilo' end target_kind,
      coalesce(s.uuid_annuncio,s.uuid_profilo) target_id,
      case when s.uuid_annuncio is not null then coalesce(nullif(btrim(a.titolo_annuncio),''),'Annuncio senza titolo') else 'Profilo' end target_title
    from private.segnalazioni s left join public.annuncio a on a.uuid=s.uuid_annuncio
      left join public.utente u on u.utente_uuid=s.uuid_utente_segnalatore
      left join public.utente editor on editor.utente_uuid=s.aggiornata_da
    where (p_id is null or s.admin_uuid=p_id) and (p_id is not null or (
      (coalesce(q->>'status','all')='all' or s.stato=q->>'status' or (coalesce(q->>'status','all')='active' and s.stato in ('open','working')))
      and (coalesce(q->>'target','all')='all' or (q->>'target'='annuncio' and s.uuid_annuncio is not null) or (q->>'target'='profilo' and s.uuid_profilo is not null))
      and (coalesce(q->>'from','')='' or s.creato_il >= ((q->>'from')::date::timestamp at time zone 'Europe/Rome'))
      and (coalesce(q->>'to','')='' or s.creato_il < (((q->>'to')::date+1)::timestamp at time zone 'Europe/Rome'))
      and (q->>'search'='' or lower(coalesce(s.uuid_annuncio,s.uuid_profilo)::text)=q->>'search' or s.admin_uuid::text=q->>'search'
        or position(q->>'search' in lower(coalesce(u.indirizzo_email,'')))>0)))
    order by s.creato_il desc,s.admin_uuid desc limit 31 offset case when p_id is null then (q->>'offset')::integer else 0 end
  ), projected as (
    select row_number() over(order by creato_il desc,admin_uuid desc) n,jsonb_build_object(
      'id',admin_uuid,'number',id::text,'createdAt',creato_il,'targetKind',target_kind,'targetId',target_id,'title',target_title,
      'reporterEmail',reporter_email,'reason',motivazione,'status',stato,'version',versione,
      'note',case when p_id is not null then nota_interna else '' end,'updatedAt',aggiornata_il,'updatedBy',coalesce(editor_email,aggiornata_da::text),
      'profileTypes',case when p_id is not null and uuid_profilo is not null then (select coalesce(jsonb_agg(t),'[]') from (
        select 'giocatore' t where exists(select 1 from public.profilo_giocatore where uuid_profilo=candidates.uuid_profilo)
        union all select 'squadra' where exists(select 1 from public.profilo_squadra where uuid_profilo=candidates.uuid_profilo)
        union all select 'staff-sportivo' where exists(select 1 from public.profilo_staff_sportivo where uuid_profilo=candidates.uuid_profilo)
        union all select 'arbitro' where exists(select 1 from public.profilo_arbitro where uuid_profilo=candidates.uuid_profilo)
        union all select 'torneo-evento' where exists(select 1 from public.profilo_torneo_evento where uuid_profilo=candidates.uuid_profilo)
        union all select 'campi-impianti-sportivi' where exists(select 1 from public.profilo_campi_impianti where uuid_profilo=candidates.uuid_profilo)
        union all select 'servizi-consulenze' where exists(select 1 from public.profilo_servizi_consulenze where uuid_profilo=candidates.uuid_profilo)
        union all select 'creators' where exists(select 1 from public.profilo_creator where uuid_profilo=candidates.uuid_profilo)
      ) kinds) else '[]'::jsonb end) item from candidates
  ) select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
  if p_id is not null then return items->0; end if;
  return jsonb_build_object('items',items,'hasMore',more);
end $$;

commit;
