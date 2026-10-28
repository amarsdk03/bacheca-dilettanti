# M07 — Cestino recuperabile sul progetto identificato

**Stato:** Da terminare — M07A, M07B e M07C Conclusi. Migrazione applicata il 26 ottobre 2026 alle 21:55 UTC, struttura verificata e 33/33 impronte invariate; gate disabilitato. Attivazione separata e rilascio pendenti.  
**Modello consigliato:** 6.1 Sol, high.  
**Dipendenze:** [M06/M06A Conclusi](06-moderazione-annunci.md), report finale del 26 ottobre 2026, 10:27 UTC. [Master](../master_plan.md), [contratto e inventario funzionale](../steps/10-cestino.md).

Il destinatario concordato resta **Webapp Bacheca Dilettanti**, project ref
**`nsytraextbndfyprwzts`**, Supabase **Free**, soli dati di prova personali.
Nome e ref sono identificatori da confrontare nell'interfaccia; una costante
nel JSON non certifica la connessione. La [copia manuale acquisita dopo M02](backup-free.md)
resta documentata separatamente, ripristino non provato. Per questo inventario
non è richiesta una nuova copia.

## Sottopassi e file

| Sottopasso | Risultato | Stato |
| --- | --- | --- |
| M07A | Inventario di catalogo dei consumatori e delle tabelle, dopo M06/M06A | Concluso: report delle 11:25 UTC acquisito, baseline invariata |
| M07B | Revisione delle definizioni effettive e preparazione dei controlli prima/dopo | Concluso: report delle 12:21 UTC acquisito, 33/33 impronte identiche a M07A |
| M07C | Applicazione unica e confronto delle sole modifiche intenzionali | Concluso: verifica delle 21:55 UTC, 33/33 impronte invariate, gate disabilitato |

L'attivazione del gate è separata: richiede app Web/Admin compatibili, revisione
cache/CDN/signed URL e Storage, prove integrate e autorizzazione al rilascio.
M08 non avviato.

| File | Uso attuale |
| --- | --- |
| [dashboard_admin_check_m07.sql](../../../supabase/scripts/dashboard_admin_check_m07.sql) | Inventario iniziale READ ONLY già acquisito; nessuna riesecuzione richiesta ora |
| [Generatore](../../../scripts/dashboard-integration/build-m07-inventory.mjs) | Riproduce lo script dal verificatore M06 versione 3 invariato e dalla nuova parte di inventario |
| [dashboard_admin_verify_m07.sql](../../../supabase/scripts/dashboard_admin_verify_m07.sql) | Verifica READ ONLY eseguita prima e dopo M07C; report finale positivo acquisito |
| [Generatore M07B](../../../scripts/dashboard-integration/build-m07-verification.mjs) e [impronte](../../../scripts/dashboard-integration/m07-definition-fingerprints.json) | Versioni esatte prima/dopo e controlli cumulativi; nessuna migrazione generata o modificata |
| [Confronto report](../../../scripts/dashboard-integration/compare-m07-reports.mjs) | Confronta tutte le 33 tabelle per schema/nome, senza interrogare database |
| [dashboard_admin_check_m07_gate.sql](../../../supabase/scripts/dashboard_admin_check_m07_gate.sql) | Controllo READ ONLY eseguito dopo M07C: una riga, `gate_disabled=true` |
| [20261024162714_admin_announcement_trash.sql](../../../supabase/migrations/20261024162714_admin_announcement_trash.sql) | Migrazione esistente invariata, applicata una sola volta via MCP; non rieseguire |
| [dashboard_admin_enable_trash.sql](../../../supabase/scripts/dashboard_admin_enable_trash.sql) | Template di attivazione separato; non compilare o eseguire adesso |

SHA-256 della migrazione esistente:
`0afed5cbddb38219037672c6595c725bc3131e2e7287cf27f460609f5d2aa9da`.
Il generatore verifica questo hash e quello del verificatore M06 prima di
produrre il file. Rigenerazione locale: `node scripts/dashboard-integration/build-m07-inventory.mjs`.

## M07B — Definizioni riesaminate e controlli preparati

Controllato nuovamente lo SHA-256 della copia M02 acquisita:
`34e0e7b1a5dea17aa68b8302d5471b2d86674cdf5127a0225be5beed74576687`.
Estratte soltanto **dodici definizioni FUNCTION**, con owner/ACL, e la definizione
del trigger pruning; nessuna riga, restore, ruolo globale, credenziale o
connessione. Le dodici sono i consumatori presenti, incluse le due firme
pagamento e le due checkout session. Gli altri cinque corpi sono già nei sorgenti
M04/M06. La fixture applica M06/M06A dopo i corpi d'archivio: **tutti i diciassette
hash, owner, settings, genere, definer e ACL coincidono con il report M07A**.

Sorgente selezionato per test:
[admin-m07-reviewed-consumers.sql](../../../tests/fixtures/admin-m07-reviewed-consumers.sql),
con provenienza dichiarata nel file; non eseguirlo sul progetto. Nuova
[fixture M07](../../../tests/helpers/admin-m07-inspection-fixture.mjs) con sole
tabelle sintetiche di supporto. Nessuno snapshot assente ricreato. Il cutoff
auto-approvazione resta quello originale, senza estensioni nel verificatore.

Applicando **solo in PGlite** la migrazione M07 invariata sono state riprodotte
le diciotto versioni finali: diciassette sostituzioni/estensioni e una nuova
guardia. Le diciassette conservano esattamente owner, settings e ACL.
Le due firme pagamento conservano il hold M06/M06A e aggiungono la tutela della
privacy del cestino; entrambe le firme checkout session applicano il blocco.

Il nuovo verificatore versione 2 è **specifico dell'inventario del progetto**:

- Prima: 17 routine note, 18 trigger dei consumatori, zero marcatori M07,
  33 tabelle presenti con owner/RLS coerenti, prerequisiti M01–M06/M06A validi.
- Dopo: 18 routine note, 19 trigger dei consumatori, 25 marcatori principali,
  due colonne nullable senza default/ACL propri, 17 policy restrittive esatte,
  due nuovi trigger, vincolo, indice e catalogo del gate corrispondenti.
- I 25 marcatori comprendono due colonne, guardia, due trigger, 17 policy,
  vincolo, indice e tabella gate. Colonne, due vincoli e indice interno del gate
  sono verificati separatamente, senza contarli di nuovo nei marcatori.
- Firme, procedure, aggregati e trigger di consumatori aggiuntivi, anche su
  tabelle fuori dalle 33, richiedono revisione. Il trigger pruning conserva
  `AFTER INSERT OR UPDATE OF allowed_regions`, come nel catalogo riscontrato.

Per i prerequisiti cumulativi vengono ricondotti agli hash M06 **soltanto** i
corpi finali M07 esatti e viene escluso il nuovo trigger generico verificato
separatamente. Le definizioni effettive sono controllate indipendentemente:
questa normalizzazione non amplia i corpi accettati e non modifica il database.
Non usare i vecchi verificatori per richiedere replay dopo i cambi previsti.

`unchanged_table_fingerprints` mantiene tutte le 33 tabelle e i tredici campi
comparabili con `tables` del report M07A. Esclude soltanto i due nuovi campi
cestino, 17 policy, due nuovi trigger, vincolo e indice attesi e controllati
separatamente. Nei trigger esistenti riconduce solo il corpo finale esatto al
suo hash iniziale; conserva definizione, owner, ACL ed EXECUTE effettivo. Tutti
gli altri metadati restano nelle impronte. **Il confronto esterno è obbligatorio**:
lo stato strutturale da solo non confronta le impronte con la baseline acquisita.

Il controllo del gate nel verificatore riguarda solo cataloghi: schema, owner,
RLS/revoche, colonne/default, vincoli, indice e assenza di policy/trigger propri.
Non legge `enabled`. Lo stato finale si chiama intenzionalmente
`m07_structurally_verified_gate_unread`. La verifica del suo valore effettivo
usa il file separato dopo M07C, in una transazione READ ONLY: unica tabella
letta `private.admin_trash_release_v1`, attesi una riga e `gate_disabled=true`.
Quel file non contiene UPDATE o attivazioni.

### Procedura M07B già eseguita

La procedura seguente documenta il checkpoint acquisito. **Nessuna operazione
manuale residua M07B**; non è richiesta una nuova esecuzione per chiuderlo.

1. Nel **SQL Editor di Supabase** del progetto `nsytraextbndfyprwzts`, ruolo
   **`postgres`**, controllare il destinatario nell'interfaccia.
2. Copiare ed eseguire **interamente**
   [`dashboard_admin_verify_m07.sql`](../../../supabase/scripts/dashboard_admin_verify_m07.sql),
   dal `begin read only` al `rollback`. È il nuovo verificatore, distinto
   dall'inventario iniziale già acquisito.
3. Inviare **il JSON completo della colonna `m07_report`**. Atteso
   `ready_for_m07_catalog_checks_only`, 17 routine, 18 trigger dei consumatori,
   zero marcatori, `functions_before_match=true`, prerequisiti validi.
   Colonne/policy/trigger/gate M07 ancora assenti e relativi match falsi sono
   previsti. Non applicare ora migrazione o template di attivazione.

Il confronto delle 33 impronte con M07A è stato completato. Riproduzione locale
dalla root, usando i due estratti selezionati con tutti i campi di confronto:

```powershell
node scripts/dashboard-integration/compare-m07-reports.mjs .local/dashboard-integration/m07-inventory-20261026T112516Z.review-extract.json .local/dashboard-integration/m07-before-20261026T122110Z.review-extract.json
```

Il comando legge esclusivamente i due file e stampa JSON. Richiede 33 identità
uniche e tutti i campi, rifiuta report incompleti e confronta solo il formato M07.
Attesi `matches=true`, 33 tabelle corrispondenti e zero differenze. Non usare
le impronte M06 in questo comando. Il confronto non certifica gate o rilascio.

### Chiusura M07B — checkpoint prima dell'applicazione

Ricevuto il report completo versione 2 del **26 ottobre 2026, 12:21:10.440937
UTC**: `ready_for_m07_catalog_checks_only`, operatore `postgres`, PostgreSQL
17.6, transazione READ ONLY. Prerequisiti M01–M06/M06A validi, **17 routine
esistenti** con corpo iniziale e protezioni corrispondenti; **18 trigger dei
consumatori esistenti** corrispondenti, nessuna firma o trigger inatteso.
Zero marcatori M07, guardia e trigger del figlio generico ancora assenti.
I match finali falsi di colonne, policy, trigger, indice, vincolo, funzioni e
catalogo gate sono previsti prima dell'installazione. Anche i due vecchi match
`detail_before_matches` e `payment_before_matches` falsi nei prerequisiti sono
previsti dopo M06/M06A; nessun replay richiesto.

Trascritte indipendentemente dal nuovo messaggio tutte le **33 impronte** e
confrontati i **13 campi** per `schema_name/table_name` con M07A: **33/33
tabelle identiche, zero differenze**. Compresi owner, presenza/genere/
persistenza, RLS/force RLS, ACL, privilegi effettivi, colonne, policy, indici,
vincoli e trigger/funzioni nelle rispettive impronte. Le definizioni iniziali
e le ACL delle 17 funzioni coincidono anche con il manifest riesaminato.

Evidenze in `.local/dashboard-integration/`:

- `m07-before-20261026T122110Z.review-extract.json`: estratto semantico
  **selezionato**, con tutte le 33 impronte, 18 voci funzione (una assente),
  19 voci trigger consumatori (una assente), controlli e limiti originali.
  Non è una copia completa del JSON originale, conservato nella conversazione.
- `m07-before-20261026T122110Z.provenance.json`: provenienza dal messaggio
  utente, SHA-256 dell'estratto e sezioni omesse dichiarate.
- `m07-before-comparison-20261026T122110Z.json`: confronto positivo derivato
  separato, con SHA-256 dei due estratti e riscontro delle funzioni iniziali.
- `m07-preparation.json`: A/B completati; C non avviato, applicazione e
  attivazione non attestate.

I limiti del report sorgente restano **tutti falsi**, incluso
`external_table_comparison_completed`: il risultato derivato non riscrive
l'evidenza SQL. Nessun valore gate letto, stato disabilitato o rilascio
certificato. Resta separata la revisione funzionale della firma checkout
legacy a sette argomenti descritta sotto.

M07B **Concluso**; M07 complessivo **Da terminare**. Per questa chiusura sono
stati verificati JSON, provenienza, confronti, hash dei quindici artefatti e
collegamenti documentali. Conservati i 128 test mirati e lint della preparazione,
non rieseguiti per una revisione delle sole evidenze e documentazione.
SQL, migrazioni, generatori, test e applicazioni invariati; nessuna query remota
dell'agente. **M07C non avviato: richiede un nuovo prompt.**

### Sequenza M07C eseguita

La revisione M07B e il confronto con M07A sono positivi. La sequenza seguente
è stata eseguita su autorizzazione dell'utente; resta documentata come riferimento,
senza richiedere una nuova applicazione:

1. Eseguire una sola volta l'intera migrazione M07 esistente come `postgres`
   nel progetto concordato. Transazione atomica e lock timeout 10 secondi.
2. Rieseguire interamente il nuovo verificatore prima/dopo. Atteso
   `m07_structurally_verified_gate_unread`, 18 routine, 19 trigger consumatori,
   25 marcatori e tutti i match finali veri. `functions_before_match=false`
   dopo le sostituzioni è previsto.
3. Eseguire interamente il controllo gate separato: deve riportare
   `gate_disabled=true`, una riga, READ ONLY. Non abilita l'azione.
4. Confrontare tutte le 33 impronte del finale con il checkpoint M07B e M07A;
   zero differenze. Conservare i report originali e i confronti derivati
   separatamente, senza cambiare i limiti falsi dei report SQL.

In caso di errore, `ROLLBACK;` se la sessione rimane in transazione, conservare
l'errore e riesaminare lo stato. Nessun replay, grant aggiuntivo o rimozione delle
guardie per superare un esito parziale. Il template di attivazione resta
separato, dopo le prove di compatibilità/cache/Storage del rilascio.

### Riscontro funzionale preesistente da conservare separatamente

La firma checkout session a **sette argomenti** contiene già nell'archivio
`pg_catalog.greatest(stripe_checkout_attempt, p_attempt)`. La prova locale con
ricevuta valida riproduce `function pg_catalog.greatest(integer, integer) does
not exist` **prima e dopo M07** su un annuncio attivo. La versione a nove
argomenti usa già `greatest` senza prefisso. PostgreSQL documenta che
[`GREATEST` non è una normale funzione](https://www.postgresql.org/docs/17/functions-conditional.html#FUNCTIONS-GREATEST-LEAST).

M07 preserva quel comportamento preesistente; i controlli strutturali non
attestano il funzionamento completo della vecchia firma. Entrambe le firme
rifiutano invece correttamente un annuncio cestinato prima di raggiungere
l'assegnazione. Registrata la necessità di revisione/correzione distinta prima
di utilizzare la firma legacy su annunci attivi; nessuna chiamata a Stripe,
pagamento reale o correzione implicita in questo sottopasso. Le prove funzionali
integrate e il gate di rilascio restano aperti.

### Verifiche locali M07B

**128 test mirati riusciti, zero fallimenti/skip**, quattordici nuovi casi inclusi;
lint mirato riuscito. Coperti stati assente/prima/dopo e CRLF, tutti gli hash
inventariati, grant diretti/ereditati, versioni miste, nuove firme/procedure/
aggregati, trigger dei consumatori fuori inventario, colonne/grant/default,
policy restrittive/ruoli, trigger, indice/vincolo, gate catalogo e valore separato,
confronto obbligatorio su 33 tabelle, due pagamenti tardivi e due blocchi checkout,
difetto legacy preesistente. Nessuna riga/funzione applicativa del progetto
letta o chiamata: tutte le prove funzionali usano dati sintetici in PGlite.
Nessuna modifica alla migrazione M07, agli script M06/M07A o alle app;
nessuna nuova copia, build, server, Docker, SQL remoto, deploy o Cron.

Rigenerazione del nuovo verificatore:
`node scripts/dashboard-integration/build-m07-verification.mjs`.
Report e confronto iniziali acquisiti nella chiusura M07B sopra; M07C/M08 non avviati.

## Inventario acquisito — 26 ottobre 2026

Ricevuto il report completo delle **11:25:16.517713 UTC**, versione 1:
`m07_inventory_requires_review`, operatore `postgres`, PostgreSQL **17.6**,
transazione READ ONLY. **Zero oggetti M07**, **33/33 tabelle presenti**,
ordinarie e permanenti, tutte con owner `postgres` e RLS attiva.
Baseline `m06_structurally_verified`, dodici routine M06 e correzione M06A
coerenti; nessun mismatch o firma inattesa nei controlli M06.

Confronto esterno con il finale M06 delle 10:27 UTC, usando le chiavi
`schema_name/table_name`: **27/27 protezioni e 27/27 metadati identici**,
zero differenze. Confrontati owner, presenza/usabilità, RLS/force RLS, quattro
impronte delle protezioni e tre impronte dei metadati. Il campo
`protection_md5` comprende anche i privilegi omessi dall'array compatto.
Le impronte M07 delle 33 tabelle sono una nuova baseline nel loro formato:
non vengono confrontate direttamente con le impronte M06.

Le **17 routine**, tutte funzioni PL/pgSQL, corrispondono a **15 nomi presenti
dei 16 monitorati**, con due firme per ciascuno dei due nomi checkout:

| Riscontro | Dettaglio da mantenere nella revisione M07B |
| --- | --- |
| Quattro sostituzioni Admin e lock figli | Definizioni/ACL correnti riscontrate; questi cinque oggetti non sono nuove funzioni M07 |
| Pagamento a dieci argomenti | Corpo `f77948a78239684e1e8ba4333d299fb5` |
| Pagamento legacy a otto argomenti | Corpo corretto M06A `e23890414fe6633d54cd4cb8694901fe` |
| Checkout session a nove argomenti | `uuid,uuid,text,text,integer,integer,text,text,integer`, corpo `96b12ddf647dcc6e02ce9cdca3caf4a7` |
| Checkout session legacy a sette argomenti | `uuid,uuid,text,text,text,text,integer`, corpo `d19374cb76be47b3aeedbd28c9aa550d` |
| Quattro firme checkout/pagamento | ACL `db23e67d6fad77fdfa003856d807d6af`, solo `service_role` tra i ruoli API riportati |
| Helper notifiche | `notification_target_ref(uuid,uuid,text)` e `notification_display_ref(jsonb,boolean)`; preservare le firme effettive |
| Snapshot profilo | `sync_published_profile_snapshot_v1` assente in entrambi gli schemi: assenza registrata, nessuna creazione o reinstallazione automatica |
| Figlio generico | `public.annuncio_generico` presente: tre colonne con `uuid_annuncio uuid NOT NULL`, RLS attiva e zero trigger iniziali; considerare policy e trigger previsti da M07 |

Riportati anche 18 trigger collegati ai consumatori: due su `annuncio`,
quindici lock sui figli e il pruning su `restricted_profile_access`.
Il conteggio e gli hash sono un inventario delle definizioni correnti:
**non attestano ancora la compatibilità dei corpi con la trasformazione M07**.
Questi erano i riscontri da riesaminare in M07B: revisione delle definizioni
effettive, incluse entrambe le firme legacy, completata sopra conservando
owner, settings e ACL. L'assenza dello snapshot non va colmata con replay
di migrazioni precedenti.

Evidenze locali in `.local/dashboard-integration/`:

- `m07-inventory-20261026T112516Z.review-extract.json`: trascrizione semantica
  **selezionata**, con tutti i 33 riepiloghi/impronte, 17 routine, 16 nomi e
  27 protezioni/metadati M06; non è una copia completa del JSON originale.
- `m07-inventory-20261026T112516Z.provenance.json`: origine dal messaggio
  utente, SHA-256 dell'estratto e sezioni omesse esplicite. Il report completo
  originale resta nella conversazione; nessuna query remota dell'agente.
- `m07-baseline-comparison-20261026T112516Z.json`: confronto derivato separato
  con il finale M06. Limiti e stato del report sorgente non modificati.
- `m07-preparation.json`: inizialmente A completato e B/C non avviati;
  ora A/B completati, C non avviato, nessuna applicazione/attivazione attestata.

**Operazioni manuali residue M07A: nessuna.** Non applicare la migrazione o il
template di attivazione a seguito di questo inventario. I limiti originali
restano falsi, compresi `consumer_bodies_reviewed`, `tables_compared_with_m06`
e `migration_authorized`; il confronto positivo è registrato separatamente.
Nessun valore del gate letto o stato corrente del gate certificato.

## Procedura M07A già eseguita

La seguente procedura documenta il report acquisito; non è richiesta una nuova
esecuzione per chiudere M07A.

1. Aprire il **SQL Editor di Supabase** nel progetto identificato sopra,
   ruolo operatore **`postgres`**. Controllare nome/ref nell'interfaccia.
2. Aprire il file `supabase/scripts/dashboard_admin_check_m07.sql` nella
   repository, copiarne **tutto il contenuto**, incollarlo in una nuova query
   del SQL Editor ed eseguirlo interamente, dal `begin read only` al `rollback`.
3. Esportare o copiare **il JSON completo della colonna `m07_report`** e inviarlo
   per la revisione. Non omettere routine, tabelle o sezioni della baseline.

Lo script usa un'unica transazione di sola lettura, `search_path=pg_catalog`,
timeout query di 15 secondi e lock di 3 secondi, impostati solo localmente.
Conclude con `ROLLBACK`; non cambia dati, schema, grant, impostazioni persistenti
o cronologia. Non chiama RPC/applicazioni e non legge il valore del gate.

Esito ordinario atteso prima di M07: **`m07_inventory_requires_review`**, con
`m06_structurally_verified=true`, `m07_objects_present=0` e baseline M06 coerente.
È un inventario da esaminare, non un permesso di applicazione. I campi
`detail_before_matches=false` e `payment_before_matches=false` nella baseline
sono normali dopo M06; i corpi finali M06/M06A devono invece corrispondere.

## Copertura e interpretazione

M07 sostituisce quattro funzioni Admin, estende il lock dei figli e modifica
tutte le firme presenti di **undici nomi di consumatori Web** in `public` e
`private`. L'inventario riporta i sedici nomi, numero effettivo, firma, genere
(funzione/procedura/aggregato), linguaggio, owner, hash canonico LF/CRLF,
settings, ACL e privilegi EXECUTE effettivi. Anche firme inattese vengono
elencate: un nome o una sottostringa nel corpo non bastano a dichiararle
compatibili. Le procedure hanno un hash di definizione; gli aggregati sono
inventariati senza chiamare `pg_get_functiondef` su un oggetto incompatibile.

Le due firme pagamento a otto e dieci argomenti restano distinte. La vecchia
firma, se presente, deve aver già ricevuto la correzione M06A; il suo corpo
riscontrato è `e23890414fe6633d54cd4cb8694901fe`, ACL
`db23e67d6fad77fdfa003856d807d6af`. Nessun replay M06/M06A/M05.

L'inventario comprende **33 posizioni di tabella**: le 27 M06 e sei supporti
(`annuncio_generico`, `restricted_profile_access`, `localita_profilo`,
`profilo_follow`, `notifiche`, `manifestazioni_interesse`, nei rispettivi schemi).
Assenza e genere effettivo restano espliciti. Le impronte M07 comprendono
**tutte** le colonne attuali, default, grant di colonna/tabella, privilegi API,
owner, RLS/policy, vincoli, indici, definizioni dei trigger e corpi delle loro
funzioni, incluso il flag e i trigger M06. Nessuna esclusione in queste impronte.
I sei supporti hanno anche dettagli di catalogo; i trigger dei consumatori sono
riportati anche quando collegati ad altre tabelle `public`/`private`.

La baseline M06 riusa i controlli precedenti nella stessa query, mantiene le
27 protezioni/metadati e riporta i dettagli degli oggetti non corrispondenti.
Per contenere l'output omette dettagli positivi e array `effective_privileges`
delle protezioni: **`protection_md5` continua a comprenderli**. Questo formato
compatto va confrontato con i campi omonimi del report finale M06 conservato,
senza equipararlo alle nuove impronte M07. Le esclusioni M06 restano quelle
originali, descritte nella guida M06. Il report SQL non attesta il confronto
esterno; quello eseguito separatamente è registrato nella sezione precedente.

I marcatori M07 comprendono colonne, gate, indice, vincolo, guardia, trigger e
policy nuovi, compreso il figlio generico opzionale. Il conteggio è un rilevatore
di presenza/collisioni, **non** un totale atteso di installazione certificata.

Il catalogo non dimostra che il valore del gate sia `false`: un default non è
il valore corrente. `gate_value_read`, `gate_disabled_verified`,
`consumer_bodies_reviewed`, `migration_authorized` e `post_migration_verified`
restano `false`, come gli altri limiti. L'attivazione non viene dedotta né eseguita.

## Esiti inattesi e recupero

`prerequisites_require_review` richiede l'esame dei controlli e mismatch M06,
senza applicare M07. `m07_objects_present_require_review` segnala un catalogo
parziale o già modificato: nessun replay, DROP o grant correttivo automatico.
Dopo M07 alcune impronte M06 cambieranno intenzionalmente: questo inventario
iniziale non è un verificatore finale M07 e non va usato per richiedere il
ripristino di vecchie funzioni.

Se il SQL Editor segnala errore o timeout, eseguire `ROLLBACK;` se la sessione
rimane in transazione, conservare l'errore e farlo esaminare. Non aumentare i
privilegi, rimuovere controlli o eseguire la migrazione per aggirare l'esito.
Il verificatore preparato in B distingue le sole modifiche previste di colonne/
policy/indici, trigger e funzioni dalle altre impronte che devono restare invariate.

## Verifiche locali e avanzamento

**114 test mirati riusciti, zero fallimenti/skip**, nove nuovi casi M07A inclusi;
lint mirato riuscito. Verificati prerequisiti assenti e M06/M06A corretti,
impostazioni di sessione, nessuna lettura/chiamata applicativa, firme legacy,
overload/procedure/aggregati, colonne/grant/policy/indici/vincoli, trigger e
ACL delle loro funzioni, supporti opzionali, stato parziale e CRLF. Il generatore
riproduce il SQL byte per byte; migrazione M07 e verificatore M06 invariati.
Le prove usano PGlite e dati sintetici; non sono prove di Auth,
PostgREST, gateway, Stripe, Storage, concorrenza o cache del progetto.
Nessuna connessione DB remota, applicazione di SQL, lettura di righe remote,
modifica env/app, build, server, Docker, deploy o Cron.

Chiusura M07A: validati estratto/provenienza, conteggi, confronto, hash dei sette
artefatti e collegamenti documentali; nessuna modifica a SQL/generatore/test.
Conservati i **114 test e lint precedenti**, non ripetuti per questa revisione
documentale. Nessuna nuova query o lettura applicativa sul progetto.

M07A/M07B/M07C **Conclusi**, nessuna operazione manuale residua per questi
sottopassi. M07 complessivo **Da terminare** per l'attivazione separata dopo
le verifiche del rilascio compatibile; gate disabilitato. Le installazioni
successive sono documentate sotto.

**Passo successivo M08 — export CSV ora Concluso**:
[applicazione e verifica delle 22:06 UTC](08-export-csv.md).
M09 è successivamente [Concluso](09-registro-attivita.md).
M10 è anch'esso [Concluso](10-home-dati.md); il prossimo step operativo è
**[IN02 — Auth e accesso Admin](auth-accesso-admin.md)**. Il gate rimane falso.
Non ripetere questo verificatore a ogni «procedi»: dopo la modifica intenzionale
del validatore audit e il nuovo indice audit usare M10 come baseline cumulativa.
L'attivazione del cestino resta distinta e successiva alle prove di rilascio.

## Chiusura M07C — installazione e verifica sul progetto

Connessione MCP verificata tramite `get_project_url` sul progetto
`nsytraextbndfyprwzts`. Il nuovo controllo iniziale delle **21:54:55 UTC**
conferma `ready_for_m07_catalog_checks_only`: 17 routine, 18 trigger,
zero marcatori e prerequisiti validi. Le 33 impronte coincidono con M07A,
il checkpoint M07B delle 12:21 UTC e il controllo delle 21:52 UTC.

Applicata una sola volta l'intera migrazione esistente, SHA-256
`0afed5cbddb38219037672c6595c725bc3131e2e7287cf27f460609f5d2aa9da`,
tramite `supabase.apply_migration`. La cronologia remota registra
**`20261026215511_admin_announcement_trash`**: è la versione assegnata dal
servizio al contenuto del file locale `20261024162714_admin_announcement_trash.sql`.
Nessuna rinomina o nuova migrazione locale; non usare la differenza di versione
per riapplicare il file. Le sette voci remote precedenti sono invariate;
questa operazione non riconcilia retroattivamente la cronologia M01–M06.

Report finale delle **21:55:21 UTC**:
`m07_structurally_verified_gate_unread`, `postgres`, READ ONLY, 18 routine,
19 trigger consumatori, 25 marcatori e tutti i match finali veri.
I match iniziali falsi sono previsti dopo la sostituzione delle definizioni.
Confrontate le 33 impronte e tutti i tredici campi con M07A, M07B e il
controllo immediatamente precedente: **33/33 identiche, zero differenze**.
Il controllo gate separato delle **21:55:25 UTC** legge una sola riga in
READ ONLY e conferma **`gate_disabled=true`**. Nessuna attivazione eseguita.

Evidenze complete in `.local/dashboard-integration/`:

- `m07c-before-20261026T215455Z.json` e relativa risposta MCP originale;
- `m07c-application-20261026T215455Z.json`, esito positivo dell'applicazione;
- `m07-after-20261026T215521Z.json` e risposta MCP originale;
- `m07-gate-20261026T215521Z.json` e risposta MCP originale;
- `m07c-completion-20261026T215521Z.json`, confronti, provenienza e hash;
- `m07c-history-20261026T215521Z.json`, cronologia prima/dopo;
- `m07c-security-advisors-20261026T215521Z.json`, avvisi del progetto.

Gli advisor segnalano RLS senza policy sul gate privato: è intenzionale,
coerente con revoche e accesso riservato verificati. Restano avvisi su funzioni
estranee a M07 (`json_array_to_object`, `jsonb_array_to_object`,
`rls_auto_enable`), funzioni SECURITY DEFINER pubbliche e protezione password
compromesse disabilitata. Le protezioni della funzione checkout interessata
da M07 coincidono con il manifest; nessun grant aggiunto per eliminare avvisi.
Riferimenti: [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[EXECUTE anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[EXECUTE authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[password compromesse](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Conservati i limiti originali dei report SQL: confronto, identità del progetto
e valore del gate sono evidenze separate. I 23 test M07A/M07B sono già riusciti
in questa sessione; sorgenti SQL/test invariati, nessuna nuova esecuzione
necessaria dopo i controlli remoti positivi. Le prove integrate di autorizzazione,
cache, Storage, recupero e rilascio restano distinte, così come il difetto
checkout legacy già documentato. Nessuna funzione applicativa chiamata per
provare operazioni di cestino sul progetto; M08 non avviato.
