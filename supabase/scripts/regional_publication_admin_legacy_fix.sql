-- Apply after 20261102145910 and before retrying the backfill.
begin;
set local lock_timeout = '10s';

create or replace function private.reject_admin_personal_owner_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_kind text;
begin
  if tg_table_name = 'profilo' then v_owner := new.uuid_utente;
  else v_owner := new.creato_da;
  end if;
  select u.tipologia_utente into v_kind from public.utente u
    where u.utente_uuid = v_owner for share;
  if v_kind collate "C" = 'Admin' then
    -- Only a clone of a pre-existing member in the protected backfill transaction.
    if tg_table_name = 'annuncio' and tg_op = 'INSERT' then
      if exists(select 1 from private.regional_publication_context c
        where c.transaction_id=txid_current() and c.mode='backfill')
        and exists(select 1 from private.regional_publication_item i
        join public.annuncio original on original.uuid=i.announcement_id
        where i.publication_id=new.gruppo_pubblicazione
          and original.gruppo_pubblicazione=new.gruppo_pubblicazione
          and original.uuid<>new.uuid and original.creato_da=new.creato_da
          and original.autore_annuncio is not distinct from new.autore_annuncio
          and original.tipologia_annuncio is not distinct from new.tipologia_annuncio) then
        return new;
      end if;
    end if;
    raise exception using errcode = '42501', message = 'ADMIN_PERSONAL_ACCOUNT_FORBIDDEN';
  end if;
  return new;
end $$;
alter function private.reject_admin_personal_owner_v1() owner to postgres;
revoke all on function private.reject_admin_personal_owner_v1() from public,anon,authenticated,service_role;
commit;
