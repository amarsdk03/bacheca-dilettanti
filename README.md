# Bacheca Dilettanti - Sito web ufficiale

#### La piattaforma italiana dedicata ad annunci, opportunità e visibilità nel calcio dilettantistico

Link sito web: https://www.bachecadilettanti.it/

Sviluppato da Amar Sidkir, per Gabriele Zaniboni, a partire dal 15 luglio 2026.

# 1. Architettura generale

## Tecnologie utilizzate

### Framework

- Typescript
- React
- Next.js (App router)

### UI e stile

- Tailwind CSS
- shadcn/ui (con Base UI)
- Lucide Icons
- React Bits
- Motion / GSAP

### Database

- Supabase (Postgres, Auth, Storage e RPC)
- SMTP per le email transazionali, configurato in Supabase (il provider effettivo va verificato nell'ambiente)

### Deployment

- Vercel

### Pagamenti

- Stripe API

### Altro

- React Markdown (per /aggiornamenti)
- Next Image e Sharp (per foto profili)
- Analytics e Speed Insights (per Vercel)

## Route principali

| Route | Funzione |
| --- | --- |
| `/` | Homepage |
| `/aggiornamenti` | Elenco e dettaglio degli aggiornamenti |
| `/annunci` | Directory annunci con ricerca e filtri |
| `/dettagli-annuncio?id=…` | Dettaglio pubblico di un annuncio |
| `/profili` | Directory profili con ricerca e filtri |
| `/dettagli-profilo?id=…&type=…` | Dettaglio pubblico di un sottoprofilo |
| `/pubblica-annuncio` | Wizard di pubblicazione |
| `/pubblica-annuncio/conferma` | Conferma della pubblicazione dell’annuncio |
| `/il-tuo-profilo` | Area personale autenticata |
| `/centro-notifiche` | Notifiche ricevute e preferenze del browser |
| `/accedi` | Accesso utente |
| `/registrati` | Registrazione account |
| `/password-dimenticata` | Richiesta di recupero password |
| `/reimposta-password` | Scelta della nuova password |
| `/auth/confirm` | Conferma dell'indirizzo email dopo la registrazione |
| `/auth/callback` | Verifica del link di recupero password |
| `/auth/link-non-valido` | Esito per link email non valido o non verificabile |
| `/contatti` | Contatti e assistenza |
| `/partner` | Sezione partner |
| `/cookie-policy` | Informativa sui cookie |
| `/privacy-policy` | Informativa sulla privacy |
| `/termini-di-servizio` | Termini di servizio |
| `/sitemap.xml` | Sitemap dei contenuti pubblici indicizzabili |
| `/robots.txt` | Direttive per crawler e riferimento alla sitemap |
| `/api/metadata/annuncio-immagine?id=…` | Immagine per le anteprime social degli annunci |

## Requisiti

- Node.js `>= 20.9.0`.
- npm e il lockfile del progetto.
- Un progetto Supabase compatibile con lo schema applicativo.
- Un account Stripe solo per completare i pagamenti di bozze prioritarie create prima della sospensione del servizio.
- Un provider SMTP configurato in Supabase per gli ambienti pubblici.

## Avvio locale

La repository usa npm Workspaces. La webapp pubblica risiede in `apps/web`; test, documentazione e migrazioni Supabase restano alla radice. Il lockfile è unico: eseguire installazione e comandi coordinati dalla root.

Installa le dipendenze:

```bash
npm ci
```

Crea `apps/web/.env.local`, nella root del progetto Next.js. Il file è ignorato da Git: per sviluppo e prove usare esclusivamente credenziali locali o di staging con dati sintetici. Un eventuale `.env.local` rimasto alla radice del monorepo non viene trasferito o caricato automaticamente dal workspace; non copiarne indiscriminatamente i valori.

```dotenv
# Applicazione
# Deve corrispondere all'origine dell'ambiente: viene usata per canonical, sitemap, URL condivisi e link email Supabase.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MAINTENANCE_MODE=false

# Gate opzionale di pre-accesso
SITE_ACCESS_RESTRICTED=false
SITE_ACCESS_PASSWORD=<password>
SITE_ACCESS_SECRET=<segreto-hmac-lungo-e-casuale>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<server-secret-key>

# Stripe, necessario soltanto per le bozze prioritarie preesistenti
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
STRIPE_ANNUNCIO_PRIORITARIO_PRICE_ID=<price-id>
```

In Supabase, configura `Site URL` e `Redirect URLs` di Auth per l'origine e i percorsi dell'ambiente. In produzione usa l'origine pubblica canonica del sito; i link di registrazione puntano a `/auth/confirm`, quelli di recupero password a `/auth/callback`. `NEXT_PUBLIC_SITE_URL` deve corrispondere a tale origine; in locale usa `http://localhost:3000`.

Avvia quindi il server di sviluppo:

```bash
npm run dev
```

L’applicazione è disponibile su [http://localhost:3000](http://localhost:3000).

I comandi root `dev`, `build`, `start` e `typecheck` delegano al workspace `bacheca-dilettanti-webapp` e vengono eseguiti dalla directory `apps/web`. Questo mantiene corretta anche la lettura degli articoli da `public/aggiornamenti`. Per un comando diretto al workspace, usare per esempio `npm run dev --workspace=bacheca-dilettanti-webapp`.

Le configurazioni Next.js, TypeScript, PostCSS e shadcn appartengono a `apps/web`. Per gestire componenti shadcn, eseguire la CLI da quella directory. ESLint resta condiviso alla radice. La roadmap della futura dashboard separata è in [docs/dashboard/master_plan.md](docs/dashboard/master_plan.md).

## SEO, condivisione e indicizzazione

La piattaforma genera metadati completi per le pagine pubbliche: titolo, descrizione, canonical, Open Graph, Twitter Card e dati strutturati JSON-LD. Il fallback grafico per le condivisioni è il banner della piattaforma.

- I dettagli pubblici di un sottoprofilo usano nome, tipologia, presentazione, località e foto, se disponibile.
- Gli articoli di `/aggiornamenti/[slug]` usano cover, autore, categoria, tag e data di pubblicazione.
- Gli annunci pubblicati usano titolo, descrizione, tipologia, località e immagine caricata; in assenza di quest’ultima usano la foto dell’autore o il banner.
- Gli annunci non pubblicati, parziali o in revisione mantengono una preview completa con lo stato visibile, ma sono `noindex,nofollow`.
- Le varianti con ricerca, filtri o paginazione di `/annunci` e `/profili` hanno una preview descrittiva, canonical verso la directory principale e `noindex,follow` per evitare contenuti duplicati.
- Le aree riservate, autenticazione, recupero password, conferme e pagamenti non vengono indicizzati.

`/sitemap.xml` include le pagine pubbliche, gli articoli, i sottoprofili visibili e gli annunci effettivamente pubblicati; viene rigenerata con una cache di un'ora. Se una query Supabase fallisce, le voci dinamiche possono risultare parziali pur con una risposta valida: la completezza della sitemap va quindi monitorata. `/robots.txt` espone la sitemap e blocca i flussi riservati ai crawler.

Le immagini degli annunci sono conservate nel bucket privato Supabase `immagini_annunci`. L’endpoint `/api/metadata/annuncio-immagine?id=…` legge soltanto l’immagine collegata all’annuncio richiesto e la serve ai crawler social senza esporre il percorso Storage: gli annunci pubblicati ricevono cache CDN, le anteprime non pubblicate usano `no-store`.

## Verifica

Esegui i controlli principali dalla root del progetto:

```bash
npm run typecheck
npm run lint
```

Per eseguire tutti i test Node di Web e Admin, anche su Windows:

```bash
npm test
```

`typecheck` e `typecheck:admin` generano prima i tipi delle route con `next typegen`, senza avviare un server o eseguire una build. `npm test` individua tutti i file `tests/*.test.mjs`, li ordina e avvia al massimo quattro file contemporaneamente; un test fallito fa fallire il comando. I test verificano i sorgenti delle due app e usano PGlite **0.5.8**, dev dependency root installata da `npm ci`, con database in memoria e soli dati sintetici. Non servono Docker, PostgreSQL esterno, cache di installazione manuali o credenziali Supabase. Senza PGlite il comando fallisce esplicitamente e non salta i test SQL.

I test locali non attestano Auth/PostgREST/Storage reali, concorrenza fra connessioni indipendenti o interazioni browser. Le evidenze e i limiti sono nella [matrice dashboard](docs/dashboard/steps/16-verifica-rilascio/matrice-verifiche.md). Non usare il database di produzione per prove o seed.

Le future operazioni di migrazione, configurazione, attivazione e recupero sono
nel [runbook dashboard](docs/dashboard/steps/16-verifica-rilascio/runbook-rilascio-recupero.md):
è un documento preparato, non una richiesta di eseguire SQL o deploy adesso.

Per le prove browser del solo login e degli ingressi anonimi Admin, su Windows
con Chrome installato, seguire lo [step 16C](docs/dashboard/steps/16-verifica-rilascio/16c-browser-anonimo.md).
`npm run test:browser:admin` è separato da `npm test`: avvia una copia isolata
dell'app con servizio Auth sintetico e non richiede credenziali Supabase.
La variante `npm run test:browser:admin:production` compila la copia con
Turbopack e ripete i controlli anonimi con `next start`, verificando anche gli
header HTML di produzione locale e gli asset client. Dettagli e limiti nello
[step 16D](docs/dashboard/steps/16-verifica-rilascio/16d-produzione-locale.md).
Il comando `npm run test:browser:admin:session` verifica shell e sessioni con
Auth/RPC sintetici, SDK e guardie effettivi: dettagli nello
[step 16E](docs/dashboard/steps/16-verifica-rilascio/16e-shell-sessione.md).

Il comando `npm run test:browser:admin:home` esegue gli otto gruppi della Home
autenticata su copia isolata con dati, errori e attese sintetici; non legge gli
env originali e non usa servizi Supabase reali. Perimetro ed esiti nello
[step 16F](docs/dashboard/steps/16-verifica-rilascio/16f-home.md).

Il comando `npm run test:browser:admin:annunci` verifica Annunci con fixture
locale opt-in, un solo Chrome dedicato e file CSV salvati nelle evidenze del
test. Nessuna connessione Supabase reale; perimetro ed esiti nello
[step 16G](docs/dashboard/steps/16-verifica-rilascio/16g-annunci.md).
Le sessioni della fixture non sono account o sessioni del progetto Supabase.

Il comando `npm run test:browser:admin:registro` verifica gli otto gruppi finali
di Registro/chiusura locale su build Admin Turbopack e `next start`: filtri,
cursori, dettagli, errori, mobile/sessione, chunk grafici falliti e osservazione
BFcache. Usa soltanto il Chrome dedicato e servizi sintetici su loopback;
non richiede Docker, env originali o migrazioni. Evidenze e limiti nello
[step 16H](docs/dashboard/steps/16-verifica-rilascio/16h-chiusura-locale.md).

## Deploy della webapp dopo il trasferimento

Nel progetto Vercel della webapp impostare **Root Directory** a `apps/web`, mantenendo l'installazione npm dal lockfile condiviso alla radice. Il preset Next.js può usare `npm run build` nella directory dell'app; per un'installazione personalizzata usare `npm ci` dalla root del monorepo. Abilitare l'inclusione dei file esterni alla Root Directory quando richiesta per le dipendenze del workspace. Verificare prima con una preview collegata esclusivamente a staging.

Le variabili Vercel restano configurate nel progetto e nei rispettivi ambienti: non vengono lette da un `.env.local` della root della repository. Preview e test devono usare staging, senza ripiego verso la produzione. Questo trasferimento non modifica Site URL, redirect Auth, dominio pubblico o schema database e non effettua deploy. La futura app Admin avrà un progetto Vercel distinto.

Riferimenti: [Vercel — Monorepos](https://vercel.com/docs/monorepos) e [configurazione della build e Root Directory](https://vercel.com/docs/builds/configure-a-build#root-directory).

## Dashboard Admin — scheletro e sviluppo locale

`apps/admin` è un progetto Next.js indipendente. Dalla root, dopo `npm ci`,
avviare `npm run dev:admin` e aprire `http://localhost:3001`. La pagina attuale
è statica e funziona senza configurare Supabase; login, autorizzazione e
sezioni amministrative saranno introdotti negli step successivi.

Gli altri comandi sono `npm run typecheck:admin`, `npm run build:admin` e
`npm run start:admin`. Il comando `npm run lint` comprende entrambe le app;
`npm run dev` e `npm run typecheck` restano dedicati alla webapp. Per eseguire
le due app contemporaneamente usare due terminali.

Quando serve collegare Supabase, copiare **solo l'esempio privo di segreti**
`apps/admin/.env.example` in `apps/admin/.env.local` e impostare URL e chiave
publishable del progetto locale/staging condiviso con Web. Il file Web esistente
non viene copiato. L'accesso implementato richiede anche `SUPABASE_SECRET_KEY`
soltanto sul server per il trasporto audit; non esporla al browser. Nessuna
credenziale è richiesta per `npm test` o per i test PGlite.
Il cookie Admin `bacheca-admin-auth-token` è distinto dal cookie Supabase Web;
non si imposta un dominio cookie condiviso e HTTPS usa cookie Secure nelle
build di produzione. La separazione del cookie non costituisce autorizzazione.

Per eventuali prove/seed contro un servizio Supabase esterno, distinti da
`npm test` e dalle fixture PGlite, impostare `BACHECA_TEST_TARGET=local` oppure
`staging` e `BACHECA_TEST_ALLOWED_SUPABASE_ORIGINS` con una lista di origini
consentite separate da virgole. Eseguire `npm run check:test-target:admin`:
configurazioni mancanti, URL non riconosciuti e tipi di ambiente incompatibili
bloccano il controllo. Questo comando non si collega al database né esegue
test/seed; i futuri runner devono richiamare `assertTestTarget` dalla stessa
configurazione prima delle operazioni. La lista va compilata soltanto con
destinazioni di prova: il controllo non può certificare che un progetto remoto
contenga esclusivamente dati sintetici.

I tipi Supabase condivisi risiedono in `packages/database/src/index.ts`;
`apps/web/src/server/supabase.ts` li riesporta per compatibilità. Nessun import
tra gli alberi privati delle app. I pacchetti dominio/UI saranno estratti quando
esistono moduli effettivamente richiesti da entrambe.

Per il futuro deploy creare un **progetto Vercel separato** collegato alla stessa
repository, Root Directory `apps/admin`, preset Next.js e build `npm run build`
nella directory dell'app. Usare il lockfile npm della root e consentire i file
esterni alla Root Directory per il pacchetto condiviso. Configurare le variabili
Admin nel nuovo progetto: Preview esclusivamente su staging, Production sul
progetto previsto al rilascio. Verificare la disponibilità dell'host desiderato;
nessun progetto, dominio o deploy è stato creato da questo step. Configurazione
Auth e redirect vanno verificati nell'ambiente destinatario secondo lo
[step 05](docs/dashboard/steps/05-accesso-sessione.md). Struttura e configurazione
iniziale: [02 — Scheletro Admin](docs/dashboard/steps/02-scheletro-admin.md).

La prima fase dell'autorizzazione database è predisposta e verificata in PGlite,
ma resta disabilitata finché la configurazione Auth e le prove su Supabase
isolato non saranno concluse. Migrazione, template manuali e istruzioni:
[03 — Autorizzazione database](docs/dashboard/steps/03-autorizzazione-database.md).

# 2. Changelog

## Versioni future

- Completamento del flusso operativo di pagamento e rimborso degli annunci prioritari.
- Analitiche visualizzazione per aggiornamenti, profili e annunci

---

## Versione 1.0 - Deploy prima versione

Push effettuato il: ??/??/2026

### Feature principali

- Personalizzazione aumentata e miglioramento UI per le pagine dei profili e annunci
- Ampliati i dati degli annunci con gruppi squadra, categorie, contenuti e promozioni professionali
- Aggiunto centro notifiche con filtri per tipologia, notifiche del browser e aggiornamenti su interessi, follower e annunci seguiti

---

## Versione 0.8.0 - Pre-alpha per LegalBlink

Push effettuato il: 17/09/2026

### Feature principali

- Homepage
- Pubblicazione articoli e aggiornamenti piattaforma
- Visualizzazione aggiornamenti editoriali in Markdown
- Sezione contatti (Instagram e Whatsapp) e partner/sponsor
- Compliance legale tramite LegalBlink (GDPR, privacy policy, cookies...)

### Account personale

- Registrazione e accesso tramite indirizzo email verificato
- Personalizzazione dei sottoprofili
- Gestione degli annunci personali e dei profili seguiti
- Centro notifiche con preferenza per gli avvisi nel browser
- Cambio password via link email

### Profili

- Registrazione e accesso tramite email verificata.
- Gestione di cinque sottoprofili ordinari per account, con la possibilità di aggiungere fino a due profili riservati.
- Otto modelli di profilo supportati:
    - Giocatore
    - Squadra
    - Staff sportivo
    - Arbitro
    - Torneo / evento
    - Campi e impianti
    - Servizi e professionisti (disponibile solo con abilitazione admin)
    - Creators (disponibile solo con abilitazione admin)
- Possibilità di cercare e filtrare i profili creati sulla piattaforma
- Possibilità di visualizzare maggiori info su un profilo specifico
- Possibilità di seguire un profilo e ricevere notifiche sui nuovi annunci
- Possibilità di impostare un nominativo anonimo per i profili supportati
- Giocatori: squadra attuale, categoria/torneo e storico della carriera
- Squadre: categoria e torneo attuali della prima squadra

### Annunci

- Pubblicazione di annunci per utenti anonimi e registrati:
    - Selezione del sottoprofilo
    - Compilazione/aggiornamento dati del sottoprofilo
    - Compilazione dati dell'annuncio
    - Pubblicazione gratuita degli annunci; i pagamenti prioritari restano disponibili solo per le bozze preesistenti.
    - Verifica tramite codice OTP per utenti anonimi (rate limiting)
    - Limite giornaliero e protezione dai retry duplicati per il flusso anonimo.
- Possibilità di visualizzare, nascondere o eliminare annunci dal proprio profilo
- Possibilità di cercare e filtrare gli annunci pubblicati sulla piattaforma
- Possibilità di visualizzare maggiori info su un annuncio specifico
- Possibilità di segnalare un annuncio con eventuali info aggiuntive

### Admin

- La dashboard amministrativa è disponibile nel workspace `apps/admin`, separato dalla webapp. Le verifiche locali 16A–16H sono concluse; integrazione Supabase e rilascio restano da eseguire secondo il master e il runbook dashboard.
