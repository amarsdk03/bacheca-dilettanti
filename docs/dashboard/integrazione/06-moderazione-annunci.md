# M06 — Moderazione annunci sul progetto identificato

**Stato:** Concluso nel registro operativo — M06 e correzione M06A riscontrate dal report finale, protezioni/metadati confrontati e invariati. Non ripetere M06, M06A o M05.  
**Modello consigliato:** 6.1 Sol, high.  
**Destinatario:** Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`, Supabase Free, con soli dati di prova personali secondo la conferma dell'utente.

[Master](../master_plan.md), [implementazione 09](../steps/09-moderazione.md),
[M05 concluso](05-dettaglio-annunci.md), [copia manuale Free](backup-free.md),
[matrice delle verifiche](../steps/16-verifica-rilascio/matrice-verifiche.md).
M05 è riscontrato dal report finale del 25 ottobre 2026, 19:19:12.973538 UTC:
sei funzioni coerenti e protezioni di 25/25 tabelle identiche prima/dopo.
Non riapplicare M01–M05. M07 non avviato.

## Chiusura operativa del 26 ottobre 2026

Report finale completo utente delle **10:27:00.881719 UTC**, versione 3:
`m06_structurally_verified`, operatore postgres, PostgreSQL 17.6, READ ONLY.
**26 oggetti attesi corrispondenti**, sedici trigger e colonna verificati,
**12/12 routine** con `after_matches=true`, nessuna firma inattesa.
Prerequisiti M01–M05 coerenti, 185 colonne corrispondenti e undici unicità valide.
Il corpo legacy è `e23890414fe6633d54cd4cb8694901fe`: correzione M06A riscontrata.
ACL legacy `db23e67d6fad77fdfa003856d807d6af` identico all'inventario precedente;
entrambe le firme pagamento consentono EXECUTE solo a service_role fra i ruoli API.
I due `*_before_matches=false` sono previsti dopo le sostituzioni.

Confronto finale separato, per `(schema_name, table_name)`: **27/27 protezioni
identiche e 27/27 metadati identici, zero differenze** rispetto al controllo
iniziale delle 09:45. Protezione della firma pagamento a dieci argomenti
invariata; ACL ed EXECUTE della legacy invariati rispetto alle 09:57.
Il report SQL originale conserva tutti i propri `limits=false`, compresi i
due confronti: l'esito del confronto è documentato separatamente.

Evidenze conservate con provenienza dalla chat, senza query remota dell'agente:

- `.local/dashboard-integration/m06-after-20261026T102700Z.json` e relativo `.provenance.json`;
- `.local/dashboard-integration/m06-protection-comparison-20261026T102700Z.json`;
- baseline iniziale, due report di revisione e vecchie revisioni SQL conservati.

**Operazioni manuali residue M06: nessuna.** Migrazioni e verificatore invariati
durante questa chiusura documentale; conservati i 464 test mirati e lint riusciti,
senza ripeterli. Gateway/Auth/Data API, autorizzazione funzionale, concorrenza,
cronologia e ripristino completo non sono attestati dal catalogo. Copia Free
acquisita separatamente, restore non provato; rilascio complessivo ancora aperto.

## File e modifiche attese

| File | Impiego | SHA-256 |
| --- | --- | --- |
| [dashboard_admin_check_m06.sql](../../../supabase/scripts/dashboard_admin_check_m06.sql) | Controllo READ ONLY versione 3: firma legacy ammessa solo se corrisponde al corpo corretto e ai privilegi attesi | `290a816f6ac297ef8234549ea0a08fae9a7475d2823e300665f8a2fadf9497aa` |
| [20261024155838_admin_announcement_moderation.sql](../../../supabase/migrations/20261024155838_admin_announcement_moderation.sql) | Migrazione esistente invariata, una sola applicazione dopo il controllo iniziale positivo | `52e325e1cf69e9cbfd771c7bcfcc0d53b71ce8198907677c9c771658addd7c99` |
| [20261026100239_admin_m06_legacy_payment_hold_compatibility.sql](../../../supabase/migrations/20261026100239_admin_m06_legacy_payment_hold_compatibility.sql) | M06A integrativa: correzione separata della sola firma legacy già esistente, una volta dopo M06 | `46b93f76052a2ae92c234895b3e9a3a5a68821dc471d52d82b7a4f14d18d5063` |

M06 aggiunge **26 oggetti nominati**: nove funzioni, sedici trigger e una colonna.
La colonna è `public.annuncio.oscurato_da_admin boolean NOT NULL DEFAULT false`.
La guardia `zz_guard_admin_announcement_visibility_v1` opera prima di INSERT/UPDATE
su `annuncio`; `admin_lock_parent_v1` opera prima di INSERT/UPDATE/DELETE su
quindici figli: undici dettagli tipizzati e località, contatti, link social, media.

Le nuove funzioni sono otto private (`admin_utf16_length_v1`,
`admin_review_url_valid_v1`, `admin_review_issues_v1`,
`admin_moderation_capabilities_v1`, `project_admin_announcement_v1`,
`guard_admin_announcement_visibility_v1`, `lock_announcement_child_parent_v1`,
`moderate_admin_announcement_v1`) e il wrapper pubblico
`admin_moderate_announcement_v1(uuid,text,text,text)`.
Tra i ruoli API verificati solo `authenticated` può eseguire wrapper e ponte
di moderazione; i sette nuovi helper interni negano EXECUTE a tutti i ruoli API.
L'autorizzazione Admin effettiva richiede comunque le prove funzionali separate.

Sono previste anche **tre sostituzioni di funzioni esistenti**:

| Funzione | Modifica prevista |
| --- | --- |
| `private.admin_announcement_field_v1(jsonb,text,text)` | Limiti di lunghezza coerenti con UTF-16 |
| `private.get_admin_announcement_v1(uuid)` | Proiezione del dettaglio con capacità di moderazione |
| `public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean)` | Completamento pagamento che conserva l'oscuramento amministrativo |

La funzione pagamento conserva owner, configurazione e ACL, con EXECUTE solo a
`service_role` fra i ruoli API. Non vengono eseguiti pagamenti o eventi Stripe.
Nessun nuovo grant alle tabelle o modifica alle policy è previsto.
Il vecchio verificatore M05 usa le impronte precedenti delle due funzioni di
dettaglio: **dopo M06 usare il verificatore M06**, senza interpretare il cambio
previsto come motivo per ripetere M05.

## Controllo iniziale acquisito

Ricevuto il report completo utente del **26 ottobre 2026, 09:45:00.918396 UTC**:
`ready_for_m06_catalog_checks_only`, operatore `postgres`, PostgreSQL 17.6,
transazione READ ONLY. Prerequisiti M01–M05 coerenti, **185/185 colonne** e
undici unicità dei dettagli valide, chiave ricevute valida; zero oggetti M06.
Versioni iniziali del dettaglio e pagamento corrispondenti, helper di
validazione invariato e funzione pagamento riservata a `service_role`.
Le nuove funzioni, la colonna e i sedici trigger sono assenti come previsto.

Report completo conservato in
`.local/dashboard-integration/m06-before-20261026T094500Z.json`, provenienza
separata nel file `.provenance.json`: trascrizione semantica dalla chat,
senza query remota dell'agente. Le **27 protezioni e 27 voci di metadati**
sono la baseline per il confronto finale; protezione della funzione pagamento
`55a216a83d1c5c204530ec9222a366cb`. Confronto prima/dopo descritto sotto.
La revisione legacy e la correzione M06A sono concluse come documentato sopra;
le procedure seguenti restano storiche e non vanno ripetute sul progetto.

Procedura del controllo iniziale già eseguita dall'utente:

1. Aprire il [SQL Editor del progetto identificato](https://supabase.com/dashboard/project/nsytraextbndfyprwzts/sql/new).
   Verificare nome/ref nel pannello e selezionare l'operatore `postgres`.
   Le etichette `expected_project_*` del report non certificano la connessione.
2. Aprire **[supabase/scripts/dashboard_admin_check_m06.sql](../../../supabase/scripts/dashboard_admin_check_m06.sql)**,
   copiare **tutto il file**, incollarlo in una nuova query ed eseguirlo intero,
   compresi `BEGIN READ ONLY` e `ROLLBACK`. Nessun parametro da compilare.
3. Salvare e inviare il JSON completo `m06_report`, comprese le due raccolte
   di impronte. Prima di applicare la migrazione serve la revisione di questo
   report iniziale. Non inviare soltanto la riga `status`.

Esito iniziale atteso: `ready_for_m06_catalog_checks_only`,
`m06_prerequisites_match=true`, `m06_named_objects=0`,
`detail_before_matches=true`, `payment_before_matches=true`.
Sono previsti controlli falsi per nuove funzioni, flag e trigger ancora assenti.
`prerequisites_require_review` o oggetti parziali richiedono revisione:
non correggere tipi, corpi o grant automaticamente per ottenere un esito positivo.

Il controllo comprende M01–M05, **185 colonne su 27 tabelle**, undici unicità
dei dettagli e la chiave univoca completa/immediata `submission_id` delle
ricevute. Le due tabelle aggiunte rispetto a M05 sono `public.utente` e
`private.announcement_submission`; sono richiesti due campi utente e diciassette
campi delle ricevute. I tipi compatibili sono espliciti in `expected_type` e
quelli effettivi in `actual_type`; non si ricostruisce il DDL storico completo.
Restano ammesse le sei rappresentazioni native date/time già corrette in M05.

## Report dopo applicazione: conteggio da esaminare

Ricevuto report completo del **26 ottobre 2026, 09:49:06.820357 UTC**:
`m06_partial_or_drift_require_review`. Tutti i 26 oggetti attesi corrispondono:
nove nuove funzioni, sedici trigger e colonna; tutte le undici funzioni elencate
hanno `after_matches=true`. Le due funzioni M05 e il corpo pagamento sono nelle
versioni finali previste; i due booleani `*_before_matches=false` sono corretti.
Restano invece falsi `moderation_routine_count_matches` e, di conseguenza,
`moderation_catalog_matches`: **in quel report M06 restava Da terminare**.

Il report originale è conservato, senza correggerne lo stato, in
`.local/dashboard-integration/m06-after-review-20261026T094906Z.json` con
provenienza separata; anche la revisione originale SQL è conservata.
Confronto separato in
`.local/dashboard-integration/m06-protection-comparison-review-20261026T094906Z.json`:
**27/27 protezioni identiche, 27/27 metadati identici**, zero differenze;
protezione pagamento invariata. I limiti falsi del report SQL originale restano tali.

Il conteggio del catalogo comprende anche firme aggiuntive degli undici nomi.
Poiché le undici firme attese sono tutte presenti, il booleano negativo indica
almeno un'altra routine. Il vecchio report non ne restituisce numero/firma:
non è possibile attribuirla ora a una specifica funzione o dichiararla innocua.
Il verificatore aggiornato aggiunge `checks.moderation_routine_count`,
`checks.expected_moderation_routine_count` e `unexpected_routines` con schema,
nome, argomenti, genere, owner, hash, configurazione e privilegi API effettivi.
Non restituisce il codice sorgente né chiama la routine; gestisce anche
procedure e aggregati. Le condizioni finali non sono allentate. Prima di una
nuova installazione anche firme inattese nelle dipendenze impediscono lo stato ready.

Procedura diagnostica già completata dall'utente: nello stesso
[SQL Editor](https://supabase.com/dashboard/project/nsytraextbndfyprwzts/sql/new),
come `postgres`, eseguire **interamente solo il verificatore M06 aggiornato**
e inviare il JSON completo. Può restare `m06_partial_or_drift_require_review`:
il nuovo inventario permetterà di esaminare la causa. Non cancellare routine,
non modificare grant e non ripetere M06 o M05.

## Firma legacy identificata e correzione M06A

Il report versione 2 delle **09:57:05.557687 UTC** identifica dodici routine
contro undici attese. L'unica aggiuntiva è:
`public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean)`.
È definer, owner postgres, `search_path` vuoto; fra i quattro ruoli API soltanto
`service_role` ha EXECUTE. Hash corpo `44155d0a2a904fe2fb0211c1b3f2bf67`,
hash ACL `db23e67d6fad77fdfa003856d807d6af`.
Report e provenienza conservati in
`.local/dashboard-integration/m06-inventory-20261026T095705Z.json` e relativo
`.provenance.json`; revisione 2 del verificatore conservata separatamente.
Le 27 protezioni e 27 voci dei metadati restano identiche alla baseline iniziale.

La definizione è stata recuperata dalla copia manuale **dopo M02/prima di M03**,
con `pg_restore --schema-only --schema=public --function=... --file=...`, senza
connessione o restore e senza estrarre righe o altri oggetti. SHA-256 dell'archivio
ricontrollato: `34e0e7b1a5dea17aa68b8302d5471b2d86674cdf5127a0225be5beed74576687`.
La riproduzione locale dà **gli stessi hash corpo e ACL del report corrente**:
la firma è preesistente a M06, non un oggetto nuovo creato dalla migrazione.
Il solo sorgente recuperato è nella [fixture SQL](../../../tests/fixtures/admin-m06-legacy-payment.sql).
Il backend corrente passa esplicitamente i dieci argomenti; questo non dimostra
che nessun consumer esterno usi gli otto, quindi la firma viene conservata.

Nel ramo di pagamento riuscito la versione legacy imposta `nascosto=false` e
sostituisce il motivo. La prova locale su annuncio in pagamento oscurato riproduce
`ADMIN_ANNOUNCEMENT_HIDDEN` e rollback della ricevuta: la guardia impedisce la
riesposizione, ma la vecchia firma non può completare quel pagamento.

M06A sostituisce **soltanto quei due valori**, come già fatto da M06 sulla firma
a dieci argomenti: conserva `nascosto=true` e il motivo quando il flag è attivo.
Nessuna firma eliminata, nessun importo inventato, nessun grant modificato,
nessuna riga applicativa letta o aggiornata dalla migrazione. Il resto del
comportamento legacy è preservato. Nuovo hash corpo
`e23890414fe6633d54cd4cb8694901fe`; ACL invariato.
File generato con `supabase migration new`, poi implementato e provato localmente.

**Procedura M06A eseguita e riscontrata dal report finale, da non ripetere:**

1. Nel [SQL Editor del progetto](https://supabase.com/dashboard/project/nsytraextbndfyprwzts/sql/new),
   come `postgres`, eseguire **una sola volta e per intero soltanto**
   [20261026100239_admin_m06_legacy_payment_hold_compatibility.sql](../../../supabase/migrations/20261026100239_admin_m06_legacy_payment_hold_compatibility.sql).
   Il report delle 09:57 e gli hash verificati sono i prerequisiti sul target.
2. Dopo il successo eseguire interamente il verificatore M06 **versione 3**
   sopra collegato e inviare il JSON completo. Attesi `m06_structurally_verified`,
   26 oggetti nuovi, dodici routine osservate/attese, dodici funzioni con
   `after_matches=true`, `legacy_payment_present=true`,
   `legacy_payment_matches=true` e `unexpected_routines=[]`.
3. Confrontare ancora le 27 protezioni, i 27 metadati e la protezione del pagamento
   a dieci argomenti con la baseline iniziale. Per gli otto argomenti verificare
   `acl_md5=db23e67d6fad77fdfa003856d807d6af` nel nuovo report, owner/settings
   attesi e EXECUTE solo a service_role. Il nuovo corpo deve corrispondere esattamente.

L'ispettore non aumenta semplicemente il conteggio ammesso: riconosce solo la
firma a otto argomenti se presente, con due hash espliciti prima/dopo, e ne esige
il corpo corretto per la verifica finale. Se assente, restano undici routine
attese e M06A non va applicata. Ogni altra firma inattesa resta un errore.
Sul progetto identificato M06A precede M07; fa parte del completamento M06.

Recupero M06A: gli errori `*_REVIEW_REQUIRED`, `*_DEPENDENCIES_REQUIRED`,
`*_NOT_PRESENT` o operatore errato fermano il file senza correggere grant o
corpi inattesi. Se la transazione resta fallita eseguire `ROLLBACK` e inviare
l'errore. `*_ALREADY_FIXED` impedisce il replay: verificare con l'ispettore.
Risposta persa/commit incerto: prima il controllo READ ONLY, mai un secondo
tentativo cieco. Dopo commit verificato eventuali correzioni sono separate.

## Procedura di applicazione già riscontrata, da non ripetere

Le istruzioni seguenti documentano il percorso prima/dopo; sul progetto corrente
il passaggio di applicazione è già riscontrato. Rimane la revisione del conteggio.

Con report iniziale positivo conservato e destinazione confermata, eseguire
**una sola volta e per intero** il file esistente
[20261024155838_admin_announcement_moderation.sql](../../../supabase/migrations/20261024155838_admin_announcement_moderation.sql)
nel medesimo SQL Editor, come `postgres`. Il file comprende la transazione.
Non creare una seconda migrazione equivalente e non eseguire frammenti.

Dopo il commit eseguire nuovamente **lo stesso verificatore M06** e salvare
il JSON completo. Attesi `m06_structurally_verified`,
`m06_named_objects=26`, `moderation_catalog_matches=true`,
`m06_prerequisites_match=true`, `detail_after_matches=true`,
le undici voci obbligatorie di `functions` con `after_matches=true` (dodici sul
target con firma legacy corretta), tutti i sedici trigger
corrispondenti e `column.matches=true`.
I controlli `detail_before_matches` e `payment_before_matches` diventano falsi
dopo le sostituzioni previste: **non è richiesto che ogni booleano sia vero**.

Prima di chiudere M06 confrontare separatamente i due report:

1. Tutte le **27 voci `table_protections`**, abbinate per
   `(schema_name, table_name)`, devono essere identiche: owner, presenza,
   accessibilità, RLS/FORCE RLS, grant, colonne, policy e privilegi effettivi.
   Dal fingerprint delle colonne è esclusa **soltanto** `annuncio.oscurato_da_admin`,
   che ha il proprio controllo su tipo, default, NOT NULL e ACL.
2. Tutte le **27 voci `unchanged_table_metadata`** devono essere identiche per
   la stessa chiave: indici, vincoli e trigger preesistenti, inclusi i corpi
   delle funzioni da essi richiamate. Sono esclusi soltanto i sedici nuovi
   trigger previsti, verificati separatamente per tabella, eventi, funzione,
   definizione e stato abilitato. I NOT NULL sono coperti dal fingerprint
   delle colonne; i corrispondenti vincoli di catalogo delle versioni PostgreSQL
   più recenti non entrano nel secondo confronto.
3. La `protection_md5` della funzione `record_priority_checkout_event_v1`
   deve restare identica. La definizione cambia esattamente nella versione
   prevista, mentre privilegi, owner e configurazione restano invariati.

Lo stato strutturale finale non sostituisce questo confronto. I limiti SQL
`table_protections_compared=false` e `unchanged_metadata_compared=false`
restano invariati nel report originale; il confronto riuscito si registra in
un'evidenza separata. Conservare report e confronti in
`.local/dashboard-integration/`, senza credenziali o righe applicative.

## Recupero e limiti

Su errore senza commit, usare `ROLLBACK` se la sessione è ancora in transazione
fallita; rileggere il controllo e correggere la causa prima di valutare un
nuovo tentativo. Con risposta persa o commit incerto controllare prima i
cataloghi. Installazione parziale o deriva richiedono revisione, mai replay
cieco o grant aggiuntivi. Dopo un'installazione verificata non ripetere M06:
eventuali correzioni richiedono una migrazione successiva distinta.

Non eliminare il flag o aggirare la guardia per tornare a una vecchia app.
Conservare oscuramento, audit e compatibilità dei writer; il recupero di
operazioni già committate segue il [runbook](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md).

La copia Free acquisita dopo M02, prima di M03, resta documentata separatamente:
`archive_verified_restore_untested`, sei controlli positivi alle 18:20:16 UTC.
Non è richiesta una nuova copia per questa preparazione. Ripristino non
provato, file Storage/configurazioni esterne esclusi e V20 aperto.

Il verificatore legge soltanto cataloghi; non legge righe, audit o valori
della policy di sessione, non chiama funzioni applicative/Auth, non modera,
non esegue webhook e non legge/modifica Cron. Non attesta cronologia completa,
esposizione Data API, autorizzazione attraverso Auth/gateway, concorrenza
reale, notifiche o deploy delle due app. Queste restano prove del gate 16.
Nessun SQL remoto eseguito dall'agente durante questa preparazione.

## Verifiche locali della preparazione

[Otto nuovi test](../../../tests/admin-m06-inspection.test.mjs) verificano
assenza dei prerequisiti, installazione CRLF prima/dopo, 26 oggetti e modifiche
previste, ricevute/chiavi/tipi, installazioni parziali, trigger/configurazioni
errati, corpi inattesi, grant PUBLIC/ereditati e impronte delle protezioni.
Sentinelle e helper che sollevano errori confermano che il controllo non
invoca funzioni né restituisce righe applicative.

Regressione mirata: **458 test riusciti, zero fallimenti/skip**, inclusi gli
otto nuovi e le suite moderazione DB/server/interfaccia, M02–M05,
lista/dettaglio, audit e autorizzazione. Lint sui tre file test/helper
interessati riuscito. I test usano PGlite e dati sintetici; non sono una prova
di concorrenza tra connessioni indipendenti né una nuova regressione completa.
Migrazione M06 e verificatore M05 invariati; nessuna build o dev server avviato.

Aggiornamento diagnostico dopo il report delle 09:49: **81 test mirati riusciti,
zero fallimenti/skip**, incluse due nuove regressioni (dieci casi M06 complessivi),
moderazione DB/server/interfaccia; lint riuscito. Provati un overload pagamento
che conserva tutti i 26 oggetti attesi e firme aggiuntive di procedura/aggregato:
inventario presente e stato finale ancora negato. Conservata la precedente
regressione di 458 test, senza ripeterla integralmente per l'aggiunta diagnostica.

Correzione M06A: **464 test mirati riusciti, zero fallimenti/skip**, lint riuscito.
Quattro nuove [prove della firma legacy](../../../tests/admin-m06-legacy-payment.test.mjs):
rollback del pagamento sotto hold prima della correzione, successo e motivo
preservati dopo; comportamento ordinario/stale/input invalido, ACL invariati,
diniego anon/authenticated, corpi/grant/prerequisiti inattesi, CRLF, replay e
ulteriori overload negati. Impronte di tutte le 27 protezioni/metadati e delle
altre funzioni identiche prima/dopo la correzione locale. Nessun test sul target,
evento Stripe o restore effettuato. Non è una prova di concorrenza reale.

Riferimenti verificati per la preparazione:
[funzioni Supabase](https://supabase.com/docs/guides/database/functions) e
[catalogo trigger PostgreSQL 17](https://www.postgresql.org/docs/17/catalog-pg-trigger.html).
Per l'inventario aggiornato: [pg_proc PostgreSQL 17](https://www.postgresql.org/docs/17/catalog-pg-proc.html)
e [diagnostica Supabase](https://supabase.com/docs/guides/observability).

**Prossimo:** M07 — cestino recuperabile, non avviato, su nuovo prompt.
Nessuna ulteriore operazione manuale M06.
Modello consigliato: **6.1 Sol, high**.
