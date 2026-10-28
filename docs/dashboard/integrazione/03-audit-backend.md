# M03 — Ponte audit riservato al backend

**Stato:** Concluso — applicazione e verifica strutturale M03 riscontrate nel report finale utente; prove funzionali integrate ancora distinte.  
**Modello consigliato:** 6.1 Sol, high.  
**Destinatario:** Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`, Supabase Free.  
**Dipendenze:** M02 Concluso; copia manuale dopo M02 riscontrata il 25 ottobre
alle 18:20:16 UTC, archivio verificato e ripristino non provato.

[Master](../master_plan.md) · [M02](02-audit.md) · [Copia Free](backup-free.md)
· [Implementazione 04B](../steps/04b-audit-server.md)
· [Matrice](../steps/16-verifica-rilascio/matrice-verifiche.md)

## File da usare

| File | Uso |
| --- | --- |
| [dashboard_admin_check_m03.sql](../../../supabase/scripts/dashboard_admin_check_m03.sql) | Controllo cataloghi prima e dopo M03, intero file nel SQL Editor |
| [20261024110910_admin_audit_server_bridge.sql](../../../supabase/migrations/20261024110910_admin_audit_server_bridge.sql) | Migrazione M03 esistente, da eseguire solo dopo il controllo iniziale positivo |
| [admin-m03-inspection.test.mjs](../../../tests/admin-m03-inspection.test.mjs) | Prove sintetiche del verificatore, senza connessione Supabase |

SHA-256 della migrazione corrente, invariata:
`0924fb2c6564ed21918758e2832a7401f71de0036c7092356e71b5c38e342d2e`.

La migrazione crea **due funzioni**:

- `public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)`,
  SQL invoker, ingresso RPC riservato a `service_role`;
- `private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)`,
  PL/pgSQL definer, owner `postgres`, `search_path` vuoto. Richiede ruolo SQL
  originale e claim tecnico `role` entrambi uguali a `service_role`.

Concede USAGE privato ed EXECUTE sulle sole due funzioni a `service_role`.
Non concede accesso diretto alla tabella audit, all'append o alla purge.
I successi ammessi dal ponte sono login/logout; i fallimenti sono limitati ai
codici previsti. L'identità umana viene verificata separatamente dal backend.
La service key non autorizza una persona come Admin.
Il file contiene BEGIN/COMMIT e notifica di ricaricamento schema PostgREST;
non scrive eventi, non chiama purge e non attiva Cron.

## Procedura nel SQL Editor

**Procedura già completata dall'utente**, riscontrata nel report finale delle
18:34:27 UTC del 25 ottobre. Conservata come riferimento: **non rieseguire M03**.
Nessuna operazione manuale residua per chiudere questo step.

Il backup Free è già documentato: **non rifarlo per questo passaggio**.
Non rieseguire M01 o M02 e non usare `db push`, reset o migration repair.

1. Aprire [il progetto Supabase](https://supabase.com/dashboard/project/nsytraextbndfyprwzts).
   Verificare nome **Webapp Bacheca Dilettanti** e ref nell'URL.
   Aprire **SQL Editor**, nuova query, ruolo **postgres**.
2. Aprire nel repository
   **`supabase/scripts/dashboard_admin_check_m03.sql`**, copiare tutto il file
   nel SQL Editor ed eseguirlo, senza parametri. Il risultato è `m03_report`.
   Per procedere devono risultare:

   ```text
   status = ready_for_m03_catalog_checks_only
   checks.m03_prerequisites_match = true
   checks.audit_catalog_matches = true
   checks.m03_named_objects = 0
   ```

   I controlli delle due funzioni M03 ancora assenti sono falsi: è previsto.
   `service_private_usage` può essere già vero sul progetto oppure diventare vero
   con M03. Se lo stato è `m03_structurally_verified`, **non applicare M03**:
   conservare e inviare il report, l'installazione risulta già coerente.
3. **Solo se il punto 2 è positivo**, aprire un'altra query e incollare tutto
   **`supabase/migrations/20261024110910_admin_audit_server_bridge.sql`**.
   Eseguirlo **una sola volta**, come `postgres`. Nessun parametro e nessun
   UUID personale da inserire. Annotare l'esito, anche se non restituisce righe.
4. Rieseguire tutto **`dashboard_admin_check_m03.sql`**. Atteso:

   ```text
   status = m03_structurally_verified
   checks.m03_prerequisites_match = true
   checks.bridge_catalog_matches = true
   checks.m03_named_objects = 2
   ```

   Tutti i campi `functions[].matches` devono essere veri; EXECUTE deve essere
   vero soltanto per `service_role` nei quattro ruoli API riportati.
   Anche owner `postgres` conserva i propri privilegi di proprietario.
5. Inviare il JSON **`m03_report` finale** e l'esito della migrazione.
   Se il controllo iniziale non dà lo stato atteso, fermarsi e inviare quel
   report prima di applicare. Non condividere chiavi, password o dump.

Non è necessario intervenire su `.env.local` o configurare una nuova chiave in
questo step. La configurazione effettiva del backend e le prove Auth/PostgREST
rimangono nel percorso di attivazione integrata già previsto.
M04 non parte automaticamente con la chiusura di M03.

## Cosa controlla il verificatore

Una transazione READ ONLY con timeout 15s/3s, search_path pg_catalog e ROLLBACK:

- operatore `postgres` senza claim applicativi, ruoli e schemi attesi;
- guardia M01 e **intera struttura M02**, comprese quattro definizioni di funzione,
  tredici colonne, cinque vincoli, quattro indici, RLS e privilegi effettivi;
- presenza e accessibilità della dipendenza `auth.jwt()` per il ruolo tecnico,
  senza eseguirla né leggere valori delle impostazioni Auth;
- assenza di PUBLIC EXECUTE sulle routine private, per individuare accessi
  involontari prima del grant di USAGE; schema pubblico non creabile dai ruoli API;
- firme, numero di overload, owner, lingue, invoker/definer, volatilità,
  risultato UUID, default, search_path e hash LF/CRLF delle due funzioni;
- ACL e privilegi ereditati: niente esecuzioni ai ruoli API ordinari,
  grant ammessi solo a owner e service_role, senza grant option al ruolo tecnico;
- USAGE privato del ruolo tecnico dopo l'installazione.

Gli hash attesi sono riprodotti con la migrazione invariata nella fixture locale:
ponte privato `17127de1fccf90f1d52d1c64ca666887`, wrapper pubblico
`cdcbb3cc1271435cd92bebfa0ddc15cb`.
La fixture usa PGlite/PostgreSQL 18.3; il progetto osservato è PostgreSQL 17.6.
Il confronto sul destinatario resta da acquisire; differenze richiedono revisione.
Il controllo restituisce solo metadati e impronte: nessuna riga applicativa,
invocazione del ponte/append/purge, lettura o modifica di job Cron, valori della
policy sessione o chiavi. Non crea, modifica o ripara oggetti.

Lo schema `private` deve restare fuori dagli schemi esposti dalla Data API;
la configurazione esterna non è attestabile da questo controllo cataloghi.
`api_schema_exposure_verified=false` lo dichiara esplicitamente, senza leggere
configurazioni o segreti. Le impostazioni Data API esistenti non vengono cambiate
da questa migrazione. Il report non certifica identità del progetto, backup,
cronologia, JWT/gateway o autorizzazione funzionale: i relativi limiti restano falsi
anche quando il catalogo è verificato. Il backup è riscontrato separatamente.

## Errori e recupero

`prerequisites_require_review` segnala prerequisiti o protezioni da rivedere;
`m03_partial_or_drift_require_review` segnala presenza parziale, overload,
definizioni o grant inattesi. In entrambi i casi inviare il report: non eliminare
funzioni, aggiungere grant o riapplicare file per forzare il controllo.
Il controllo non va usato dopo future migrazioni che cambiano legittimamente
M01/M02 per dedurne un replay.

Se la migrazione fallisce prima del commit, eseguire `ROLLBACK;` nella stessa
sessione se ancora in transazione fallita, conservare codice/messaggio e inviarli.
Se l'esito del commit è incerto, eseguire il controllo prima di ogni altro tentativo.
Dopo installazione coerente nessun replay M03: eventuali correzioni vanno preparate
separatamente, preservando gli eventi. Nessun restore automatico o ripristino
sul progetto sorgente è previsto; limiti della copia nella guida Free.

## Verifiche e stato effettivo

Sei nuovi test del verificatore superati e ESLint riuscito: prerequisiti assenti,
prima/dopo con CRLF, ripristino delle impostazioni di sessione, nessuna lettura
eventi o purge, installazione parziale/overload, PUBLIC EXECUTE e grant ereditati,
funzioni private estranee con PUBLIC EXECUTE, accesso per colonna all'audit,
definer modificato, USAGE revocato e dipendenza JWT non disponibile.
**211 test mirati riusciti, zero fallimenti/skip**, inclusi i sei nuovi e i cinque
controlli M02; regressioni di bridge, audit server, foundation audit e autorizzazione
con servizi sintetici. Non è una nuova esecuzione della regressione completa.
Comando: `node --test tests/admin-m03-inspection.test.mjs tests/admin-m02-inspection.test.mjs tests/admin-audit-bridge-database.test.mjs tests/admin-audit-server.test.mjs tests/admin-audit-database.test.mjs tests/admin-authorization-database.test.mjs`.
ESLint del nuovo test riuscito; nessuna connessione remota configurata nell'IDE.

**Controllo iniziale sul progetto superato**, report fornito dall'utente:
25 ottobre 2026, **18:32:15.786651 UTC**, operatore `postgres`, PostgreSQL 17.6,
READ ONLY. Stato `ready_for_m03_catalog_checks_only`,
`m03_prerequisites_match=true`, M01 coerente, struttura M02 interamente coerente
con nove oggetti, dipendenza JWT disponibile, PUBLIC EXECUTE privato assente,
USAGE tecnico già presente. `m03_named_objects=0`: entrambe le funzioni M03
sono assenti; i relativi matches falsi sono previsti prima della migrazione.
Report completo conservato in `.local/dashboard-integration/m03-before-20261025T183215Z.json`,
escluso da Git, con provenienza dalla chat. Nome/ref associati al progetto già
identificato dall'utente, non certificati dalle etichette attese nel SQL.

Il successivo report finale delle 18:34:27 UTC, descritto sotto, riscontra
l'applicazione e la verifica delle due funzioni. La copia Free
delle 18:20 resta acquisita separatamente: `backup_verified=false` nel controllo
non invalida quel riscontro. Nessun nuovo SQL o test applicativo dell'agente
per questo aggiornamento delle evidenze.

**Controllo finale sul progetto superato**, report completo fornito dall'utente
il 25 ottobre 2026, **18:34:27.052344 UTC**, operatore `postgres`, PostgreSQL 17.6,
READ ONLY. Stato **`m03_structurally_verified`**, `m03_named_objects=2`, tutti
i controlli booleani veri. Entrambe le funzioni sono presenti, definizioni e
privilegi corrispondenti, hash privato `17127de1fccf90f1d52d1c64ca666887` e
pubblico `cdcbb3cc1271435cd92bebfa0ddc15cb`. Nei ruoli API verificati EXECUTE
è vero solo per `service_role`, falso per `anon`, `authenticated` e
`supabase_auth_admin`. M01/M02 ancora coerenti, nove oggetti M02, nessun
PUBLIC EXECUTE privato. Anche i due hash riprodotti localmente corrispondono
al catalogo PostgreSQL 17.6 del report utente.

Il passaggio da zero a due oggetti, insieme a definizioni e privilegi finali,
riscontra l'applicazione. Report conservato in
`.local/dashboard-integration/m03-after-20261025T183427Z.json`, escluso da Git,
con provenienza dalla chat dell'utente. Nessuna connessione o esecuzione remota
dell'agente e nessuna attestazione aggiuntiva di gateway, JWT, esposizione Data API,
cronologia o Cron. La copia Free resta quella separata delle 18:20, con restore
non provato e file Storage/configurazioni esterne esclusi; V20 resta aperto.

**Registro operativo M03 Concluso. Nessuna operazione manuale residua.**
Migrazione e verificatore invariati; nessun nuovo SQL o test applicativo,
ambiente, segreto, build, server o Cron modificati per questa chiusura documentale.
Prossimo step **M04 — elenco annunci**, **6.1 Sol, high**, non avviato.

Fonti: [changelog Supabase](https://supabase.com/changelog),
[funzioni database e privilegi](https://supabase.com/docs/guides/database/functions).
