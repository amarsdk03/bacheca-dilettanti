# M05 — Dettaglio annunci: controllo e integrazione

**Stato:** Concluso — installazione strutturalmente verificata e protezioni di 25/25 tabelle invariate nel confronto prima/dopo.  
**Modello consigliato:** 6.1 Sol, high.  
**Destinatario:** Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`, Supabase Free.  
**Dipendenze:** M04 Concluso, report finale del 25 ottobre 2026 alle 18:55:18 UTC,
protezioni di 10/10 tabelle invariate; copia manuale Free dopo M02 delle 18:20
acquisita, restore non provato.

[Master](../master_plan.md) · [M04](04-elenco-annunci.md) · [Copia Free](backup-free.md)
· [Implementazione 07B](../steps/07b-annunci-dettaglio.md)
· [Matrice](../steps/16-verifica-rilascio/matrice-verifiche.md)

## File e risultato previsto

| File | Uso |
| --- | --- |
| [dashboard_admin_check_m05.sql](../../../supabase/scripts/dashboard_admin_check_m05.sql) | Verificatore completo prima/dopo, nel SQL Editor come postgres |
| [20261024145954_admin_announcement_detail.sql](../../../supabase/migrations/20261024145954_admin_announcement_detail.sql) | Migrazione M05 già verificata; non rieseguire su questa installazione |
| [admin-m05-inspection.test.mjs](../../../tests/admin-m05-inspection.test.mjs) | Undici test locali del verificatore con PGlite |

Migrazione **invariata**, SHA-256:
`ee96ea99249d2a3e27b1bcb910e397f59fe4b2cca13719d9d6af7b60fea4fdad`.
SHA-256 del verificatore corretto sui sei campi data/ora:
`9837d47c4a6c34c041f387487977be4bd69d449b6dcefc09cc08432e2d527e29`.
M05 aggiunge sei funzioni, senza indici, tabelle, grant sulle tabelle o cambi alle
policy. La RPC e i DTO del dettaglio sono già implementati in 07B.

| Funzione | Accesso e impronta MD5 normalizzata LF/CRLF |
| --- | --- |
| `private.admin_announcement_author_v1(uuid,text)` | Solo proprietario; `e84bee24b64542536ec9da0e07504600` |
| `private.admin_announcement_detail_spec_v1(text)` | Solo proprietario; `a278c4de70132cc162a68da84671afdf` |
| `private.admin_announcement_field_v1(jsonb,text,text)` | Solo proprietario; `4bd3ab7aaf2ee8eed1d646efec6c8521` |
| `private.admin_announcement_snapshot_v1(uuid)` | Solo proprietario; `1de5cd3843e700a007c60a7b07f983a7` |
| `private.get_admin_announcement_v1(uuid)` | Authenticated con controlli interni Admin; `2f8a44d5ec24d4ed3d095835f02eb899` |
| `public.admin_get_announcement_v1(uuid)` | Authenticated tramite wrapper; `53e45d4d0fb16202ad923d0564b1a785` |

Owner postgres per tutti; solo `get_admin_announcement_v1` è SECURITY DEFINER.
Spec IMMUTABLE, altre cinque STABLE; search path vuoto su tutte. TimeZone UTC
su snapshot e ponte. EXECUTE negato a PUBLIC; tra i quattro ruoli API riportati,
solo authenticated esegue wrapper/ponte e nessuno esegue i quattro helper.

## Controllo iniziale riscontrato

Il report del **25 ottobre 2026, 19:08:28.849615 UTC** è stato ricevuto:
`prerequisites_require_review`, zero oggetti M05, undici unicità valide e
**160/166 colonne corrispondenti**. I sei falsi negativi dipendevano dal
verificatore: richiedeva testo anche per quattro date e due orari nativi,
compatibili con la proiezione SQL e con il DTO del dettaglio.

| Campi interessati | Tipo aggiunto alle alternative text/varchar |
| --- | --- |
| `annuncio_squadra_cerca_staff.periodo_dal`, `periodo_al` | `date` |
| `annuncio_squadra_cerca_partita.periodo_dal`, `periodo_al` | `date` |
| `annuncio_squadra_cerca_partita.orario_dalle`, `orario_alle` | `time without time zone`, anche con precisione esplicita |

La correzione riguarda solo queste sei coppie tabella/colonna. Non richiede
conversioni dei dati, cambi di schema o di privilegi. Funzioni/indice M04 e
prerequisiti M01–M03 corrispondono nel report ricevuto; il flag cumulativo
`m04_prerequisites_match=false` nel verificatore M05 dipendeva dal controllo
esteso delle colonne, non da un drift delle funzioni o dell'indice M04.

Il report originale è conservato senza correggerne valori, tipi attesi o stato in
`.local/dashboard-integration/m05-before-review-20261025T190828Z.json`, insieme
alla provenienza e alla copia del verificatore precedente. Il controllo è stato
ripetuto con la revisione corretta, da usare anche dopo l'applicazione.

**Report iniziale positivo ricevuto:** 25 ottobre 2026, **19:16:35.949046 UTC**,
`ready_for_m05_catalog_checks_only`, `m05_prerequisites_match=true`,
`source_schema_matches=true`, **166/166 colonne corrispondenti**, undici unicità
valide e zero oggetti M05. M01–M04 coerenti, nove oggetti M02, due M03 e tre M04.
Le sei funzioni M05 sono assenti come previsto; i relativi matches falsi non
segnalano un errore nella fase iniziale. Operatore postgres, PostgreSQL 17.6,
READ ONLY, nessun PUBLIC EXECUTE privato.

Report completo conservato in
`.local/dashboard-integration/m05-before-20261025T191635Z.json`, escluso da Git,
con provenienza separata dalla chat. Protezioni di tutte le **25 tabelle**
conservate per il confronto finale: owner postgres, RLS attiva e privilegi
effettivi riportati. Le etichette nome/ref non attestano l'identità del progetto
né il backup acquisito separatamente. Nessuna nuova esecuzione SQL o test
applicativo dell'agente per questo aggiornamento delle evidenze.

**Procedura completata:** report finale delle 19:19:12 UTC e confronto delle
25 tabelle acquisiti. Nessuna operazione manuale residua M05.
I punti sotto conservano la procedura già svolta; non riapplicare M05.

1. Aprire [il progetto Supabase](https://supabase.com/dashboard/project/nsytraextbndfyprwzts),
   verificare nome e ref, poi **SQL Editor → nuova query**, ruolo **postgres**.
2. Aprire **`supabase/scripts/dashboard_admin_check_m05.sql`**, copiare ed eseguire
   **l'intero file**, senza UUID o altri parametri. Restituisce un JSON `m05_report`.
3. Fornire il **report iniziale completo**, prima dell'applicazione. Atteso:

   ```text
   status = ready_for_m05_catalog_checks_only
   checks.m05_prerequisites_match = true
   checks.source_schema_matches = true
   checks.detail_uniqueness_matches = true
   checks.m05_named_objects = 0
   ```

I sei oggetti assenti e i relativi matches falsi sono previsti in questa fase.
Prerequisiti e impronte iniziali sono ora acquisiti. Non occorre rifare la copia
Free o rieseguire M01–M04.

## Applicazione e controllo finale, dopo il riscontro iniziale

Procedura di riferimento già completata sul progetto identificato. Non ripetere
la migrazione su questa installazione strutturalmente verificata.

1. Sullo stesso progetto, nuova query come postgres, eseguire **una sola volta e
   interamente** `supabase/migrations/20261024145954_admin_announcement_detail.sql`.
   Nessun parametro. Conservare l'esito; può riuscire senza righe restituite.
2. Rieseguire l'intero **`dashboard_admin_check_m05.sql`**. Atteso:

   ```text
   status = m05_structurally_verified
   checks.m05_prerequisites_match = true
   checks.detail_catalog_matches = true
   checks.m05_named_objects = 6
   ```

3. Fornire report finale completo ed esito dell'applicazione. Per la chiusura
   confrontare `table_protections` per `table_name`: **25/25 tabelle identiche**
   nelle impronte, owner, RLS e privilegi effettivi. Stessa revisione del
   verificatore prima/dopo, nessun altro cambio di schema/ruoli/policy fra i due.

Se M05 risulta già strutturalmente verificato, non applicare la migrazione;
fornire il report per la riconciliazione. Senza il report iniziale non si deduce
l'invarianza delle protezioni dalla sola installazione coerente.

## Controlli e limiti

Il verificatore usa READ ONLY, timeout 15s/3s, search path pg_catalog e ROLLBACK.
Verifica M01–M04, indice lista, **166 colonne su 25 tabelle**, sei funzioni e
unicità dei dettagli nelle undici tipologie. Le 25 tabelle comprendono le dieci
di M04, undici dettagli e quattro relazioni località/contatti/link/media.
La tabella Creator è `annuncio_creator`, mentre la tipologia è `annuncio_creators`.

L'unicità richiede indice unico valido, pronto, vivo, immediato, non parziale e
senza espressioni, con unica chiave `uuid_annuncio`; INCLUDE è ammesso. Non legge
righe per cercare duplicati e non rimuove vincoli per aggirare il requisito.

Le 52 colonne già verificate da M04 conservano i tipi esatti. Per quelle
aggiuntive il contratto SQL/TypeScript richiede UUID, bigint, boolean, timestamptz,
text[], JSONB oppure famiglie esplicite compatibili: text/varchar per testo,
smallint/integer/bigint/numeric/real/double precision per numeri. Precisione
numeric e lunghezza varchar non cambiano la rappresentazione JSON attesa.
Per i soli sei campi nella tabella sopra sono ammessi anche date e time senza
fuso: `to_jsonb` li proietta come stringhe. Timestamp e time con fuso restano
esclusi da questi campi; gli altri campi testuali non ammettono tipi temporali.
`expected_type` separa con `|` le alternative; `actual_type` riporta il tipo
effettivo completo. `annuncio_servizi_consulenze.tipologie_sport` è dichiarato
JSONB nel contratto condiviso. Il DDL iniziale completo non è presente nella
storia locale: nessuna esatta struttura storica viene inventata da tipi TS.

Le impronte coprono tutte le colonne/default e relativi ACL, owner, RLS/force
RLS, policy e privilegi effettivi API, nel formato M04. Non espongono definizioni
o righe. `limits.table_protections_compared=false` resta corretto anche nel
report finale: il confronto dei due report si documenta separatamente.

Nessuna chiamata a dettaglio/spec/snapshot, guardia Admin, Auth, audit o purge;
nessuna lettura di annunci, identità, eventi, valori della policy sessione o Cron.
Le etichette del report non certificano progetto o backup. Firma JWT/gateway,
esposizione degli schemi Data API, autorizzazione funzionale, cronologia e
ripristino completo restano distinti. V20 resta aperto; copia manuale Free
acquisita dopo M02, restore non provato e file Storage/configurazioni esclusi.

## Esiti inattesi e recupero

`prerequisites_require_review` richiede revisione delle dipendenze, dei tipi,
dell'unicità o dell'accesso agli schemi. `m05_partial_or_drift_require_review`
segnala oggetti parziali, overload, definizioni o privilegi inattesi.
Fornire il JSON prima di altre operazioni: nessun replay, drop o grant automatico.

Se la migrazione fallisce prima del commit, eseguire `ROLLBACK;` nella stessa
sessione se resta in transazione fallita e conservare codice/messaggio.
Se il commit è incerto, eseguire prima il verificatore. Dopo installazione
coerente non ripetere M05; eventuali correzioni richiedono intervento separato.
Non ripristinare sul progetto sorgente per correggere un controllo.

## Verifiche locali e avanzamento

**379 test mirati riusciti, zero fallimenti/skip**, inclusi undici del verificatore
M05 (otto iniziali e tre nuove regressioni temporali); ESLint riuscito. Comando dalla root:

```text
node --test --test-concurrency=4 tests/admin-m05-inspection.test.mjs tests/admin-m04-inspection.test.mjs tests/admin-m03-inspection.test.mjs tests/admin-m02-inspection.test.mjs tests/admin-announcement-detail-database.test.mjs tests/admin-announcement-detail-server.test.mjs tests/admin-announcements-database.test.mjs tests/admin-announcements-server.test.mjs tests/admin-audit-bridge-database.test.mjs tests/admin-audit-server.test.mjs tests/admin-audit-database.test.mjs tests/admin-authorization-database.test.mjs
```

Verificati prerequisiti assenti, colonne mancanti/tipi errati e compatibili,
undici unicità, indici parziali/espressioni/multicolonna/deferrabili, prima/dopo
con CRLF e sei oggetti, overload, drift definizioni/settings/definer,
grant PUBLIC/ereditati/grant option, accesso vietato agli helper e USAGE mancante.
Protezioni identiche con migrazione corretta; cambi di ACL tabella/colonna,
RLS, policy e colonne aggiunte rilevati. Titolo ed evento sintetici non compaiono;
evento vecchio non eliminato. Helper sostituito con eccezione non viene invocato.

Le tre regressioni temporali coprono prima/dopo con tutte le sei colonne native
e protezioni identiche, percorso SQL → DTO di entrambe le tipologie con null,
date bisestili, secondi/frazioni e DateStyle ISO/German, rifiuto di timestamp,
time con fuso e date/orari su campi testuali estranei. Migrazione e sei impronte
di funzione invariate; generatore locale allineato al verificatore corretto.

Test con servizi sintetici PGlite, non nuova regressione completa né prova sul
progetto. Nessun SQL remoto, env, chiave, build, server, deploy o Cron modificato.

**Report finale utente acquisito:** 25 ottobre 2026, **19:19:12.973538 UTC**,
`m05_structurally_verified`, sei oggetti M05 contro zero iniziali. Tutti i
controlli booleani sono veri, 166 colonne corrispondenti, undici unicità valide
e prerequisiti M01–M04 coerenti. Le sei funzioni hanno le impronte attese;
nessun EXECUTE API sui quattro helper, authenticated ammesso solo a wrapper e
ponte tra i ruoli API riportati.

Report finale completo conservato in
`.local/dashboard-integration/m05-after-20261025T191912Z.json`, con provenienza
dalla chat. Confronto separato conservato in
`.local/dashboard-integration/m05-protection-comparison-20261025T191912Z.json`:
**25/25 tabelle identiche, zero differenze**, nelle quattro impronte, owner,
RLS/force RLS, presenza/utilizzabilità e privilegi effettivi API.
Il report SQL originale conserva `limits.table_protections_compared=false`;
il confronto riuscito è documentato separatamente e in `m05-preparation.json`.
Questi file locali sono esclusi da Git.

**M05 Concluso nel registro operativo.** Migrazione e verificatore SQL invariati;
nessuna nuova esecuzione SQL remota o test applicativo per questa chiusura.
Conservati i 379 test mirati e lint precedenti. Nessuna operazione manuale
residua M05. Gateway/Auth, esposizione Data API, autorizzazione funzionale,
cronologia e ripristino completo non sono attestati da questo confronto.
Copia manuale Free delle 18:20 acquisita separatamente, restore non provato;
V20 aperto. Prossimo: **M06 — moderazione annunci**, non avviato;
modello consigliato **6.1 Sol, high**.

Fonti: [funzioni Supabase](https://supabase.com/docs/guides/database/functions),
[catalogo pg_index PostgreSQL 17](https://www.postgresql.org/docs/17/catalog-pg-index.html).
