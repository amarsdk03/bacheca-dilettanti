# 10 — Cestino recuperabile

**Stato:** Da terminare — implementazione verificata localmente; rilascio e prove integrate nel gate 16  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** Implementazione 09 verificata; prove integrate rinviate al gate 16.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Introdurre eliminazione logica Admin distinguibile da `nascosto`, con motivazione e audit, filtro cestino e ripristino. La dashboard non cancella definitivamente né rimuove media. Scelta confermata: l'autore conserva l'eliminazione definitiva degli annunci fuori dal cestino; quelli cestinati scompaiono dall'area personale.

Conservare dati e collegamenti dell'annuncio nel cestino. Escluderlo dalle normali consultazioni pubbliche, inclusi accesso diretto, metadata/preview, feed, liste salvate e altre procedure che potrebbero restituirlo. Nell'area personale l'autore non deve poterlo ripubblicare o modificare aggirando la decisione Admin.

## Compatibilità e ripristino

Esaminare tutte le letture e scritture della webapp, policy, procedure, trigger e webhook: un pagamento tardivo, una procedura di auto-approvazione o un aggiornamento dell'autore non deve rendere visibile un annuncio nel cestino. Preservare gli aggiornamenti finanziari legittimi senza introdurre rimborsi automatici.

Il ripristino rimuove il vincolo del cestino ma mantiene l'annuncio nascosto; non avvia pubblicazione automatica, approvazione o pagamento. Per renderlo visibile occorre una successiva azione esplicita consentita dallo stato corrente. Conservare il ruolo distinto di privacy, pagamento e priorità.

Controllo di concorrenza, autorizzazione e audit atomico per entrambe le azioni. L'Admin può consultare il dettaglio nel cestino tramite le letture protette.

## Criteri di completamento e verifiche

Provare cestino/ripristino, annuncio già nascosto/privato, moderazione pendente, conflitti e audit fallito. Provare URL pubblico diretto, preview, feed, aggiornamento autore e completamento pagamento tardivo. Verificare che ripristino non generi immediata visibilità o notifiche di pubblicazione.

## Migrazioni e operazioni manuali

Migrazione additiva per lo stato di eliminazione e aggiornamenti dei consumatori. Coordinare webapp e database: non abilitare l'azione in un ambiente finché tutti i percorsi pubblici rispettano il cestino. Documentare compatibilità con deploy non simultanei e rollback che non riesponga record eliminati. Collegare migrazioni e inventario dei consumatori dal documento.

## Avanzamento

### Integrazione esterna M07 — 26 ottobre 2026

Dopo M06/M06A Conclusi è **Concluso M07A**,
[inventario iniziale READ ONLY](../integrazione/07-cestino.md): report delle
11:25 UTC, 33 tabelle e 17 routine, zero oggetti M07; confronto positivo di
27 protezioni e 27 metadati con il finale M06. Due firme sia per pagamento sia
per checkout session, figlio generico presente, snapshot profilo assente.
Nessuna operazione manuale residua M07A/M07B. M07B **Concluso**: diciassette definizioni
coincidenti con l'inventario, diciotto versioni finali riprodotte in PGlite,
ACL/settings/owner conservati. Nuovo
[verificatore prima/dopo](../../../supabase/scripts/dashboard_admin_verify_m07.sql)
e confronto su 33 tabelle completati; report iniziale READ ONLY versione 2 delle
12:21:10 UTC, `ready_for_m07_catalog_checks_only`, 17 routine, 18 trigger esistenti
coerenti e zero marcatori M07. **33/33 impronte identiche a M07A**, zero differenze.
Estratto selezionato, provenienza e confronto derivato conservati separatamente
in .local; limiti originali falsi, valore del gate non letto.
**128 test mirati e lint riusciti**, quattordici nuovi casi; documentato il difetto
preesistente `pg_catalog.greatest` nella firma checkout a sette argomenti,
riprodotto anche prima di M07, da riesaminare prima dell'uso di quella firma.
M07C **Concluso**: migrazione applicata una sola volta via MCP, versione remota
`20261026215511`, verifica finale delle 21:55 UTC positiva, 18 routine,
19 trigger, 25 marcatori e 33/33 impronte invariate. Gate letto separatamente:
una riga, `enabled=false`. L'attivazione resta separata; prossimo step M08,
senza ulteriori ripetizioni del verificatore M07.
La procedura storica in ambiente isolato riportata
sotto non è l'azione manuale attuale. Migrazione e template di attivazione
invariati; M08 non avviato.

### Implementazione disponibile

Migrazione preparata con Supabase CLI 2.122.0:
[`20261024162714_admin_announcement_trash.sql`](../../../supabase/migrations/20261024162714_admin_announcement_trash.sql).
Applicata alle fixture PGlite sintetiche e, in M07C, al progetto identificato
`nsytraextbndfyprwzts`; installazione remota verificata, gate disabilitato.
Non modifica le migrazioni precedenti. Nuove colonne nullable `eliminato_il`
e `eliminato_da` (UUID applicativo dell'operatore), vincolo di coerenza/hold,
indice per il filtro e gate privato `private.admin_trash_release_v1`, inizialmente
**disabilitato**. Nessun flag frontend o variabile ambiente abilita l'azione.

`trash` e `restore` estendono la RPC e il servizio dello step 09. Ogni operazione
valida usa il client umano, verifica nella RPC sessione attuale e ruolo esattamente
`Admin`, acquisisce ricevute e parent con NOWAIT e confronta lo snapshot completo.
Il successo audit è nella stessa transazione; fallimenti/esiti incerti conservano
il percorso audit separato 04B. Nessuna attestazione di successo dal browser,
query di autorizzazione per riga, modifica ottimistica o retry cieco.

| Comando | Effetto |
| --- | --- |
| Sposta nel cestino | Richiede motivo interno di 1–1.000 code point, conservato solo nell'audit. Mantiene stato, privacy, livello e dati finanziari; imposta data/operatore, `nascosto=true` e `oscurato_da_admin=true`. Conserva tutti i figli e i media. |
| Ripristina dal cestino | Azzera data/operatore, conserva stato/privacy e mantiene entrambi i flag di oscuramento. Non richiede motivo, non pubblica, non approva, non azzera il tempo di priorità e non genera notifica di pubblicazione. |

Nel cestino gli altri quattro comandi non sono consentiti. Il ripristino è
possibile anche con contenuto legacy/incompleto; una successiva azione Mostra
resta subordinata alle verifiche del contenuto e dello stato. Per i professionisti
verifica anche che **tutte le regioni conservate siano ancora abilitate**: una
revoca durante il cestino non cancella dati e non può essere aggirata ripristinando.
Non ci sono cancellazione definitiva Admin, scadenza o garbage collection.

La tabella dispone del filtro URL `trash=exclude|only|all`, predefinito `exclude`,
badge «Nel cestino», motivo interno nella conferma e comandi coerenti fra menu e
Sheet. Il dettaglio mostra data e operatore. I cursori passano a **v2**, vincolati
anche al filtro cestino; v1 e cambi di filtro incompatibili restituiscono errore
esplicito con ritorno alla prima pagina. Massimo 30 righe e caricamenti dello step
08 invariati. Le capacità mancanti di un DTO precedente rimangono disabilitate.

### Inventario dei consumatori e delle protezioni

| Percorso | Protezione implementata |
| --- | --- |
| `public.annuncio` e 15 figli dello step 09, più `annuncio_generico` se presente | Policy **restrittive**, senza nuovi grant, escludono il cestino da letture/scritture anon e authenticated. Guardia parent impedisce DELETE anche privilegiato, modifica dei contenuti e rimozione del hold. I trigger figli serializzano entrambi i parent e congelano i contenuti, compresi spostamenti fra annunci. |
| `apps/web/src/features/annunci/server/queries.ts` | Filtro esplicito `eliminato_il IS NULL` nella query centrale anche con client privilegiato: dettaglio diretto, elenco, ultimi, correlati/simili, salvati e annunci/conteggi del profilo pubblico. Prima verifica il parent, poi carica i contenuti aggiuntivi. |
| `features/profilo/server/queries.ts` e `actions.ts` Web | Cestinati assenti dall'area autore. Lettura di proprietà, update privilegiato della visibilità e DELETE filtrano il cestino. L'autore continua a eliminare fisicamente **fuori dal cestino**; cleanup Storage soltanto dopo DELETE effettivamente riuscito. Se arriva il cestino fra lettura e scrittura, nessun cleanup. |
| `features/interessi/server/queries.ts`, `features/interazioni/server/actions.ts` Web | Contesto interesse e nuovo salvataggio richiedono un annuncio non cestinato. I writer SQL esistenti verificano anche pubblicazione/oscuramento/privacy; il hold del cestino impedisce di aggirarli. |
| Conferma pubblicazione | Query owner filtrata. Le nuove immagini passano dal proxy verificato, senza creare signed URL di 600 secondi. Un retry idempotente non modifica il record congelato; la conferma di un annuncio cestinato restituisce not-found. |
| `/api/metadata/annuncio-immagine` | Verifica parent non cestinato **prima** di scaricare Storage. Risposte 200 e 404 `private, no-store, max-age=0`. Nessun URL diretto Storage nel DTO. |
| Sitemap e cache Web | Query filtrata, sitemap dinamica, fetch del client server privilegiato `no-store`. Conservata la deduplicazione React `cache` per singolo render del dettaglio/metadata. |
| `notify_announcement_v1`, `notification_target_ref`, `notification_display_ref`, `get_notifications_v1/v2` | Nessuna nuova notifica per cestino/ripristino. Vecchi riferimenti diventano «Annuncio non più disponibile», senza link né recupero del vecchio titolo salvato; stato e info dell'annuncio vengono omessi. |
| `get_owned_priority_checkout_v1`, `record_priority_checkout_session_v1` | Nessun nuovo checkout del cestino. La registrazione acquisisce ricevute/parent nello stesso ordine NOWAIT prima di verificare il cestino. Una sessione Stripe già creata prima del cestino può comunque completarsi: si riconcilia come pagamento tardivo. |
| `record_priority_checkout_event_v1`, `record_priority_refund_v1`, `expire_priority_announcements_v1` | Ricevute, rimborsi e scadenze legittimi continuano. Pagamento tardivo può portare pending→review senza togliere cestino/hold/privacy. Non vengono aggiunti rimborsi automatici; la priorità continua a scadere con il suo orologio originario. |
| `prune_revoked_professional_regions_v1`, `sync_published_profile_snapshot_v1` | Saltano i dati congelati del cestino; continuano a operare sugli annunci attivi. La sincronizzazione serializza anche il parent. |
| Auto-approvazione temporanea, se installata | Controlla il record corrente non cestinato, anche quando il trigger differito riceve il vecchio INSERT. Non reinstallare in seguito versioni precedenti delle funzioni senza riesaminare queste protezioni. |

Le modifiche ai corpi delle funzioni esistenti mantengono firma, owner e ACL.
Se una funzione presente ha una definizione inattesa, la migrazione si interrompe
con errore di revisione; non rimuovere i controlli per forzarla. L'inventario è
riferito ai consumatori nella repository: confrontarlo con il catalogo completo,
job esterni e policy Storage dell'ambiente prima di abilitare il gate.
La guardia impedisce anche eventuali cascata DELETE che coinvolgano annunci nel
cestino: non aggirarla per cancellazioni di account/profili o manutenzione.

### Verifiche locali

Suite di regressione Web/Admin: **657 test riusciti, zero fallimenti/skip**.
Comprende 20 casi del nuovo file
[`admin-trash-database.test.mjs`](../../../tests/admin-trash-database.test.mjs),
con i corpi reali delle funzioni consumatrici e tabelle sintetiche di supporto:
gate chiuso, script di attivazione non attestato/attestato, ACL, transizioni,
conservazione figli/media, privacy, legacy/null, motivi Unicode e audit atomico,
conflitti, blocco writer privilegiati, pagamento tardivo, checkout/rimborso,
notifiche pregresse, pruning/snapshot, priorità, auto-approvazione differita,
revoca e RLS restrittiva. Il cutoff temporaneo è spostato solo nella fixture al
2999 per esercitare deterministicamente la finestra attiva; lo script reale non
è stato eseguito né modificato.

Prove dei moduli Web reali con trasporti sintetici: URL diretto prima delle
query ausiliarie, discovery/salvati/profilo, conferma, proxy immagini senza
download dei cestinati, sitemap, cache fetch e cleanup autore anche in corsa.
Prove servizio/controller/conferme: motivo interno, limite caratteri, una sola
mutazione, ripristino legacy, errori e ricaricamento. Le prove 07A storiche
continuano a verificare la relativa migrazione originale; il roundtrip DTO/cursore
v2 corrente viene verificato sulla nuova fixture completa.

Typecheck Web/Admin, lint mirato sui sorgenti/test modificati e compilazione
PostCSS/Tailwind in memoria delle due app riusciti. Nessun nuovo pacchetto,
dev server, build di produzione, Docker, modifica env o connessione remota.

### Ordine futuro di applicazione e attivazione

**Procedura storica di sviluppo isolato.** Per l'integrazione attuale seguire
la guida esterna M07, con A/B/C Conclusi e attivazione ancora pendente;
nessuna attivazione è autorizzata dal solo report. Le due seguenti fasi
restano separate operativamente.

1. Preparare/verificare il progetto **isolato con dati sintetici**, destinazione
   e policy Auth secondo 03B. Applicare la baseline Web e i prerequisiti
   03, 04A, 04B, 07A, 07B e 09 nell'ordine documentato.
2. Con ruolo postgres nel SQL Editor isolato eseguire **l'intero file di
   migrazione 10** collegato sopra, una sola volta. Lock timeout 10 secondi,
   transazione atomica; se fallisce, `ROLLBACK`, controllo schema/cataloghi e
   correzione della causa. Non rilanciare una migrazione già applicata.
3. Verificare colonne, vincolo, indice, policy restrittive/trigger, ACL e
   `select enabled from private.admin_trash_release_v1`: deve essere `false`.
   Provare che una RPC Admin diretta non possa ancora cestinare/ripristinare.
4. Distribuire **entrambe** le app compatibili dopo lo schema. Un vecchio reader
   privilegiato potrebbe ignorare il cestino; un vecchio Admin non comprende i
   cursori v2. Verificare tutte le letture/scritture dell'inventario sullo schema
   completo, ruolo esatto e revoca, browser/HTTP reali, concorrenza e pagamenti in
   test. Non considerare PGlite una prova di questi servizi integrati.
5. Esaurire o invalidare le cache emesse dai deploy precedenti: vecchio proxy
   immagini con `max-age=3600`, `s-maxage=86400` e `stale-while-revalidate=604800`,
   sitemap con revalidate 3600, eventuali HTML/RSC, CDN, ottimizzatori o service
   worker e signed URL già emessi. Il nuovo `no-store` **non elimina** risposte
   vecchie. Misurare TTL/stale effettivi e purge nel deployment; non basta
   attendere i soli 600 secondi dei token Storage. Controllare bucket
   `immagini_annunci` privato e assenza di policy/API che consentano a utenti
   ordinari lettura diretta, sovrascrittura o cancellazione dei media conservati.
   Copie già scaricate da browser/servizi esterni non sono ritirabili dal codice.
6. Soltanto dopo queste verifiche, compilare i tre booleani di revisione nello
   script separato
   [`dashboard_admin_enable_trash.sql`](../../../supabase/scripts/dashboard_admin_enable_trash.sql)
   sulla **copia destinata all'ambiente isolato verificato** ed eseguirlo intero
   come postgres. Il template non compilato fallisce intenzionalmente con
   `ADMIN_TRASH_RELEASE_REVIEW_REQUIRED`. Controllare `enabled=true`, una coppia
   cestino/ripristino sintetica, un audit per successo, nessuna visibilità
   immediata e successivo Mostra soggetto alle verifiche.

Il rilascio richiede il runbook consolidato del gate 16 e autorizzazione
separata; l'evidenza M07C attesta l'installazione con gate disabilitato.
Per fermare nuovi comandi usare come operatore
`update private.admin_trash_release_v1 set enabled=false where singleton;`:
blocca cestino **e ripristino**, conserva protezioni, record e audit; non annulla
operazioni già confermate/in corso. Mantenere app compatibili e schema.
Non rimuovere colonne, policy, trigger o filtri e non tornare a vecchi reader
privilegiati: si rischierebbe di riesporre dati cestinati.

### Residui obbligatori del gate 16

Schema completo/advisor, funzioni esterne e ACL/policy Storage effettive;
due connessioni realmente concorrenti (Admin, autore/figli, ricevute, checkout,
pruning e snapshot), snapshot corrente dopo lock, assenza di stalli e duplicati;
Server Action/PostgREST/Auth/cookie, rendering/HTTP/cache/CDN e propagazione
fra due deploy; prova integrata di vecchi URL/signed URL e notifiche; Stripe e
Storage in test; piani RPC con filtri/cursori profondi e costi delle policy/trigger.
Browser: focus/Annulla/Escape, dialog sopra Sheet, mobile e filtri/cronologia.
Questi residui mantengono lo step **Da terminare**, senza bloccare lo sviluppo
dello step 11 con le fixture disponibili.

## Prossimo step

Avviare su nuovo prompt [M07C](../integrazione/07-cestino.md), applicazione unica e
verifiche dopo l'installazione, **6.1 Sol, high**. M07A/M07B Conclusi.
L'implementazione [11 — Export CSV](11-export-csv.md)
è documentata separatamente; la relativa applicazione esterna M08 non è avviata.
