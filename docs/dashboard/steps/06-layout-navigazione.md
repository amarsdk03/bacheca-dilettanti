# 06 — Layout, navigazione e stati comuni

**Stato:** Da terminare — implementazione e test mirati riusciti; prove visive/interattive browser pendenti  
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze di sviluppo:** Step 05 implementato e verificato con SDK/risposte sintetiche; accesso e pagine protette disponibili. Prove integrate 03–05 obbligatorie prima del rilascio, rinviate secondo il master.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Costruire sidebar con logo, gruppi/ordine/icone definiti nel master, contenuto principale e logout in fondo. Nessuna voce Impostazioni o gruppo Altro. Versioni sito web è ultima in Analitiche.

Tema Light e Arial; riutilizzare componenti Base UI/shadcn esistenti e aggiungere solo quelli mancanti con la CLI prevista. Sidebar desktop e menu mobile, focus visibile e indicazione della voce attiva.

Ogni sezione ha titolo medio-grande e la stessa icona del menu; Home mostra «Bentornato, admin!» senza icona. Tutte le sezioni future mostrano i due testi esatti del master. Home, Annunci e Registro restano scaffolding protetto fino ai rispettivi step.

## Comportamento condiviso

Predisporre skeleton di card, righe tabella, pannelli e grafici, stati vuoti ed errori riprovabili. Caricamenti progressivi senza schermata bloccante unica o ritardi artificiali.

Adattare il pattern ExternalNavigation esistente: AlertDialog prima di aprire contenuti su host esterni, inclusa la webapp pubblica, con destinazione visibile e conferma/annullamento. Il testo per il sito ufficiale non deve dichiararlo non affiliato. Coprire i percorsi di apertura gestiti dall'app, comprese scorciatoie/tasti modificatori intercettabili; non promettere controllo sulle funzioni native del browser fuori dall'app. Le anteprime interne non aprono il dialogo.

## Criteri di completamento e verifiche

Ordine completo del menu, URL diretti protetti, titoli e placeholder corretti. Verificare mobile/desktop, overflow confinato alle tabelle, navigazione da tastiera, focus nei pannelli/dialoghi e annullamento dei link esterni. Nessuna nuova logica dati nei componenti comuni.

## Migrazioni e operazioni manuali

**Nessuna nuova migrazione, script SQL o configurazione da applicare ora.** Non
sono stati letti/modificati `.env.local`, collegati progetti Supabase o attivate
policy. Per provare il sito completo usare esclusivamente il locale/staging
sintetico e i prerequisiti della [scheda 05](05-accesso-sessione.md): PGlite da solo
non offre un servizio Auth/PostgREST per effettuare il login dal browser.

I componenti Base UI mancanti sono stati aggiunti dalla CLI shadcn installata:
Sidebar, Sheet, AlertDialog, Tooltip, Empty, Card e Table, più hook mobile. File
già presenti mantenuti; import `cn` allineati all'utility Admin esistente e
dipendenza aggiuntiva `cn` rimossa dall'Admin. Lockfile root unico mantenuto.
Il logo quadrato esistente è già copiato in `apps/admin/public/logo.png`.

## Avanzamento

### Implementazione disponibile

- `app/(dashboard)` contiene layout, Home, pagina dinamica `[section]`, loading ed
  error boundary. `/accesso` resta fuori dalla shell. `requireAdminPageContext`
  verifica nel layout **e in ogni pagina**, usando il contesto React deduplicato
  nella sola richiesta. Diniego, sessione assente o verifica indisponibile portano
  a `/accesso`, dove gli stati controllati dello step 05 restano disponibili.
  Il layout non è l'unica barriera: una pagina successiva verifica anche se la
  shell è già montata. Nessun ID/sessione viene passato alla shell client.
- Catalogo tipizzato in `features/dashboard/sections.ts`: Home `/`, poi `/annunci`,
  `/segnalazioni`, `/utenti`, `/profili`, `/codici-invito`, `/pagamenti`,
  `/promo-e-crediti`, `/distribuzione`, `/statistiche`, `/registro-attivita`,
  `/integrazioni`, `/versioni-sito-web`. Gruppi/icone nell'ordine esatto del master.
  Lo slug viene risolto solo nel catalogo; quelli sconosciuti restituiscono 404
  dopo la guardia. Future pagine dedicate potranno sostituire la rotta dinamica
  mantenendo gli URL. Nessun `generateStaticParams` o contenuto Admin prerenderizzato.
- Home mostra «Bentornato, admin!» senza icona. Le altre dodici sezioni mostrano
  titolo/icona e i due testi esatti del master, incluse Annunci e Registro fino ai
  rispettivi step. Nessuna tabella, metrica o dato dimostrativo.
- Sidebar inizialmente estesa, riducibile a icone con tooltip e label accessibili;
  banner estesa e logo quadrato compatta. Stato locale al layout, nessun nuovo
  cookie o localStorage. Voci Next Link con prefetch disabilitato per non generare
  verifiche preventive su tutte le pagine; stato attivo esatto o per sottopercorso.
  Logout in fondo con scope locale e gestione errori dello step 05, anche compatto.
- Sotto 768 px: Sheet mobile con titolo/descrizione accessibili, banner e pulsante
  Chiudi; selezione chiude il menu, focus configurato per tornare al comando di
  apertura. Hook media query basato su `useSyncExternalStore`, senza aggiornamento
  sincrono dello stato in un effetto. Scorciatoia Ctrl/Cmd+B non intercetta campi
  di testo. Menu scorrevole anche compatto, footer separato e contenuto `min-w-0`.
- Unico landmark `main`, collegamento «Salta al contenuto», sezioni con un solo
  h1. Token sidebar aggiunti al tema Light/Arial. Header con comando menu e nome
  della dashboard; errori e caricamenti della sezione non smontano la shell.
- Skeleton riutilizzabili per card, righe tabella, dettagli, grafici e sezioni;
  Table usa il contenitore con overflow orizzontale, senza allargare la pagina.
  Limite 30 anche per le righe skeleton; nessun ritardo artificiale. EmptyState,
  ComingSoon e ContentError distinti. L'error boundary usa `retry` della versione
  Next installata e non mostra né registra errori grezzi. Skeleton menu stabili
  tra server e client, senza larghezze casuali.

### Contratto per contenuti esterni

`features/navigation/ExternalNavigation.tsx` espone `ExternalNavigationProvider`,
`ExternalLink` e `useExternalNavigation()`. Il provider è montato nella shell;
usare `ExternalLink` per link utente e il relativo hook per pulsanti che richiedono
un'apertura esterna. Senza provider viene generato un errore controllato di
programmazione, evitando un ripiego silenzioso sulla navigazione diretta.

Il validatore puro accetta HTTP/HTTPS e URL relativi, rifiuta credenziali incorporate,
caratteri di controllo, schemi non consentiti e URL malformati prima di rendere
`href`. I link interni mantengono il comportamento nativo; quelli verso un'origine
diversa richiedono AlertDialog, anche per Web ufficiale, porte diverse, modificatori
e click centrale. Enter su un link passa dal normale click del browser.

Il dialogo mostra URL completo come testo React e un avviso neutro: non definisce
la Web ufficiale non affiliata. Focus iniziale configurato su Annulla; focus finale
al link/pulsante originale solo se ancora presente. La conferma è un link nativo
con `target="_blank"` e `rel="noopener noreferrer"`, senza `window.open` anticipato.
Annullare chiude il dialogo senza navigare. Le anteprime interne non lo usano.

Non promettere intercettazione dei menu contestuali, trascinamenti o altri comandi
nativi fuori dal controllo dell'app. Non usare link raw o `window.open` nelle future
feature per aggirare il contratto; non accettare HTML utente arbitrario. Mailto,
tel e altri schemi non sono abilitati da questo ingresso per siti esterni.

### Verifiche effettuate

```text
node --test tests/admin-auth-server.test.mjs tests/admin-auth-interface.test.mjs tests/admin-audit-server.test.mjs tests/admin-dashboard.test.mjs tests/admin-external-navigation.test.mjs tests/admin-web-boundary.test.mjs
npm run typecheck:admin
npm run typecheck
node node_modules/eslint/bin/eslint.js apps/admin/src tests/admin-dashboard.test.mjs tests/admin-external-navigation.test.mjs tests/admin-auth-interface.test.mjs tests/helpers/admin-server-loader.mjs
```

**143 test riusciti, zero fallimenti/skip**, di cui 37 nuovi. Rendering statico
con i componenti Base UI reali, contesto sintetico e handler effettivi: ordine e
URL, titoli/placeholder, accessi diretti, revoca con layout già accettato, 404,
sidebar estesa/compatta e logout, chiusura mobile e configurazione focus, limiti
skeleton, retry e link esterni/annullamento/modificatori. Test Auth/audit e confine
Web esistenti mantenuti; test della Home aggiornati per il gruppo di rotte.

TypeScript di entrambe le app e lint mirato senza rilievi. Compilazione
PostCSS/Tailwind riuscita in memoria: Arial, token/varianti sidebar e overflow
presenti; nessun file build prodotto. Verificata corrispondenza binaria del logo.
Le guide installate di Next su route groups, loading ed error boundary e le
documentazioni ufficiali shadcn sono state consultate prima dell'implementazione.

Nessun dev server, build di produzione, Docker o collegamento Supabase. Nessun
test su dati reali. Nessun browser avviato: rendering statico e handler simulati
non provano viewport, focus effettivo, trapping dei dialoghi o apertura di schede.

### Residui prima del rilascio

Su ambiente sintetico predisposto secondo 05, verificare nel browser desktop e
mobile: riduzione/espansione sidebar, tooltip con tastiera, menu scrollabile con
Logout visibile, chiusura e focus, tab order e skip link, overflow a 320/375/768 px,
titoli lunghi, skeleton durante navigazione ed errori con retry. Provare logout
pendente/fallito anche compatto, assenza di shell al login e accessi diretti dopo
revoca ruolo/sessione. Verificare intercettazione click/Enter/modificatori/centrale,
Annulla/Escape e focus, una sola nuova scheda dopo Continua e nessuna apertura
anticipata. Confermare i limiti dei comandi nativi del browser e assenza di
richieste dati nuove per i placeholder. Restano anche le prove integrate 03–05.

Questi residui mantengono lo step **Da terminare**, mentre la parte implementativa
verificata consente lo sviluppo dello step 07 secondo il protocollo del master.

## Prossimo step

[07 — Dati Annunci](07-annunci-dati.md), **6.1 Sol, high**.
