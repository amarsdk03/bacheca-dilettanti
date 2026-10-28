# IN01 — Ricognizione del progetto Supabase esistente

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16A–16H Conclusi; progetto usato da `apps/web` con soli dati di
prova personali, come confermato dall'utente. Primo report dei cataloghi ricevuto
e confrontato; cronologia ricevuta e incrociata con i cataloghi. Destinatario
confermato dall'utente: **Webapp Bacheca Dilettanti**, ref
`nsytraextbndfyprwzts`.

[Master](../master_plan.md) · [Matrice](../steps/16-verifica-rilascio/matrice-verifiche.md)
· [Runbook](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md)

## Obiettivo e confini

Confrontare lo stato effettivo del progetto con le dieci migrazioni Admin
M01–M10 e i prerequisiti Web. È la prima attività della fase esterna di
integrazione, non un ulteriore sottopasso locale dello step 16.

Si usa il SQL Editor del progetto esistente. Non servono Docker, nuove
installazioni, password da condividere o modifiche agli env. PGlite verifica
localmente lo script; non sostituisce il riscontro sul progetto Supabase.

Lo script non applica migrazioni, non crea account, non modifica la policy
sessione e non attiva cestino o retention. Non chiama RPC applicative né legge
righe di account, sessioni, annunci, audit o configurazioni private. Le
definizioni delle funzioni sono rappresentate da impronte MD5, senza esportarne
il corpo; le impostazioni delle funzioni sono limitate a quelle operative
necessarie al confronto. Le impronte servono al confronto, non a certificare
sicurezza o equivalenza semantica.

## Operazioni manuali, nell'ordine

Procedura completata dall'utente il 25 ottobre 2026; conservata come riferimento.
Nessuna ripetizione richiesta per chiudere IN01.

1. Apri nel pannello Supabase **il progetto già usato da `apps/web`**. Annota
   nome e project ref nella scheda sotto; verifica che il contesto sia quello
   con i tuoi soli dati di prova. Non dedurre il destinatario dai dati PGlite
   o dal nome del database `postgres`.
2. Apri **SQL Editor** e una nuova query, con operatore `postgres`.
3. Apri il file
   [dashboard_admin_inspect_baseline.sql](../../../supabase/scripts/dashboard_admin_inspect_baseline.sql),
   copialo **interamente** nella query ed eseguilo. Non ci sono parametri da
   compilare. Il blocco cronologia in fondo è commentato e non parte da solo.
4. Conserva il risultato della colonna **`baseline_report`**, preferibilmente
   esportando il risultato completo in JSON/CSV invece di copiarne una parte
   troncata dall'anteprima. `report_version` deve essere `1` e
   `environment.transaction_read_only` deve essere `on`.
5. Nel risultato cerca `migration_history`. Solo se
   `can_read_versions=true`, copia le sole istruzioni comprese fra
   `OPTIONAL_HISTORY_SQL_BEGIN` e `OPTIONAL_HISTORY_SQL_END`, senza i delimitatori
   del commento esterno, in **una seconda query** ed eseguila. Conserva la
   colonna `migration_history_report`. Se il flag è falso, salta questa query:
   il motivo è già riportato nel primo risultato.
6. Restituisci i risultati completi e nome/project ref. Puoi allegare i file
   esportati; eventuali copie locali vanno in `.local/dashboard-integration/`,
   già esclusa da Git. Non inviare env, password o chiavi. Nessun comando di
   migrazione va eseguito sulla base dei soli flag di presenza.

### Scheda del destinatario

| Campo | Stato |
| --- | --- |
| Nome progetto e project ref | **Webapp Bacheca Dilettanti** — `nsytraextbndfyprwzts`, forniti dall'utente dal pannello il 25 ottobre 2026 e associati a entrambe le query |
| Uso | Progetto esistente utilizzato da `apps/web`, dichiarazione dell'utente |
| Dati presenti | Soltanto dati di prova personali, confermato dall'utente |
| Operatore SQL e data esecuzione | `postgres`, 2026-10-25 13:23:23.488144 UTC, dal report fornito dall'utente |
| `baseline_report` del progetto | Ricevuto in chat; versione 1, PostgreSQL 17.6, transazione `read_only=on` |
| `migration_history_report` o motivo di indisponibilità | Ricevuto in chat: 2026-10-25 13:35:59.569894 UTC, versione 1, READ ONLY, 7 versioni, `truncated=false` |
| Migrazioni applicate dall'agente sul progetto | Nessuna |

## Come verranno interpretati i risultati

- `migration_markers` elenca oggetti rappresentativi M01–M10, **non certifica
  l'applicazione completa**. `markers_absent`, `some_markers_present` e
  `all_markers_present` descrivono soltanto gli oggetti trovati.
- Il catalogo restituisce colonne, vincoli, indici, policy, trigger, funzioni,
  proprietari, ACL ed esecuzione effettiva per i ruoli pertinenti. I nomi non
  bastano: definizioni/impronte e privilegi vanno confrontati con il repository.
- Una riga nella cronologia non certifica lo schema attuale. Una versione
  assente non prova che il SQL non sia mai stato eseguito nel SQL Editor.
  La query opzionale restituisce al massimo 2.000 versioni: se `truncated=true`,
  il risultato è parziale e non consente di dichiarare assenti le altre versioni.
- Ogni migrazione verrà classificata come **da confrontare**, **coerente nei
  controlli strutturali eseguiti**, **divergente/incompleta** oppure **non
  verificabile**. La verifica funzionale Auth/PostgREST resta distinta.
- La precedente applicazione di M01 è una dichiarazione dell'utente: non viene
  rieseguita automaticamente. Un oggetto assente o un hash diverso non avvia
  correzioni, `db push`, reset o riparazioni della cronologia.
- I valori effettivi della policy sessione e del gate, le impostazioni Auth,
  gli schemi esposti dalla Data API e i job Cron restano da verificare a parte:
  non sono attestati dalla sola presenza delle rispettive strutture.

## Errori e recupero

Le due query aprono transazioni `READ ONLY`, impostano timeout locali e le
chiudono con `ROLLBACK`. In caso di errore, conserva codice e messaggio senza
aggirare i controlli. Se il SQL Editor segnala una transazione fallita ancora
aperta, esegui `ROLLBACK;` nella stessa sessione. Non ci sono modifiche
applicative da annullare e non occorre ripristinare dati.

Se mancano permessi, un catalogo è inaccessibile o il risultato è incompleto,
il controllo resta **non verificabile**. Non concedere privilegi per far
passare la ricognizione. La query opzionale della cronologia può fallire se
la tabella o i permessi cambiano fra le due esecuzioni: conservare l'errore,
senza dedurre che manchino migrazioni.

## Avanzamento

Script e guida **preparati e verificati localmente**. Entrambi i report
ricevuti dall'utente, confronto M01 e incrocio della cronologia eseguiti.
**IN01 Concluso:** l'utente ha identificato il destinatario di entrambi i report
come **Webapp Bacheca Dilettanti**, ref `nsytraextbndfyprwzts`.
Le migrazioni e le prove funzionali restano passaggi successivi distinti.

### Esito del report ricevuto il 25 ottobre 2026

Fonte: JSON `baseline_report` fornito dall'utente in chat, acquisito alle
13:23:23.488144 UTC. Non è una connessione dell'agente al progetto e il nome
del database `postgres` non identifica il project ref. Il report dichiara
`READ ONLY`, `search_path=pg_catalog`, timeout di 15s/3s e nessuna lettura di
righe applicative o chiamata alle funzioni catalogate.

| Controllo | Esito e limite |
| --- | --- |
| M01, oggetti rappresentativi | Tutti presenti; confronto esteso sotto, senza rieseguire la migrazione sul progetto |
| M02–M10 | Tutti i marcatori assenti, nessuna delle nove versioni registrata; candidate alla successiva applicazione con verifica dei prerequisiti specifici, non applicate in IN01 |
| Cronologia | Ricevute 7 versioni, elenco non troncato; M01 assente dalla cronologia pur essendo coerente nei controlli strutturali |
| `pg_cron` | Estensione 1.6.4 presente; nessun job letto o attestato |
| Auth, policy sessione, API e gate | Valori effettivi e comportamento funzionale non verificati da questa ricognizione |

**M01: coerente nei controlli strutturali eseguiti.** Riprodotte tutte le nove
impronte delle funzioni create o aggiornate da M01, con le ACL/esecuzioni,
proprietari, modalità definer/invoker, volatilità e `search_path` attesi.
`authenticated` può eseguire il contesto Admin; `anon` e `service_role` non
possono eseguirlo. Le funzioni tecniche conservano i destinatari previsti.

| Funzione | MD5 del report riprodotto localmente |
| --- | --- |
| `private.protect_admin_account_v1()` | `0d220aadfe24bc06ac6c511f845f9324` |
| `private.reject_admin_personal_owner_v1()` | `74f39043df8442042cd167525aaad8a3` |
| `private.assert_not_admin_account_v1(uuid)` | `666d532f07001e7d11b24082952ef701` |
| `private.require_admin_context_v1()` | `c530b6eec65685c805b1551ac349a990` |
| `public.admin_get_context_v1()` | `701b931eb57d6b025c5879ecc1c79bb4` |
| `private.provision_auth_user(uuid,text,jsonb)` | `10681b6b7fc43aa64d21879dd96ec9a6` |
| `private.registered_internal_user_id(uuid)` | `4bd9919e9306bf7dcdecebf15fb5c599` |
| `public.complete_registration_v1(uuid)` | `52bf6d29c7fb6cf858bec6dd7817dc1a` |
| `public.publish_announcement_v2(uuid,jsonb,text,text,text)` | `3423db40cd1e03c107310e6a066def7e` |

Le differenze iniziali delle impronte erano riproducibili con i ritorni a
capo CRLF nei corpi SQL. Per i wrapper di provisioning/pubblicazione sono
stati ricostruiti anche gli aggiornamenti Web successivi alla fixture minima,
compresi rinomina servizi, consensi, campi profilo, anonimato, highlights e
squadre attuali; mantenuti i ritorni a capo introdotti dalle singole patch.
Il confronto usa PGlite/PostgreSQL 18.3 contro il report PostgreSQL 17.6:
coincidenza degli hash per questi oggetti, non equivalenza generale delle versioni.
Script e log del confronto dei nove hash sono conservati localmente in
`.local/dashboard-integration/compare-m01.mjs` e
`.local/dashboard-integration/m01-hash-comparison.jsonl`, esclusi da Git.
Sono estratti mirati, non una copia completa del report del progetto.

Coincidono inoltre le impronte dei tre trigger di protezione su `utente`,
`profilo` e `annuncio`, tutti abilitati, e del vincolo
`admin_account_not_registered_v1`, validato. La tabella privata della policy
sessione ha colonne/default, quattro vincoli CHECK/PK e indice primario
coerenti, RLS attiva e nessun privilegio CRUD ai ruoli API. I vincoli NOT NULL
sono confrontati tramite le colonne: PostgreSQL 18 li espone anche come
vincoli di catalogo distinti. Sul progetto `authenticated` non può inserire o
aggiornare `utente`, né le quattro colonne di identità controllate; l'indice
univoco su `auth_user_uuid` è presente e valido.

Questi riscontri non attestano contenuto della policy sessione, account
dedicati, sessioni Auth reali o autorizzazione funzionale. Non occorre
rieseguire M01. Entrambe le query di ricognizione sono state completate
dall'utente e associate al destinatario identificato. Non occorre ripetere i report.

### Cronologia ricevuta e decisione di riconciliazione

Il secondo report è stato acquisito il **25 ottobre 2026 alle
13:35:59.569894 UTC**, versione 1, `transaction_read_only=on`.
`returned_count=7` coincide con il numero di versioni distinte; `truncated=false`.
Tutte le versioni corrispondono a un solo file nel repository:

| Versione registrata | Migrazione locale |
| --- | --- |
| `20260823154343` | `registration_profile_provisioning` |
| `20260823154731` | `registration_intent_deny_policy` |
| `20260823162929` | `profile_dashboard_connection` |
| `20260824195350` | `publish_announcement_workflow` |
| `20260824195359` | `reconcile_auth_identity_registration` |
| `20260907152850` | `auth_email_identity` |
| `20260907154436` | `optimize_auth_email_identity_lookup` |

Il repository contiene attualmente **77 migrazioni**: **70 versioni locali
non sono registrate** nel risultato, comprese tutte M01–M10. Non significa
che siano 70 migrazioni da eseguire: M01 ha già nove impronte e controlli
strutturali coerenti; i wrapper Web confrontati incorporano anche aggiornamenti
successivi alle sette versioni elencate. La cronologia non rappresenta quindi
tutti i cambiamenti osservati nel catalogo. Il dato non permette di stabilire
come o quando quei cambiamenti siano stati applicati.

Decisione per il seguito:

- **M01:** mantenere gli oggetti presenti, senza replay. Registrare separatamente
  l'assenza della versione `20261024095639`; nessun inserimento nella cronologia
  o `migration repair` eseguito o richiesto in questa ricognizione.
- **M02–M10:** versioni non registrate e marcatori assenti. Sono le candidate
  Admin per il passaggio successivo, nell'ordine del runbook, con verifica dei
  prerequisiti effettivi e delle eventuali parti già presenti prima delle mutazioni.
- **Altre 60 versioni locali non registrate:** assenza nella cronologia non
  equivale ad assenza nello schema. Non avviare un `db push` globale, reset o
  replay della baseline Web per riallineare automaticamente i numeri.

Il report completo della cronologia ricevuta e il confronto con l'elenco
locale sono conservati in
`.local/dashboard-integration/migration-history-20261025.json`, escluso da Git;
nome/ref associati su dichiarazione dell'utente. Nessuna connessione, riparazione della cronologia
o migrazione remota eseguita dall'agente. Controllati conteggio, unicità delle
versioni e corrispondenza univoca con i file locali; nessuna nuova esecuzione
dei test applicativi necessaria per questo aggiornamento documentale.

Verifiche eseguite il 25 ottobre 2026:

- **8 test PGlite riusciti**, senza rete o env, in
  `tests/admin-baseline-inspection.test.mjs`: oggetti assenti, sola M01 e tutte
  M01–M10; transazione read only e ripristino delle impostazioni locali;
  schema/funzioni/policy/trigger e righe canary invariati; nessuna invocazione
  delle funzioni catalogate; nessun corpo, valore applicativo o impostazione
  riservata nel risultato; variazioni di definizioni/ACL e privilegi ereditati
  per colonna; presenza parziale e cronologia vuota, limitata o illeggibile.
- **1.320 test Node/PGlite su 92 file riusciti, zero fallimenti/skip**,
  log `node_modules/.cache/dashboard-in01-regression.log`. I nuovi otto test
  sono inclusi nel totale. ESLint sul nuovo file di test riuscito.
- Verificato nel [sorgente pubblico postgres-meta](https://github.com/supabase/postgres-meta/blob/master/src/lib/db.ts)
  che il gestore delle query conserva l'ultimo risultato con righe anche dopo
  comandi senza righe; lo script restituisce un solo report e termina con
  `ROLLBACK`. Questa lettura del sorgente non attesta la versione o il
  comportamento del servizio attualmente distribuito sul tuo progetto.

Nessuna build/server/browser avviati, nessun Docker, dipendenza, env, codice
applicativo o migrazione modificati. L'agente ha eseguito SQL **soltanto
nelle fixture in memoria**; la ricognizione sul progetto è documentata dal
report fornito dall'utente, senza connessione remota dell'agente.

### Passaggio successivo: M02 — foundation audit

Il prossimo step usa il file esistente
[20261024104822_admin_audit_foundation.sql](../../../supabase/migrations/20261024104822_admin_audit_foundation.sql),
con procedura di applicazione, verifica e recupero nel runbook. Dalla lettura
del file e dai riscontri IN01 risultano presenti i prerequisiti strutturali
diretti: schema `private` con privilegi CREATE per l'operatore `postgres` e
`private.require_admin_context_v1()` coerente con M01. M02 crea una tabella
audit privata, tre indici e quattro funzioni interne, con RLS e revoche ai
ruoli API; l'applicazione non invoca le funzioni di manutenzione né configura
job Cron o impostazioni Auth.

Questa lettura non attesta M02 applicata o una prova Auth funzionale. Nel
prossimo step vanno preparati i controlli specifici prima/dopo l'applicazione
sul destinatario identificato e soddisfatte le precondizioni operative del
runbook. La ricognizione IN01 è completa, con nessuna operazione manuale
residua. **Modello consigliato per M02: 6.1 Sol, high.**

Riferimenti: [transazioni PostgreSQL](https://www.postgresql.org/docs/17/sql-set-transaction.html)
e [funzioni di introspezione](https://www.postgresql.org/docs/17/functions-info.html).
