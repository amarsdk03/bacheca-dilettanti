# Prompt per Claude — DESIGN.md della dashboard Admin

Agisci come product designer e frontend designer senior.

Devi produrre un unico file `DESIGN.md` per il refactoring visivo della dashboard amministrativa di **Bacheca Dilettanti**.

Destinazione del documento: `apps/admin/DESIGN.md`. Se non hai accesso al filesystem, restituisci il contenuto completo del file in un unico blocco Markdown.

Il documento deve essere una specifica concreta per Codex: decisioni visive definite, componenti identificati, pochi interventi conclusivi. Non implementare il codice e non limitarti a un moodboard o a consigli generici.

## Obiettivo e confini

La dashboard esiste già e le funzionalità implementate devono essere conservate. Il lavoro riguarda stile, composizione, gerarchia visiva, leggibilità, adattamento agli schermi e coerenza dell'interfaccia.

Sono consentiti:

- Modifiche a colori, tipografia, spaziature, dimensioni, bordi, ombre e icone.
- Riorganizzazione visiva dei contenuti esistenti.
- Miglioramento della presentazione di filtri, tabelle, pannelli e messaggi.
- Modalità dark/light e transizioni leggere, come descritto sotto.

Sono esclusi:

- Pagina di accesso e relativi componenti, incluso `LoginForm`, `GradientASCII` e `TechText`.
- Modifiche a funzionalità, autorizzazioni, autenticazione, richieste, controller, validazioni, URL, dati, database e API.
- Nuove sezioni operative, nuove metriche o nuove azioni amministrative.
- Test, browser automation, build, deploy e verifiche su servizi remoti.
- Riapertura della precedente roadmap di sviluppo.

Non introdurre ricerca globale, notifiche, filtri temporali, confronti percentuali, ordinamento, azioni massive o altri controlli soltanto perché presenti nelle immagini: non sono autorizzati.

## Riferimenti visivi, in ordine di priorità

Le tre immagini sono allegate a questo prompt nello stesso ordine:

1. **Prima immagine, Ember:** riferimento principale per superfici scure stratificate, sidebar, bordi sottili, selezione della navigazione, tipografia e profondità discreta. Riprendi il linguaggio visivo, senza copiare branding, dati finanziari, illustrazioni o dimensioni ingrandite del mockup.
2. **Seconda immagine, NUMI:** riferimento secondario per compattezza operativa, griglie, organizzazione delle card, grafici e buon utilizzo dello spazio.
3. **Terza immagine, Revenue Analytics:** riferimento per la modalità chiara, la leggibilità, la gerarchia tra titoli e numeri e la separazione delle superfici.

Produci un sistema coerente. In caso di conflitto prevale la prima immagine; la terza guida l'adattamento al tema chiaro.

Mantieni identità, nome e asset originali di Bacheca Dilettanti. Colori vivaci soprattutto per grafici, stati e accenti mirati. Evita decorazioni finanziarie, effetti luminosi invasivi e sfondi animati nelle schermate operative.

## Contesto tecnico reale

Il monorepo ha applicazioni Web e Admin separate. Admin utilizza:

- Next.js 16 App Router, React 19 e TypeScript.
- Tailwind CSS 4 con variabili semantiche.
- shadcn/ui, preset `base-nova`, basato su **Base UI**, non Radix.
- Lucide per le icone.
- Recharts per i grafici.

Esistono già `Sidebar`, `Card`, `Button`, `Badge`, `Input`, `InputGroup`, `Field`, `Select`, `Table`, `Sheet`, `AlertDialog`, `DropdownMenu`, `Tooltip`, `Alert`, `Empty` e `Skeleton`. Riutilizzali.

Il tema attuale è chiaro e neutro, con font Arial/Helvetica. Non esiste ancora un gestore del tema Admin. Per il nuovo sistema usa uno stack sans-serif di sistema curato e numeri tabulari; evita dipendenze font esterne.

I componenti condivisi sono utilizzati anche dall'accesso: modificare i valori globali o i loro default indiscriminatamente cambierebbe una pagina esclusa dal lavoro.

Menu, tooltip, selettori, dialog e Sheet usano portal: il tema deve raggiungere anche queste superfici e la sidebar mobile.

Motion è già presente nel monorepo per la Web, versione risolta `12.42.2`; deve essere dichiarato anche tra le dipendenze Admin, senza aggiornamenti generali delle librerie.

## Inventario della dashboard

### Struttura comune

- `DashboardShell`: sidebar, barra superiore e area contenuto.
- `DashboardSidebar`: logo/banner, navigazione raggruppata, modalità compatta, menu mobile e logout.
- `SectionHeading`: titoli delle sezioni.
- Componenti condivisi per caricamento, errori, assenza di dati e «Presto in arrivo».
- Conferma esistente per l'apertura di collegamenti esterni, da conservare e uniformare visivamente.

Navigazione esistente, da conservare:

- Home.
- Contenuti: Annunci, Segnalazioni.
- Community: Utenti, Profili, Codici invito.
- Gestione: Pagamenti, Promo e crediti, Distribuzione.
- Analitiche: Statistiche, Registro attività, Integrazioni, Versioni sito web.

Solo **Home, Annunci e Registro attività** hanno schermate operative dedicate. Le altre dieci sezioni mostrano «Presto in arrivo»: progetta un unico trattamento coerente per queste pagine senza implementarne le funzionalità.

### Home

Componenti principali: `HomeKpis`, `HomeQuickActions`, `HomeChartPanel`, `HomeCharts`, `HomeActivity`.

Contiene:

- Quattro indicatori selezionabili: Utenti totali, Annunci totali, Annunci da approvare, Profitti totali.
- La selezione dell'indicatore cambia i grafici.
- Profitti totali deve continuare a mostrare «Non disponibile».
- Grafico temporale ad area oppure grafico a barre per anzianità degli annunci da approvare.
- Grafico a torta della distribuzione, legenda e tabelle accessibili dei dati.
- Tredici colori grafico esistenti: prevedi la copertura di `--chart-1` fino a `--chart-13` in entrambi i temi.
- Aggiornamenti separati di indicatori, grafici e attività.
- Ultime cinque operazioni e collegamento al registro completo.
- Azioni rapide esistenti, incluse quelle disabilitate e marcate «Presto».

Mantieni informazioni su aggiornamento, periodi, popolazioni e limiti dei dati. Non inventare trend, confronti o importi. Non cambiare aggregazioni, categorie, serie o interpolazione dei grafici per imitare le immagini.

### Annunci

Componenti principali: `AnnunciWorkspace`, `AnnouncementDetailContent`, `ModerateActions`, `ModerationDialog`.

Contiene:

- Ricerca per titolo o UUID.
- Filtri Stato, Tipologia, Oscuramento e Cestino.
- Ricerca con invio esplicito e filtri con il comportamento attuale.
- Tabella con Titolo, Autore/Profilo, Tipologia, Stato, Visibilità, Creazione e Azioni.
- Paginazione e aggiornamento.
- Esportazione CSV della sola pagina corrente, fino a 30 risultati.
- Creazione annuncio disabilitata, indicata come futura.
- Anteprima in pannello laterale con contenuto, autore, località, contatti, collegamenti e metadati.
- Azioni di approvazione, rifiuto, oscuramento, ripristino della visibilità, cestino e recupero.
- Conferme, motivazioni, blocchi e messaggi già implementati.

Conserva tutti i campi e le informazioni. Mantieni distinti stato, oscuramento, privacy e cestino: hanno significati diversi. Non attivare azioni attualmente indisponibili e non rimuovere spiegazioni o conferme per rendere l'interfaccia più pulita.

### Registro attività

Componenti principali: `AuditWorkspace`, `AuditSummaryTable`, `AuditDetailContent`.

Contiene:

- Filtri Dal, Al, Operatore, Operazione ed Esito.
- Applicazione esplicita e ripristino dei filtri.
- Ricerca operatore tramite email/UUID e opzione «Non identificato».
- Tabella con data/ora, amministratore, operazione/esito e apertura dettagli.
- Paginazione fino a 30 eventi per pagina.
- Dettaglio in pannello laterale, in sola lettura, con identificativi, variazioni, motivazione, correlazione ed eventuali informazioni di esportazione.

Conserva le informazioni sulla provenienza dei dati e sulle date in Europe/Rome. `AuditSummaryTable` è utilizzata anche nella Home: prevedi uno stile condiviso.

## Temi

Progetta entrambi i temi completi:

- **Dark iniziale**.
- Selettore dark/light discreto nella struttura della dashboard, accessibile anche su mobile.
- Preferenza salvata localmente nel browser; assenza di preferenza significa dark.
- Nessuna sincronizzazione con account, database o preferenze del sistema operativo.
- Accesso invariato, anche dopo cambio tema, logout o navigazione.

Le variabili e le personalizzazioni devono essere circoscritte alla dashboard e ai relativi portal. Non applicare indiscriminatamente il nuovo tema a `html`/`body` o ai componenti usati dal login.

## Motion

Voglio transizioni minime e rapide, usando Motion per React:

- Fade dell'area contenuto durante il cambio di sezione/pagina: **160 ms**.
- Microtransizioni di hover e selezione: circa **120 ms**.
- Aperture e chiusure delle superfici temporanee: massimo **180–200 ms**, coordinando le transizioni Base UI già presenti.
- Rispetto di `prefers-reduced-motion`: le transizioni decorative vengono eliminate.
- Nessuna attesa artificiale prima della navigazione.
- Sidebar e header persistenti.
- Nessuna animazione per singola riga, conteggio crescente dei KPI, entrata a cascata delle card, loop o animazione dei dati dei grafici.
- Nessun rimontaggio di controller, form o provider per ottenere l'effetto.
- Nessuna transizione dell'intera pagina quando cambiano soltanto filtri, paginazione o query string.
- Non sovrapporre Motion alle animazioni già gestite dai componenti.

## Contenuto richiesto nel DESIGN.md

### 1. Direzione visiva definitiva

Spiega cosa riprendi da ciascun riferimento e come si applica a questa dashboard.

### 2. Token concreti dark/light

Definisci valori esatti per superfici, testi, bordi, azioni, focus, selezione, stati e tutti i colori dei grafici; scala tipografica, spaziature, raggi, ombre e motion. Usa nomi compatibili con le variabili semantiche esistenti.

### 3. Specifiche della struttura e delle schermate

Descrivi ordine dei blocchi, proporzioni, densità e gerarchia. Includi semplici schemi testuali per Home, Annunci e Registro. Definisci il comportamento per mobile, tablet e desktop. Mantieni tutte le informazioni delle tabelle, consentendo scorrimento orizzontale interno quando necessario.

### 4. Regole dei componenti e degli stati

Specifica navigazione attiva, card selezionate, pulsanti primari/secondari/distruttivi, filtri, badge, tabelle, pannelli, conferme, tooltip e grafici. Copri focus, hover, disabled, loading, empty, error, dati incompleti, «Non disponibile» e «Presto».

Mantieni etichette, gestione del focus, semantica e messaggi accessibili esistenti. Non affidare il significato degli stati al solo colore.

### 5. Esattamente tre piani operativi Codex

- **STEP 1 — Fondamenta visive, temi, struttura comune e Motion.**
- **STEP 2 — Home: indicatori, grafici, azioni rapide e attività.**
- **STEP 3 — Annunci, Registro attività, dettagli, conferme e completamento degli stati condivisi.**

Per ciascuno step indica:

- Obiettivo e componenti interessati.
- Da tre a cinque interventi concreti.
- Vincoli da preservare.
- Risultato conclusivo e criteri di completamento.
- Un prompt breve da inviare a Codex, che richiami `DESIGN.md` e limiti il lavoro a quello step.

Lo step 3 include il completamento visivo e chiude il lavoro. Non aggiungere una quarta fase di «polish», audit, testing, ottimizzazione o backlog.

I criteri di completamento sono criteri di implementazione e revisione del codice, non una richiesta di eseguire test. Non chiedere a Codex di avviare browser, servizi, test, lint, typecheck, build o deploy.

Scegli una soluzione per ogni decisione visiva. Non lasciare alternative aperte, TODO o richieste di ulteriori approvazioni. Se non hai accesso al repository, usa questo inventario e non fingere di aver letto file o visto schermate reali.

Il risultato deve poter essere applicato da Codex senza inventare funzioni e senza riprogettare nuovamente il sistema durante ogni step.
