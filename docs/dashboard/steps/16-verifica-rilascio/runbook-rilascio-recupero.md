# Runbook — rilascio e recupero della dashboard

**Preparato il:** 25 ottobre 2026 · **Aggiornato il:** 27 ottobre 2026 · **Esecuzione esterna:** installazioni e prerequisiti riscontrati fino a IN02; applicazioni MCP documentate, prove reali Auth/PostgREST ancora da eseguire.

[Master](../../master_plan.md) · [Step 16](README.md) · [Scheda 16B](16b-runbook.md)
· [Matrice delle evidenze](matrice-verifiche.md)

## 1. Cosa fare adesso

**M02 — foundation audit Concluso nel registro operativo**, sul progetto identificato in
IN01. La [guida M02](../../integrazione/02-audit.md) contiene controllo prima/dopo,
file di migrazione esistente e recupero. M02 è già applicata e verificata;
la [copia manuale per Supabase Free](../../integrazione/backup-free.md) ha il report
positivo del 25 ottobre, 18:20:16 UTC. Checkpoint dopo M02 e prima di M03;
restore non provato. **M03 ora Concluso nel registro operativo**:
[guida M03](../../integrazione/03-audit-backend.md) e
[controllo prima/dopo](../../../../supabase/scripts/dashboard_admin_check_m03.sql),
211 test mirati e lint riusciti. Controllo iniziale utente delle 18:32:15 UTC
positivo, prerequisiti coerenti e nessun oggetto M03. Report finale utente delle
18:34:27 UTC `m03_structurally_verified`, due funzioni coerenti e tutti i controlli
booleani veri; EXECUTE solo tecnico tra i ruoli API verificati. Nessuna operazione
manuale residua M03. **M04 Concluso nel registro operativo**:
[guida](../../integrazione/04-elenco-annunci.md) e
[controllo cataloghi](../../../../supabase/scripts/dashboard_admin_check_m04.sql),
297 test mirati e lint riusciti. Report iniziale utente delle 18:52:10 UTC
positivo, 52 colonne corrispondenti, zero oggetti M04 e dieci impronte conservate.
Report finale utente delle **18:55:18 UTC**, `m04_structurally_verified`,
tre oggetti coerenti; confronto prima/dopo: **10/10 tabelle identiche, zero
differenze** nelle protezioni e nei privilegi effettivi. Nessuna operazione
manuale residua M04. **M05 — dettaglio annunci Concluso nel registro operativo**:
[guida](../../integrazione/05-dettaglio-annunci.md) e
[verificatore](../../../../supabase/scripts/dashboard_admin_check_m05.sql)
pronti, 379 test mirati e lint riusciti. Sei funzioni, 166 colonne su 25 tabelle
e undici unicità; report iniziale positivo del progetto acquisito alle
**19:16:35 UTC**: 166/166 colonne corrispondenti, prerequisiti coerenti, zero
oggetti M05 e protezioni delle 25 tabelle conservate.
Il report delle 19:08:28 UTC ha rilevato sei falsi negativi del verificatore su
date/orari nativi, ora corretti solo nei sei campi interessati. Migrazione e
schema invariati; per il controllo finale usare la stessa revisione corretta.
Report finale delle **19:19:12 UTC**, `m05_structurally_verified`, sei funzioni
coerenti e tutti i controlli booleani veri; confronto prima/dopo completato:
**25/25 tabelle identiche, zero differenze** nelle protezioni e nei privilegi
effettivi. Nessuna operazione manuale residua M05. **M06 — moderazione annunci
Concluso nel registro operativo:** [guida](../../integrazione/06-moderazione-annunci.md) e
[verificatore](../../../../supabase/scripts/dashboard_admin_check_m06.sql)
preparati, 458 test mirati e lint riusciti. Report iniziale completo del 26 ottobre,
09:45:00 UTC, positivo: 185 colonne corrispondenti, prerequisiti coerenti e zero
oggetti M06. Report delle 09:49:06 UTC: 26 oggetti attesi coerenti e protezioni/
metadati 27/27 invariati. Report delle 09:57:05 UTC: firma legacy pagamento a otto
argomenti identificata nel backup M02 con hash identici. M06A integrativa preparata
per conservare il flag anche su quella firma; 464 test mirati e lint riusciti.
Report finale versione 3 delle **10:27:00 UTC**: `m06_structurally_verified`,
26 oggetti e dodici routine coerenti, M06A riscontrata e nessuna firma inattesa.
Confronto finale 27/27 protezioni e 27/27 metadati identici, protezione pagamento
e ACL legacy invariati. Nessuna operazione manuale residua M06. Non riapplicare
M06, M06A o M05.
**M07A — Concluso:** [inventario iniziale e guida](../../integrazione/07-cestino.md),
report completo delle 11:25:16 UTC acquisito dallo
[script READ ONLY](../../../../supabase/scripts/dashboard_admin_check_m07.sql).
Zero oggetti M07, 33 tabelle e 17 routine; 27 protezioni e 27 metadati identici
al finale M06. Due firme sia per pagamento sia per checkout session, figlio
generico presente e snapshot profilo assente. Nessuna operazione manuale
residua M07A. **M07B Concluso:** diciassette definizioni riscontrate e
[nuovo verificatore prima/dopo](../../../../supabase/scripts/dashboard_admin_verify_m07.sql)
preparato. Report iniziale READ ONLY versione 2 delle **12:21:10 UTC** acquisito:
`ready_for_m07_catalog_checks_only`, 17 routine e 18 trigger esistenti coerenti,
zero marcatori M07. Confronto con M07A completato: **33/33 impronte identiche,
zero differenze** nei tredici campi per schema/nome, senza confrontare formati M06
e M07 diversi. Estratto selezionato, provenienza e confronto separato in .local;
limiti sorgente falsi conservati, gate non letto. Nessuna operazione manuale
residua M07B. Diciotto versioni finali riprodotte in PGlite,
128 test mirati e lint riusciti. Difetto preesistente della firma checkout a
sette argomenti riprodotto e documentato nella guida, funzionalità integrata
non attestata. M07C applicato e verificato successivamente via MCP alle 21:55 UTC:
18 routine, 19 trigger, 25 marcatori e 33/33 impronte invariate; gate
disabilitato. M07 resta Da terminare solo per l'attivazione separata nel
rilascio. M08 è stato successivamente applicato e verificato alle 22:06 UTC:
tre routine, 33/33 tabelle e 149/149 altre routine invariate, gate disabilitato.
M09 è stato successivamente applicato e verificato alle 22:14 UTC:
quattro funzioni e indice, 33 tabelle, audit/Auth e 152 altre routine
invariati; nessun SELECT API diretto. M10 è stato successivamente applicato
e verificato alle 22:22 UTC: quattro funzioni STABLE, 33 tabelle, audit/Auth
e 156 altre routine invariate. **IN02 — Auth e accesso Admin Concluso**:
policy applicata dopo consenso esplicito, attestata alle 10:40:38 UTC;
su ulteriore deroga esplicita l'account esistente è stato promosso a Admin,
con registrazione e contenuti conservati. Eccezione al CHECK limitata alla
coppia Auth/applicativa, trigger originale ripristinato e protezioni invariate;
migrazione remota `20261027104542_admin_existing_account_exception`.
53 test mirati e lint riusciti, verifica MCP positiva e 25 riscontri advisor
preesistenti invariati. Nessun nuovo UUID richiesto; prossimo IN03 per le
prove reali di accettazione, non avviato. Stato
ed evidenze nella [scheda IN02](../../integrazione/auth-accesso-admin.md).
Il verificatore non chiama
funzioni applicative né legge audit; nessuna nuova copia richiesta ora.
I test locali si eseguono dalla root con `npm test`,
senza Docker, Supabase locale o credenziali; non applicano SQL sul progetto.

Aggiornamento 16H: **verifiche locali terminate**, 1.312 test Node/PGlite
riusciti e otto gruppi browser finali su produzione locale, più tre controlli
tecnici. Evidenze, BFcache esclusa da Chrome e sei gruppi finiti di condizioni
esterne nella [scheda 16H](16h-chiusura-locale.md). Lo step 16 mantiene aperte
integrazione Supabase e rilascio; nessun nuovo sottopasso locale è richiesto.

**IN01 Concluso:** l'utente ha confermato che il progetto Supabase
esistente utilizzato da `apps/web` contiene soltanto propri dati di prova.
Il primo report cataloghi ricevuto è coerente con M01 nei controlli strutturali
eseguiti, con nove hash di funzione riprodotti; i marcatori M02–M10 sono assenti.
La [guida di ricognizione](../../integrazione/01-ricognizione.md) registra
riscontri e limiti. La cronologia ricevuta riporta sette versioni, tutte note
al repository, senza troncamento; M01 non registrata nonostante gli oggetti
coerenti. Decisione documentata: conservare M01 senza replay o riparazioni
automatiche; verificare i prerequisiti delle candidate M02–M10 prima di applicarle.
Destinatario di entrambe le query identificato dall'utente: **Webapp Bacheca
Dilettanti**, ref `nsytraextbndfyprwzts`. Nessuna operazione manuale residua
IN01. Il successivo M02 è stato applicato e verificato come riportato sotto.

L'intervento corrente riguarda solo M02: applicazione e verifica strutturale
riscontrate nel report finale dell'utente delle 14:21 UTC, nove oggetti
coerenti e tutti i controlli veri. Acquisito anche il riepilogo della copia
manuale delle 18:20:16 UTC, tutti e sei i controlli veri; nessun'altra operazione
manuale M02 da eseguire. Copia successiva alla migrazione, restore non provato.
124 test mirati e lint già riusciti; nessuna applicazione remota dell'agente.
Le sezioni successive descrivono anche i passaggi di
integrazione e rilascio successivi: prima delle mutazioni servono baseline
riconciliata e backup recuperabile; prima del rilascio, le evidenze di
accettazione richieste e la decisione di rilascio. Le prove
integrate si svolgono soltanto su un ambiente isolato con dati sintetici;
la produzione non viene usata come fixture. Docker non è richiesto dal percorso.

Lo script del cestino oggi dichiara esplicitamente come destinatario un target
isolato verificato: non è un comando da trasferire sul reale solo perché è
disponibile. Una futura procedura di attivazione reale dovrà essere approvata
con le evidenze e il destinatario effettivi, rispettando queste precondizioni.

## 2. Identificare ambiente, revisione e responsabilità

Aprire una scheda operativa riservata all'intervento, senza segreti. Compilare
questi campi prima di applicare file o cambiare impostazioni; non dedurli da
un `.env.local` o dalla selezione rimasta aperta nel browser.

| Campo | Stato della consegna 16B |
| --- | --- |
| Tipo di intervento: accettazione sintetica oppure rilascio reale | Da confermare; nessun intervento esterno avviato |
| Project ref, nome e versione PostgreSQL Supabase destinatari | IN01: **Webapp Bacheca Dilettanti**, `nsytraextbndfyprwzts`, identificato dall'utente dal pannello; PostgreSQL 17.6 dal report. Ricontrollare il contesto prima delle mutazioni |
| Origine API e corrispondenza con Web/Admin nello stesso ambiente | Da confermare; non registrare chiavi |
| Progetti Vercel Web/Admin, team e ambienti interessati | Da confermare |
| Host Web previsto `https://www.bachecadilettanti.it` | Riferimento architetturale, configurazione effettiva non verificata qui |
| Host Admin previsto `https://dashboard-bacheca.vercel.app` | Disponibilità/assegnazione da confermare; non dichiarato già distribuito |
| Revisione sorgente, lockfile e artefatti compatibili delle due app | Da fissare prima dell'intervento; nessun commit/deploy prodotto da 16B |
| Operatore SQL autorizzato, responsabile app e finestra di intervento | Da confermare |
| Backup, copertura Storage, prova di recupero e punto di ritorno applicativo | Da confermare, secondo §3 |
| Evidenze di accettazione e decisione di procedere | Aperte: vedere matrice V01–V20 |

Per eventuali runner esterni con dati sintetici, `assertTestTarget` deve essere
eseguito nello stesso processo/configurazione che eseguirà l'operazione. Il
comando `npm run check:test-target:admin` è soltanto un controllo della
configurazione Admin: non cambia la destinazione di altri strumenti e non
dimostra che un progetto contenga esclusivamente dati sintetici. Non aggiungere
la produzione alla lista consentita. Questa configurazione non serve a PGlite.

## 3. Backup e recuperabilità prima delle modifiche

1. **Il progetto attuale è sul piano Free**, confermato dall'utente: Database
   Backups automatici e PITR non sono disponibili. Usare la
   [guida di copia manuale](../../integrazione/backup-free.md) e lo
   [script PowerShell](../../../../scripts/dashboard-backup/run.ps1), con client
   PostgreSQL 17 portabili e Session pooler, senza Docker o upgrade del piano.
   Registrare data e copertura dal riepilogo; il checkpoint attuale è dopo M02
   e prima di M03. Su eventuali altri piani verificare prima le funzionalità
   effettive, senza trasferire qui prerequisiti Pro.
2. Verificare che la copertura includa schema, dati applicativi, audit e dati Auth
   necessari; registrare separatamente configurazioni esterne, ruoli/credenziali
   da ripristinare e versioni compatibili delle app. Un dump schema-only non è
   un backup dei dati. Un ripristino parziale non prova il recupero dell'insieme.
3. Proteggere separatamente gli oggetti Storage, in particolare
   `immagini_annunci`, insieme a metadati e policy coerenti. Il backup database
   contiene metadati Storage, **non gli oggetti salvati tramite Storage API**.
   [Documentazione backup Supabase](https://supabase.com/docs/guides/platform/backups)
4. Prima di usare il backup come punto di ritorno, verificare la procedura di
   recupero in un contesto riservato distinto dai test applicativi. Non importare
   copie di dati reali nelle fixture o nell'ambiente sintetico. Se non esiste
   evidenza di recuperabilità, non registrare il backup come verificato.

Prima esportazione del database eseguita dall'utente il 25 ottobre alle 18:10
UTC; dump, ruoli e leggibilità positivi, falso errore public corretto nel
verificatore. Seconda copia positiva riscontrata nel report utente delle
18:20:16 UTC: stato `archive_verified_restore_untested`, sei controlli veri,
dimensioni e SHA-256 registrati nella guida Free. M02 chiuso con quei limiti.
Nessuna esportazione del database o prova di ripristino è stata eseguita
dall'agente, che ha letto solo l'indice locale dell'archivio. Il percorso Free prepara schema+dati custom, inventario dei ruoli
senza password e verifica locale dell'intero archivio, senza eseguire restore.
`archive_verified_restore_untested` documenta solo la leggibilità della copia:
il checkpoint M02 può essere registrato con quel limite, mentre V20 e la
recuperabilità completa restano non attestati fino alla prova separata e alla
copertura di Storage/configurazioni esterne. Un riepilogo `incomplete` non
permette di procedere a M03. Non ripristinare sul progetto sorgente.

## 4. Riconciliare baseline e migrazioni già presenti

La sequenza seguente presume una **baseline Web completa e coerente** precedente
alla foundation Admin. Non crea da sola un progetto vuoto e non equivale alla
fixture minima PGlite. Confrontare le migrazioni Web del repository con lo schema
effettivo, incluse Auth/registrazione, pubblicazione, undici tipi di dettaglio e
raccolte, pagamenti/ricevute, interazioni/notifiche, regioni e Storage.
Fra i prerequisiti Web c'è anche
[`20261022230902_fix_deferred_activity_trigger_permissions.sql`](../../../../supabase/migrations/20261022230902_fix_deferred_activity_trigger_permissions.sql):
la sua presenza non dimostra da sola che il resto della baseline sia completo.

Come operatore autorizzato, leggere la cronologia migrazioni e i cataloghi del
destinatario. Per ogni file registrare revisione/checksum locale, presenza in
cronologia, definizioni effettive degli oggetti, dipendenze, proprietari e ACL.
I file del repository restano la fonte unica del SQL; non ricopiarli nel runbook.

**Foundation già dichiarata applicata:** il report fornito dall'utente il
25 ottobre corrobora l'applicazione di
`20261024095639_admin_authorization_foundation.sql` nei controlli strutturali
registrati in IN01; non è una prova funzionale o connessione remota dell'agente.
Il report della cronologia delle 13:35 UTC non contiene la versione M01.
La discrepanza è registrata esplicitamente in IN01: conservare gli oggetti
coerenti, senza replay o modifica automatica della cronologia. Prima di procedere:

- Confrontare anche le definizioni dei controlli, trigger, revoche e RPC con il
  file; la sola presenza di una tabella o del nome di funzione non basta.
- Se gli oggetti coincidono, registrare l'applicazione verificata e non rilanciare
  il file. Se cronologia e cataloghi divergono, sospendere la sequenza per una
  riconciliazione esplicita; nessun `migration repair` o correzione automatica.
- Se gli oggetti sono incompleti/differenti, non nascondere il problema con
  `IF NOT EXISTS`, rimozioni o reinserimenti. Preparare una correzione separata,
  verificata sulle dipendenze effettive, prima di proseguire.

Nessun `db push`, reset o replay indiscriminato è previsto. In particolare,
un file mancante nella cronologia non è automaticamente una migrazione da
eseguire. Non rimuovere oggetti o dati per forzare la sequenza.

## 5. Registro delle dieci migrazioni Admin

**Stato comune:** tutti i file sono preparati e provati nelle fixture PGlite;
nessuno è stato applicato o verificato tramite connessione Supabase dall'agente.
M01 ha i riscontri strutturali del report utente documentati al §4 e in IN01;
M02 ha il confronto strutturale finale positivo dell'utente, descritto nella
guida M02. M03 ha il report finale utente delle 18:34:27 UTC con due funzioni
e definizioni/privilegi corrispondenti. Il precedente report IN01 riportava
marcatori/versioni M03–M10 assenti; i report successivi riscontrano le applicazioni
senza riconciliare automaticamente le voci manuali precedenti. Applicazione esterna
**attestata fino a M10 nei controlli strutturali**; M07C, M08, M09 e M10 sono conclusi con struttura verificata,
33/33 impronte invariate e gate disabilitato. Prove funzionali integrate
ancora distinte dall'installazione strutturale.
Per M04 il verificatore comprende 52 colonne richieste, due funzioni, indice
ordinato e impronte delle protezioni di dieci tabelle. Entrambi i report sono
conservati localmente; finale delle 18:55:18 UTC strutturalmente verificato e
confronto separato completato: 10/10 tabelle identiche, zero differenze.
Il report SQL conserva `limits.table_protections_compared=false`; l'evidenza del
confronto è in `.local/dashboard-integration/m04-protection-comparison-20261025T185518Z.json`.
Gateway/Auth, esposizione Data API e restore completo restano verifiche distinte.

Per M05 il percorso prima/dopo è completato: `ready_for_m05_catalog_checks_only`,
`m05_prerequisites_match=true` e zero oggetti nel report iniziale, poi
`m05_structurally_verified` e sei funzioni corrispondenti nel report finale delle
19:19:12 UTC. Confronto separato delle 25 tabelle riuscito, zero differenze;
non riapplicare M05 su questa installazione verificata. Nessun helper o
RPC viene chiamato dal verificatore. Le 52 colonne M04 restano esatte; i nuovi
campi ammettono le rappresentazioni compatibili esplicitate in `expected_type`,
con `actual_type` completo. Divergenze richiedono revisione, non replay o grant.
La correzione del controllo successiva al report delle 19:08 ammette anche
`date` per i quattro estremi del periodo staff/partita e `time without time zone`
per i due orari partita. Il report originale resta invariato e non autorizza
l'applicazione; la nuova baseline positiva è stata acquisita alle 19:16:35 UTC
e conservata in `.local/dashboard-integration/m05-before-20261025T191635Z.json`.
Report finale in `.local/dashboard-integration/m05-after-20261025T191912Z.json`;
confronto in `.local/dashboard-integration/m05-protection-comparison-20261025T191912Z.json`.
`limits.table_protections_compared=false` resta invariato nel report SQL originale;
il risultato positivo del confronto è documentato separatamente. Gateway/Auth,
esposizione Data API e ripristino completo restano condizioni distinte.

Per M06 seguire la [guida dedicata](../../integrazione/06-moderazione-annunci.md).
Prima acquisire il report READ ONLY `ready_for_m06_catalog_checks_only`,
`m06_prerequisites_match=true`, zero oggetti, versioni iniziali dettaglio e
pagamento coerenti. Solo dopo la revisione applicare una volta M06 e rieseguire
lo stesso controllo: attesi `m06_structurally_verified`, 26 oggetti e versioni
finali previste. Alcuni booleani `before_matches` diventano falsi dopo M06.
Confrontare tutte le 27 protezioni e 27 metadati invarianti per schema/tabella,
escludendo soltanto il nuovo flag e i sedici trigger controllati separatamente,
e la protezione della funzione pagamento. Le due modifiche previste alle
funzioni M05 non richiedono replay di M05. Nessuna funzione applicativa invocata;
report iniziale positivo acquisito alle 09:45:00.918396 UTC del 26 ottobre in
`.local/dashboard-integration/m06-before-20261026T094500Z.json` con provenienza
separata e baseline di 27 protezioni/metadati. Commit e confronto finale esterni
riscontrati dal report delle 09:49:06 UTC e dal confronto separato: 26 oggetti
attesi coerenti, 27/27 protezioni e 27/27 metadati identici, protezione pagamento
invariata. Resta lo stato `m06_partial_or_drift_require_review` per conteggio
routine inatteso nel primo report. L'inventario delle 09:57 identifica gli otto
argomenti preesistenti, confermati nel backup M02 (hash corpo e ACL identici).
Il ramo legacy non conserva il flag: preparata la correzione separata M06A,
senza nuove API/grant o righe modificate. Applicare solo M06A dopo M06, poi
verificatore versione 3: dodici firme note sul target, tutte con corpo corretto;
ogni ulteriore overload resta negato. Percorso completato dal report versione 3
delle 10:27:00.881719 UTC: M06A riscontrata, M06 strutturalmente verificato,
27 protezioni e 27 metadati invariati nel confronto finale separato.
Report in `.local/dashboard-integration/m06-after-20261026T102700Z.json`, confronto
in `.local/dashboard-integration/m06-protection-comparison-20261026T102700Z.json`.
Nessun replay delle installazioni verificate. La copia Free
dopo M02 resta acquisita, restore non provato; nessuna nuova copia richiesta ora.

La colonna «Precedente» fissa l'ordine operativo conservativo della prima
versione, anche quando una funzione ha meno dipendenze SQL dirette.

| ID / step | File sorgente | Precedente | Verifica specifica dopo commit |
| --- | --- | --- | --- |
| M01 · 03A | [20261024095639_admin_authorization_foundation.sql](../../../../supabase/migrations/20261024095639_admin_authorization_foundation.sql) | Baseline Web riconciliata | `public.admin_get_context_v1()` e `private.admin_session_policy_v1`; ruolo/account protetti, policy non attestata nega l'accesso |
| M02 · 04A | [20261024104822_admin_audit_foundation.sql](../../../../supabase/migrations/20261024104822_admin_audit_foundation.sql) | M01 verificata | `private.admin_audit_event_v1`, RLS/revoche, helper di scrittura e `private.purge_admin_audit_events_v1()`; nessun job creato |
| M03 · 04B | [20261024110910_admin_audit_server_bridge.sql](../../../../supabase/migrations/20261024110910_admin_audit_server_bridge.sql) | M02 verificata | `public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)` riservata al backend, senza privilegi di autorizzazione umana |
| M04 · 07A | [20261024120724_admin_announcement_list.sql](../../../../supabase/migrations/20261024120724_admin_announcement_list.sql) | M03 verificata | `public.admin_list_announcements_v1(jsonb)`, indice ordinato, grant/policy tabelle invariati |
| M05 · 07B | [20261024145954_admin_announcement_detail.sql](../../../../supabase/migrations/20261024145954_admin_announcement_detail.sql) | M04 verificata | `public.admin_get_announcement_v1(uuid)`, snapshot e proiettori privati non eseguibili dai client |
| M06 · 09 | [20261024155838_admin_announcement_moderation.sql](../../../../supabase/migrations/20261024155838_admin_announcement_moderation.sql) | M05 verificata | `public.admin_moderate_announcement_v1(uuid,text,text,text)`, flag `oscurato_da_admin` e trigger su parent/figli |
| M06A · completamento M06 | [20261026100239_admin_m06_legacy_payment_hold_compatibility.sql](../../../../supabase/migrations/20261026100239_admin_m06_legacy_payment_hold_compatibility.sql) | M06 applicata, firma legacy a otto argomenti presente e hash/ACL esatti del report delle 09:57 | Correzione della sola firma legacy, oscuramento/motivo preservati; nessun grant o rimozione. Applicazione e struttura riscontrate dal report finale delle 10:27; non ripetere |
| M07 · 10 | [20261024162714_admin_announcement_trash.sql](../../../../supabase/migrations/20261024162714_admin_announcement_trash.sql) | M07A/M07B Conclusi | M07C Concluso: versione remota 20261026215511, struttura finale e 33/33 impronte verificate; gate disabilitato. Non riapplicare. Attivazione distinta; proseguire con M08 |
| M08 · 11 | [20261024205423_admin_announcement_export.sql](../../../../supabase/migrations/20261024205423_admin_announcement_export.sql) | M07 verificata | Concluso: versione remota 20261026220629, tre routine verificate, 33/33 tabelle e 149/149 altre routine invariate; gate disabilitato. Prossimo M09; non riapplicare |
| M09 · 12 | [20261024211431_admin_audit_reads.sql](../../../../supabase/migrations/20261024211431_admin_audit_reads.sql) | M08 verificata | Concluso: versione remota 20261026221418, quattro funzioni e indice corretti, SELECT API negato; 33 tabelle, audit/Auth e 152 altre routine invariati. Non riapplicare; prossimo M10 |
| M10 · 13 | [20261024212824_admin_home_aggregations.sql](../../../../supabase/migrations/20261024212824_admin_home_aggregations.sql) | M09 verificata | Concluso: versione remota 20261026222201, quattro funzioni STABLE, 33 tabelle, audit/Auth e 156 altre routine invariate; gate disabilitato. Non riapplicare; prossimo IN02 |

### Procedura comune per ciascuna migrazione ancora mancante

1. **Destinatario:** ambiente sintetico identificato per l'accettazione; in un
   futuro rilascio, soltanto il progetto nominato nell'autorizzazione distinta,
   dopo evidenze di accettazione e backup. Controllare project ref e ruolo
   dell'operatore prima di aprire il SQL Editor. Non usare la chiave client.
2. **Applicazione:** come operatore SQL `postgres`, aprire il file sorgente della
   revisione approvata ed eseguirlo **intero una volta**, dopo il precedente
   verificato. Tutti i dieci file hanno `BEGIN`/`COMMIT`; M07–M10 impostano anche
   `lock_timeout` locale a 10 secondi. Non estrarre singoli frammenti per superare
   guardie o cambiare i timeout durante il tentativo.
3. **Verifica:** confermare commit, cataloghi e controllo specifico della riga.
   Confrontare firme, owner, `SECURITY INVOKER` dei wrapper funzionali,
   `SECURITY DEFINER` dei ponti privati e `search_path` vuoto dove previsto dal
   sorgente. Controllare i privilegi effettivi ereditati, non soltanto `proacl`.
   `private` resta fuori dagli schemi esposti dalla Data API.
4. **Autorizzazione:** le RPC funzionali sono per sessioni umane `authenticated`
   con ruolo esatto `Admin`; anonimi, ordinari e client tecnici sono negati.
   M03 è l'eccezione backend per attestazioni audit, non una RPC di lettura o
   moderazione. I test dei rami autorizzati richiedono gli account sintetici e
   la policy verificata del §7, non avvengono implicitamente al commit SQL.
5. **Errore:** se non c'è commit, fare `ROLLBACK` quando la sessione risulta ancora
   in transazione fallita, verificare cataloghi/lock/prerequisiti e correggere la
   causa. In caso di risposta persa, accertare prima se il commit è avvenuto:
   non ripetere alla cieca. Dopo un commit verificato non riapplicare il file;
   correggere in avanti con una migrazione separata, preservando dati e audit.

Il registro dell'intervento deve contenere per ogni M01–M10: ambiente, checksum,
esito commit, ora, operatore, controlli eseguiti e stato di cronologia/cataloghi.
Le prove funzionali complete, gli advisor e le misure restano condizioni
separate della [matrice](matrice-verifiche.md), non conseguenze dell'esistenza RPC.

## 6. Configurare e distribuire le app compatibili

Creare/configurare **due progetti Vercel distinti** della stessa repository,
ciascuno con la propria Root Directory e variabili per ambiente.
[Riferimento Vercel per monorepo](https://vercel.com/docs/monorepos)

| Impostazione | Web | Admin |
| --- | --- | --- |
| Root Directory | `apps/web` | `apps/admin` |
| Build nel workspace selezionato | `npm run build` | `npm run build` |
| Lockfile e pacchetti condivisi | Lockfile root; includere i file esterni alla Root Directory necessari ai workspace | Stesso lockfile, `@bacheca/database` incluso |
| API Supabase | Progetto dello stesso ambiente dell'Admin | Stesso progetto della Web nello stesso ambiente |
| Preview / prove esterne | Soltanto destinazione isolata con dati sintetici | Soltanto la stessa destinazione sintetica |
| Produzione | Destinatario confermato e autorizzato separatamente | Destinatario confermato e autorizzato separatamente |

Conservare l'installazione npm dalla root del monorepo. Se si configura un
comando Install esplicito eseguito da `apps/web` o `apps/admin`, usare
`cd ../.. && npm ci`; se il contesto è già la root, usare soltanto `npm ci`.
Verificare il contesto nei log della build, senza stampare variabili. Non creare
lockfile nelle app o eseguire migrazioni nei comandi Install/Build.

Variabili **Admin**, senza valori da riportare qui:

| Nome | Utilizzo e verifica |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Origine del progetto destinatario; nessuna credenziale/path/query incorporati; corrisponde alla Web dello stesso ambiente |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chiave pubblica del medesimo progetto; non conferisce privilegi Admin |
| `SUPABASE_SECRET_KEY` | Solo server, client tecnico separato per `admin_record_server_audit_v1`; necessaria al percorso login/audit, mai prefisso `NEXT_PUBLIC_` |
| `BACHECA_TEST_TARGET` | Solo eventuali runner esterni sintetici: `local` o `staging`; non seleziona la destinazione dell'app né autorizza produzione |
| `BACHECA_TEST_ALLOWED_SUPABASE_ORIGINS` | Solo eventuali runner esterni: origini sintetiche esplicitamente consentite; non necessaria a `npm test` |

Mantenere le altre variabili Web già necessarie ai suoi flussi e i suoi ambiti
Preview/Production; questa consegna non ne legge o modifica i valori. Non
copiare automaticamente `.env.local` fra app o verso Vercel. Le variabili
pubbliche sono incorporate durante la build: dopo una variazione predisporre
un nuovo artefatto verificato, non presumere che basti cambiare il pannello.

**Ordine:** schema compatibile verificato → entrambe le app compatibili → prove
end-to-end e cache/Storage → eventuale attivazione cestino. Mantenere il gate
falso durante distribuzioni non simultanee. Il rollback Web ammesso deve già
rispettare i contenuti cestinati; vedere §9. Non collegare Preview al reale.

Non modificare il Site URL o i template Auth condivisi per farli puntare alla
dashboard. Il login Admin email/password usa redirect interni fissi e non
introduce callback email. Il recupero password è riservato all'operatore secondo
[step 05](../05-accesso-sessione.md). Qualsiasi modifica futura dei redirect
deve preservare i flussi Web e usare host effettivamente verificati.

Cookie Admin `bacheca-admin-auth-token`, `path=/`, `sameSite=lax`, Secure in
produzione, senza dominio condiviso con Web. Verificare che login/logout Admin
non alterino i cookie Web, che la sessione scaduta apra `/accesso` e che una
sessione ordinaria sia negata anche su URL/RPC diretti. Confermare gli header
`X-Robots-Tag` e private/no-store sull'HTTP reale e l'assenza di segreti nei bundle.

## 7. Account dedicato e policy della sessione: operazioni distinte

Le procedure qui sotto sono per l'ambiente identificato e autorizzato; per le
prove usare soltanto identità sintetiche. I file restano in `supabase/scripts`,
non nelle migrazioni automatiche. Non riscrivere i template con dati reali
durante 16B e non eseguirli per proseguire lo sviluppo.

### 7.1 Provisioning Admin

**File:** [dashboard_admin_provision.sql](../../../../supabase/scripts/dashboard_admin_provision.sql).
**Prerequisiti/ordine:** M01 e baseline verificati; per provare il login devono
essere pronti anche M02/M03, credenziali audit server e policy §7.2.

1. Nel pannello Auth del destinatario creare un'identità dedicata, con email
   confermata, distinta dall'account personale; niente registration intent o
   metadata di ruolo. Non convertire un account ordinario registrato o con contenuti.
2. In una copia operativa riservata del file impostare `v_auth_user_id` al suo
   UUID Auth, **non** a `utente.utente_uuid`. Conservare password e chiavi fuori
   dalla documentazione e dai log. Eseguire il file intero come operatore SQL.
3. Verificare una sola riga collegata da `utente.auth_user_uuid`, valore esatto
   `tipologia_utente='Admin'`, `registrato_il IS NULL` e assenza di profili/contenuti
   personali. Registrare l'esito senza trascrivere credenziali.
4. **Errore/recupero:** il placeholder genera `ADMIN_AUTH_UUID_REQUIRED`, identità
   non pronta `ADMIN_AUTH_IDENTITY_NOT_READY`, account incompatibile
   `ADMIN_REQUIRES_DEDICATED_ACCOUNT`. Non aggirare queste guardie. Dopo rollback
   correggere identità/destinatario; non eliminare contenuti per convertire un
   account. Un commit incerto richiede rilettura della riga prima di riprovare.

Per recupero password o account compromesso seguire la procedura operatore
dello step 05: cambio password, revoca globale verificata e vecchi token negati.
Il pulsante Logout usa scope locale e non sostituisce questa procedura.

### 7.2 Attestare le impostazioni Auth effettive

**File:** [dashboard_admin_verify_session_policy.sql](../../../../supabase/scripts/dashboard_admin_verify_session_policy.sql).
**Prerequisiti/ordine:** M01 verificata, impostazioni reali dell'ambiente lette
dal suo pannello Auth e limiti confrontati con la logica dello step 03. Non
servono i valori di un progetto diverso né quelli simulati nelle fixture.

1. Verificare timebox, timeout inattività, sessione singola e altri limiti Auth
   effettivamente presenti. Non disabilitare limiti del progetto per superare
   il controllo della dashboard. Se non sono supportati, fermarsi e pianificare
   l'adeguamento del controllo DB prima di aprire l'accesso.
2. Controllare sulla copia destinata a quel progetto i cinque parametri:
   `v_configuration_reviewed`, `v_timebox_seconds`,
   `v_inactivity_timeout_seconds`, `v_single_session_per_user`,
   `v_other_auth_limits_present`. Il file già compilato dall'utente non viene
   modificato da 16B: compilazione non equivale ad applicazione né verifica.
3. Eseguire il file completo soltanto dopo la revisione effettiva. Verificare
   nella riga singleton di `private.admin_session_policy_v1` valori coerenti,
   `verified_at` valorizzato e assenza di limiti non supportati. Nell'ambiente
   sintetico verificare prima il diniego senza attestazione, poi sessione valida,
   scadenza e revoca tramite Auth/PostgREST; non impostare claim manuali come
   sostituto della verifica del gateway.
4. **Errore/recupero:** `ADMIN_AUTH_SETTINGS_REVIEW_REQUIRED` indica revisione
   non attestata, `ADMIN_AUTH_SETTINGS_NOT_SUPPORTED_YET` limiti non supportati,
   `ADMIN_SESSION_POLICY_MISSING` prerequisito mancante. Non cambiare booleani
   per sopprimere l'errore senza controllarne la causa. Dopo cambiamenti Auth
   sospendere l'accesso operativo fino alla nuova verifica; non considerare
   valida per sempre la precedente attestazione.

Se manca la chiave audit, l'audit fallisce o la policy non è pronta, un login
negato/non disponibile non va risolto togliendo controlli. Il logout conserva
la pulizia locale anche in caso di errore del trasporto audit.

## 8. Accettazione e attivazioni finali

### Deroga IN02 già applicata

L'utente ha autorizzato una sola promozione dell'identità esistente del progetto,
con conservazione di registrazione, profili e annunci. La
[migrazione mirata](../../../../supabase/migrations/20261027104339_admin_existing_account_exception.sql)
è applicata (versione remota `20261027104542`): non riapplicare e non usarla
per futuri account. Il vincolo consente soltanto la coppia di ID originale;
il trigger account, il divieto di nuovi contenuti personali e la guardia Web
sono gli stessi di prima. Il provisioning §7.1 resta la regola per altri Admin.
Il consenso risolve anche il precedente rifiuto di applicare la policy.
Dettagli e recupero nella [scheda IN02](../../integrazione/auth-accesso-admin.md).
Per la baseline corrente usare il
[verificatore IN02 READ ONLY](../../../../supabase/scripts/dashboard_admin_verify_in02.sql):
il vincolo differisce intenzionalmente dal checkpoint M10.

**Chiusura finale — decisione del 28 ottobre:** dopo IN03, una sola
[task dello step 16](chiusura-finale.md) comprende tutte le verifiche residue,
le correzioni e la decisione di rilascio. Nessun nuovo «procedi» per ciascuna
voce di questo runbook. Destinazioni/accesso Vercel e connessione SQL sono
prerequisiti ancora da rendere disponibili o confermare; sono dichiarati
prima dell'avvio. Attivazioni dipendenti dal deploy e prima esecuzione Cron
restano operazioni del rilascio, senza attestarne preventivamente il successo.

**IN03 — accettazione reale Auth/PostgREST e Web/Admin, Concluso:**
30 controlli riusciti: endpoint/dinieghi, ingressi, letture protette, audit di
login negato/riuscito, rinnovo, logout/revoca, osservatore indipendente,
audit persistente del logout, dinieghi per identità Auth senza mapping e
isolamento Web/Admin in entrambe le direzioni con sessioni autentiche.
L'utente ha autorizzato il ciclo specifico dell'unica identità temporanea;
revoca/cancellazione e cookie rimossi verificati, helper e server Web di test
fermati. Nessuna operazione manuale residua IN03. Il gate del sito è stato
escluso soltanto nel processo Web locale, senza modificare env o configurazione.
I casi di ruolo/email e utente ordinario registrato non coperti da questa
sessione, oltre a compatibilità completa, prestazioni e recupero, restano
nella matrice generale. Esiti e limiti nella
[scheda IN03](../../integrazione/03-accettazione-auth.md).
Non confondere il contesto sintetico PGlite con una prova del gateway.
Nessun avvio automatico di attivazioni, retention o rilascio.

Prima di una decisione di rilascio associare le evidenze agli ID V01–V20 della
matrice, registrando ambiente, revisione, data, risultato e limiti. La tabella
seguente riassume l'ordine, senza ridurre la checklist completa dello step 16.

| Passaggio | Esito richiesto / punto di arresto |
| --- | --- |
| Auth e autorizzazione | Admin valido (dedicato o identità autorizzata dalla deroga IN02); ordinario, ruolo non esatto, riga mancante, email non confermata, token/sessione revocata e accessi diretti negati |
| RPC e audit | Private non esposto, ACL effettivi, separazione tecnico/umano, successo atomico e fallimenti corretti; letture non scrivono eventi |
| Annunci e Registro | Limite 30, filtri/cursori, dettaglio su richiesta, conflitti con connessioni indipendenti, export CSV e import nei fogli di calcolo |
| Home e navigazione | Streaming/idratazione, una metrica per selezione, indipendenza dei blocchi, BFcache, skeleton/retry, niente query economica o N+1 |
| Browser | Desktop/mobile, focus/tastiera, Eye/EyeOff, AlertDialog esterni, Sheet annidati, tooltip/grafici/tabelle e chunk falliti |
| Compatibilità Web | Writer/reader, URL diretti, metadata/immagini, profili, notifiche, pagamenti tardivi e media: nessuna esposizione del cestino |
| Prestazioni e deploy | Build finale e bundle verificati nell'ambiente previsto, piani/tempi/chiamate misurati, cookie/cache reali e revisioni compatibili |

Queste prove rimangono **non eseguite** ove indicato dalla matrice. Non usare
account/dati reali per i casi di errore o concorrenza e non marcare l'accettazione
come completata sulla base dei soli 1.275 test locali.

### 8.1 Abilitare il cestino: soltanto dopo app, Storage e cache

**File:** [dashboard_admin_enable_trash.sql](../../../../supabase/scripts/dashboard_admin_enable_trash.sql).
**Destinatario previsto dal file:** ambiente isolato verificato, come `postgres`.
**Prerequisiti:** M07–M10 verificati per la prima versione completa, Web/Admin
compatibili distribuite, inventario dello [step 10](../10-cestino.md) verificato,
bucket `immagini_annunci` privato e policy Storage controllate, prove integrate
richieste concluse. Non è un'attivazione inclusa nelle migrazioni o nel deploy.

1. Verificare inizialmente `enabled=false`. Censire e invalidare o esaurire
   cache immagini, sitemap, HTML/RSC/CDN/service worker e signed URL precedenti.
   Considerare anche `stale-while-revalidate`: il vecchio proxy immagini aveva
   `max-age=3600`, `s-maxage=86400`, `stale-while-revalidate=604800`; la sitemap
   revalidate 3600. Verificare i TTL effettivi, non dedurli dal solo token Storage.
   Il nuovo `no-store` non ritira copie precedentemente emesse o scaricate.
2. Solo con evidenze disponibili, nella copia operativa impostare i tre booleani
   di revisione del file ed eseguirlo intero. Non riutilizzare attestazioni di un
   altro ambiente o revisione.
3. Verificare `enabled=true` e una coppia cestino/ripristino **sintetica** con
   audit singolo per successo; nessuna lettura pubblica di contenuti cestinati,
   ripristino sotto hold e nessuna pubblicazione automatica.
4. **Errore/recupero:** template non attestato →
   `ADMIN_TRASH_RELEASE_REVIEW_REQUIRED`; operatore errato →
   `ADMIN_TRASH_RELEASE_OPERATOR_REQUIRED`; M07 assente →
   `ADMIN_TRASH_MIGRATION_REQUIRED`. Conservare il gate falso e correggere la
   causa. Per sospendere nuovi comandi usare la procedura di disattivazione
   già contenuta nel file e nello step 10; vedere §9.

### 8.2 Pianificare e verificare la retention audit

**File:** [dashboard_admin_audit_schedule_retention.sql](../../../../supabase/scripts/dashboard_admin_audit_schedule_retention.sql).
**Destinatario:** SQL Editor del progetto esplicitamente autorizzato, operatore
`postgres` senza claim applicativi. **Prerequisiti:** M02 e successive modifiche
audit verificate, `pg_cron` già installato, disponibilità del backup e revisione
della retention. L'installazione dell'estensione è un'operazione distinta: lo
script non la installa. Non abilitare job per poter eseguire i test PGlite.

1. Prima dell'esecuzione controllare che non esista un job omonimo appartenente
   ad altro utente/database; leggere `cron.timezone` e registrare il fuso effettivo.
2. Eseguire il file completo: pianifica/attiva
   `dashboard-admin-audit-retention-v1` con schedule **`17 3 * * *`**. L'orario è
   03:17 nel fuso di Cron; il cutoff della funzione è sempre in UTC, dodici mesi
   di calendario. Non descriverlo come 03:17 UTC senza verificare il fuso.
3. Verificare `cron.job`: nome, command, database, username, schedule e `active`.
   Attendere un'esecuzione pianificata e controllare `cron.job_run_details`;
   non attestare la retention in funzione sulla sola creazione del job. Un'esecuzione
   riuscita senza eventi scaduti può cancellare zero righe. Non inserire eventi
   di prova né anticipare purge sul reale per simulare una verifica riuscita.
4. **Errore/recupero:** fermarsi su `ADMIN_AUDIT_SQL_OPERATOR_REQUIRED`,
   `ADMIN_AUDIT_PG_CRON_REQUIRED`, `ADMIN_AUDIT_MIGRATION_REQUIRED` o
   `ADMIN_AUDIT_CRON_JOB_CONFLICT`; non sovrascrivere altri job né ignorare
   prerequisiti. Per sospendere, disattivare il solo job come indicato nello
   [step 04A](../04a-audit-database.md); non eliminare eventi/helper o altri job.

La cancellazione degli eventi scaduti è definitiva sul database corrente;
un recupero dei dati eliminati richiede il backup, non la riattivazione del job.

## 9. Recupero e monitoraggio

| Situazione | Azione operativa prevista | Verifica prima della riapertura |
| --- | --- | --- |
| Migrazione non committata / esito incerto | Seguire §5: rollback della transazione fallita se necessario, rilettura cataloghi e cronologia; nessun replay cieco | Commit e definizioni dei soli oggetti attesi, prerequisiti e dati preservati |
| Errore dopo migrazione riuscita | Correzione in avanti separata o app compatibile precedente; mantenere schema e audit, niente DROP come rollback rapido | Baseline, ACL, account ordinari e protezioni Web/Admin ancora rispettati |
| Problema cestino o vecchio consumer | Come operatore sul target corretto, impostare il gate a false usando l'istruzione di disattivazione già documentata in `dashboard_admin_enable_trash.sql`; conservare tutti i filtri e writer compatibili | Nuovi cestino **e ripristino** bloccati; annunci già cestinati ancora invisibili; operazioni già in corso/committate riconciliate |
| Necessità di rollback applicativo | Scegliere una revisione esplicitamente compatibile con lo schema corrente e le protezioni del cestino; se non disponibile sospendere il consumer coinvolto | Nessuna riesposizione via Web/metadata/media; nessuna rimozione del ruolo/audit/session checks |
| Problema retention | Sospendere soltanto il job dedicato con la procedura 04A; analizzare errore e cutoff senza purge manuale | Audit ancora scrivibile, scheduler corretto, successiva esecuzione registrata |
| Credenziali/sessioni compromesse | Procedura operatore 05: recupero, revoca globale verificata e rotazione dei segreti coinvolti con artefatti coerenti | Vecchi token negati, nuovo login e audit riusciti, Web preservata |
| Ripristino dati necessario | Sospendere i writer interessati; ripristino pianificato del punto verificato, riconciliazione fra DB/Auth/Storage e revisioni app | Completezza e coerenza dati, ACL/sessioni, media, notifiche e pagamenti; nessun ripristino improvvisato sopra traffico attivo |

Disabilitare il gate **non** annulla operazioni già riuscite, non ripristina
contenuti e non rende sicura una vecchia Web che ignora il cestino. Non rimuovere
`eliminato_il`, `eliminato_da`, hold, policy, trigger o filtri per far funzionare
un vecchio deploy. Mantenere evidenza delle modifiche operative e degli esiti
incerti, senza rilanciare automaticamente operazioni con audit già committato.

Dopo un intervento autorizzato monitorare errori Auth/audit, correlation ID,
conflitti di moderazione, letture/export/Home, latenza e chiamate per richiesta,
stato Cron e protezioni cache/Storage. Non inserire token, password, chiavi,
contenuti esportati o messaggi grezzi del database nei log operativi. L'audit
di export attesta la preparazione del file, non l'effettiva consegna al browser.

## 10. Registro finale e condizioni ancora aperte

Per ciascuna fase registrare **non avviata / applicata / verificata**, destinatario,
revisione, operatore e riferimenti alle evidenze; un dato sconosciuto resta
«da confermare». Al 25 ottobre 2026:

| Consegna / operazione | Evidenza effettiva |
| --- | --- |
| Implementazione e test locali | 16A–16H conclusi localmente, 1.312 test Node/PGlite riusciti; browser finali, evidenze e limiti nella scheda 16H e nella matrice |
| Questo runbook | Preparato e confrontato con i file; non eseguito sul destinatario |
| M01 | Applicazione reale dichiarata dall'utente, non verificata dall'agente |
| M02 | Concluso nel registro operativo: cataloghi coerenti e copia manuale successiva verificata nel report utente delle 18:20:16 UTC; gateway/Cron e restore non attestati |
| M03 | Concluso nel registro operativo: report finale utente delle 18:34:27 UTC, due funzioni coerenti e grant attesi; 211 test mirati e lint già riusciti, gateway non attestato |
| M04 | Concluso nel registro operativo: report finale utente delle 18:55:18 UTC strutturalmente verificato, tre oggetti coerenti e protezioni di 10/10 tabelle identiche al report iniziale; 297 test mirati e lint già riusciti. Nessuna operazione manuale residua |
| M05 | Concluso nel registro operativo: report finale delle 19:19:12 UTC strutturalmente verificato, sei funzioni coerenti e protezioni di 25/25 tabelle identiche alla baseline; 379 test mirati e lint già riusciti. Nessuna operazione manuale residua |
| M06 | Concluso nel registro operativo: report finale versione 3 delle 10:27:00 UTC, 26 oggetti e dodici routine corrispondenti, M06A riscontrata; 27 protezioni e 27 metadati invariati, privilegi pagamento/ACL legacy invariati. Conservati 464 test mirati e lint riusciti; nessuna operazione manuale residua |
| M07 | M07C Concluso: installazione e confronto verificati via MCP, gate disabilitato; attivazione e prove integrate restano separate |
| M08 | Concluso: applicazione/verifica MCP delle 22:06 UTC, confronto positivo e nessun nuovo riscontro advisor; prove integrate separate |
| M09 | Concluso: applicazione/verifica MCP delle 22:14 UTC, confronto completo positivo, 120 test mirati e nessun nuovo riscontro advisor; prove integrate separate |
| M10 | Concluso: applicazione/verifica MCP delle 22:22 UTC, confronto completo positivo, 101 test mirati e nessun nuovo riscontro advisor; prove integrate separate |
| IN02 | Concluso: runtime pronto, policy attestata e account esistente promosso su deroga esplicita con dati conservati, vincolo limitato alla coppia e trigger originale ripristinato. 53 test/lint e verifica MCP positivi; advisor invariati. Nessuna operazione manuale residua |
| IN03 | Concluso nel perimetro della scheda IN03 e §8: 30 controlli riusciti, isolamento Web/Admin bidirezionale e dinieghi con identità Auth senza mapping; fixture autorizzata revocata/cancellata, pulizia verificata. Residui nella sola task finale dello step 16; nessuna attivazione o rilascio implicito |
| Chiusura finale step 16 | Perimetro consolidato su richiesta dell'utente: una sola task al prossimo procedi, esito Pronto per il rilascio o blocchi concreti. Scheda chiusura-finale.md; SQL operativo e destinazioni/accesso Vercel da confermare prima delle prove dipendenti |
| Provisioning/policy | Template presenti; compilazione della policy dichiarata dall'utente, esecuzione esterna non attestata |
| Cestino e retention | Script presenti; nessuna attivazione esterna eseguita/attestata |
| Copia manuale Supabase Free | Eseguita dall'utente dopo M02, archivio verificato nel report delle 18:20:16 UTC; restore non provato, Storage binario e configurazioni esterne esclusi |
| Vercel/host/Storage e prove integrate/browser | Da confermare o non eseguiti; nessun deploy o restore effettuato |

Concludere 16B significa consegnare il documento verificato, **non concludere
lo step 16 o autorizzare il rilascio**. La chiusura locale 16H è conclusa;
la prossima e ultima task preparatoria è la
[chiusura finale dello step 16](chiusura-finale.md), **6.1 Sol, high**.
Riconciliare i residui delle condizioni esterne di 16H con le evidenze
effettive già raccolte e distinguere le operazioni di rilascio. Non introdurre
nuove funzionalità, ulteriori sottopassi o applicazioni automatiche degli script.
