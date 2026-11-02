-- Read-only inventory. Run on the intended release database before maintenance.
select a.tipologia_annuncio,count(*) as existing_announcements,
  sum(case when a.tipologia_annuncio='annuncio_squadra_cerca_sponsor' then 1 else greatest(1,z.regions) end) as expected_regional_rows
from public.annuncio a cross join lateral (
  select count(distinct btrim(regione)) as regions from public.localita_annuncio where uuid_annuncio=a.uuid
) z group by a.tipologia_annuncio order by a.tipologia_annuncio;

-- Every row listed here must be resolved before conversion; no inferred regions.
select uuid_annuncio,regione,citta from public.localita_annuncio where regione is null or not(btrim(regione)=any(array[
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige','Umbria','Valle d''Aosta','Veneto']));

-- Explicitly authorized deletion scope: legacy TEST priority/payment-linked rows.
select a.uuid,a.tipologia_annuncio,a.livello_annuncio,a.stato_annuncio,a.eliminato_il,
  s.submission_id,s.requested_visibility,s.stripe_checkout_session_id,s.stripe_payment_intent_id,s.paid_at
from public.annuncio a left join private.announcement_submission s on s.announcement_id=a.uuid or s.requested_announcement_id=a.uuid
where a.livello_annuncio='prioritario' or s.requested_visibility='prioritario'
  or s.stripe_checkout_session_id is not null or s.stripe_payment_intent_id is not null or s.paid_at is not null
order by a.uuid;

-- Nullable historical creators are recovered from their receipt or author profile.
select a.uuid from public.annuncio a left join public.profilo p on p.uuid=a.autore_annuncio
left join private.announcement_submission s on s.announcement_id=a.uuid
where coalesce(a.creato_da,s.utente_id,p.uuid_utente) is null;
