# Audit tecnico — Bacheca Dilettanti

## Obiettivo

Raccogliere una fotografia tecnica verificabile della piattaforma: sicurezza, qualità del codice, performance, SEO, dati sensibili, consistenza del database e gap funzionali. Questo master coordina i sotto-report e le azioni consigliate; l'implementazione delle correzioni sarà una fase separata.

**Piano approvato:** 2026-09-25. **Fase 0:** completata. **Prossimo punto:** 10 — Accessibilità e animazioni.

## Metodologia

Sola analisi, un punto per sessione. All'avvio leggere prima questo master e le istruzioni del repository. Se un punto è **In corso**, riprendere quello; altrimenti selezionare il primo **Da fare** nell'ordine della tabella. Prima di ispezionare il codice, cambiare lo stato del punto scelto in **In corso** e registrare nella nota della sessione il punto, data, modello/ragionamento/modalità e checkpoint iniziale. Subito dopo registrare il commit di partenza.

Durante il lavoro aggiornare lo stesso checkpoint con l'ultima area completata, i file esaminati e ciò che resta. Se il lavoro si interrompe, lasciare il punto **In corso**: la sessione successiva riparte da quel punto e checkpoint, senza ricominciare l'audit da zero. Non lasciare più punti **In corso** contemporaneamente.

Usare la mappa del Punto 0 e ricerche mirate, evitando nuove scansioni integrali del repository. Scrivere soltanto il sotto-report del punto, aggiornare stato/data/link e prossimo punto nel master, quindi fermarsi. **Completato** significa analisi conclusa, non problemi risolti. L'audit non applica migrazioni. Nel riepilogo finale dichiarare sempre quante migrazioni sono state create (normalmente zero) e se ne esistono da applicare manualmente.

## Tabella di stato

La numerazione sostituisce quella della proposta iniziale. Priorità e complessità stimano il lavoro di audit e non attestano vulnerabilità già riscontrate. Il profilo modello/ragionamento è una raccomandazione per la sessione, non la registrazione di quale modello abbia prodotto un report. I profili dei punti già completati sono retrospettivi e non identificano il modello realmente usato. Tutte le esecuzioni che scrivono report/master usano **Default**; **Plan mode** si usa soltanto per definire o rivedere il piano, perché non consente di materializzare i documenti. I report hanno percorsi relativi a questa cartella.

| # | Punto | Priorità | Complessità | Profilo consigliato | Modalità | Stato | Report | Data completamento |
|---|---|---|---|---|---|---|---|---|
| 0 | Mappa della codebase e delle fonti | Alta | Media | GPT-6 Sol · medium | Default | Completato | [00-mappa-codebase.md](00-mappa-codebase.md) | 2026-09-25 |
| 1 | Segreti, dati nei file e tracciamento Git | Critica | Media | GPT-6 Astra · high | Default | Completato | [01-segreti-git.md](01-segreti-git.md) | 2026-09-25 |
| 2 | Sicurezza server, autenticazione e rate limiting | Critica | Alta | GPT-6 Astra · high | Default | Completato | [02-sicurezza-server-auth.md](02-sicurezza-server-auth.md) | 2026-09-25 |
| 3 | Autorizzazioni Supabase, RLS, RPC e Storage | Critica | Alta | GPT-6 Astra · high | Default | Completato | [03-autorizzazioni-supabase.md](03-autorizzazioni-supabase.md) | 2026-09-28 |
| 4 | Consistenza DB e allineamento delle migrazioni | Alta | Alta | GPT-6 Astra · high | Default | Completato | [04-consistenza-database.md](04-consistenza-database.md) | 2026-09-29 |
| 5 | Pagamenti Stripe e flussi prioritari preesistenti | Alta | Alta | GPT-6 Astra · high | Default | Completato | [05-pagamenti-stripe.md](05-pagamenti-stripe.md) | 2026-09-29 |
| 6 | Privacy tecnica e ciclo di vita dei dati | Alta | Alta | GPT-6 Astra · high | Default | Completato | [06-privacy-dati.md](06-privacy-dati.md) | 2026-09-29 |
| 7 | Confini server/client, React e TypeScript | Alta | Alta | GPT-6 Sol · high | Default | Completato | [07-qualita-react-typescript.md](07-qualita-react-typescript.md) | 2026-09-29 |
| 8 | Performance applicativa e accesso ai dati | Alta | Alta | GPT-6 Sol · medium | Default | Completato | [08-performance.md](08-performance.md) | 2026-09-29 |
| 9 | SEO, indicizzazione e condivisione | Alta | Media | GPT-6 Sol · medium | Default | Completato | [09-seo-indicizzazione.md](09-seo-indicizzazione.md) | 2026-09-29 |
| 10 | Accessibilità e animazioni | Media | Media | GPT-6 Sol · medium | Default | Da fare | `10-accessibilita.md` | — |
| 11 | Gap funzionali, integrazioni e roadmap | Media | Media | GPT-6 Sol · medium | Default | Da fare | `11-gap-roadmap.md` | — |
| 12 | Pulizia, dipendenze e strumenti di verifica | Media | Media | GPT-6 Luna · medium | Default | Da fare | `12-pulizia-tooling.md` | — |

La scelta segue le indicazioni OpenAI: Astra per il lavoro più complesso, Sol per un equilibrio tra capacità e costo, Luna per attività mirate ed efficienti. `medium` è adeguato alle verifiche circoscritte; `high` è riservato ai punti critici o con molte interazioni. L'effort guida il livello di ragionamento e resta distinto dalla modalità Default/Plan. Fonti: [modelli GPT-6](https://developers.openai.com/api/docs/models), [reasoning effort](https://developers.openai.com/api/docs/guides/reasoning), [Plan mode in Codex](https://developers.openai.com/blog/mastering-codex-remote-for-engineering).

## Decisioni e riferimenti della Fase 0

- Il sito è pubblico e destinato all'indicizzazione, come confermato dall'utente: SEO a priorità Alta.
- Sono autorizzate letture remote mirate tramite accessi già disponibili, per metadati e configurazioni. Non raccogliere record personali; dichiarare ciò che non è verificabile e assegnare le verifiche residue alla checklist manuale.
- La ricognizione iniziale ha rilevato Next.js 16, React 19, TypeScript strict, Tailwind v4, Base UI, Supabase, 32 migrazioni SQL e 18 file di test. Questi conteggi descrivono la ricognizione, non un inventario aggiornato automaticamente.
- Esistono `/auth/callback`, pagine pubbliche di annunci, profili e aggiornamenti, sitemap, robots e componenti Squadra, Arbitro e Staff: verificarne funzionamento e completezza senza presumere che manchino.
- Il codice e la documentazione prevedono pagamenti Stripe per bozze prioritarie preesistenti; la sospensione delle nuove pubblicazioni prioritarie rientra nel punto 5.
- Le migrazioni disponibili non definiscono interamente lo schema iniziale: distinguere schema ricostruibile localmente e schema applicato leggibile da remoto.
- Il provider SMTP effettivo è da confermare: la documentazione cita Resend; non assumere Aruba né considerare provata una precedente correzione SMTP.
- La Fase 0 è una ricognizione leggera e non coincide con il Punto 0. Nessun punto di audit è stato eseguito durante la pianificazione o la creazione del master.

## Ambito dei punti

### 0 — Mappa della codebase e delle fonti

Inventariare route e relativi accessi, feature, componenti principali, azioni server, query, integrazioni, test e configurazioni. Mappare tabelle, policy, RPC e bucket ricostruibili, distinguendo fonti locali e remote e indicando le lacune dello schema iniziale. Elencare le variabili d'ambiente solo per nome e utilizzo. Includere `src/features/dettagli-profilo/components/LatestProfileAnnouncements.tsx`, allegato alla richiesta, nell'area dettagli profilo. Produrre riferimenti e percorsi utilizzabili dai punti successivi, senza findings.

### 1 — Segreti, dati nei file e tracciamento Git

Cercare credenziali hardcoded, esposizione tramite variabili pubbliche, file tracciati nonostante regole ignore, log, dump e artefatti con dati sensibili. Oscurare sempre i riscontri. Quando emergono indizi di esposizioni pregresse, estendere la ricerca alla cronologia Git locale dei percorsi coinvolti, dichiarandone la copertura.

### 2 — Sicurezza server, autenticazione e rate limiting

Verificare input e autorizzazione di Route Handlers e Server Actions, sessioni, callback, recupero password, redirect, errori e anti-enumeration, inclusa la logica `identities?.length === 0`. Esaminare il rate limiting di registrazione, OTP, pubblicazione, segnalazioni, inviti e form pubblici effettivamente presenti. Le autorizzazioni nel database sono approfondite nel punto 3.

### 3 — Autorizzazioni Supabase, RLS, RPC e Storage

Costruire una matrice ruolo/operazione/risorsa per RLS e grant, viste e RPC privilegiate, ownership e accesso anonimo. Verificare policy Storage, upload e percorsi che rendono disponibili immagini e contatti. Valutare l'assenza di una policy CRUD rispetto agli accessi previsti; non considerarla automaticamente una vulnerabilità. Distinguere definizioni storiche nelle migrazioni e configurazione effettiva.

### 4 — Consistenza DB e allineamento delle migrazioni

Analizzare FK e azioni ON DELETE/ON UPDATE, unicità, vincoli, indici, naming, transazioni, concorrenza, snapshot e stati degli annunci. Ricostruire gli effetti della cancellazione di un utente sulle entità collegate. Confrontare migrazioni locali, storico applicato e schema remoto leggibile, dichiarando le parti non ricostruibili.

### 5 — Pagamenti Stripe e flussi prioritari preesistenti

Verificare autorizzazione delle bozze preesistenti, importi, firma webhook, duplicazioni e ordine degli eventi, idempotenza, riconciliazione, pagamenti asincroni e rimborsi. Controllare la sospensione delle nuove pubblicazioni prioritarie lungo l'intero flusso, senza creare checkout, pagamenti o rimborsi.

### 6 — Privacy tecnica e ciclo di vita dei dati

Analizzare dati raccolti e resi pubblici, contatti, immagini, consensi, cookie, analytics, embed, log e servizi esterni. Verificare cancellazione, conservazione ed esportazione dei dati e coerenza tecnica con le informative disponibili. Usare il punto 3 per i controlli di accesso e il punto 4 per i vincoli relazionali, senza duplicarne i findings.

### 7 — Confini server/client, React e TypeScript

Verificare import server/client, serializzazione, hydration, casualità e date nel rendering, gestione degli errori e TypeScript strict. Controllare le convenzioni delle props Action, incluso `onXAction`, rispetto al plugin Next installato. Consultare le guide della versione Next presente nel repository.

### 8 — Performance applicativa e accesso ai dati

Analizzare query ripetute, paginazione, cache e invalidazione, rendering, bundle, immagini, font e animazioni. Distinguere misure osservate da rischi dedotti staticamente e collegare le raccomandazioni sugli indici al punto 4. Dichiarare le misure non ottenibili con gli ambienti disponibili.

### 9 — SEO, indicizzazione e condivisione

Verificare metadati, canonical, sitemap, robots, pagine filtrate, contenuti non pubblicati, manutenzione e coming-soon, Open Graph e immagini social. Valutare i dati strutturati per categoria; `JobPosting` soltanto dove pertinente. Consultare Search Console se accessibile in lettura, altrimenti preparare le azioni manuali. Le decisioni di prodotto sulla condivisione appartengono al punto 11.

### 10 — Accessibilità e animazioni

Verificare navigazione da tastiera, focus, nomi accessibili, relazioni ARIA effettive, modali, form, errori, skip-link, contrasto e riduzione del movimento per Motion, GSAP e CSS. Distinguere controlli statici e riscontri nel browser.

### 11 — Gap funzionali, integrazioni e roadmap

Costruire una matrice per categoria fra UI, validazione, persistenza e visualizzazione. Confrontare implementazione, feature flag, TODO e roadmap, includendo Squadra e sottotipi, Arbitro, Staff, Ente sportivo/Società e le altre categorie realmente presenti. Verificare SMTP, coming-soon, amministrazione, moderazione e condivisione. Lasciare le scelte di prodotto come decisioni manuali; la sola presenza di configurazione SMTP non prova la consegna delle email.

### 12 — Pulizia, dipendenze e strumenti di verifica

Individuare componenti inutilizzati, duplicazioni, import, console, file `.bak`/`.old`, backup e documentazione superata. Esaminare dipendenze, lockfile, script e copertura effettiva dei test. Non classificare una migrazione come eliminabile soltanto perché storica. Proporre interventi senza rimuovere o modificare file.

## Contratto dei sotto-report

Ogni report deve essere sintetico e contenere queste sei sezioni:

1. **Obiettivo e ambito:** 2–3 righe.
2. **File/aree analizzate:** elenco di percorsi, versione Git osservata, eventuali modifiche locali rilevanti e fonti remote consultate.
3. **Findings per severità:** 🔴 Critico · 🟠 Alto · 🟡 Medio · 🟢 Basso · 💡 Nice-to-have. Per ciascuno usare un ID stabile, ad esempio `02-F01`, descrizione, `file:riga` con snippet minimo, impatto e azione consigliata. Non incollare file interi. Le evidenze esclusivamente remote riportano risorsa o query e data, senza inventare un riferimento locale.
4. **Checklist azioni:** due gruppi di voci `- [ ]`, “Eseguibili da agente AI” e “Da fare manualmente dall'utente”. Sono proposte per una fase futura, non autorizzazioni a implementare durante l'audit.
5. **Domande aperte / decisioni da prendere:** includere verifiche residue e accessi mancanti.
6. **Stato finale e punto successivo:** indicare la copertura raggiunta, i limiti e il collegamento al master e al successivo punto Da fare. Non eseguire il punto successivo.

Il Punto 0 sostituisce la sezione findings con la mappa e le evidenze di riferimento. Negli altri report distinguere sempre **confermato**, **da verificare** e **non verificabile con gli accessi disponibili**; un sospetto non va presentato come problema accertato. Richiamare gli ID dei findings già documentati invece di duplicarli.

## Verifiche e chiusura di sessione

- Controllare prima le istruzioni del repository e le guide pertinenti della versione Next installata. Consultare documentazione ufficiale quando serve a valutare un comportamento; i documenti storici del progetto sono riferimenti da verificare.
- Nel punto 7 eseguire TypeScript con la configurazione strict esistente, per esempio `npx tsc --noEmit --incremental false`, ed ESLint senza correzioni automatiche. Negli altri punti eseguire soltanto i controlli pertinenti.
- Prima dei test esistenti verificarne dipendenze e possibili effetti. Eseguire soltanto quelli pertinenti e compatibili con la sola analisi. Distinguere verifiche statiche o isolate da prove sul database effettivamente applicato.
- Per SEO, accessibilità e performance sono ammesse letture HTTP e browser delle pagine pubbliche. Non inviare email, pubblicare contenuti, eseguire pagamenti, applicare migrazioni o modificare servizi remoti. Non avviare sistematicamente dev server o build di produzione.
- Non riportare credenziali o dati personali nei documenti né negli output dei comandi. Le verifiche non eseguibili devono restare esplicite nel report e nella checklist manuale.
- Terminato il singolo punto, scrivere il relativo report, aggiornare la sua riga a **Completato** con data e link e aggiornare l'indicazione del prossimo punto in testa al master. Registrare una nota di sessione con i progressi. Se il punto resta incompleto, mantenerlo **In corso** e riprenderlo dal checkpoint senza ricominciare da zero.
- All'avvio di ciascun punto, impostare prima lo stato **In corso** e registrare un checkpoint; durante l'audit aggiornare quel checkpoint invece di sovrascrivere la storia delle sessioni precedenti. In caso di interruzione lasciare lo stato **In corso**. Alla ripresa dare precedenza a quel punto rispetto a ogni punto **Da fare**.
- Nel riepilogo finale indicare il prossimo punto con il relativo profilo consigliato (**modello · effort · Default**), il conteggio delle nuove migrazioni create e le migrazioni preesistenti eventualmente da applicare manualmente. In sola analisi, le migrazioni create devono essere zero.
- Fermarsi con un riepilogo di 3–5 righe sui risultati e sul punto successivo. Nessuna correzione del codice e nessun avanzamento automatico ad altri punti.

## Note di sessione

- **2026-09-29 — Punto 9 completato:** Default; profilo consigliato GPT-6 Sol · medium (impostazioni effettive non verificabili). Commit iniziale/finale `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`. Creato [09-seo-indicizzazione.md](09-seo-indicizzazione.md): 2 findings medi (vecchia `/accesso` ancora nel campione dell'indice pubblico; sitemap dinamica parziale su errore), 2 bassi (spazio di crawl delle faccette da misurare; autori organizzazione dichiarati `Person`) e 1 miglioramento. Test metadata 4/4 pass; `robots.txt` live coerente e asset social verificati. Search Console e validazione live completa non disponibili; connessione HTTP intermittente. Nessuna modifica applicativa; modifiche preesistenti preservate. Migrazioni create/applicate: 0; nessuna nuova da applicare, stato delle preesistenti invariato. Prossimo: Punto 10, GPT-6 Sol · medium · Default.

- **2026-09-29 — Punto 8 completato:** Default; profilo consigliato GPT-6 Sol · medium (impostazioni effettive non verificabili). Commit iniziale/finale `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`. Creato [08-performance.md](08-performance.md): 1 finding alto sulle directory che materializzano dataset completi, 3 medi su fan-out dei dettagli, cache/invalidazione e avatar senza varianti responsive, 1 basso sul placeholder da 8,59 MB e 1 miglioramento sul bundle client globale. Due campioni HTTP per home/annunci/profili; nessun benchmark DB, build o bundle analyzer. Nessuna modifica applicativa; modifiche preesistenti e concorrenti preservate. Migrazioni create/applicate: 0; nessuna nuova da applicare, stato delle preesistenti da verificare. Prossimo: Punto 9, GPT-6 Sol · medium · Default.

- **2026-09-29 — Punto 7 completato:** Default; profilo consigliato GPT-6 Sol · high (impostazioni effettive non verificabili). Commit iniziale/finale `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`. Creato [07-qualita-react-typescript.md](07-qualita-react-typescript.md): 2 findings medi (assenza di `error.tsx`; 13 callback non conformi al contratto di cinque entry client), 1 basso (8 warning ESLint) e 1 miglioramento su clock/UUID. TypeScript strict 0 errori; ESLint 0 errori/8 warning; analizzate 80 entry client senza percorsi verso `server-only`, `next/headers` o `node:` oltre `use server`; nessun mismatch hydration confermato staticamente. Nessuna build/server, modifica applicativa o migrazione. Preesistenti preservati. Prossimo: Punto 8, GPT-6 Sol · medium · Default.

- **2026-09-29 — Punto 6 completato:** Default; profilo consigliato GPT-6 Astra · high (impostazioni effettive non verificabili). Commit iniziale/finale `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`. Creato [06-privacy-dati.md](06-privacy-dati.md): 2 findings alti, 3 medi e 2 bassi; test consensi 8/8 pass e prova sintetica EXIF. Browser CLI assente, informative LegalBlink non raggiungibili e nessuna connessione DB; verifiche residue nella checklist manuale. Nessuna modifica applicativa. Migrazioni create/applicate: 0; allineamento delle preesistenti non verificato. Prossimo: Punto 7, GPT-6 Sol · high · Default.

- **2026-09-29 — Punto 5 completato:** Default; profilo consigliato GPT-6 Astra · high (impostazioni effettive non verificabili). Commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`. Creato [05-pagamenti-stripe.md](05-pagamenti-stripe.md): `05-F01` alto rimborso anticipato perso; `05-F02` alto condizionale webhook intercettato da gate/manutenzione; `05-F03` medio parziali cumulativi ignorati; `05-F04` basso validazione protocollo origine inefficace. Test storico sospensione 1/1 pass; quattro gruppi di prove isolate su RPC, firma SDK/validatori, proxy e wrapper finale. Ownership/replay pagamento e blocco nuove priorità verificati localmente. DB/Stripe remoti non verificati; nessuna operazione reale o modifica applicativa, preesistenti preservati. Migrazioni create: 0; nessuna nuova da applicare, stato delle preesistenti da verificare. Prossimo: Punto 6, GPT-6 Astra · high · Default.

- **2026-09-29 — Punto 4 completato:** Default; profilo consigliato GPT-6 Astra · high (impostazioni effettive non verificabili). Commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`. Creato [04-consistenza-database.md](04-consistenza-database.md): matrice FK/cancellazioni, vincoli/indici, transazioni, snapshot e catena delle 48 migrazioni. `04-F01` medio: wrapper finale perde validazione Staff, riprodotto in PGlite con core simulato; `04-F02` medio: race foto principale riprodotta con funzione reale e client simulato; `04-F03` basso: indice invitante parziale, impatto da misurare. Sei test file PGlite: 13/13 pass, zero skip; non certificano tutta la catena attuale. Nessuna connessione DB: baseline e applicato restano da verificare. Riferimenti controllati; modifiche preesistenti preservate. Migrazioni create: 0; nessuna nuova da applicare, stato delle preesistenti ignoto. Prossimo: Punto 5, GPT-6 Astra · high · Default.

- **2026-09-28 — Punto 3 completato:** commit `9fc87c7`; Default; profilo consigliato GPT-6 Astra · high (impostazioni effettive non verificabili dall'agente). Creato [03-autorizzazioni-supabase.md](03-autorizzazioni-supabase.md): matrici grant/RLS/RPC/Storage aggiornate alle 48 migrazioni. `03-F01` alto: percorso immagine accettato dalla RPC può oltrepassare il bucket durante il download admin, confermato con SDK e fetch simulato senza rete. `03-F02` medio: baseline RLS non attestabile per 29 tabelle; verifica remota prioritaria, IDE senza connessioni. Test PGlite interazioni/inviti 8/8 pass, zero skip; riferimenti del report controllati. Nessuna modifica applicativa; modifiche preesistenti preservate. Migrazioni create: 0; applicazione delle preesistenti non verificata, nessuna prescritta da questo audit. Prossimo: Punto 4, GPT-6 Astra · high · Default.

- **2026-09-25 — Fase 0, pianificazione:** ricognizione leggera sul commit `278dd83` con modifiche locali; piano proposto, sito pubblico e letture remote mirate confermati. Nessun punto eseguito; master non scritto in Plan Mode.
- **2026-09-25 — Fase 0, piano approvato e master creato:** commit osservato `c2d2ab5`, workspace pulito prima della creazione; materializzato soltanto questo documento, tutti i 13 punti Da fare. Nessuna analisi approfondita o verifica remota eseguita. Prossima sessione: Punto 0.
- **2026-09-25 — Punto 0 completato:** mappa locale sul commit `c2d2ab5`; 25 pagine, 5 endpoint, 34 tabelle tipizzate, 4 tabelle private e 32 migrazioni. Policy locali e variabili d'ambiente indicizzate; schema remoto non verificato, nessuna connessione DB configurata nell'IDE. Creato [00-mappa-codebase.md](00-mappa-codebase.md); nessuna modifica applicativa. Prossimo: Punto 1.
- **2026-09-25 — Punto 1 completato:** commit `c2d2ab5`; nessuna esposizione di credenziali confermata nelle fonti e negli artefatti verificati. `01-F01` medio: configurazione Stripe live locale; `01-F02` facoltativo: scansione automatica dei segreti. Storico limitato ai percorsi sensibili, come descritto in [01-segreti-git.md](01-segreti-git.md). Nessuna correzione implementata. Prossimo: Punto 2.
- **2026-09-25 — Punto 2 completato:** commit osservato `c2d2ab5`; creato [02-sicurezza-server-auth.md](02-sicurezza-server-auth.md), con quattro findings medi, un finding basso condizionale e un miglioramento facoltativo. Test isolati: 20/20 pass; nessuna configurazione Auth/edge remota verificata. Al controllo finale risultano modifiche locali in `src/features/annunci/Annunci.tsx` e `src/features/profili/Profili.tsx`, non apportate durante l’audit e non esaminate in questo punto; nessuna correzione applicativa implementata. Prossimo: Punto 3.
- **2026-09-28 — Aggiornati i profili e la ripresa:** assegnati modello/effort/mode ai punti 0–12; i profili 0–2 sono retrospettivi. Definito checkpoint persistente e ripresa prioritaria dello stato `In corso`. Nessuna migrazione creata o da applicare manualmente da questo aggiornamento. Workspace al controllo: eliminati localmente `docs/preplanning-refactoring-pubblica-annuncio.md` e `docs/refactoring-pubblica-annuncio/roadmap.md`, modificato `src/features/registrati/Registrati.tsx`; non modificati in questa sessione.
