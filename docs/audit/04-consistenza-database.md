# 04 — Consistenza DB e allineamento delle migrazioni

## 1. Obiettivo e ambito

Verificare relazioni, cancellazioni, vincoli, indici, transazioni, concorrenza e conservazione degli snapshot nella sequenza SQL disponibile. Analisi locale del **2026-09-29**, commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`; nessuna correzione o migrazione applicata.

## 2. File/aree analizzate

- [Mappa del Punto 0](00-mappa-codebase.md), §3.5–3.7, e [Punto 3](03-autorizzazioni-supabase.md), matrici e limite `03-F02`: 34 tabelle pubbliche tipizzate, 4 private, 48 migrazioni. Nessuna migrazione aggiunta rispetto al Punto 3.
- `supabase/migrations/`: ricerche mirate di FK, vincoli, indici, lock, trigger, sostituzioni di funzioni; lettura dei percorsi di provisioning, salvataggio/rimozione sottoprofili, pubblicazione, ricevute, media, interazioni, inviti e snapshot. Verificate anche le riparazioni `20260927050000`/`20260927060000` e il wrapper finale `20260928141148`.
- `src/server/supabase.ts`, `supabase/config.toml`, `src/features/profilo/server/actions.ts`, helper immagini e flusso di pubblicazione già mappati.
- Test PGlite di pubblicazione, interazioni, inviti, verifica profilo, riparazione annate e sede storica torneo; lettura mirata dei test Staff e del refactor finale.
- Preesistenti preservati: master modificato, report 03 non tracciato, due documenti refactoring eliminati, modifiche a `Homepage.tsx`, `homepage-notices.ts` e `Registrati.tsx`. L'allegato Homepage non cambia l'ambito del punto.

**Copertura remota:** il 2026-09-29 l'IDE restituisce ancora `connections: []`. Non verificabili: schema applicato, storico remoto, trigger fuori repo, vincoli validati, indici reali, dati da migrare e job attivi. Non raccolti record personali. Il baseline delle 29 tabelle pubbliche non create nel repository resta il limite già documentato in **03-F02**, qui esteso alle conseguenze relazionali.

### 2.1 Relazioni e cancellazione utente

Nella tabella, le fonti SQL sono relative a `supabase/migrations/`. “Confermato” riguarda la definizione locale. Per le FK esplicite esaminate non è specificato `ON UPDATE`: vale il default PostgreSQL `NO ACTION`; non dedurre lo stesso per FK del baseline assente. I tipi Supabase riportano colonne e relazioni, non le azioni referenziali. [Semantica dei vincoli PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html).

| Relazione / evento | Effetto locale ricostruibile | Fonte / limite |
|---|---|---|
| `auth.users` → `utente.auth_user_uuid` | Cancellazione Auth: CASCADE dell'utente applicativo | `20260823154343_registration_profile_provisioning.sql:230` |
| `utente` → `profilo.uuid_utente`, colonne creatore/modificatore; `profilo` → sottoprofili | **Azione non attestabile.** Un commento storico descrive SET NULL per profili, ma non sostituisce il DDL | Stessa migrazione `:158`; contratti in `src/server/supabase.ts` |
| `utente`/`profilo` → creatore/autore annuncio | **Azione non attestabile**; non si può concludere se cancellare l'utente mantenga, blocchi o elimini gli annunci | `src/server/supabase.ts:96`, `:103`; manca il DDL iniziale |
| Annuncio → 12 dettagli, località/social/media | Relazioni nei tipi, azioni DELETE/UPDATE del baseline da esportare | `src/server/supabase.ts:157` e famiglie nella mappa §3.5 |
| Annuncio → `contatto_annuncio` | CASCADE; un contatto per tipo/annuncio | `20260824195350_publish_announcement_workflow.sql:3`, `:8` |
| Annuncio → `private.announcement_submission` | SET NULL su `announcement_id`; ricevuta conservata dopo cancellazione annuncio | Stessa migrazione `:38`; retry consumato rifiutato a `:750` |
| Utente → stessa ricevuta | CASCADE: cancellando l'utente si elimina anche la ricevuta, inclusi campi consensi/checkout aggiunti successivamente | Stessa migrazione `:39`; scelta di conservazione da confermare |
| Profilo → `media_profilo` | CASCADE sul **profilo base**, non sul singolo sottoprofilo | `20260912120000_profile_highlights_and_minimum_age.sql:19`; ripristino `20260923130000_restore_profile_highlights_helpers.sql:6` |
| Profilo → follow, utente/annuncio → salvati | CASCADE, entrambe le direzioni delle relazioni; PK composte impediscono duplicati | `20260919115906_profile_follows_and_saved_announcements.sql:6`, `:19` |
| Utente → inviti come invitante o invitato | CASCADE; un solo invito per invitato; niente auto-invito | `20260924173632_invitation_codes.sql:35` |
| Annuncio/profilo segnalato → segnalazioni | CASCADE della segnalazione | `20260917124241_segnalazioni.sql:9`, `:10` |
| Utente segnalatore → segnalazioni | SET NULL; il CHECK identità permette zero identità, quindi è compatibile con la cancellazione | Stessa migrazione `:11`, `:18` |
| Intent registrazione / richieste OTP | Nessuna FK all'utente: righe indicizzate per scadenza/data, non eliminate per cascata dell'account | `20260823154343_registration_profile_provisioning.sql:9`; `20260825204042_publish_email_otp_rate_limit.sql:7` |

**Conclusione sulla cancellazione account:** è ricostruibile il primo passaggio Auth → utente e l'eliminazione di ricevute, salvati e inviti; restano indeterminati i passaggi verso profili/annunci e rispettivi figli. Non proporre CASCADE generalizzati prima di definire conservazione e comportamento di prodotto. Se i profili diventano orfani tramite SET NULL, potrebbero rimanere sottoprofili/media: è uno scenario da verificare sul catalogo, non un effetto remoto accertato.

La rimozione di un sottoprofilo è distinta: blocca l'ultimo sottoprofilo, sceglie un nuovo principale e cancella le località nella stessa funzione (`20260823162929_profile_dashboard_connection.sql:527`, `:531`, `:546`; spostata in `private` da `20260824195359_reconcile_auth_identity_registration.sql:76`). Un trigger elimina gli highlights del giocatore (`20260912120000_profile_highlights_and_minimum_age.sql:393`). Le immagini vengono invece pulite dal server dopo la RPC (`src/features/profilo/server/actions.ts:423`, `:432`): vedere **04-F02**. La cancellazione di social legati al sottoprofilo dipende anche dalle FK del baseline, non ricostruibili.

I profili temporanei di pubblicazione nascono con `uuid_utente`, `creato_da` e `ultima_modifica_da` NULL (`20260824195350_publish_announcement_workflow.sql:292`). La cancellazione applicativa dell'annuncio elimina annuncio e oggetti immagine, senza una rimozione esplicita di quel profilo (`src/features/profilo/server/actions.ts:552`, `:567`). Verificare trigger remoti e decidere il ciclo di vita degli snapshot anonimi nel Punto 6.

### 2.2 Vincoli, indici, naming

| Invariante | Evidenza / valutazione |
|---|---|
| Profilo principale unico per utente, sottoprofilo unico per categoria | Indici UNIQUE su `uuid_utente` e `uuid_profilo`: `20260823154343_registration_profile_provisioning.sql:273`. La nullable ownership consente più profili anonimi: compatibile con il flusso previsto. |
| Email normalizzata e unica | CHECK e indice sull'espressione normalizzata; migrazione interrompe in presenza di duplicati preesistenti: `20260824195359_reconcile_auth_identity_registration.sql:32`, `:53`, `:59`. Non significa che siano presenti duplicati remoti. |
| Contatti, media e social | UNIQUE annuncio/tipo; indici parziali separano foto principale NULL e foto di sottoprofilo; indice piattaforme gestite include `website` nell'ultima migrazione: `20260824195350_publish_announcement_workflow.sql:8`; `20260916160000_profile_images.sql:26`, `:30`; `20260928141148_refactor_profile_publication_fields.sql:129`. |
| Ricevute e interazioni | PK submission e UNIQUE annuncio; PK composte follow/salvati, CHECK no self-follow; codice invito UNIQUE e immutabile; indice sessione/intent pagamento univoco: `20260824195350_publish_announcement_workflow.sql:37`; `20260919115906_profile_follows_and_saved_announcements.sql:6`; `20260924173632_invitation_codes.sql:9`; `20260911120000_priority_announcement_checkout.sql:63`. |
| Intervalli e dati storici | CHECK annate richiede entrambi gli estremi o entrambi NULL; riparazione evita di riscrivere il wrapper corrente: `20260927050000_repair_team_player_year_range.sql:33`. Campi giocatore nullable per righe storiche sono intenzionali (`20260926180000_player_profile_fields.sql:1`), non automaticamente violazioni. |
| Indici sulle FK | Presenti su ownership, sport, figli accessori, media, ricevute, follow/salvati e segnalazioni; alcuni UNIQUE composti coprono già la FK come prima colonna. Un caso parziale è **04-F03**. Completezza sul baseline ed effettivo utilizzo non verificabili. |
| Naming | Tabelle pubbliche italiane, ricevute private inglesi; UUID Auth distinto dall'UUID applicativo e ID numerici dei sottoprofili. Alcuni nomi FK storici differiscono dal nome tabella (`src/server/supabase.ts:1156`, `:1360`): non prova di relazioni errate, evitare rinomine cosmetiche prima del confronto remoto. |

Un indice sulla FK non viene creato automaticamente da PostgreSQL; PK/UNIQUE invece creano il proprio indice. Non sono stati misurati piani o latenze e non si propone di duplicare indici già equivalenti. [Vincoli PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html).

### 2.3 Transazioni, snapshot e allineamento

- **Pubblicazione:** lock advisory per submission, controllo proprietario della ricevuta, retry idempotente e rifiuto della submission il cui annuncio è stato eliminato (`20260824195350_publish_announcement_workflow.sql:730`, `:746`, `:752`). Il lock per email serializza provisioning/pubblicazioni della stessa identità (`:762`). Non eseguita una prova multi-connessione di deadlock.
- **Salvataggio profilo:** blocco della riga profilo e scritture dentro RPC; wrapper profilo/social unico (`20260923120000_restore_owned_subprofile_core.sql:35`; `20260923222553_enforce_required_subprofile_fields.sql:130`). La gestione immagini avviene invece in richieste separate: **04-F02**.
- **Snapshot:** la v1 aggiorna i campi copiati dopo il salvataggio del profilo (`20260924122000_reconcile_publish_dates_and_profile_snapshots.sql:219`); il wrapper finale salva campi aggiuntivi e snapshot Staff/Arbitro, uscendo presto sui retry (`20260928141148_refactor_profile_publication_fields.sql:303`, `:375`). Helpers referenziano submission e autore; errore RPC annulla le scritture della chiamata. Non è un aggiornamento retroattivo di tutti gli annunci quando cambia un profilo.
- **Stati:** CHECK su intervallo/priorità attiva, trigger prima di update/delete, scadenza pianificata ogni minuto (`20260911120000_priority_announcement_checkout.sql:7`, `:603`, `:635`). Corpo lifecycle successivamente sostituito in `20260914130000_reconcile_priority_checkout_amount_rpc.sql:319`. Esistenza del job applicato e invarianti generali di stato del baseline non verificabili; audit del pagamento nel Punto 5.
- **Migrazioni:** 48 file locali; `supabase/config.toml:42` indica PostgreSQL 17, `:64` nessuno schema dichiarativo. La catena include rename, ripristini e patch su `pg_get_functiondef`, alcune con controllo del punto di inserimento; il refactor finale riscrive intere funzioni. **04-F01 dimostra una regressione di composizione**, non soltanto un rischio teorico.
- **Verifica applicato vs repository:** nessun confronto remoto possibile. Servono storico versioni e DDL/definizioni effettive; non basta il nome del file né una tipizzazione aggiornata. Test su fixture e file separati non certificano un reset completo. Non cancellare migrazioni storiche e non riapplicarle indiscriminatamente. [Workflow migrazioni Supabase](https://supabase.com/docs/guides/deployment/database-migrations).

## 3. Findings per severità

### 🟡 04-F01 — Il refactor finale perde la validazione del catalogo Staff

**Confermato nelle definizioni e in prova PGlite isolata. Applicazione remota non verificata.**

- **Evidenza:** `supabase/migrations/20260927002300_staff_announcement_catalog.sql:57` aggiunge `private.staff_step11_detail_is_valid(...)` prima del core. `supabase/migrations/20260928141148_refactor_profile_publication_fields.sql:255` sostituisce l'intera `publish_announcement_v2`; a `:290` conserva il controllo Torneo e a `:294` passa al core, senza il controllo Staff. Il validatore resta definito ma non viene richiamato dalla nuova catena.
- **Prova:** stesso dettaglio sintetico con `categorie_ricercate: ["Serie A"]` e `disponibilita_spostamento: "Forse"`: il wrapper con patch del 27 restituisce `INVALID_STAFF_ANNOUNCEMENT_DETAIL`; sostituendolo con il corpo reale del 28 raggiunge il core simulato. Nessuna pubblicazione eseguita; prova limitata alla perdita del controllo, non al salvataggio sullo schema completo. I controlli generici originari verificano array/lunghezze, non quel catalogo (`20260824195350_publish_announcement_workflow.sql:651`).
- **Impatto:** si perde un'invariante già introdotta per categorie e disponibilità; chiamate dirette alla RPC non hanno la garanzia del catalogo UI. Possibili valori incoerenti per filtri/visualizzazione se non bloccati da ulteriori vincoli remoti.
- **Copertura insufficiente:** il test Staff applica la migrazione del 27, mentre il test “all nine announcement types” si ferma al wrapper del 24 (`tests/staff-announcement-migration.test.mjs:44`; `tests/publish-announcement-types-database.test.mjs:10`). Il test del refactor finale controlla il testo per regex (`tests/profile-publication-refactor-migration.test.mjs:19`), senza verificare questo controllo.
- **Azione consigliata:** reintrodurre la guardia nella definizione corrente tramite nuova migrazione e verificare la catena completa delle sostituzioni. Testare accettazione/rifiuto del catalogo dopo l'ultima migrazione, includendo gli altri controlli introdotti nelle versioni precedenti; non modificare retroattivamente SQL già applicato.

### 🟡 04-F02 — Foto e metadati possono divergere fra salvataggi concorrenti o cleanup parziali

**Confermato nel flusso applicativo; concorrenza riprodotta con la funzione reale e client simulato.**

- **Evidenza:** `src/features/profilo/server/actions.ts:165` legge il media precedente; `:184` aggiorna `media_profilo`, `:207` aggiorna separatamente `profilo.link_foto_profilo`. Non c'è un'unica transazione né confronto con la versione letta. Il rollback manuale a `:209` non controlla l'esito della compensazione. La rimozione sottoprofilo pulisce i media dopo la RPC a `:432`; un errore di cleanup viene loggato ma la funzione può restituire successo a `:448`.
- **Prova:** estratta ed eseguita in JavaScript la reale `saveProfileImage`, con due upload sintetici A/B e risposte DB/Storage simulate. Interleaving: media=A, media=B, profilo=B, profilo=A. Entrambe le chiamate restituiscono `success`; risultato **media=B, profilo=A**. Zero rete e nessun oggetto reale. Non è una misura della frequenza in produzione.
- **Impatto:** viste che usano fonti diverse possono mostrare foto diverse; errori o concorrenza nelle compensazioni possono lasciare riferimenti/oggetti residui. Anche `removeAnnouncement` prosegue dopo errore di lookup media o cleanup (`:548`, `:570`), senza un retry persistente visibile nel percorso.
- **Azione consigliata:** aggiornare i due riferimenti DB in un'unica RPC con lock o controllo versione; coordinare nello stesso modo rimozione e sostituzione. Storage richiede una compensazione separata e ritentabile, basata sui riferimenti effettivamente committati; conservare un lavoro di cleanup recuperabile. Testare concorrenza e guasti intermedi. La pulizia esiste già: il problema è la sua consistenza, non l'assenza totale.

### 🟢 04-F03 — L'indice dell'invitante non copre gli inviti non confermati

**Confermato nel DDL locale; indice remoto aggiuntivo e impatto prestazionale da verificare.**

- **Evidenza:** `supabase/migrations/20260924173632_invitation_codes.sql:37`: FK `uuid_invitante ... on delete cascade`; `:48`: indice `(uuid_invitante, confermato_il) where confermato_il is not null`. Nessun altro indice sull'invitante dichiarato nella catena locale.
- **Impatto:** l'indice parziale copre il conteggio dei confermati, ma non tutte le righe da trovare quando si elimina l'invitante. La FK resta corretta; su volumi elevati la cancellazione può richiedere una scansione più costosa. Nessun rallentamento misurato.
- **Azione consigliata:** confrontare gli indici reali e i volumi; se manca una copertura completa, valutare un indice con `uuid_invitante` come prima colonna senza quel predicato. Non aggiungerlo prima di escludere equivalenti già presenti.

Nessun finding critico/alto accertato in questo punto. Il limite di baseline resta **03-F02**; il problema percorsi Storage resta **03-F01**, senza duplicarne l'analisi.

## 4. Checklist azioni

### Eseguibili da agente AI — futura fase di implementazione

- [ ] **04-F01:** ripristinare la validazione Staff con una nuova migrazione e aggiungere un test che esegua la sequenza fino al wrapper finale.
- [ ] **04-F02:** rendere atomici i riferimenti DB della foto e verificare salvataggio/rimozione concorrenti; prevedere cleanup Storage ritentabile e compensazioni controllate.
- [ ] **04-F03:** confrontare cataloghi/indici prima di proporre l'indice completo sull'invitante.
- [ ] Dopo export autorizzato, completare la matrice FK (DELETE/UPDATE/deferrability/validazione), univocità, indici e trigger del baseline, includendo identità Auth, profili, annunci e figli.
- [ ] Allestire un replay dell'intera catena su database isolato con baseline verificato, verificando invarianti e conservazione dei dati storici dopo l'ultima migrazione. Le fixture attuali restano test circoscritti.

### Da fare manualmente dall'utente

- [ ] Fornire accesso/export in sola lettura dei metadati: storico `supabase_migrations.schema_migrations`, `pg_constraint`, `pg_index`, definizioni funzioni/trigger, schemi e job `cron.job`; non servono record personali.
- [ ] Confermare l'esito voluto della cancellazione account per annunci, profili, inviti, ricevute e riferimenti di pagamento. Il CASCADE delle ricevute è definito; la conservazione necessaria va decisa prima di cambiarlo.
- [ ] Confermare se i profili temporanei di pubblicazione e i relativi social/media debbano sopravvivere alla cancellazione dell'annuncio; collegare la decisione al Punto 6.
- [ ] Confrontare lo storico applicato prima di qualsiasi intervento manuale; non eseguire tutte le migrazioni perché l'audit non può attestarne lo stato.

## 5. Domande aperte / decisioni da prendere

1. Quali azioni referenziali sono realmente applicate ai legami utente → profilo → annuncio e ai dettagli? È il dato mancante per concludere la simulazione di cancellazione account.
2. Quali snapshot/consensi/ricevute devono essere conservati dopo la cancellazione dell'utente? Il Punto 5 valuterà anche il recupero dei pagamenti preesistenti; il Punto 6 la conservazione dei dati.
3. I due riferimenti della foto principale devono restare entrambi memorizzati o uno può diventare derivato? Qualunque scelta deve garantire un aggiornamento coerente.
4. Esistono modifiche SQL manuali, indici, trigger di pulizia o job remoti fuori repository? Senza cataloghi non è possibile confermarli o escluderli.

## 6. Stato finale e punto successivo

**Completato — analisi locale.** Due findings medi confermati e un finding basso strutturale; confronto remoto e baseline esplicitamente non verificati.

Verifiche eseguite:

- `node --test` sui sei file `tests/{publish-announcement-types-database,interaction-database,invitation-codes-database,team-player-year-range-repair,tournament-legacy-headquarters-migration,profile-verification-database}.test.mjs`: **13/13 pass, zero skip**. PGlite in memoria; copertura di idempotenza/snapshot del wrapper storico, FK interazioni, inviti, sincronizzazione verifica e riparazioni. Non prova l'intera sequenza attuale o il DB applicato.
- Due prove aggiuntive isolate: perdita della guardia Staff con corpi SQL reali e core simulato; race foto con funzione TypeScript reale e client simulato. Nessun nuovo file di test scritto, nessuna rete o modifica a DB/Storage reali.
- Nessuna build, avvio server, email, pubblicazione o pagamento.

**Migrazioni create: 0. Nessuna nuova migrazione da applicare manualmente per questo audit.** Le proposte richiedono una futura implementazione; lo stato delle 48 migrazioni preesistenti è ignoto, non un invito ad applicarle.

Prossimo: **Punto 5 — Pagamenti Stripe e flussi prioritari preesistenti**, profilo consigliato **GPT-6 Astra · high · Default**. Aggiornato il [master](AUDIT-MASTER.md); il Punto 5 non è stato avviato.
