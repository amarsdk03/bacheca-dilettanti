# M04 — Elenco annunci: applicazione e confronto cataloghi

**Stato:** Concluso — installazione strutturalmente verificata e protezioni delle dieci tabelle invariate nel confronto prima/dopo.  
**Modello consigliato:** 6.1 Sol, high.  
**Destinatario:** Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`, Supabase Free.  
**Dipendenze:** M03 Concluso, report utente del 25 ottobre 2026 alle 18:34:27 UTC;
copia manuale dopo M02 acquisita alle 18:20:16 UTC, restore non provato.

[Master](../master_plan.md) · [M03](03-audit-backend.md) · [Copia Free](backup-free.md)
· [Implementazione 07A](../steps/07a-annunci-lista.md)
· [Matrice](../steps/16-verifica-rilascio/matrice-verifiche.md)

## File da usare

| File | Uso |
| --- | --- |
| [dashboard_admin_check_m04.sql](../../../supabase/scripts/dashboard_admin_check_m04.sql) | Controllo completo prima e dopo M04, da eseguire nel SQL Editor |
| [20261024120724_admin_announcement_list.sql](../../../supabase/migrations/20261024120724_admin_announcement_list.sql) | Migrazione M04 esistente, da applicare solo dopo il controllo iniziale positivo |
| [admin-m04-inspection.test.mjs](../../../tests/admin-m04-inspection.test.mjs) | Test locali del verificatore e delle impronte delle protezioni |

SHA-256 della migrazione corrente, **invariata**:
`75405cd39c46730f48869cdd78b58a49e55d12b32426cc234c5eed79af11a017`.

M04 crea due funzioni e un indice:

- `public.admin_list_announcements_v1(jsonb)`: wrapper SQL STABLE invoker;
- `private.list_admin_announcements_v1(jsonb)`: PL/pgSQL STABLE definer,
  owner postgres, search_path vuoto e timezone UTC; verifica ruolo SQL
  authenticated e contesto umano Admin prima della lettura;
- `public.annuncio_admin_order_v1_idx`: B-tree su
  `creato_il DESC NULLS LAST, uuid DESC`, senza unicità o filtro parziale.

EXECUTE alle due funzioni è consentito ad authenticated e al proprietario,
negato a PUBLIC e agli altri ruoli API. Non sono introdotti nuovi grant sulle
tabelle, modifiche alle policy, scritture audit o job. L'indice è creato nella
transazione della migrazione, non CONCURRENTLY. La RPC mantiene filtri, cursore
e DTO già implementati: nessuna modifica all'interfaccia o ai tipi applicativi.

## Controllo iniziale già riscontrato

**Report iniziale positivo ricevuto:** 25 ottobre 2026, **18:52:10.766058 UTC**,
operatore postgres, PostgreSQL 17.6, READ ONLY. Stato
`ready_for_m04_catalog_checks_only`, `m04_prerequisites_match=true`,
`source_schema_matches=true`, zero oggetti M04: due funzioni e indice assenti,
come previsto. M01–M03 coerenti, nove oggetti M02 e due M03; tutte le 52 colonne
corrispondono. Dieci tabelle presenti e utilizzabili, owner postgres e RLS attiva,
con le impronte di grant, colonne e policy conservate per il confronto finale.

Report completo fornito dall'utente in chat conservato in
`.local/dashboard-integration/m04-before-20261025T185210Z.json`, escluso da Git.
Le impronte sono quelle del destinatario, non quelle della fixture sintetica.
Nome/ref associati al progetto già identificato; nessuna verifica indipendente
dell'identità tramite le etichette del SQL. Nessuna nuova esecuzione remota o
test applicativo dell'agente per questo aggiornamento delle evidenze.

**Procedura completata:** report finale del 25 ottobre 2026 alle 18:55:18 UTC
e confronto delle dieci tabelle acquisiti. Nessuna operazione manuale residua M04.
I punti sotto conservano la procedura già svolta; non riapplicare M04.

Non rifare il backup Free e non rieseguire M01, M02 o M03.

1. Aprire [il progetto Supabase](https://supabase.com/dashboard/project/nsytraextbndfyprwzts).
   Verificare nome e ref nell'URL; aprire **SQL Editor**, nuova query, ruolo
   **postgres**. Non sono necessarie chiavi tecniche o modifiche agli env.
2. Aprire **`supabase/scripts/dashboard_admin_check_m04.sql`**, copiare l'intero
   file nel SQL Editor ed eseguirlo senza parametri. Atteso:

   ```text
   status = ready_for_m04_catalog_checks_only
   checks.m04_prerequisites_match = true
   checks.source_schema_matches = true
   checks.m04_named_objects = 0
   ```

3. Inviare il JSON completo **`m04_report` iniziale** prima di applicare M04.
   Questo conserva le impronte delle protezioni delle dieci tabelle per il
   confronto finale. Gli oggetti M04 assenti danno matches falsi: è previsto.

Se il risultato è `m04_structurally_verified`, non applicare la migrazione:
inviare il report per riconciliare la presenza già coerente. Se il report
iniziale manca, non dedurre da un solo controllo finale che grant e policy
precedenti siano rimasti invariati.

## Applicazione e verifica finale

Procedura di riferimento già completata sul progetto identificato, da non ripetere
su questa installazione. Dopo il riscontro del report iniziale positivo:

1. Nello stesso progetto, nuova query come postgres, eseguire **interamente e
   una sola volta** `supabase/migrations/20261024120724_admin_announcement_list.sql`.
   Nessun parametro o UUID da inserire. Non modificare il file per adattarlo a
   un errore. Può riuscire senza righe restituite; conservare l'esito.
2. Rieseguire l'intero **`dashboard_admin_check_m04.sql`**. Atteso:

   ```text
   status = m04_structurally_verified
   checks.m04_prerequisites_match = true
   checks.list_catalog_matches = true
   checks.m04_named_objects = 3
   ```

3. Inviare il JSON completo **`m04_report` finale** e l'esito della migrazione.
   Per la chiusura occorrono entrambe le copie del report: confrontare
   `table_protections` per `table_name`, verificando identici `protection_md5`
   sulle dieci tabelle. Qualsiasi differenza richiede revisione dei metadati;
   non dichiarare M04 Concluso sulla sola presenza delle tre nuove entità.

Il confronto riguarda la stessa revisione del verificatore e lo stesso progetto;
non eseguire altri cambi di schema, ruoli, grant o policy fra i due report.
L'indice aggiunto da M04 è verificato separatamente ed escluso dalle impronte
delle protezioni, così il suo inserimento non produce una falsa differenza.

## Verifiche e limiti del report

READ ONLY, timeout 15s/3s, search_path pg_catalog e ROLLBACK. Il controllo include:

- operatori/ruoli/schemi e prerequisiti M01–M03 già controllati dal verificatore M03;
- esistenza, tipi e leggibilità per postgres delle dieci tabelle richieste,
  con **52 colonne** corrispondenti alle dipendenze della migrazione;
- firme, default JSONB, owner, linguaggi, stabilità, invoker/definer, timezone,
  search_path e hash delle due funzioni, normalizzati LF/CRLF;
- ACL espliciti, grant option, PUBLIC e privilegi ereditati: nei quattro ruoli
  API riportati EXECUTE deve essere vero solo per authenticated;
- indice sulla tabella corretta, owner postgres, pronto/valido/vivo e definizione
  esatta, compresi ordine e NULLS LAST; overload o collisioni di nome da rivedere;
- impronte di owner, RLS/force RLS, ACL di tabella/colonna, tutte le colonne e
  relativi default, privilegi effettivi API e policy. Default ed espressioni delle
  policy sono riportati come impronte, senza esporne i valori o leggere righe.

Le impronte attese sono riprodotte nella fixture PGlite/PostgreSQL 18.3:
privata `29910e0bd58ec293e1990b606c84e09d`, pubblica
`417e6e463cae3810c46eccb7cb3d9aaf`, indice
`4756a5f8e95f24fb26b23a68cd254b69`. Tutte corrispondono al report finale
PostgreSQL 17.6 del progetto. Eventuali divergenze future richiedono revisione,
mai replay automatici.

Il SQL non chiama elenco, guardia Admin, Auth, append o purge; nessun annuncio,
identità, evento o valore della policy sessione viene letto. Non cambia privilegi,
cronologia o Cron e non interpreta dati applicativi.
`limits.table_protections_compared=false` è previsto anche nel report finale:
la singola query non ha memoria del primo risultato. Il confronto tra i due
report viene documentato separatamente prima della chiusura.

Il nome/ref nel report sono etichette attese; la verifica del progetto resta
manuale. Il backup Free è acquisito separatamente, quindi `backup_verified=false`
non ne invalida il riscontro. Firma JWT/gateway, esposizione degli schemi Data API,
prove funzionali integrate, durata/lock dell'indice sul target e ripristino completo
non sono certificati dalla sola corrispondenza dei cataloghi. V20 resta aperto.

## Errori e recupero

`prerequisites_require_review` richiede confronto dei prerequisiti;
`m04_partial_or_drift_require_review` segnala oggetti parziali, overload o
definizioni/grant/indice inattesi. Inviare il report prima di altre operazioni:
non rimuovere funzioni/indici, concedere privilegi o ripetere migrazioni per
forzare il controllo. Non usare i vecchi verificatori dopo modifiche successive
legittime per dedurre che vadano riapplicate M01–M04.

Se la migrazione fallisce prima del commit, eseguire `ROLLBACK;` nella stessa
sessione se ancora in transazione fallita; conservare codice/messaggio e inviarli.
Se l'esito del commit è incerto, eseguire prima il verificatore. Dopo installazione
coerente nessun replay: eventuali correzioni vanno preparate separatamente.
Non ripristinare sul progetto sorgente; limiti della copia nella guida Free.

## Riscontri locali ed avanzamento

Sette nuovi test del verificatore riusciti; ESLint riuscito. Coperti assenza dei
prerequisiti, tipo/colonna errati, prima/dopo con CRLF e tre oggetti, fingerprint
invariati con la migrazione corretta, installazioni parziali/overload,
timezone modificata, indice errato o sulla tabella sbagliata, grant PUBLIC o
ereditati, USAGE revocato, variazioni di grant tabella/colonna, RLS e policy.
Un annuncio e un evento sintetici non compaiono nel report; l'evento vecchio
resta presente, senza esecuzione della purge.

**297 test mirati riusciti, zero fallimenti/skip**, inclusi i sette nuovi;
regressioni elenco DB/server, foundation audit, bridge audit/server, autorizzazione
e verificatori M02/M03. ESLint del nuovo test riuscito. Comando:

```text
node --test --test-concurrency=4 tests/admin-m04-inspection.test.mjs tests/admin-m03-inspection.test.mjs tests/admin-m02-inspection.test.mjs tests/admin-announcements-database.test.mjs tests/admin-announcements-server.test.mjs tests/admin-audit-bridge-database.test.mjs tests/admin-audit-server.test.mjs tests/admin-audit-database.test.mjs tests/admin-authorization-database.test.mjs
```

È una verifica mirata con servizi sintetici, non una nuova regressione completa.
I 297 test e il lint sono quelli già riusciti durante la preparazione; nessun
nuovo test applicativo o SQL eseguito per la chiusura documentale.

**Report finale utente acquisito:** 25 ottobre 2026, **18:55:18.489359 UTC**,
`m04_structurally_verified`, tre oggetti M04 contro zero nel report iniziale.
Tutti i controlli booleani sono veri, 52 colonne corrispondenti e prerequisiti
M01–M03 coerenti. Le due funzioni e l'indice hanno le impronte attese;
EXECUTE è consentito solo ad authenticated tra i quattro ruoli API riportati.

Report finale completo conservato in
`.local/dashboard-integration/m04-after-20261025T185518Z.json`.
Confronto separato conservato in
`.local/dashboard-integration/m04-protection-comparison-20261025T185518Z.json`:
**10/10 tabelle identiche, zero differenze**, per tutte le quattro impronte,
owner, RLS/force RLS, presenza/utilizzabilità e privilegi effettivi API.
Il report SQL originale conserva `limits.table_protections_compared=false`;
il confronto riuscito è registrato separatamente e in `m04-preparation.json`.
Questi file locali sono esclusi da Git e derivano dai report forniti in chat.

**M04 Concluso nel registro operativo.** Nessuna operazione manuale residua;
migrazione e verificatore SQL invariati, nessuna esecuzione remota dell'agente.
Prove gateway/Auth, esposizione Data API, cronologia e ripristino completo restano
non attestati da questo controllo. La copia manuale Free delle 18:20 resta il
checkpoint acquisito; V20 aperto. Prossimo: **M05 — dettaglio annunci**, non
avviato; modello consigliato **6.1 Sol, high**.

Fonti: [funzioni Supabase](https://supabase.com/docs/guides/database/functions),
[ordine degli indici PostgreSQL](https://www.postgresql.org/docs/17/indexes-ordering.html).
