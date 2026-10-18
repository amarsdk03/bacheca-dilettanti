# Proposta: webapp e dashboard Admin nella stessa repository

**Stato:** progettazione aggiornata con le decisioni concordate; architettura e requisiti non ancora implementati.

**Obiettivo:** mantenere webapp e dashboard come applicazioni distinte, distribuirle separatamente e conservare una sola fonte per schema e regole condivise.

Questo documento definisce la struttura e i requisiti preliminari. Il suo aggiornamento non comporta spostamenti di codice, creazione di account o ambienti, modifiche al database o configurazioni di deploy.

## Decisione proposta

Mantenere una sola repository Git e organizzare le due applicazioni con npm Workspaces. La webapp pubblica e la dashboard Admin avranno ciascuna il proprio pacchetto, progetto Next.js, configurazione, build, variabili d’ambiente e destinazione di deploy. Condivideranno soltanto pacchetti espliciti, come tipi e regole di dominio. Le migrazioni Supabase rimarranno una sola volta alla radice.

La cartella Admin sarà codice versionato: non va aggiunta a `.gitignore` e non avrà una repository annidata. Questo permette di coordinare, nello stesso commit, modifiche che coinvolgono entrambe le applicazioni o il database.

## Struttura obiettivo

```text
bacheca-dilettanti-webapp/
├─ package.json                 # root workspace e comandi coordinati
├─ package-lock.json            # lockfile unico
├─ .gitignore                   # regole comuni; esclude tutti i file .env
├─ README.md                    # avvio, test e mappa dei workspace
├─ supabase/                    # configurazione e migrazioni condivise
├─ docs/
│  └─ dashboard/                # progettazione progressiva della dashboard
├─ apps/
│  ├─ web/
│  │  ├─ package.json
│  │  ├─ next.config.ts
│  │  ├─ tsconfig.json
│  │  ├─ components.json
│  │  ├─ public/
│  │  └─ src/
│  │     ├─ app/
│  │     ├─ components/
│  │     ├─ features/
│  │     ├─ lib/
│  │     └─ server/
│  └─ admin/
│     ├─ package.json
│     ├─ next.config.ts
│     ├─ tsconfig.json
│     ├─ components.json
│     ├─ public/
│     └─ src/
│        ├─ app/
│        ├─ features/
│        ├─ lib/
│        └─ server/
├─ packages/
│  ├─ domain/                    # regole pure, tipi e cataloghi condivisi
│  ├─ database/                  # tipi TypeScript dello schema Supabase
│  └─ ui/                        # componenti e tema condivisi, estratti gradualmente
└─ tests/                        # test condivisi, test delle app e delle migrazioni
```

`apps/web` contiene la piattaforma pubblica e l’area personale. `apps/admin` contiene la dashboard per la moderazione e le operazioni amministrative. Nessuna delle due importa file dall’albero privato `src` dell’altra: le dipendenze comuni passano da `packages/*`.

## Cosa condividere

- **`packages/domain`:** tipi e funzioni senza accesso a Next.js, al browser o a Supabase, per esempio cataloghi delle categorie e dei tornei, etichette, normalizzazioni e regole di dominio effettivamente usate da entrambe le app. Prima di estrarre un modulo va verificato che non importi componenti o runtime specifici dell’app Web.
- **`packages/database`:** tipo `Database` generato dallo schema e, se utile, tipi neutrali di righe e DTO. Non vi si trasferiscono automaticamente i client autenticati, i client con privilegi o le query legate a una schermata.
- **`packages/ui`:** componenti, varianti e tema solo quando entrambe le app devono davvero riutilizzarli. È possibile iniziare con componenti Admin propri e promuovere in seguito quelli stabili; il pacchetto va configurato in modo che Next.js e Tailwind includano correttamente sorgenti esterne al workspace.
- **`supabase/`:** resta alla radice. Migrazioni, configurazione e test SQL descrivono un solo schema condiviso dalle applicazioni, distribuito su database distinti per ambiente.

Le query e le Server Actions specifiche di un flusso restano nella rispettiva applicazione. Se una procedura di accesso o un tipo è condiviso, lo si estrae deliberatamente, invece di creare import trasversali tra le due app.

## Deploy e configurazione

Sono previsti due progetti Vercel collegati alla stessa repository. Il deploy della webapp punta alla root `apps/web`; quello della dashboard punta a `apps/admin`. Ogni deploy ha il proprio comando di build/start e le proprie variabili d’ambiente. L’installazione usa il lockfile unico alla radice; la configurazione Vercel deve consentire a ogni app di includere i pacchetti condivisi esterni alla propria root.

| Applicazione | Indirizzo previsto | Sessione |
| --- | --- | --- |
| Webapp | `https://www.bachecadilettanti.it` | Sessione della piattaforma pubblica |
| Dashboard | `https://dashboard-bacheca.vercel.app` | Sessione indipendente, dedicata all’Admin |

L’indirizzo della dashboard è una decisione di progetto, non un dominio già assegnato o configurato: la disponibilità e l’assegnazione andranno verificate durante la configurazione Vercel.

All’interno dello stesso ambiente, le due app usano lo stesso progetto Supabase. Le credenziali privilegiate restano esclusivamente sul server: la webapp le usa già per alcuni flussi, quindi non sono riservate alla sola dashboard. Non devono finire in variabili `NEXT_PUBLIC_*`, bundle client, documentazione o pacchetti condivisi accessibili al browser.

In locale si mantengono file d’ambiente separati e ignorati, ad esempio `apps/web/.env.local` e `apps/admin/.env.local`, senza copiarne i valori nei documenti. I file locali per sviluppo e test devono contenere esclusivamente credenziali locali o di staging; non si deve trasferire automaticamente l’attuale configurazione di produzione negli ambienti di prova.

I workspace npm consentono di coordinare pacchetti locali con un lockfile alla radice. Next.js può compilare pacchetti locali tramite `transpilePackages` quando necessario. Riferimenti: [npm Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/) e [opzione Next.js `transpilePackages`](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages).

## Accesso e account Admin

### Identità e fonte del ruolo

Il login utilizzerà **Supabase Auth con indirizzo email e password**, senza password statica condivisa dell’applicazione. La MFA non sarà obbligatoria nella prima versione e resta un miglioramento successivo da valutare.

La fonte dell’autorizzazione è `public.utente.tipologia_utente`, con valore esatto **`Admin`**. L’identità restituita e verificata da Supabase Auth deve essere collegata alla riga applicativa mediante `utente.auth_user_uuid`; `utente.utente_uuid` è invece l’identificativo applicativo e non va confuso con l’ID Auth. Questo collegamento esiste già nel modello attuale.

Il controllo server deve verificare identità Auth valida, email confermata e presenza della riga collegata con ruolo `Admin`. Ruoli ricevuti dal browser, `user_metadata`, email corrispondenti senza collegamento Auth o il solo possesso di una sessione non autorizzano l’accesso. Riga mancante, ruolo diverso o errore di verifica comportano il diniego dell’accesso.

### Protezione delle pagine e delle operazioni

Un controllo server centralizzato deve essere richiamato da tutte le pagine protette e da ogni Route Handler e Server Action della dashboard che legge o modifica dati. Proxy, redirect e layout possono aiutare la navigazione, ma non sostituiscono la verifica nel punto di accesso ai dati. Nessuna informazione amministrativa viene restituita prima della verifica.

Il ruolo va riletto dal database a ogni richiesta protetta, senza cache persistente tra richieste. Una revoca deve impedire le richieste successive anche se la sessione Auth è ancora valida; non si presume che interrompa un’operazione già in esecuzione. I dati privati non devono essere serviti tramite cache condivise tra utenti.

Solo gli ingressi strettamente necessari al login e al recupero credenziali possono essere raggiunti senza autorizzazione Admin; gli asset necessari a mostrarli non devono contenere dati riservati. Un visitatore anonimo viene indirizzato al login; un account autenticato ordinario riceve un diniego e non accede ai contenuti.

### Account operativi e gestione manuale

Gli account Admin sono dedicati alla dashboard. Per pubblicare annunci, gestire sottoprofili o usare le altre funzioni personali della webapp è richiesto un account ordinario distinto. Questo separa l’attività operativa da quella personale e rende più chiara la revoca dell’accesso. Le pagine pubbliche della piattaforma restano consultabili come visitatori.

La separazione dovrà essere rispettata anche dagli ingressi server della webapp, non soltanto dalla navigazione. La futura implementazione dovrà esaminare i flussi di provisioning e registrazione: un account Admin deve poter esistere senza sottoprofili personali e senza dipendere dai requisiti di completamento del profilo ordinario.

Creazione e revoca saranno manuali tramite una procedura riservata Supabase: creazione dell’identità Auth, conferma dell’email, collegamento alla riga `utente` e assegnazione controllata di `Admin`. Non è prevista nella prima versione una registrazione pubblica o una schermata per creare altri Admin. Password e credenziali non devono essere registrate nei documenti o nei log.

La colonna `tipologia_utente` deve essere protetta da modifiche da parte di account ordinari, registrazioni pubbliche e payload manipolati. Prima dello sviluppo vanno verificati grant, RLS e procedure server che possono scriverla, oltre agli eventuali vincoli che devono ammettere `Admin`. La revoca consiste nella rimozione del ruolo autorizzato; per un account compromesso va prevista anche la gestione delle sessioni secondo una procedura da definire.

### Privilegi tecnici e recupero dell’accesso

Le operazioni devono usare i privilegi minimi necessari. Quando le policy lo consentono, si usa il client con la sessione autenticata. Le operazioni che richiedono credenziali privilegiate devono restare in moduli server dedicati ed essere precedute dalla verifica Admin; la chiave tecnica bypassa RLS e non prova l’identità dell’operatore. Anche il nome attuale `createAdminClient` identifica un client tecnico, non il ruolo umano `Admin`.

Login, callback e recupero password della dashboard devono mantenere la destinazione nell’app Admin. Vanno configurati redirect espliciti e template email compatibili con entrambe le applicazioni, preservando il dominio e i flussi Auth della webapp. Non si deve modificare il Site URL del progetto condiviso presumendo che serva soltanto la dashboard.

Riferimenti: [Auth server-side Supabase](https://supabase.com/docs/guides/auth/server-side), [sicurezza dei dati e chiavi privilegiate](https://supabase.com/docs/guides/database/secure-data) e [MFA Supabase](https://supabase.com/docs/guides/auth/auth-mfa).

## Ambienti e isolamento dei dati reali

**Il database attuale, contenente dati reali, non deve mai essere usato per i test.** Questo requisito comprende prove manuali, test automatici, preview, seed e verifiche delle migrazioni.

| Ambiente | Progetto Supabase | Dati e utilizzo |
| --- | --- | --- |
| Locale | Istanza Supabase locale | Dati fittizi; sviluppo e test isolati |
| Staging / preview | Progetto Supabase separato dalla produzione | Dati fittizi; prove integrate delle due app e validazione dei rilasci |
| Produzione | Progetto attuale | Dati reali; normale funzionamento delle app pubblicate, escluso dai test |

Staging significa un altro progetto con database, Auth, Storage, account e credenziali propri: non è una seconda app collegata al database attuale e non è soltanto un diverso schema al suo interno. Le due app condividono il progetto di staging durante le prove e quello di produzione nel loro normale utilizzo pubblicato.

Lo schema di staging viene ricostruito dalle migrazioni versionate e popolato con dati sintetici, senza copiare utenti, dati o file reali. Va verificato che eventuali seed o migrazioni esistenti non introducano dati reali. Email, notifiche e altre integrazioni di prova devono usare destinatari fittizi o strumenti di test, senza inviare messaggi o attivare operazioni reali.

Le variabili Vercel di Preview e quelle dei test CI devono puntare esclusivamente a staging; nessun ripiego automatico verso la produzione se manca una configurazione. Prima di avviare test, seed, reset o comandi distruttivi, un controllo deve verificare URL e identificativo del progetto contro una lista esplicita di destinazioni locali o di staging. Se la destinazione non è riconosciuta come ambiente di prova, l’esecuzione deve fermarsi. I processi di test non devono ricevere credenziali di produzione.

L’applicazione di migrazioni approvate in produzione è un’attività di rilascio distinta dai test; non viene autorizzata o eseguita da questo documento. Configurazioni e identificativi dei futuri ambienti di staging saranno documentati senza includere segreti.

Riferimento: [gestione degli ambienti Supabase](https://supabase.com/docs/guides/deployment/managing-environments).

## Non indicizzabilità e assenza dalla piattaforma pubblica

La dashboard non deve essere indicizzata dai motori di ricerca, comprese le pagine di login e recupero password. Prevedere `X-Robots-Tag: noindex, nofollow` sulle risposte controllate dall’app e metadati equivalenti nelle pagine HTML. La configurazione va verificata anche sulle pagine pubbliche di autenticazione, sui redirect e sulle risposte di errore applicative.

Non pubblicare una sitemap della dashboard e non inserirne gli URL nelle sitemap, nella navigazione, nel footer, nei pulsanti, nelle email agli utenti ordinari o in altri contenuti della piattaforma principale. L’accesso operativo avviene conoscendo direttamente l’indirizzo dedicato.

Il file `robots.txt` non deve bloccare la scansione delle pagine pubbliche di autenticazione che espongono `noindex`: il crawler deve poter leggere la direttiva. Le pagine interne restano protette dal login e dal controllo del ruolo. L’esclusione dai risultati di ricerca non sostituisce l’autorizzazione e non rende segreto l’indirizzo.

Riferimento: [Google Search Central: bloccare l’indicizzazione con noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

## CI, migrazioni e tracciabilità amministrativa

I controlli CI devono verificare separatamente le due app. Una modifica a un pacchetto condiviso deve far eseguire i controlli delle app che lo consumano; le modifiche al lockfile o alle configurazioni comuni richiedono di verificare entrambe. Ogni deploy deve poter usare le dipendenze dei workspace senza importare i sorgenti privati dell’altra app.

Le migrazioni restano uniche e vengono applicate tramite un processo coordinato, separato dalle build Vercel: le due app non devono tentare di migrare lo stesso database indipendentemente. Prima si verificano su locale e staging. Gli aggiornamenti dello schema devono restare compatibili con le versioni delle app temporaneamente in uso durante deploy non simultanei: introdurre prima le aggiunte compatibili, aggiornare i consumatori e rimuovere i vecchi elementi soltanto in un rilascio successivo.

Il refactoring della struttura va separato dalle nuove funzioni Admin e dalle eventuali modifiche allo schema. Prima di un rilascio che modifica dati reali devono essere definite la procedura di backup e quella di ripristino; tornare a un deploy precedente non annulla automaticamente una migrazione.

Le modifiche amministrative devono lasciare una traccia persistente con identità dell’operatore, operazione, risorsa interessata, data ed esito, compresi gli errori rilevanti. La registrazione avviene lato server e non dipende da valori dichiarati dal browser. Non inserire password, token o interi payload personali nei log. Schema dell’audit, durata di conservazione e trattamento degli errori di registrazione saranno definiti prima di implementare le prime operazioni di modifica.

## Spostamenti e refactoring proposti

La migrazione va fatta in passaggi piccoli. Prima si crea un checkpoint Git delle modifiche presenti; poi:

1. **Preparare il workspace.** Convertire il `package.json` in root in un manifest privato con Workspaces e script coordinati; creare `apps/web/package.json` mantenendo versioni e script dell’app attuale. Conservare un solo `package-lock.json` in root.
2. **Spostare la webapp senza ridisegnarla.** Trasferire `src/`, `public/`, `next.config.ts`, `tsconfig.json` e `components.json` in `apps/web/`. Conservare root `supabase/`, `docs/` e `tests/`. Aggiornare alias `@/*`, configurazione ESLint, comandi, percorsi usati dai test e root directory del deploy.
3. **Ripristinare la webapp isolatamente.** Verificare installazione pulita, typecheck, lint e test della sola webapp, con le prove integrate su locale o staging. Configurare i file d’ambiente locali senza inserirli in Git e verificare il deploy di preview senza usare dati reali.
4. **Creare lo scheletro Admin.** Aggiungere `apps/admin` come nuovo progetto Next.js, con layout, autenticazione e configurazioni proprie. Configurare il deploy indipendente verso il progetto Supabase dello stesso ambiente e verificare prima in staging il controllo del ruolo `Admin`.
5. **Estrarre le condivisioni una alla volta.** Iniziare dai tipi/database e dalle regole pure di dominio usate da entrambe; estrarre UI e tema quando è chiaro il bisogno concreto. Per ciascuna estrazione aggiornare gli import delle due app e i test associati.

In questa transizione l’attenzione maggiore va ai test: molti test esistenti caricano sorgenti da `src/` con percorsi relativi alla root. Dopo lo spostamento dovranno puntare a `apps/web/src/`, senza cambiare le asserzioni funzionali. Anche le configurazioni di Next.js, TypeScript, ESLint, shadcn e Tailwind andranno verificate per ciascuna app: non si deve presumere che la configurazione in root continui ad avere lo stesso significato quando il progetto Next.js risiede in una sottocartella.

## Criteri di accettazione per la futura implementazione

- Le due app si installano dallo stesso lockfile, superano i propri controlli e possono essere distribuite separatamente. Le estrazioni condivise non introducono import diretti tra le app.
- Accesso diretto, navigazione, endpoint e Server Actions negano contenuti e operazioni Admin a utenti anonimi, account ordinari e identità senza riga `utente` valida. Il login rimane raggiungibile senza esporre dati riservati.
- Un account Admin valido può accedere con email e password; dopo la revoca del ruolo la richiesta protetta successiva viene negata, anche con sessione ancora attiva. Errori del controllo non concedono accesso.
- Registrazione pubblica e richieste manipolate non possono assegnare o modificare `Admin`. Gli account dedicati non possono usare le funzioni personali della webapp e non richiedono sottoprofili ordinari per accedere alla dashboard.
- Le sessioni delle due app sono indipendenti; callback e recupero password tornano all’app corretta. I flussi Auth ordinari continuano a funzionare.
- Preview, test e seed usano soltanto locale o staging. Una destinazione di prova mancante o non autorizzata impedisce l’esecuzione; nessuna prova usa il database attuale o copie di dati reali.
- Le risposte della dashboard espongono le direttive di non indicizzazione previste, anche sul login. Non esistono link pubblici o voci di sitemap della piattaforma principale verso la dashboard.
- Le chiavi privilegiate non compaiono nei bundle client; le operazioni Admin sono autorizzate sul server e le modifiche previste sono tracciate.

Queste verifiche sono requisiti per il futuro sviluppo, non controlli eseguiti o funzionalità introdotte con l’aggiornamento del documento. La validazione attuale riguarda soltanto coerenza del testo, struttura Markdown e collegamenti documentali.

## Risultato atteso e decisioni successive

Webapp e Admin si possono sviluppare e distribuire separatamente. Un cambio condiviso a schema o dominio resta tracciato e revisionabile insieme alle applicazioni interessate; la dashboard non è un fork e non dipende da modifiche manuali copiate tra repository.

Sono fissati: monorepo con npm Workspaces; due progetti Vercel; indirizzo previsto della dashboard; sessioni indipendenti; account Admin dedicati con email e password; ruolo letto da `utente.tipologia_utente`; gestione manuale degli account; staging isolato con dati sintetici; esclusione dei dati reali dai test; non indicizzabilità e assenza di collegamenti pubblici dalla piattaforma principale.

Restano da trattare nei documenti successivi, prima delle rispettive implementazioni:

| Tema | Decisioni e verifiche ancora necessarie |
| --- | --- |
| Prima versione | Funzioni della dashboard, priorità, dati consultabili dall’Admin e azioni consentite su utenti, profili e annunci |
| Operazioni sensibili | Conferme, eventuale nuova verifica della password, cancellazione definitiva o reversibile ed effetti sulle risorse collegate |
| Provisioning e permessi | Procedura manuale completa, compatibilità di vincoli e trigger con gli account Admin, protezione del ruolo e privilegi richiesti da ciascuna operazione |
| Recupero accesso | Reset password, account compromesso, revoca delle sessioni ed eventuale introduzione della MFA |
| Ambienti e deploy | Creazione di staging, identificativi e host di preview, assegnazione dell’indirizzo Vercel, callback Auth e destinazioni di test ammesse |
| Audit e monitoraggio | Struttura dei record, conservazione, accesso ai log, comportamento in caso di mancata registrazione e gestione degli errori operativi |
| Rilascio e ripristino | Automazioni CI/CD, regole per promuovere un rilascio in produzione, backup e procedura di ripristino coordinata tra app e schema |

Questi punti non autorizzano ora il refactoring, lo sviluppo della dashboard, la creazione di servizi o operazioni sul database: ne definiscono la progettazione da completare.
