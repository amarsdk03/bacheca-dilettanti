# Punto 9 — SEO, indicizzazione e condivisione

## 1. Obiettivo e ambito

Verificare metadati, canonical, direttive crawler, sitemap, dati strutturati e anteprime social delle pagine pubbliche. La copertura combina analisi statica e riscontri HTTP/search pubblici; Google Search Console non era disponibile, quindi copertura, crawl e rich result effettivi restano da misurare manualmente.

## 2. File e aree analizzate

- **Versione osservata:** commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`; Next installato **16.3.4**. Erano già presenti modifiche applicative e documentali elencate nel master; l'audit non le ha alterate.
- **Metadata e crawler:** `src/server/metadata.ts`, tutte le 25 route `page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/server/sitemap-data.ts`, `src/proxy.ts` e `src/app/not-found.tsx`.
- **Dati strutturati e social:** `src/server/structured-data.ts`, `src/components/seo/JsonLd.tsx`, pagine dettaglio e articoli, `src/features/aggiornamenti/ShareButtons.tsx`, `public/banner.png` e `public/logo.png`.
- **Guide installate:** metadata/Open Graph, `generateMetadata`, sitemap, robots, JSON-LD e `not-found` di Next 16.3.4. Fonti Google: [canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [navigazione a faccette](https://developers.google.com/crawling/docs/faceted-navigation), [Article](https://developers.google.com/search/docs/appearance/structured-data/article), [ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page) e [JobPosting](https://developers.google.com/search/docs/appearance/structured-data/job-posting).
- **Riscontri pubblici, 2026-09-29:** `robots.txt` ha risposto `200` con host, sitemap e regole coerenti col sorgente. Una query pubblica `site:bachecadilettanti.it` ha restituito soltanto, nel campione osservato, la vecchia URL `/accesso?next=%2F`, indicata come scansionata tre settimane prima; l'apertura attuale risponde `404`. Tentativi successivi su sitemap e HTML hanno avuto errori di connessione intermittenti, quindi non certificano il contenuto attualmente servito.
- **Verifiche isolate:** `node --test tests/metadata.test.mjs` **4/4 pass**. `banner.png` misura realmente `1254×627`, come dichiarato nei metadati; `logo.png` misura `1254×1254`.

## 3. Findings per severità

### 🟡 09-F01 — Una vecchia pagina di accesso è ancora presente nell'indice pubblico ma oggi restituisce 404

**Confermato nel campione pubblico e nel codice; copertura completa dell'indice non verificabile senza Search Console.**

- **Evidenza minima:** il risultato pubblico [Bacheca Dilettanti — `/accesso?next=%2F`](https://www.bachecadilettanti.it/accesso?next=%2F) mostra ancora il contenuto “coming soon”, ma la URL oggi risponde `404`. Non esiste `src/app/accesso/page.tsx`; il gate può tuttavia reindirizzare nuovamente a `/accesso` quando `SITE_ACCESS_ENABLED` è attivo (`src/proxy.ts:83`, `src/proxy.ts:147`).
- **Impatto:** il risultato di marca conduce a una pagina morta e presenta contenuto non più attuale. Il `404` consente la rimozione naturale, ma non garantisce tempi rapidi; riattivare il gate ricreerebbe inoltre un redirect verso una route assente. Il difetto funzionale del gate è già trattato dal Punto 2 e non viene duplicato qui.
- **Azione consigliata:** scegliere la destinazione definitiva di `/accesso`, applicare un redirect permanente verso la pagina corretta oppure ripristinare una pagina valida con `noindex`; prima di riattivare il gate, eliminare il target inesistente. In Search Console ispezionare la URL, richiedere nuova scansione/rimozione temporanea se serve e verificare quali altre vecchie URL risultano indicizzate.

### 🟡 09-F02 — Un errore Supabase produce una sitemap parziale con risposta apparentemente valida e cache di un'ora

**Confermato nel codice; nessun errore remoto osservato.**

- **Evidenza minima:** se una pagina di risultati fallisce, i loader registrano solo il codice e restituiscono gli elementi accumulati (`src/server/sitemap-data.ts:57`, `src/server/sitemap-data.ts:85`). La route incorpora quel risultato senza segnalare il fallimento (`src/app/sitemap.ts:33`) e dichiara `revalidate = 3_600` (`src/app/sitemap.ts:7`).
- **Impatto:** profili o annunci pubblici possono sparire dalla sitemap per almeno un ciclo senza che il consumer distingua una sitemap completa da una degradata. Un errore nel primo batch produce zero URL dinamiche pur mantenendo `200`, rendendo difficile rilevare la regressione.
- **Azione consigliata:** fallire esplicitamente la generazione quando una sorgente non è completa, oppure servire l'ultima sitemap integra e inviare un alert. Aggiungere test per errore al primo batch e ai batch successivi, metriche sul numero di URL per categoria e un controllo schedulato sulla sitemap pubblica.

### 🟢 09-F03 — Le combinazioni di ricerca, filtri e pagine restano tutte esplorabili dai crawler

**Rischio confermato staticamente; spreco di crawl non dimostrato.**

- **Evidenza minima:** annunci e profili assegnano `noindex` a ogni URL personalizzata e canonical alla directory base, ma mantengono `follow` (`src/app/annunci/page.tsx:26`, `src/app/annunci/page.tsx:41`; `src/app/profili/page.tsx:28`, `src/app/profili/page.tsx:43`). `robots.ts` consente queste query (`src/app/robots.ts:7`). Google documenta che molte combinazioni di navigazione a faccette possono espandere lo spazio di crawl.
- **Impatto:** con l'aumento di filtri e paginazione, Googlebot può spendere richieste su combinazioni senza valore e rallentare la scoperta dei dettagli. La scelta attuale evita correttamente l'indicizzazione e consolida il canonical, ma non impedisce la scansione necessaria a leggere il `noindex`; i volumi osservati non sono disponibili.
- **Azione consigliata:** prima misurare in Search Console e log CDN crawler, separando ricerca, filtri utili, ordinamento e pagine vuote. Se il volume è materiale, definire una strategia di URL indicizzabili e regole mirate per le faccette non utili; non bloccare indiscriminatamente via robots finché le URL già note non sono deindicizzate e non è chiarita la strategia di paginazione.

### 🟢 09-F04 — Gli autori registrati degli annunci sono sempre dichiarati come `Person`

**Confermato nel JSON-LD generato.**

- **Evidenza minima:** il modello conserva `profileType` per gli autori registrati (`src/features/annunci/announcement-model.ts:341`) e la query può costruire autori squadra, creator e organizzazione (`src/features/annunci/server/queries.ts:319`, `src/features/annunci/server/queries.ts:333`), ma il dato strutturato emette sempre `{"@type":"Person"}` (`src/server/structured-data.ts:74`).
- **Impatto:** squadre e organizzazioni vengono descritte semanticamente come persone. Il markup annuncio usa `CreativeWork` e non dà, da solo, accesso a uno specifico rich result Google, ma l'informazione errata riduce affidabilità e riuso del grafo.
- **Azione consigliata:** derivare il tipo schema dallo stesso mapping dei profili e collegare l'autore alla relativa URL pubblica. Aggiungere casi di test per persona, squadra e organizzazione e validare esempi reali con Schema Markup Validator/Rich Results Test.

### 💡 09-F05 — Rafforzare dati editoriali e configurazione dell'origine

**Miglioramenti facoltativi; nessun errore corrente confermato.**

- **Evidenza minima:** l'`Article` contiene data di pubblicazione e autore, ma non `dateModified` né URL dell'autore (`src/server/structured-data.ts:96`); `getSiteUrl` ripiega su localhost se manca `NEXT_PUBLIC_SITE_URL` (`src/server/metadata.ts:30`). Il deploy osservato espone invece host e sitemap corretti, quindi la variabile è configurata nell'ambiente pubblico verificato.
- **Impatto:** più dettagli editoriali possono aiutare Google a interpretare gli articoli; un futuro deploy senza variabile potrebbe generare canonical, sitemap e JSON-LD verso localhost.
- **Azione consigliata:** aggiungere `dateModified` solo da una fonte attendibile, identificare l'autore con URL/sameAs quando disponibile e rendere obbligatoria l'origine pubblica in produzione. Non introdurre `JobPosting` in modo generalizzato: Google vieta quel markup per richieste in cui il candidato offre il proprio lavoro; valutarlo solo per vere posizioni aperte, con requisiti e modalità di candidatura completi.

### Riscontri positivi

- Tutte le 25 pagine hanno metadata statici o dinamici; aree auth, dashboard, pagamento, manutenzione, errori e contenuti non disponibili impostano `noindex` coerente. Le pagine pubbliche principali hanno canonical, Open Graph e Twitter Card.
- La sitemap include soltanto profili visibili e registrati e annunci pubblicati, non nascosti e non privati (`src/server/sitemap-data.ts:53`, `src/server/sitemap-data.ts:80`). Le route private non sono elencate e `robots.txt` blocca le aree più sensibili.
- Il componente JSON-LD neutralizza `<` prima dell'iniezione (`src/components/seo/JsonLd.tsx:5`), seguendo la guida Next installata. `ProfilePage`, `Article`, `ItemPage`, Organization e WebSite sono presenti; non è stato trovato un uso improprio già attivo di `JobPosting`.
- L'immagine social predefinita è presente e coerente con le dimensioni dichiarate. La condivisione articolo codifica URL e titolo per WhatsApp, Facebook e X (`src/features/aggiornamenti/ShareButtons.tsx:17`); l'estensione della condivisione ad annunci/profili resta una decisione di prodotto del Punto 11.

Nessun finding critico o alto è stato accertato.

## 4. Checklist azioni

### Eseguibili da agente AI — futura fase di implementazione

- [ ] **09-F01:** implementare la destinazione decisa per `/accesso`, aggiungere metadata/redirect appropriati e un test del gate prima di una sua riattivazione.
- [ ] **09-F02:** rendere atomica o recuperabile la sitemap dinamica, aggiungere alert e test sugli errori tra batch.
- [ ] **09-F03:** dopo le misure, implementare regole mirate per query/filter/paginazione e testare canonical, status e robots su combinazioni rappresentative.
- [ ] **09-F04:** tipizzare correttamente gli autori JSON-LD e collegarli al profilo pubblico; aggiungere test per le diverse categorie.
- [ ] **09-F05:** validare l'origine in produzione e arricchire gli articoli con dati editoriali realmente disponibili.

### Da fare manualmente dall'utente

- [ ] Collegare o consultare Search Console: proprietà dominio, copertura/Pages, sitemap, URL inspection, crawl stats, query di marca, Core Web Vitals e azioni manuali.
- [ ] Ispezionare `/accesso?next=%2F`, richiedere nuova scansione o rimozione temporanea secondo la destinazione scelta e controllare altre URL “coming soon” residue.
- [ ] Inviare e monitorare `https://www.bachecadilettanti.it/sitemap.xml`; confrontare conteggi attesi di profili/annunci e notifiche di lettura/errori.
- [ ] Validare un articolo, un profilo per ciascuna macro-categoria e annunci con autore persona/squadra/organizzazione tramite strumenti Google e Schema.org.
- [ ] Decidere quali combinazioni filtrate debbano avere valore SEO e se alcune vere ricerche di personale soddisfino integralmente i requisiti Google per `JobPosting`.

## 5. Domande aperte / decisioni da prendere

1. `/accesso` deve diventare un redirect permanente, essere ripristinata come gate `noindex`, oppure essere rimossa definitivamente?
2. Search Console mostra altre URL legacy, canonical scelti diversi, pagine scoperte ma non indicizzate o volume crawler sulle faccette?
3. Quali filtri meritano landing page indicizzabili con contenuto stabile e quali devono restare soltanto strumenti di navigazione?
4. Esistono annunci di vere posizioni lavorative con datore, sede, qualifiche e modalità di candidatura, distinti dalle richieste di collaborazione sportiva?
5. La revisione pubblica osservata coincide con il commit analizzato? Sitemap e HTML live non sono stati riletti in modo affidabile per gli errori di connessione intermittenti.

## 6. Stato finale e punto successivo

**Completato il 2026-09-29** per analisi statica, test metadata e campioni pubblici disponibili. Copertura: metadata e indicizzazione delle 25 pagine, canonical, robots, sitemap, contenuti non pubblici, dati strutturati, immagini social e condivisione articoli. Search Console, validazione rich result su URL live e sitemap pubblica completa non erano accessibili in modo affidabile e restano nella checklist manuale.

Migrazioni create/applicate: **0**. Non è stata creata alcuna migrazione da applicare manualmente; lo stato delle migrazioni preesistenti resta quello documentato nei Punti 3–4.

Prossimo: **Punto 10 — Accessibilità e animazioni**, profilo consigliato **GPT-6 Sol · medium · Default**. Ripartire dal [master](AUDIT-MASTER.md) e impostare prima il punto su **In corso**.
