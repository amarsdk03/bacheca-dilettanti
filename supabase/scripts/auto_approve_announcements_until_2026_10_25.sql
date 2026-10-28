-- Approvazione automatica temporanea dei NUOVI annunci.
-- Eseguire una volta nel SQL Editor Supabase con il ruolo postgres.
-- Lo script e' rieseguibile e non approva gli annunci gia' in coda.
-- Attivo fino al 25 ottobre 2026 incluso, fuso Europe/Rome:
-- dalle 00:00 del 26 ottobre (25 ottobre alle 23:00 UTC) non approva piu'.
-- Gli annunci approvati rimangono pubblicati dopo la scadenza.
-- Non richiede cron: dopo la scadenza il trigger resta installato ma inerte.

begin;
set local lock_timeout = '10s';

create or replace function private.auto_approve_new_announcement_until_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff constant timestamptz := timestamptz '2026-10-26 00:00:00 Europe/Rome';
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  -- Usare l'ora effettiva: una transazione iniziata prima della scadenza
  -- non deve approvare se viene completata dopo la scadenza.
  if v_now >= v_cutoff then
    return null;
  end if;

  -- Leggere lo stato corrente, non NEW: il trigger differito riceve la riga
  -- originale, ma il wizard puo' averla aggiornata nella stessa transazione.
  -- Il normale trigger del ciclo di vita continua a verificare i pagamenti.
  update public.annuncio
  set stato_annuncio = 'pubblicato',
      info_stato_annuncio = 'Annuncio approvato automaticamente e pubblicato.',
      ultima_modifica_il = v_now
  where uuid = new.uuid
    and stato_annuncio = 'in_revisione';

  return null;
end;
$$;

-- Il trigger differito puo' essere eseguito dopo il ritorno delle RPC,
-- con il ruolo del chiamante. SECURITY DEFINER permette l'UPDATE interno;
-- la funzione privata non deve essere invocabile direttamente dai client.
revoke all on function private.auto_approve_new_announcement_until_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists auto_approve_new_announcement_until_v1 on public.annuncio;
create constraint trigger auto_approve_new_announcement_until_v1
  after insert on public.annuncio
  deferrable initially deferred
  for each row
  execute function private.auto_approve_new_announcement_until_v1();

comment on function private.auto_approve_new_announcement_until_v1() is
  'Approva solo i nuovi annunci ancora in revisione a fine transazione, prima del 26 ottobre 2026 ore 00:00 Europe/Rome. Scadenza automatica senza cron.';

commit;

-- Verifica dell'installazione (eseguire separatamente):
-- select pg_catalog.pg_get_triggerdef(oid)
-- from pg_catalog.pg_trigger
-- where tgrelid = 'public.annuncio'::regclass
--   and tgname = 'auto_approve_new_announcement_until_v1';
--
-- Verifica della finestra temporale (eseguire separatamente):
-- select pg_catalog.clock_timestamp() <
--   timestamptz '2026-10-26 00:00:00 Europe/Rome' as finestra_attiva;
--
-- Disattivazione anticipata o pulizia dopo la scadenza
-- (eseguire separatamente; non modifica gli annunci gia' approvati):
-- begin;
-- set local lock_timeout = '10s';
-- drop trigger if exists auto_approve_new_announcement_until_v1 on public.annuncio;
-- drop function if exists private.auto_approve_new_announcement_until_v1();
-- commit;
