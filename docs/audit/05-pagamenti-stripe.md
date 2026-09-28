# 05 — Pagamenti Stripe e flussi prioritari preesistenti

## 1. Obiettivo e ambito

Verificare checkout delle bozze prioritarie preesistenti, autenticazione, importi, webhook, eventi fuori ordine, riconciliazione e rimborsi. Analisi locale del **2026-09-29**, commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`; nessun checkout, pagamento o rimborso reale creato.

## 2. File/aree analizzate

- [Mappa del Punto 0](00-mappa-codebase.md), §3.2/3.7; [Punto 2](02-sicurezza-server-auth.md), endpoint e gate; [Punto 3](03-autorizzazioni-supabase.md), grant/ownership; [Punto 4](04-consistenza-database.md), ricevute, cancellazioni e lifecycle.
- `src/features/pubblica-annuncio/server/stripe-checkout.ts`; `src/app/api/{create-checkout-session,complete-checkout-session,stripe/webhook}/route.ts`.
- `src/app/pubblica-annuncio/pagamento/page.tsx`, `src/features/pubblica-annuncio/components/PriorityCheckoutRedirect.tsx`, `publish-model.ts`, validazione e Server Action di pubblicazione; `src/proxy.ts`.
- SQL mirato: schema ricevute `20260824195350`, checkout `20260911120000`, RPC correnti `20260914130000`/`20260914140000`, sospensione `20260924120000`, wrapper finale `20260928141148`. Nessuna nuova scansione integrale del repository.
- `tests/priority-announcements-paused.test.mjs`; gli altri test di riconciliazione pubblicazione riguardano date/snapshot, non costituiscono test di pagamenti Stripe.

**Limiti:** nessuna connessione DB nell'IDE (`connections: []`); CLI Stripe impossibilitata ad accedere alla propria configurazione locale (`Access is denied`), senza escalation o modifiche. Consultata documentazione pubblica ufficiale via web. Non letti valori delle variabili d'ambiente né dati di clienti. Account Stripe, Price, promozioni, destinazione webhook/versione API, eventi reali, flag di deployment e schema applicato **non verificabili**. Il rischio di configurazione live locale è già **01-F01**: nessun test ha usato quelle credenziali.

Modifiche preesistenti preservate: master/report 03–04, due documenti refactoring eliminati, `Homepage.tsx`, `homepage-notices.ts`, `Registrati.tsx`. Scritti soltanto questo report e il master.

### 2.1 Matrice del flusso

Le fonti SQL abbreviate sono relative a `supabase/migrations/`. Gli esiti descrivono il codice locale, non certificano il deployment.

| Passaggio | Controlli e comportamento osservati | Evidenza |
|---|---|---|
| Nuova pubblicazione | UI/modello ammettono solo `gratuito`; input validato; Server Action forza `gratuito`; wrapper finale rifiuta ogni altra visibilità prima del core | `src/features/pubblica-annuncio/publish-model.ts:156`; `server/validation.ts:414`; `server/actions.ts:435`; `20260928141148_refactor_profile_publication_fields.sql:277` |
| Bozza prioritaria preesistente | Lookup con sessione Auth: ricevuta prioritaria, annuncio esistente e stesso proprietario. Nessun ID utente fidato dal form | `src/features/pubblica-annuncio/server/stripe-checkout.ts:124`; `20260911120000_priority_announcement_checkout.sql:202`, `:228` |
| Creazione/ripresa checkout | Richiede stato `in_attesa_pagamento`; rimborsato respinto, pagato porta alla conferma. Riusa sessione aperta, non ripropone pagamento quando una sessione completa è in elaborazione | `src/app/api/create-checkout-session/route.ts:55`, `:64`, `:76`, `:94` |
| Prezzo | Price attivo, una tantum, EUR 799 centesimi; quantità 1. Sessione controllata per metadata, riferimento submission, modalità, EUR, subtotale 799 e totale fra 0 e 799; promozioni abilitate, tasse automatiche disabilitate | `src/features/pubblica-annuncio/server/stripe-checkout.ts:105`, `:162`; `src/app/api/create-checkout-session/route.ts:125` |
| Retry creazione | Chiave idempotente derivata da submission, Price e tentativo. Ricevuta aggiornata con tentativo crescente; niente garanzia di transazione distribuita fra Stripe e DB | `src/app/api/create-checkout-session/route.ts:113`, `:141`; `20260914140000_fix_priority_checkout_greatest.sql:40` |
| Ritorno browser | Non crede al solo parametro `result=success`: lookup proprietario, session ID uguale alla ricevuta, recupero sessione dal server Stripe e sincronizzazione DB | `src/app/api/complete-checkout-session/route.ts:36`, `:38`, `:45`; `src/features/pubblica-annuncio/components/PriorityCheckoutRedirect.tsx:27` |
| Webhook | Body originale e firma SDK; eventi completed/async succeeded/async failed/expired, identificatori integrazione corrente e legacy; errori persistenti restituiscono 500, mismatch 400 | `src/app/api/stripe/webhook/route.ts:26`, `:41`, `:72`; `src/features/pubblica-annuncio/server/stripe-checkout.ts:73` |
| Pagamento asincrono | `complete` da solo non basta: `payment_status = paid`. Esito positivo porta soltanto da attesa pagamento a revisione; non pubblica automaticamente | `src/features/pubblica-annuncio/server/stripe-checkout.ts:246`; `20260914130000_reconcile_priority_checkout_amount_rpc.sql:210` |
| Eventi duplicati/fuori ordine | Lock sulla ricevuta, sessione obsoleta ignorata; `paid_at` resta stabile e un evento unpaid successivo non revoca paid; async failed non viene cancellato da un completed/unpaid tardivo | Stessa migrazione `:153`, `:159`, `:169`, `:184`, `:193`; confermato in PGlite |
| Attivazione priorità | Dopo pagamento e approvazione, trigger attiva sette giorni; scadenza tramite job SQL. Vincoli/job locali già descritti al Punto 4 | `20260914130000_reconcile_priority_checkout_amount_rpc.sql:341`; `20260911120000_priority_announcement_checkout.sql:635` |
| Rifiuto/eliminazione | Imposta `refund_required_at` secondo stato/importo; eliminazione annuncio mantiene ricevuta e ID richiesto. Eliminazione utente cancella ricevute: decisione già aperta nel Punto 4 | `20260914130000_reconcile_priority_checkout_amount_rpc.sql:196`, `:329`, `:364`; `20260824195350_publish_announcement_workflow.sql:38`, `:39` |
| Rimborso | Previsto **manuale**, non emesso automaticamente dal codice: commento esplicito. Il webhook registra refund e disattiva priorità su successo completo; problemi in **05-F01/F03** | `20260911120000_priority_announcement_checkout.sql:643`; `src/features/pubblica-annuncio/server/stripe-checkout.ts:275`; `20260914130000_reconcile_priority_checkout_amount_rpc.sql:295` |

Non esiste un registro locale degli `event.id` nei percorsi esaminati; per i pagamenti la ripetizione è gestita mediante stato della ricevuta e identificativi univoci. Questo funziona nei casi provati, ma non risolve gli eventi rimborso anticipati. Stripe non garantisce l'ordine e può reinviare eventi; è necessario conservare o riconciliare gli eventi pertinenti non ancora associabili. [Consegna e duplicati webhook](https://docs.stripe.com/webhooks).

### 2.2 Prove isolate e limiti

- **SQL reale in PGlite:** schema ricevuta e vincoli checkout dalle migrazioni, RPC correnti estratte, tabelle base sintetiche. Verificati proprietario corretto/estraneo, async failed seguito da completed/unpaid, pagamento duplicato, expired tardivo, rimborso anticipato, parziali e stato pending tardivo. Nessuna simulazione del DB completo o del servizio Stripe.
- **Webhook reale con dipendenze simulate:** modulo TypeScript e SDK Stripe installato, payload firmato con segreto inventato. Firma valida → 200 e una scrittura RPC simulata; body alterato → 400 e nessuna scrittura aggiuntiva; firma assente → 503. Prezzo/importo, valuta e identità discordanti rifiutati; totale scontato 599 accettato.
- **Proxy reale simulato:** POST verso `/api/stripe/webhook`: normale → prosegue; gate senza cookie → redirect `/accesso`; manutenzione → rewrite `/in-manutenzione`. Nessuna richiesta HTTP effettuata.
- **Sospensione:** test esistente **1/1 pass, zero skip**, più prova PGlite sul corpo finale del 28 settembre: `prioritario` rifiutato prima del core. Il test storico da solo non avrebbe attestato il wrapper finale.
- Nessun invio di eventi via Stripe CLI, build o server avviato. Le prove aggiuntive sono state eseguite in memoria, senza nuovi file di test.

## 3. Findings per severità

### 🟠 05-F01 — Un rimborso anticipato può essere perso definitivamente dalla riconciliazione

**Confermato localmente; frequenza e presenza di casi reali non verificate.**

- **Evidenza:** `supabase/migrations/20260914130000_reconcile_priority_checkout_amount_rpc.sql:273` cerca la ricevuta per `stripe_payment_intent_id`; a `:278` restituisce `ignored/not_found` se il checkout non ha ancora registrato il PaymentIntent. `src/features/pubblica-annuncio/server/stripe-checkout.ts:285` legge solo `error`, ignorando il risultato della RPC; `src/app/api/stripe/webhook/route.ts:78` risponde comunque 200. Non risulta una coda per riprendere questo evento dopo l'associazione.
- **Prova:** refund completo di 799 prima dell'evento pagamento → `not_found`; successivo pagamento → `paid_at` valorizzato, `refunded_at` ancora NULL. Il percorso può considerare pagato un ordine già rimborsato. Stripe ammette eventi fuori ordine. [Documentazione webhook](https://docs.stripe.com/webhooks).
- **Ulteriore incoerenza:** dopo refund `succeeded`, un vecchio `pending` sovrascrive `stripe_refund_status` a `:288`, pur mantenendo `refunded_at`: riprodotto in PGlite. La priorità non viene riattivata da questo solo evento, ma stato e data divergono.
- **Impatto:** stato economico locale errato e possibile attivazione della priorità dopo un rimborso già completato; necessità di recupero manuale se nessun altro evento utile arriva.
- **Azione consigliata:** conservare gli eventi non ancora associabili con identificativo, esito e retry; riconciliare il rimborso quando arriva il pagamento. Gestire transizioni coerenti per ogni refund e recuperare lo stato corrente da Stripe dove necessario; non usare il solo timestamp di arrivo come ordine.

### 🟠 05-F02 — Gate e manutenzione impediscono al webhook di raggiungere il gestore

**Comportamento confermato; impatto condizionato ai flag attivi nel deployment, non verificati.**

- **Evidenza:** `src/proxy.ts:67` applica la manutenzione anche all'endpoint; `:83` abilita il gate; l'eccezione a `:126` contiene solo `/auth/confirm`; il matcher a `:186` include `/api/stripe/webhook`. Prova del proxy reale descritta in §2.2.
- **Impatto:** eventi di pagamento/rimborso possono non raggiungere la verifica firma e la persistenza. Il redirect non è una consegna riuscita; un rewrite non garantisce un errore che provochi retry. Non è stata verificata la risposta HTTP finale della pagina di manutenzione. Stripe richiede un endpoint pubblico e limita nel tempo i retry automatici. [Requisiti e retry webhook](https://docs.stripe.com/webhooks).
- **Azione consigliata:** preservare l'accessibilità dell'esatto endpoint webhook anche durante gate/manutenzione, mantenendo la verifica della firma. Verificare le risposte attraverso il proxy e predisporre il recupero degli eventi del periodo di indisponibilità. Estende la verifica lasciata aperta nel Punto 2 §5, senza duplicare `02-F05` sul redirect.

### 🟡 05-F03 — Più rimborsi parziali pari al totale restano non rimborsati nel DB

**Confermato nel confronto importi e in PGlite; uso effettivo dei parziali non verificato.**

- **Evidenza:** `supabase/migrations/20260914130000_reconcile_priority_checkout_amount_rpc.sql:281`: `p_amount <> v_receipt.stripe_amount_total` → `ignored/not_full_refund`. Lo schema memorizza un solo ID/stato rimborso, senza aggregazione per PaymentIntent.
- **Prova:** su pagamento 799, refund riusciti 399 e 400 vengono entrambi ignorati; `refunded_at` resta NULL. Un singolo refund da 799 viene invece registrato e declassa l'annuncio. Stripe consente più rimborsi per lo stesso addebito entro il totale. [Rimborsi Stripe](https://docs.stripe.com/refunds).
- **Impatto:** dopo rimborso economico completo in più operazioni, la priorità può restare attiva e l'operatore può vedere una richiesta ancora da rimborsare. Il supporto ai rimborsi parziali come scelta commerciale resta una decisione manuale.
- **Azione consigliata:** registrare i refund per ID e sommare soltanto gli importi riusciti senza duplicazioni, oppure riconciliare l'importo complessivo restituito dal pagamento. Definire esplicitamente l'effetto della quota parziale sul servizio.

### 🟢 05-F04 — Il validatore dell'origine checkout non rifiuta protocolli non HTTP

**Confermato nel codice e in esecuzione isolata.**

- **Evidenza:** `src/features/pubblica-annuncio/server/stripe-checkout.ts:91`: `new Error("INVALID_PROTOCOL")` senza `throw`. Con configurazione sintetica `ftp://audit.invalid`, `getCheckoutSiteUrl()` restituisce quell'origine.
- **Impatto:** una configurazione server errata supera la validazione e può produrre URL di ritorno non validi o fallimento di creazione checkout. Non è un redirect controllato da input utente; nessuna configurazione reale errata accertata.
- **Azione consigliata:** sollevare l'errore e validare l'origine richiesta dal deployment, con casi negativi per schemi non ammessi.

## 4. Checklist azioni

### Eseguibili da agente AI — futura fase di implementazione

- [ ] **05-F01:** persistenza/retry degli eventi rimborso non associabili, transizioni coerenti e test refund-prima-di-checkout, duplicati e consegna invertita.
- [ ] **05-F02:** eccezione mirata del webhook nel proxy e test con gate/manutenzione attivi; firma sempre richiesta.
- [ ] **05-F03:** riconciliazione per refund distinti/importo aggregato e test di parziali cumulativi, pending/failed e duplicati.
- [ ] **05-F04:** correggere il validatore dell'origine e coprire protocolli invalidi.
- [ ] Testare, in ambiente separato autorizzato, creazione concorrente e guasto fra Stripe e persistenza DB, recupero dopo webhook fallito, successo asincrono e codice sconto al 100%; nessuna prova live implicita.
- [ ] Preparare una vista operativa delle ricevute con rimborso richiesto e una procedura di riconciliazione con esiti tracciabili, coerente con la gestione manuale prevista.

### Da fare manualmente dall'utente

- [ ] Verificare Price e ambiente, versione API della destinazione webhook, eventi sottoscritti e consegne fallite; consultare soli metadati necessari, senza esportare dati dei clienti nell'audit.
- [ ] Controllare che l'endpoint resti raggiungibile durante gate/manutenzione e organizzare il recupero degli eventi pertinenti non elaborati dopo una correzione.
- [ ] Assegnare responsabile e tempi del rimborso **manuale** già previsto: `refund_required_at` non emette un rimborso. Controllare periodicamente la coda e riconciliare gli esiti Stripe.
- [ ] Decidere rimborsi parziali, sconti al 100%, gestione contestazioni e conservazione delle ricevute dopo eliminazione account.
- [ ] Verificare applicazione delle migrazioni checkout/RPC/sospensione e job scadenza, usando lo storico remoto. Non applicare file indiscriminatamente né riattivare nuove pubblicazioni prioritarie per eseguire l'audit.

## 5. Domande aperte / decisioni da prendere

1. Esistono bozze prioritarie o rimborsi pendenti reali? Senza metadati Stripe/DB non si può quantificare l'esposizione ai findings né dichiarare il flusso inutilizzato.
2. Chi esegue e controlla i rimborsi manuali? Il commento SQL li prevede; nessuna automazione `refunds.create` è presente nei percorsi cercati. La sua assenza non è di per sé un bug.
3. Le promozioni a totale zero sono consentite? Il codice ammette importo zero ma considera concluso soltanto `complete + paid` (`src/features/pubblica-annuncio/server/stripe-checkout.ts:246`). Non verificato quale stato producano le promozioni abilitate sull'account: testare il caso e allineare la regola di evasione, senza assumere un guasto reale. [Stati Checkout Session](https://docs.stripe.com/api/checkout/sessions/object).
4. Il Price storico resta disponibile e configurato fino alla chiusura delle bozze? La validazione confronta gli eventi col Price attualmente in ambiente, non soltanto con quello persistito (`src/features/pubblica-annuncio/server/stripe-checkout.ts:166`, `:174`); una futura sostituzione richiede compatibilità esplicita.
5. La sospensione riguarda le nuove pubblicazioni, mentre il codice conserva i checkout delle bozze esistenti. Confermare se questo comportamento debba continuare. Eventuali contestazioni e policy di rimborso non vanno decise dall'agente.

## 6. Stato finale e punto successivo

**Completato — analisi locale.** Due findings alti (uno condizionato ai flag), uno medio e uno basso; non accertate perdite economiche, incidenti reali o configurazioni remote errate.

Test esistente **1/1 pass** e quattro gruppi di prove isolate (§2.2): RPC economiche/ownership, firma e validatori SDK, proxy, wrapper di sospensione corrente. Nessun test su Stripe/DB reali e nessun codice applicativo modificato.

**Migrazioni create: 0. Nessuna nuova migrazione da applicare manualmente per questo audit.** Applicazione delle preesistenti non verificata; i findings descrivono interventi futuri.

Prossimo: **Punto 6 — Privacy tecnica e ciclo di vita dei dati**, profilo consigliato **GPT-6 Astra · high · Default**. Tornare al [master](AUDIT-MASTER.md); il Punto 6 non è stato avviato.
