# Revisione del contratto `/pubblica-annuncio` / Supabase

Data della revisione: 24 agosto 2026

Fonti confrontate:

- i tipi generati in [`src/server/supabase.ts`](../src/server/supabase.ts);
- i form profilo e annuncio;
- la validazione server;
- le migrazioni in [`supabase/migrations`](../supabase/migrations).

## Esito

Il nuovo flusso raccoglie soltanto dati che hanno una destinazione esplicita nello schema. La sezione di visibilità e i dati premium/pagamento sono stati rimossi. `Professionisti e studi` e `Creators` sono mostrati, ma non selezionabili e non vengono gestiti dalla RPC di pubblicazione.

## Mappatura dei tipi

| Tipo scelto | Profilo autore | Dettaglio annuncio |
| --- | --- | --- |
| Giocatore | `profilo_giocatore` | `annuncio_giocatore` |
| Squadra / cerca giocatore | `profilo_squadra` | `annuncio_squadra_cerca_giocatore` |
| Squadra / cerca staff | `profilo_squadra` | `annuncio_squadra_cerca_staff` |
| Squadra / cerca partita | `profilo_squadra` | `annuncio_squadra_cerca_partita` |
| Squadra / cerca sponsor | `profilo_squadra` | `annuncio_squadra_cerca_sponsor` |
| Staff sportivo | `profilo_staff_sportivo` | `annuncio_staff_sportivo` |
| Arbitro | `profilo_arbitro` | `annuncio_arbitro` |
| Torneo o evento | `profilo_torneo_evento` | `annuncio_torneo_evento` |
| Campo o impianto | `profilo_campi_impianti` | `annuncio_campo_impianto` |

Ogni invio crea inoltre:

- il record base `annuncio`, impostato a `livello_annuncio = 'gratuito'`, `stato_annuncio = 'in_revisione'`, `nascosto = false` e `privato = false`;
- una o più righe in `localita_annuncio`;
- email e/o telefono in `contatto_annuncio`, senza riutilizzare automaticamente l'email dell'account;
- una ricevuta privata in `private.announcement_submission` per idempotenza, consensi, proprietà ospite e rate limit.

`annuncio_torneo_evento.tipologie_sport` viene aggiunto come `text[]`. Gli orari dell'impianto, già modellati come JSON, vengono salvati come oggetto con una descrizione testuale. I campi `info_mostrate`, media e link social non vengono raccolti in questa fase e restano non valorizzati.

## Utente autenticato

La pagina legge con RLS il profilo base, i sei sottoprofili pubblicabili e le relative località. Il server accetta soltanto un sottoprofilo esistente e non nascosto dello stesso utente. I dati profilo mostrati nel form sono bloccati; località e contatti del singolo annuncio restano modificabili.

## Ospite

La stessa transazione PostgreSQL crea:

1. `profilo` con `uuid_utente = null`;
2. il sottoprofilo corrispondente;
3. `localita_profilo`;
4. annuncio base, dettaglio, località e contatti;
5. la ricevuta privata della pubblicazione.

Prima dell'invio l'ospite verifica un indirizzo email con un OTP di Supabase Auth. La transazione deriva l'email confermata dalla sessione e, per un `utente` con `registrato_il = NULL`, applica il limite di un invio ogni 24 ore sulla email normalizzata con un advisory lock. Non vengono trattati IP, token HMAC o cookie applicativi. La ricevuta privata resta conservata anche dopo l'eventuale eliminazione dell'annuncio, così il limite non può essere aggirato.

## Gate di rilascio

Prima di usare il flusso in un ambiente remoto occorre:

1. collegare la CLI o l'integrazione Supabase allo stesso project ref presente in `NEXT_PUBLIC_SUPABASE_URL`;
2. applicare in ordine tutte le migrazioni locali;
3. rigenerare i tipi TypeScript dal database migrato;
4. configurare il template Magic Link con `{{ .Token }}` e un SMTP personalizzato per l'OTP;
5. eseguire Database Advisors e test di integrazione per account registrato, utente OTP non registrato, rate limit e RLS.

Se `publish_announcement_v1` non esiste nel database remoto, l'applicazione restituisce un errore controllato e non effettua insert parziali.
