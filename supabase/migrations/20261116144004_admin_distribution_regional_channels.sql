-- Regional destinations supplied by the owner. Basilicata and Molise await URLs.
-- Run after 20261116130709_admin_distribution_workspace.sql.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(hashtextextended('distribution-channels', 1));

with destinations(region, display_region, channel_key) as (values
  ('Abruzzo', 'Abruzzo', '0029VbDS7vZ3GJOwJ4Yx4w3G'),
  ('Calabria', 'Calabria', '0029VbDMOuH0lwgr7a9eFZ0j'),
  ('Campania', 'Campania', '0029VbCRyUwFXUujbAouO50t'),
  ('Emilia-Romagna', 'Emilia-Romagna', '0029Vb7TErsISTkKlirDw02Q'),
  ('Friuli-Venezia Giulia', 'Friuli', '0029Vb8l6aX1noyyuOQmH108'),
  ('Lazio', 'Lazio', '0029VbDaeJcHQbS3tmQ9Bg0z'),
  ('Liguria', 'Liguria', '0029VbD5cbcG8l5EQ29a080J'),
  ('Lombardia', 'Lombardia', '0029Vb7xXeP5Ui2WFON5760T'),
  ('Marche', 'Marche', '0029VbCtuGm84OmINIlY9f1S'),
  ('Piemonte', 'Piemonte', '0029Vb841uC8V0twNplLLR2u'),
  ('Puglia', 'Puglia', '0029VbCuFgSFXUubDGDToV0o'),
  ('Sardegna', 'Sardegna', '0029VbD4FRwHVvThMRJbvc0d'),
  ('Sicilia', 'Sicilia', '0029VbDMsuhAe5VyCxlAom1A'),
  ('Toscana', 'Toscana', '0029Vb81ShY2phHJfeWbFf2u'),
  ('Trentino-Alto Adige', 'Trentino AA', '0029VbDOKq6Gk1FyjRfZDt31'),
  ('Umbria', 'Umbria', '0029Vb841qB7DAWz6S1mVh0l'),
  ('Valle d''Aosta', 'Valle D''Aosta', '0029Vb8bkPO8PgsEm1fO2309'),
  ('Veneto', 'Veneto', '0029VbCoZba17Emvj3jbUn0G')
)
insert into private.distribution_channel_v1 as current_channel(name, channel_key, url, region)
select 'Annunci ' || display_region || ' ⚽️ | Bacheca Dilettanti',
  channel_key, 'https://www.whatsapp.com/channel/' || channel_key, region
from destinations order by region
on conflict(channel_key) do update
set name = excluded.name, url = excluded.url, region = excluded.region,
  version = current_channel.version + 1, updated_at = statement_timestamp()
where (current_channel.name, current_channel.url, current_channel.region)
  is distinct from (excluded.name, excluded.url, excluded.region);

-- Existing destinations retain their IDs, publication history and archive state.
do $$ begin
  if (select count(*) from private.distribution_channel_v1 where active) > 200 then
    raise exception 'DISTRIBUTION_ACTIVE_CHANNEL_LIMIT_EXCEEDED';
  end if;
end $$;
commit;
