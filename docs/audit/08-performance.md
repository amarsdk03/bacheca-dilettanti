# Punto 8 — Performance applicativa e accesso ai dati

## 1. Obiettivo e ambito

Valutare accesso ai dati, paginazione, cache, rendering, immagini, font e dipendenze client delle principali pagine pubbliche. Le latenze HTTP riportate sono campioni diagnostici, non benchmark; piani SQL, statistiche del database e dimensioni dei bundle non erano disponibili senza accesso all'ambiente remoto o build di produzione.

## 2. File e aree analizzate

- **Versione osservata:** commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`; Next installato **16.3.4**. Il worktree conteneva già modifiche a `src/features/homepage/Homepage.tsx`, `homepage-notices.ts` e `src/features/registrati/Registrati.tsx`, oltre ai documenti dell'audit. Al controllo finale è comparsa anche una modifica concorrente a `src/features/pubblica-annuncio/ConfermaPubblicazione.tsx`; nessuna di queste modifiche è stata alterata dall'audit.
- **Directory e dettagli pubblici:** `src/features/annunci/server/queries.ts`, `src/features/profili/server/queries.ts`, `src/features/dettagli-profilo/server/profile-detail-query.ts`, `src/features/profilo/server/public-team-profiles.ts`, route in `src/app/annunci`, `profili`, `dettagli-annuncio`, `dettagli-profilo`.
- **Cache e invalidazione:** homepage, detail route, Server Actions di profilo/pubblicazione/interazioni e webhook Stripe; `next.config.ts`.
- **Asset e client:** `src/app/layout.tsx`, `src/app/fonts.ts`, `src/components/ui/avatar.tsx`, `src/components/support/SupportBubble.tsx`, directory UI, elaborazione immagini profilo e contenuto di `public/`.
- **Guide installate:** Next 16.3.4 su fetching, cache, revalidation, immagini, font, lazy loading e package bundling. Fonti ufficiali aggiuntive: [ottimizzazione query Supabase](https://supabase.com/docs/guides/database/query-optimization), [observability](https://supabase.com/docs/guides/observability), [ispezione database](https://supabase.com/docs/guides/observability/inspect). Changelog Supabase consultato il 2026-09-29; nessuna novità individuata cambia i findings sotto.
- **Campione HTTP pubblico, 2026-09-29:** due GET per route da questa postazione. TTFB: home `0,292–0,578 s`, annunci `0,325–0,335 s`, profili `0,299–0,316 s`; byte trasferiti rispettivamente `227.349`, `347.346`, `336.425`. I tempi totali hanno oscillato tra `0,792` e `1,552 s`. Revisione deploy, cache edge, distanza e condizioni di rete non sono note; tre tentativi successivi di leggere gli header sono falliti per connessione, quindi il campione non prova regressioni né politiche cache effettive.

## 3. Findings per severità

### 🟠 08-F01 — Le directory materializzano dataset completi prima di filtrare e paginare

**Confermato nel codice; impatto remoto da misurare.**

- **Evidenza minima:** la directory profili seleziona relazioni e `{count: "exact"}` per ogni blocco da 500 (`src/features/profili/server/queries.ts:46`), percorre tutti i blocchi (`:528`), carica poi le immagini di tutti i profili (`:540`) e soltanto dopo filtra, ordina e applica la pagina in memoria (`:542`). La directory annunci usa la pagina DB solo senza ricerca/filtri (`src/features/annunci/server/queries.ts:612`); negli altri casi scarica blocchi da 500 fino a esaurimento (`:668`) e filtra/pagina in memoria (`:685`). Anche il percorso semplice usa offset e conteggio esatto (`:617`).
- **Impatto:** costo DB, payload PostgREST, memoria server e tempo CPU crescono con l'intero catalogo anziché con la pagina. Nei profili il conteggio esatto viene ricalcolato per ciascun blocco ma non viene usato. Le pagine profonde con `range` pagano inoltre il costo dell'offset. Il campione HTTP non isola questi costi e i volumi attuali non sono noti.
- **Azione consigliata:** portare ricerca, filtri, ordinamento e paginazione in SQL/RPC con proiezioni per card; calcolare il conteggio una sola volta o usare una strategia meno costosa quando il totale esatto non serve. Valutare cursor/keyset per navigazione profonda, oppure conservare l'offset soltanto se i volumi e i piani lo giustificano. Definire indici compositi/parziali o full text solo dopo `EXPLAIN (ANALYZE, BUFFERS)` sullo schema reale; richiamare `04-F03` invece di aggiungere indici alla cieca.

### 🟡 08-F02 — I dettagli pubblici attendono molti round trip e arricchimenti non critici

**Confermato come struttura delle query; latenza delle singole chiamate non misurata.**

- **Evidenza minima:** il dettaglio annuncio attende prima il contenuto (`src/features/annunci/server/queries.ts:817`), poi sette rami in parallelo (`:832`) e infine il conteggio follower in sequenza (`:870`). Il dettaglio profilo avvia sei rami (`src/features/dettagli-profilo/server/profile-detail-query.ts:441`), quindi una seconda ondata per follower/simili (`:488`) e una terza per le squadre collegate (`:509`). Gli helper aggregano per ID, quindi non è stato trovato un N+1 per singola card; resta un fan-out fisso a più ondate.
- **Impatto:** la risposta completa è vincolata dal ramo più lento di ogni ondata. `generateMetadata` riusa il risultato tramite `React.cache` (`src/app/dettagli-annuncio/page.tsx:20`, `src/app/dettagli-profilo/page.tsx:22`), evitando il doppio caricamento nella stessa richiesta, ma richiede comunque il risultato esteso con simili, conteggi e relazioni che i metadati non usano.
- **Azione consigliata:** separare il nucleo necessario a visibilità/metadati dagli arricchimenti; consolidare query correlate in una vista/RPC quando riduce realmente i round trip. Rendere streamabili conteggi, simili e squadre collegate con boundary mirati, preservando gli stati di errore parziale. Misurare prima e dopo con tracing e statistiche DB.

### 🟡 08-F03 — Le letture pubbliche non hanno una strategia di cache persistente e invalidazione coordinata

**Confermato nel repository; comportamento edge del deploy non verificato.**

- **Evidenza minima:** homepage e directory invocano direttamente le query (`src/features/homepage/Homepage.tsx:164`, `src/app/annunci/page.tsx:50`, `src/app/profili/page.tsx:52`). Solo i due dettagli usano `React.cache`, che la guida installata descrive come riuso nella stessa richiesta. Non risultano `use cache`, `cacheLife`, `cacheTag`, `revalidateTag` o `unstable_cache`; `next.config.ts:3` configura soltanto il limite delle Server Actions. Next 16.3.4 documenta che i fetch non sono persistiti di default (`node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md:62`).
- **Impatto:** ogni visita può ripetere letture identiche verso Supabase. Le invalidazioni esistenti sono a percorsi sparsi: una pubblicazione invalida soltanto `/il-tuo-profilo` (`src/features/pubblica-annuncio/server/actions.ts:461`), mentre la homepage legge gli ultimi annunci; alcune modifiche profilo invalidano le directory (`src/features/profilo/server/actions.ts:42`), altre soltanto la dashboard (`:397`, `:481`, `:521`). Se si introducesse cache senza prima definire la matrice, i contenuti potrebbero restare obsoleti.
- **Azione consigliata:** fissare requisiti di freschezza per directory, ultimi annunci, dettagli e conteggi; applicare cache esplicita alle sole letture pubbliche idonee, con tag per annuncio/profilo e liste. Centralizzare l'invalidazione di ogni mutazione pertinente e mantenere freschi i dati sensibili o dipendenti dall'utente. Verificare il comportamento su Vercel, perché la durata effettiva dipende anche dal cache handler e dal deployment.

### 🟡 08-F04 — Le foto profilo da 1024 px sono servite come immagini HTML senza varianti responsive

**Confermato nel codice; peso medio reale degli upload non disponibile.**

- **Evidenza minima:** l'upload produce WebP quadrati `1024×1024`, fino a 2 MiB (`src/features/profilo/server/profile-image-processing.ts:7`, `:24`). `AvatarImage` inoltra il sorgente al primitive Base UI (`src/components/ui/avatar.tsx:28`) e le card lo mostrano a 64 px (`src/features/profili/components/cards/ProfileCardShell.tsx:104`); lo stesso percorso è usato anche per avatar piccoli negli annunci (`src/features/annunci/AnnouncementAuthorHoverCard.tsx:58`).
- **Impatto:** il browser può scaricare l'immagine profilo intera anche per avatar molto piccoli, moltiplicando byte, decodifica e memoria sulle directory. Il limite di 2 MiB è un tetto, non il peso osservato di ogni immagine.
- **Azione consigliata:** produrre varianti thumbnail affidabili oppure usare un loader/servizio immagini autorizzato con dimensioni e cache esplicite; servire `srcset`/`sizes` coerenti con 24–112 px. Mantenere l'originale 1024 px per usi che lo richiedono e misurare hit ratio e byte risparmiati.

### 🟢 08-F05 — Un placeholder da 8,59 MB è richiesto eager tre volte nelle directory

**Confermato sugli asset locali; byte finali ottimizzati non misurati.**

- **Evidenza minima:** `public/banner-pubblicita/placeholder.png` pesa `8.590.216` byte. Annunci e profili renderizzano tre `<Image>` identiche con `loading="eager"` (`src/features/annunci/Annunci.tsx:490`, `src/features/profili/Profili.tsx:416`), prima dei risultati. Non è dichiarato `sizes`.
- **Impatto:** Next/Image può generare e mettere in cache una variante, e il browser può riusare la stessa URL, quindi non si deducono tre download da 8,59 MB. Restano costo di trasformazione/cache del sorgente, tre elementi anticipati e competizione con le risorse più utili della pagina.
- **Azione consigliata:** sostituire il sorgente con un asset compresso e dimensionato, dichiarare `sizes`, caricare eager soltanto l'eventuale elemento realmente prioritario e verificare se le tre copie sono richieste dal prodotto.

### 💡 08-F06 — Dipendenze client globali da misurare prima di ottimizzare

**Rischio statico; nessuna dimensione bundle prodotta.**

- **Evidenza minima:** il root layout monta su ogni route provider tooltip, toaster e support bubble (`src/app/layout.tsx:9`, `:53`, `:56`, `:58`). La bubble è client e importa `motion/react` e un pacchetto icone (`src/components/support/SupportBubble.tsx:1`, `:5`, `:16`). `Suspense` nel layout non costituisce da solo code splitting.
- **Impatto:** queste dipendenze possono aumentare JS iniziale e hydration su pagine che usano poco o nulla di tali funzioni. Senza build/analyzer o dati RUM non è confermata una regressione.
- **Azione consigliata:** misurare JS per route, parse/evaluation e Core Web Vitals; soltanto se il costo è materiale, valutare import dinamico della bubble o provider più locali. Non rimuovere funzionalità globali sulla base della sola dimensione dei pacchetti installati.

### Riscontri positivi

- Le query di autori, immagini e squadre lavorano per batch/insiemi; non è emerso un N+1 per elemento nelle directory.
- I rami indipendenti principali usano `Promise.all` e le route pubbliche hanno `loading.tsx`/`Suspense` per stati di attesa.
- I tre font sono gestiti da `next/font/google` (`src/app/fonts.ts:1`), evitando richieste runtime a Google; le immagini annuncio passano da `next/image` e l'endpoint pubblico dichiara cache CDN per contenuti elencati (`src/app/api/metadata/annuncio-immagine/route.ts:37`).

Nessun finding critico è stato accertato. `04-F03` resta il riferimento per l'indice inviti; questo punto non propone migrazioni senza piani e statistiche reali.

## 4. Checklist azioni

### Eseguibili da agente AI — futura fase di implementazione

- [ ] **08-F01:** progettare query/RPC paginate con filtri server-side, rimuovere i conteggi ripetuti e aggiungere test su pagine/filtri; accompagnare ogni indice proposto con piano prima/dopo.
- [ ] **08-F02:** dividere i dati essenziali dagli arricchimenti, eliminare round trip ridondanti e introdurre streaming mirato senza perdere gli errori parziali.
- [ ] **08-F03:** definire cache/tag e una matrice di invalidazione per pubblicazione, modifica, rimozione e interazioni; aggiungere prove di freschezza.
- [ ] **08-F04:** introdurre thumbnail responsive/cacheabili per avatar e verificare dimensioni rese nelle card e nei dettagli.
- [ ] **08-F05:** comprimere il placeholder, definire `sizes` e correggere la priorità di caricamento dopo aver chiarito quante creatività mostrare.
- [ ] **08-F06:** eseguire in una fase autorizzata bundle analysis e profilazione browser su route rappresentative; applicare lazy loading soltanto ai costi dimostrati.

### Da fare manualmente dall'utente

- [ ] Fornire statistiche in sola lettura o snapshot di Performance Advisor/`pg_stat_statements`, volumi delle tabelle e `EXPLAIN (ANALYZE, BUFFERS)` delle directory; non servono record personali.
- [ ] Confermare requisiti di freschezza per homepage, elenchi, dettagli e conteggi, inclusa la tolleranza a dati stale.
- [ ] Confermare se la paginazione numerata deve restare navigabile direttamente o può usare cursor/keyset.
- [ ] Verificare in Vercel Speed Insights/RUM Core Web Vitals, cache hit e revisione effettivamente deployata; confrontare almeno periodi omogenei prima/dopo.
- [ ] Decidere se i tre placeholder pubblicitari identici rappresentano tre slot reali o contenuto temporaneo.

## 5. Domande aperte / decisioni da prendere

1. Quali sono cardinalità attuali e crescita prevista di profili, annunci, media e relazioni? Senza questi dati non si assegna una soglia di urgenza agli indici.
2. Il totale esatto e i numeri di pagina sono requisiti di prodotto, oppure sono accettabili conteggi differiti e cursori?
3. Qual è la latenza obiettivo per TTFB/LCP mobile e quale percentuale di richieste deve rispettarla?
4. La revisione pubblica misurata coincide con il commit osservato? I campioni HTTP non permettono di stabilirlo.
5. Sono disponibili log Vercel/Supabase in sola lettura e un ambiente rappresentativo per misure ripetibili?

## 6. Stato finale e punto successivo

**Completato il 2026-09-29** per l'analisi statica e due campioni HTTP delle route pubbliche. Copertura: query delle directory e dei dettagli, cache/invalidazione, rendering asincrono, immagini, font e rischio bundle globale. Non sono stati eseguiti build di produzione, server locale, query sul DB remoto, `EXPLAIN`, bundle analyzer o audit browser; nessuna latenza è attribuita con certezza a Supabase.

Migrazioni create/applicate: **0**. Non è stata creata alcuna migrazione da applicare manualmente; lo stato delle migrazioni preesistenti resta da confrontare come indicato nel Punto 4.

Prossimo: **Punto 9 — SEO, indicizzazione e condivisione**, profilo consigliato **GPT-6 Sol · medium · Default**. Ripartire dal [master](AUDIT-MASTER.md) e impostare prima il punto su **In corso**.
