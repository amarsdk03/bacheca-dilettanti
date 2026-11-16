begin;
create or replace function private.distribution_public_v1(p_id uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select coalesce(a.stato_annuncio is not null and not a.privato and not a.nascosto and not a.profile_admin_hidden and a.eliminato_il is null
    and (a.tipologia_annuncio<>'annuncio_servizi_consulenze' or exists(select 1 from public.localita_annuncio l where l.uuid_annuncio=a.uuid)),false)
  from public.annuncio a where a.uuid=p_id;
$$;
commit;
