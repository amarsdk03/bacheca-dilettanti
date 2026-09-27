# Audit tecnico — Bacheca Dilettanti

## Obiettivo

Raccogliere una fotografia tecnica verificabile della piattaforma: sicurezza, qualità del codice, performance, SEO, dati sensibili, consistenza del database e gap funzionali. Questo master coordina i sotto-report e le azioni consigliate; l'implementazione delle correzioni sarà una fase separata.

**Piano approvato:** 2026-09-25. **Fase 0:** completata. **Prossimo punto:** 3 — Autorizzazioni Supabase, RLS, RPC e Storage.

## Metodologia

Sola analisi, un punto per sessione: leggere prima questo master e selezionare il primo punto con stato **Da fare** nell'ordine della tabella.
Dal punto 1 usare la mappa del Punto 0 e ricerche mirate, evitando nuove scansioni integrali del repository.
Scrivere soltanto il sotto-report del punto e aggiornare questo master; poi fermarsi. **Completato** significa analisi conclusa, non problemi risolti.

## Tabella di stato

La numerazione sostituisce quella della proposta iniziale. Priorità e complessità stimano il lavoro di audit e non attestano vulnerabilità già riscontrate. I report indicati hanno percorsi relativi a questa cartella; al completamento sono collegati qui.

| # | Punto | Priorità | Complessità | Stato | Report | Data completamento |
|---|---|---|---|---|---|---|
| 0 | Mappa della codebase e delle fonti | Alta | Media | Completato | [00-mappa-codebase.md](00-mappa-codebase.md) | 2026-09-25 |
| 1 | Segreti, dati nei file e tracciamento Git | Critica | Media | Completato | [01-segreti-git.md](01-segreti-git.md) | 2026-09-25 |
| 2 | Sicurezza server, autenticazione e rate limiting | Critica | Alta | Completato | [02-sicurezza-server-auth.md](02-sicurezza-server-auth.md) | 2026-09-25 |
| 3 | Autorizzazioni Supabase, RLS, RPC e Storage | Critica | Alta | Da fare | `03-autorizzazioni-supabase.md` | — |
| 4 | Consistenza DB e allineamento delle migrazioni | Alta | Alta | Da fare | `04-consistenza-database.md` | — |
| 5 | Pagamenti Stripe e flussi prioritari preesistenti | Alta | Alta | Da fare | `05-pagamenti-stripe.md` | — |
| 6 | Privacy tecnica e ciclo di vita dei dati | Alta | Alta | Da fare | `06-privacy-dati.md` | — |
| 7 | Confini server/client, React e TypeScript | Alta | Alta | Da fare | `07-qualita-react-typescript.md` | — |
| 8 | Performance applicativa e accesso ai dati | Alta | Alta | Da fare | `08-performance.md` | — |
| 9 | SEO, indicizzazione e condivisione | Alta | Media | Da fare | `09-seo-indicizzazione.md` | — |
| 10 | Accessibilità e animazioni | Media | Media | Da fare | `10-accessibilita.md` | — |
| 11 | Gap funzionali, integrazioni e roadmap | Media | Media | Da fare | `11-gap-roadmap.md` | — |
| 12 | Pulizia, dipendenze e strumenti di verifica | Media | Media | Da fare | `12-pulizia-tooling.md` | — |

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
- Terminato il singolo punto, scrivere il relativo report, aggiornare la sua riga a **Completato** con data e link e aggiornare l'indicazione del prossimo punto in testa al master. Registrare una sola riga di note per la sessione. Se il punto resta incompleto, mantenere **Da fare**, annotare quanto già coperto e riprenderlo senza ricominciare da zero.
- Fermarsi con un riepilogo di 3–5 righe sui risultati e sul punto successivo. Nessuna correzione del codice e nessun avanzamento automatico ad altri punti.

## Note di sessione

- **2026-09-25 — Fase 0, pianificazione:** ricognizione leggera sul commit `278dd83` con modifiche locali; piano proposto, sito pubblico e letture remote mirate confermati. Nessun punto eseguito; master non scritto in Plan Mode.
- **2026-09-25 — Fase 0, piano approvato e master creato:** commit osservato `c2d2ab5`, workspace pulito prima della creazione; materializzato soltanto questo documento, tutti i 13 punti Da fare. Nessuna analisi approfondita o verifica remota eseguita. Prossima sessione: Punto 0.
- **2026-09-25 — Punto 0 completato:** mappa locale sul commit `c2d2ab5`; 25 pagine, 5 endpoint, 34 tabelle tipizzate, 4 tabelle private e 32 migrazioni. Policy locali e variabili d'ambiente indicizzate; schema remoto non verificato, nessuna connessione DB configurata nell'IDE. Creato [00-mappa-codebase.md](00-mappa-codebase.md); nessuna modifica applicativa. Prossimo: Punto 1.
- **2026-09-25 — Punto 1 completato:** commit `c2d2ab5`; nessuna esposizione di credenziali confermata nelle fonti e negli artefatti verificati. `01-F01` medio: configurazione Stripe live locale; `01-F02` facoltativo: scansione automatica dei segreti. Storico limitato ai percorsi sensibili, come descritto in [01-segreti-git.md](01-segreti-git.md). Nessuna correzione implementata. Prossimo: Punto 2.
- **2026-09-25 — Punto 2 completato:** commit osservato `c2d2ab5`; creato [02-sicurezza-server-auth.md](02-sicurezza-server-auth.md), con quattro findings medi, un finding basso condizionale e un miglioramento facoltativo. Test isolati: 20/20 pass; nessuna configurazione Auth/edge remota verificata. Al controllo finale risultano modifiche locali in `src/features/annunci/Annunci.tsx` e `src/features/profili/Profili.tsx`, non apportate durante l’audit e non esaminate in questo punto; nessuna correzione applicativa implementata. Prossimo: Punto 3.
