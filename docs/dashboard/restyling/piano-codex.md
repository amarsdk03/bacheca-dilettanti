# Refactoring UI della dashboard — Tre step Codex

**Stato del lavoro:** concluso. Il [prompt completo per Claude](prompt-claude.md) è stato utilizzato e `apps/admin/DESIGN.md` è disponibile. Tutti e tre gli step sono implementati e riesaminati tramite lettura del codice e del diff. Nessuno step residuo nel perimetro concordato; test e verifiche runtime non eseguiti su richiesta dell'utente.

Questo piano riguarda il nuovo lavoro di stile richiesto dall'utente. La precedente consegna funzionale della dashboard resta chiusa.

## Utilizzo

1. Invia a Claude il contenuto completo di [prompt-claude.md](prompt-claude.md) e le tre immagini, nell'ordine **Ember → NUMI → Revenue Analytics**.
2. Salva il documento restituito da Claude in `apps/admin/DESIGN.md`.
3. Usa i prompt di avvio riportati sotto, nell'ordine degli step. Ogni intervento deve terminare entro il proprio perimetro, senza introdurre nuove fasi.

`DESIGN.md` definisce le scelte visive; questo documento conserva il perimetro e la sequenza approvati. Se il design include funzioni o verifiche escluse, Codex applica soltanto la parte coerente con la richiesta dell'utente. Non creare un `DESIGN.md` vuoto o sostitutivo in attesa di Claude.

## Regole comuni ai tre step

- Intervenire solo sulla presentazione di `apps/admin`: markup, layout, classi, token, varianti visive e asset già disponibili. I soli nuovi comportamenti consentiti sono il selettore dark/light con preferenza locale e le transizioni leggere richieste.
- Conservare codice, aspetto e comportamento dell'accesso, inclusi `LoginForm`, `GradientASCII`, `TechText` e gli stati di autenticazione. Non estendere al login il tema o le transizioni della dashboard.
- Conservare handler, controller, query, server action, API, contratti, validazioni, autorizzazioni, destinazioni e parametri URL. La riorganizzazione del JSX deve mantenere gli stessi dati e collegamenti alle azioni esistenti.
- Nessuna modifica a database, Supabase, applicazione Web o gate delle funzionalità. Nessuna nuova funzione per le sezioni «Presto in arrivo».
- Riutilizzare shadcn/Base UI, Lucide e Recharts esistenti. Non migrare primitive, sovrascrivere preset o aggiornare genericamente le dipendenze. Dichiarare Motion nel workspace Admin mantenendo la versione già risolta nel monorepo; limitare il lockfile alle modifiche necessarie.
- Usare token e varianti circoscritti alla dashboard. Conservare i default utilizzati dall'accesso; estendere il tema ai portal, alla sidebar mobile e alle conferme esistenti.
- Dark iniziale, selezione esplicita dark/light, preferenza locale. Nessun collegamento con profilo, sessione o database.
- Fade del contenuto al cambio di pagina di 160 ms; hover/selezione circa 120 ms; superfici temporanee entro 180–200 ms. Con movimento ridotto, eliminare le transizioni decorative. Non rimontare contenuti per animarli, non ritardare le navigazioni e non animare i cambi della sola query string.
- Conservare messaggi, descrizioni dei dati, stati disabilitati, indicatori di attesa, etichette accessibili, gestione del focus e conferme. Non nascondere informazioni per ottenere un aspetto più pulito.
- **Nessun test, browser automation, avvio dell'applicazione o di servizi, lint, typecheck, build o deploy.** Sono previste soltanto lettura del codice e revisione del diff; non dichiarare verifiche runtime o visive mai eseguite.
- Rispettare le modifiche già presenti nel workspace. Leggere le istruzioni applicabili e le guide Next.js installate pertinenti prima di intervenire sul codice.

Non cambiano API pubbliche, tipi di dominio o formati dei dati. Eventuali nuovi tipi, provider e wrapper riguardano esclusivamente tema e presentazione.

## Step 1 — Sistema comune, temi e Motion

**Stato:** Completato — 2026-10-28. Implementazione e revisione statica di codice e diff; nessuna verifica runtime o visiva dell'applicazione.

**Prerequisito:** `apps/admin/DESIGN.md` disponibile con le decisioni visive di Claude.

**Obiettivo:** applicare il linguaggio visivo all'intera struttura della dashboard e predisporre le basi riutilizzate dalle schermate.

**Componenti interessati:** `DashboardShell`, `DashboardSidebar`, `SectionHeading`, primitive UI condivise e relativi portal. Le variabili si definiscono nel CSS esistente, sotto un ambito dedicato alla dashboard.

1. Applicare i token dark/light del design, includendo tipografia, numeri tabulari, superfici, bordi, stati, raggi e tutti i tredici colori dei grafici. Preservare i valori globali da cui dipende l'accesso.
2. Introdurre il tema locale della dashboard e il selettore accessibile su desktop e mobile. Includere menu, tooltip, select, Sheet e AlertDialog nel medesimo ambito visivo, senza modificare la loro gestione di apertura, focus o chiusura.
3. Sistemare sidebar estesa/compatta/mobile, barra superiore, titoli e griglia del contenuto. Conservare gruppi, voci, collegamenti, shortcut, chiusura del menu mobile e logout.
4. Uniformare gli elementi condivisi tramite token e varianti dedicate, preservando il rendering preesistente fuori dalla dashboard. Definire qui lo stile comune di tabelle, controlli e superfici temporanee, riutilizzato negli step successivi.
5. Dichiarare Motion nelle dipendenze Admin e aggiungere la transizione del contenuto su cambio di pathname, mantenendo montati shell e provider. Coordinare i tempi delle transizioni già presenti ed eliminare quelle decorative con movimento ridotto.

**Chiusura:** tema, shell, primitive e transizioni sono implementati secondo il documento; il codice include anche i portal e il menu mobile. La revisione del diff conferma che l'accesso conserva il proprio ambito e che non sono state introdotte modifiche funzionali. Le pagine operative riceveranno i rispettivi layout negli step 2 e 3.

**Allineamenti approvati dopo la lettura di DESIGN.md:**

- Il trattamento specifico di `ComingSoon` resta nello step 3 secondo questa sequenza, anche se il piano interno al design lo anticipa allo step 1. Le dieci pagine ricevono già tema, shell e heading condivisi.
- Sidebar desktop da 1024 px, larga 248 px o 72 px in modalità compatta; sotto questa soglia si usa lo Sheet. Hook e CSS concordano sul breakpoint, mentre il default della primitiva fuori dalla dashboard resta 768 px.
- La classe `dark` appartiene soltanto a shell e host dei portal. I colori del preset sono corretti mediante stili Admin, senza ridefinire la variante globale Tailwind o gli stili di html/body.
- Il fade ascolta esclusivamente il pathname. Il movimento ridotto include un ascolto esplicito della media query per interrompere anche un'animazione già in corso.

**Consegna dello step:**

- Nuovi `DashboardThemeProvider`, `DashboardThemeToggle`, `DashboardPageTransition` e contesto `components/ui/admin-appearance.tsx`; preferenza `bd-admin-theme`, dark iniziale e host `bd-admin-portal-root` con rimozione all'uscita.
- Nuovo `src/app/dashboard.css`, importato dal CSS esistente: palette complete, tredici colori grafico, sistema tipografico, controlli e stati, dimensioni e transizioni circoscritti alle due radici Admin. Asset originali mantenuti, con supporto chiaro locale per il marchio nero.
- Aggiornati `DashboardShell`, `DashboardSidebar`, `SectionHeading`, `use-mobile` e le primitive `sidebar`, `sheet`, `alert-dialog`, `dropdown-menu`, `select`, `tooltip`, `table`, `button`, `badge`, `alert`. Varianti semantiche e outline danger disponibili per gli step successivi; destinazione dei portal e default visivi originali preservati fuori dal contesto Admin.
- Motion fissato a 12.42.2 in `apps/admin/package.json` e nel solo riferimento necessario di `package-lock.json`; nessun aggiornamento generale delle dipendenze.
- Revisione statica: nessuna modifica dello step ad accesso, controller, servizi, guard, server action, contratti, URL o dati. Nessuna key di navigazione, rimontaggio decorativo, fade sulla query string o attesa introdotta nella navigazione.
- **Test, browser, avvio servizi, lint, typecheck, build e deploy non eseguiti su richiesta dell'utente.** La revisione dei sorgenti e del diff non certifica il comportamento runtime o la resa visiva.

**Prompt di avvio:**

```text
Leggi apps/admin/DESIGN.md e docs/dashboard/restyling/piano-codex.md.
Esegui soltanto lo step 1: sistema comune, temi e Motion.
Organizza un piano breve sui componenti coinvolti e porta l'implementazione
fino ai criteri di chiusura dello step, senza un nuovo giro di approvazione
per le decisioni già fissate nei documenti.
Conserva accesso, funzioni, dati e modifiche già presenti nel workspace.
Non eseguire test, browser, avvio servizi, lint, typecheck, build o deploy.
Alla fine aggiorna solo lo stato di questo step e riporta i file modificati,
l'esito della revisione del diff e che non sono stati eseguiti test.
```

## Step 2 — Home

**Stato:** Completato — 2026-10-28. Implementazione e revisione statica di codice e diff; nessuna verifica runtime o visiva dell'applicazione.

**Prerequisito:** step 1 concluso.

**Obiettivo:** applicare la composizione definita da Claude alla Home, usando il sistema comune già realizzato.

**Componenti interessati:** pagina Home, `HomeKpis`, `HomeQuickActions`, `HomeChartPanel`, `HomeCharts`, `HomeActivity`, relativi skeleton e presentazione condivisa di `AuditSummaryTable`.

1. Comporre titoli, quattro indicatori, azioni rapide, grafici e ultime operazioni secondo il design, con spaziature e proporzioni definite per mobile, tablet e desktop.
2. Evidenziare l'indicatore selezionato e la gerarchia dei valori senza modificare il collegamento ai grafici. Profitti rimane «Non disponibile» e le azioni future restano disabilitate.
3. Applicare la veste dei grafici a contenitori, assi, griglie, tooltip, legende e tabelle accessibili. Conservare serie, interpolazione, categorie, ordinamento, denominatori e metadati; non introdurre animazioni dei dati.
4. Uniformare la tabella delle ultime cinque operazioni e le azioni esistenti. Applicare lo stesso stile di `AuditSummaryTable` che sarà utilizzato nel Registro.
5. Allineare skeleton, errori, assenza di dati e disponibilità parziale ai blocchi effettivi, mantenendo l'indipendenza degli aggiornamenti di indicatori, grafici e attività.

**Chiusura:** tutti i blocchi Home e gli stati già implementati adottano il design in entrambi i temi e hanno una composizione responsive definita. La revisione del codice conserva selezione della metrica, richieste, dati e relativi limiti. Nessun intervento Home è rinviato a una fase di rifinitura.

**Consegna dello step:**

- Home nell'ordine titolo, indicatori, azioni rapide, grafici, ultime operazioni. Quattro KPI su una colonna sotto 480 px, due fino a 1279 px e quattro da 1280 px; selezione neutra con Check decorativo, controllo Toggle e riferimenti accessibili conservati. Profitti resta selezionabile e mostra «Non disponibile».
- Grafici in due Card senza guscio Card esterno, rapporto 2:1 da 1280 px e impilamento sotto questa soglia. Area cartesiana 240/280 px, torta entro 176/200 px, tooltip e legende tematizzati. Conservati dati, categorie, serie, interpolazione lineare, denominatori, metadati, note sui limiti e tabelle accessibili. Animazioni delle serie disattivate come prima.
- Attività a tutta larghezza, azioni esistenti nell'header responsive e presentazione unica di `AuditSummaryTable` condivisa con il Registro: esiti semantici, wrapping, caption e scorrimento interno. Le configurazioni dei due utilizzi e l'apertura dei dettagli restano invariate.
- Skeleton statici coerenti con i blocchi Home; stati vuoti, errori e dati non disponibili usano le superfici e i token dello step 1. Aggiornamenti e caricamenti di indicatori, grafici e attività restano separati.
- File modificati: pagina `src/app/(dashboard)/page.tsx`, `HomeKpis`, `HomeQuickActions`, `HomeChartPanel`, `HomeCharts`, `HomeActivity`, `HomeSkeletons`, `HomeFailure`, `AuditSummaryTable` e import in `src/app/globals.css`. Aggiunto `src/app/home.css` con regole circoscritte all'Admin, inclusa la presentazione condivisa della tabella attività.
- Revisione statica di sorgenti e diff: nessuna modifica ad accesso, provider della sessione, hook/controller, query, trasporti, contratti, presentazione dei dati o servizi. Conservati handler, destinazioni, messaggi, condizioni di disponibilità e recupero dagli errori. Il cambio di metrica non introduce un fade della pagina.
- **Test, browser, avvio servizi, lint, typecheck, build e deploy non eseguiti su richiesta dell'utente.** La revisione statica non certifica il comportamento runtime o la resa visiva. Lo step 2 è concluso; resta soltanto lo step 3 già previsto.

**Prompt di avvio:**

```text
Leggi apps/admin/DESIGN.md e docs/dashboard/restyling/piano-codex.md.
Esegui soltanto lo step 2, assumendo lo step 1 già concluso: refactoring
visivo completo della Home e dei suoi stati secondo il design.
Organizza un piano breve e completalo riutilizzando tema e primitive
esistenti, senza riprogettare la struttura comune.
Conserva metriche, selezione dei grafici, dati, azioni e caricamenti separati.
Non modificare accesso o funzioni e non eseguire test, browser, avvio servizi,
lint, typecheck, build o deploy.
Alla fine aggiorna solo lo stato di questo step e riporta i file modificati,
l'esito della revisione del diff e che non sono stati eseguiti test.
```

## Step 3 — Annunci, Registro attività e chiusura

**Stato:** Completato — 2026-10-28. Refactoring UI concluso con revisione statica di sorgenti e diff; nessuna verifica runtime o visiva dell'applicazione.

**Prerequisito:** step 2 concluso.

**Obiettivo:** completare tutte le superfici operative rimaste e chiudere il refactoring visivo.

**Componenti interessati:** `AnnunciWorkspace`, `AnnouncementDetailContent`, `ModerateActions`, `ModerationDialog`, `AuditWorkspace`, `AuditSummaryTable`, `AuditDetailContent`, `ComingSoon`, stati condivisi e conferma di navigazione esterna.

1. Applicare il design ad azioni, filtri, tabelle e paginazione degli Annunci e del Registro. Conservare colonne, informazioni, comportamento dei filtri, limite di pagina ed esportazione della sola pagina corrente. Su schermi stretti usare scorrimento interno dove necessario.
2. Uniformare i pannelli di dettaglio, la gerarchia delle informazioni e la presentazione dei metadati. Conservare i campi, le motivazioni, i dati incompleti e le spiegazioni sulla loro provenienza.
3. Sistemare visivamente azioni di moderazione, motivazioni e conferme, inclusa quella per i collegamenti esterni. Conservare abilitazioni, stati di invio, focus, annullamento, esiti e gestione dei conflitti.
4. Completare il trattamento comune di caricamento, vuoto, errore, dati parziali, contenuto non più disponibile e «Presto in arrivo». Le dieci sezioni future condividono il medesimo componente, senza nuove funzionalità.
5. Riesaminare il codice e il diff degli interventi rispetto al design: copertura dei due temi, responsive, portal, movimento ridotto, informazioni conservate e accesso escluso. Risolvere qui eventuali incoerenze di presentazione rimaste nel perimetro, senza creare una quarta fase.

**Chiusura:** tutte le superfici previste dal piano sono implementate secondo il design. Aggiornare lo stato dello step e dichiarare **«Refactoring UI completato; nessuno step residuo nel perimetro concordato. Test non eseguiti su richiesta dell'utente.»** soltanto quando l'implementazione è conclusa. La revisione del codice non equivale a una verifica runtime o a una certificazione di rilascio.

**Consegna finale:**

- Annunci: ricerca esplicita e quattro filtri in una superficie dedicata; toolbar risultati con aggiornamento, CSV della sola pagina corrente e nota del limite di 30 risultati. Tutte e sette le colonne conservate, titoli completi, badge distinti e paginazione nella Card risultati con scorrimento orizzontale interno.
- Dettaglio Annunci: header separato dal corpo scorrevole, contenuto prima dell'autore, tutti i campi e le note originali conservati, azioni di moderazione in fondo al corpo. Stato, oscuramento, privacy e cestino hanno trattamenti semantici distinti. Blocchi, motivazioni e condizioni delle azioni restano quelli esistenti.
- Conferme: motivazione, validazione, pending, annullamento, focus iniziale e ritorno al trigger preservati. Rifiuto e cestino hanno pulsanti outline danger nel dettaglio e conferma destructive; gli esiti e i conflitti conservano tutti i messaggi. La conferma dei link esterni presenta l'indirizzo completo nel medesimo tema senza modificare la navigazione.
- Registro: filtri responsive con invio e ripristino espliciti, opzione Non identificato, Europe/Rome e provenienza visibili; tabella condivisa con la Home e pagina fino a 30 eventi. Dettaglio in sola lettura con tutti gli identificativi, valori prima/dopo, motivazione, correlazione, errore, dati di esportazione e note sull'identità.
- Stati condivisi: vuoto, errori, dati incompleti, contenuti non più disponibili, skeleton statici e indicatori pending esistenti. Trattamento unico delle dieci pagine future, senza nuove CTA o funzioni. Nessuna animazione in loop nello scope Admin; accesso escluso anche da questa regola.
- Revisione trasversale statica: regole circoscritte alle radici Admin in dark/light, portal instradati nell'host dedicato, superfici responsive, contenuti lunghi e focus leggibili, movimento ridotto e nessuna nuova animazione delle pagine o dei dati. La tabella Audit usa dimensionamento automatico per conservare le etichette delle azioni senza sovrapposizioni a larghezze fisse.
- File dello step: `AnnunciWorkspace`, `AnnouncementDetailContent`, `ModerateActions`, `ModerationDialog`, nuovo `AnnouncementBadges`; `AuditWorkspace`, `AuditDetailContent`, `AuditSummaryTable`; `ContentStates`, `ContentError`, `ContentSkeletons`; presentazione di `ExternalNavigation`; classi delle pagine Annunci, Registro e `[section]`; nuovo `src/app/operations.css`, relativo import in `globals.css` e adeguamento della tabella condivisa in `home.css`.
- Nessun intervento dello step ad accesso, controller, trasporti, query, server action, contratti, date, autorizzazioni, database, Web o gate. La consegna funzionale precedente e le operazioni manuali già documentate restano separate da questo refactoring.
- **Test, browser, avvio servizi, lint, typecheck, build e deploy non eseguiti su richiesta dell'utente.** La revisione statica non certifica il comportamento runtime o la resa visiva.

**Refactoring UI completato; nessuno step residuo nel perimetro concordato. Test non eseguiti su richiesta dell'utente.**

**Prompt di avvio:**

```text
Leggi apps/admin/DESIGN.md e docs/dashboard/restyling/piano-codex.md.
Esegui lo step 3 fino alla chiusura del refactoring UI: Annunci, Registro,
dettagli, conferme, stati condivisi e pagine Presto in arrivo.
Gli step 1 e 2 sono già conclusi. Riutilizza le loro scelte e correggi
eventuali incoerenze di presentazione residue entro questo stesso step.
Conserva colonne, informazioni, filtri, azioni, vincoli, focus e messaggi;
non modificare accesso, controller, richieste, autorizzazioni o dati.
Non eseguire test, browser, avvio servizi, lint, typecheck, build o deploy.
Rivedi soltanto codice e diff, aggiorna lo stato dello step e consegna il
refactoring completato. Non aggiungere una quarta fase, ulteriori audit
o una lista aperta di rifiniture. Dichiara che i test non sono stati eseguiti.
```

## Avanzamento

| Step | Risultato atteso | Stato |
| --- | --- | --- |
| 1 | Temi, struttura comune, primitive e Motion | Completato — revisione statica |
| 2 | Home completa nel nuovo design | Completato — revisione statica |
| 3 | Schermate operative, stati e chiusura UI | Completato — refactoring UI concluso |

Aggiornare la riga e la sezione dello step effettivamente eseguito. Non modificare i vecchi stati di chiusura dello sviluppo funzionale, né aggiungere nuovi step a questa sequenza.
