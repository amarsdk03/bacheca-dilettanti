-- Final phase, after compatible Web, backup and successful backfill verification.
begin;
set local lock_timeout = '10s';
do $$ begin
  if exists(select 1 from public.annuncio where gruppo_pubblicazione is null) then raise exception 'REGIONAL_BACKFILL_REQUIRED'; end if;
end $$;
create function private.guard_regional_announcement_identity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.gruppo_pubblicazione,new.regione_pubblicazione) is distinct from (old.gruppo_pubblicazione,old.regione_pubblicazione) and current_user<>'postgres' then
    raise exception 'REGIONAL_IDENTITY_PROTECTED' using errcode='42501';
  end if;
  return new;
end $$;
create trigger guard_regional_identity before update on public.annuncio for each row execute function private.guard_regional_announcement_identity();
create function private.assert_regional_announcement() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; a public.annuncio; count_regions integer; only_region text;
begin
  for v_id in select distinct x from unnest(array[(to_jsonb(new)->>'uuid_annuncio')::uuid,(to_jsonb(new)->>'uuid')::uuid,(to_jsonb(old)->>'uuid_annuncio')::uuid,(to_jsonb(old)->>'uuid')::uuid]) x where x is not null loop
  select * into a from public.annuncio where uuid=v_id;
  if not found then continue; end if;
  select count(distinct btrim(regione)),min(btrim(regione)) into count_regions,only_region from public.localita_annuncio where uuid_annuncio=v_id;
  if a.gruppo_pubblicazione is null or count_regions>1 or (count_regions=1 and a.regione_pubblicazione is distinct from only_region)
    or (count_regions=0 and a.regione_pubblicazione is not null)
    or not exists(select 1 from private.regional_publication_item where publication_id=a.gruppo_pubblicazione and announcement_id=a.uuid and region is not distinct from a.regione_pubblicazione) then
    raise exception 'REGIONAL_ANNOUNCEMENT_INCONSISTENT' using errcode='23514';
  end if;
  if a.tipologia_annuncio='annuncio_servizi_consulenze' and a.regione_pubblicazione is not null
    and a.stato_annuncio='pubblicato' and a.nascosto is false and a.privato is false and a.eliminato_il is null then
    if not exists(select 1 from public.restricted_profile_access r where r.profile_id=a.autore_annuncio
      and r.profile_type='servizi-consulenze' and a.regione_pubblicazione=any(r.allowed_regions)) then
      raise exception 'PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED' using errcode='23514';
    end if;
  end if;
  end loop;
  return null;
end $$;
create constraint trigger assert_regional_announcement after insert or update on public.annuncio deferrable initially deferred for each row execute function private.assert_regional_announcement();
create constraint trigger assert_regional_locations after insert or update or delete on public.localita_annuncio deferrable initially deferred for each row execute function private.assert_regional_announcement();
alter function private.assert_regional_announcement() owner to postgres;
revoke all on function private.guard_regional_announcement_identity(),private.assert_regional_announcement() from public,anon,authenticated,service_role;
-- Core entry points are only used by the trusted, preserved single writer.
revoke all on function public.publish_announcement_core_v1(uuid,jsonb,text,text),public.publish_announcement_v1(uuid,jsonb,text,text) from public,anon,authenticated,service_role;
update private.regional_publication_release set enabled=true where singleton;
notify pgrst,'reload schema';
commit;
