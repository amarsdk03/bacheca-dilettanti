# Master plan — Dashboard Admin

**Ultimo aggiornamento:** 2026-10-28  
**Fase attuale:** IN03 **Concluso**, trenta controlli riusciti e fixture rimossa. Su richiesta dell'utente del 28 ottobre, resta **un'unica task preparatoria: [step 16 — chiusura finale e decisione di rilascio](steps/16-verifica-rilascio/chiusura-finale.md)**, Da iniziare. Il prossimo «procedi» ne avvia l'intero perimetro, comprese correzioni e verifica finale, senza richiedere un prompt per ciascun controllo. Esito previsto: «Pronto per il rilascio» oppure elenco preciso di blocchi riscontrati. Nessun requisito obbligatorio viene eliminato; gate cestino disabilitato e nessun rilascio eseguito.  
**Stato della dashboard:** accesso, shell protetta, Annunci, moderazione, cestino recuperabile, export CSV e Registro attività disponibili nel codice. Home con quattro KPI, azioni rapide, ultime cinque operazioni e grafici della sola metrica selezionata. Auth e isolamento delle sessioni integrati verificati nel perimetro IN03; compatibilità completa Web, cache/Storage, recupero e job Cron ancora da completare. Cestino disabilitato nel DB fino al rilascio compatibile e alla revisione delle cache.

**Vincolo operativo attuale:** Supabase **Free**, confermato dall'utente.
Database Backups automatici, PITR e altre funzionalità Pro non sono disponibili
per questo percorso. [Copia manuale](integrazione/backup-free.md)
**Conclusa per il checkpoint M02**: report utente positivo delle 18:20 UTC,
`archive_verified_restore_untested`, sei controlli veri, dimensioni e SHA-256
registrati, senza Docker. Ripristino non provato, file Storage e configurazioni
esterne esclusi; V20 resta aperto. Non attestare retroattivamente un backup precedente a M02.

**Prossimo e ultimo step preparatorio: [16 — chiusura finale e decisione di rilascio](steps/16-verifica-rilascio/chiusura-finale.md).**
IN02 è Concluso, senza operazioni manuali residue. Non serve un nuovo UUID:
la deroga esplicita per l'identità esistente è applicata e documentata nella
[scheda IN02](integrazione/auth-accesso-admin.md).
IN03 è Concluso con trenta controlli riusciti. L'identità Auth temporanea
autorizzata è stata cancellata dopo revoca; nessun altro accesso manuale richiesto.
Le prove Web usano un'identità senza mapping applicativo, non un profilo
ordinario completo; i limiti residui restano nella matrice dello step 16.
Un nuovo «procedi» avvia l'intera chiusura finale: residui integrati,
compatibilità Web/cache/Storage, recuperabilità, candidato e consegna di
rilascio. Nessun nuovo IN04/IN05 o sequenza di sottopassi da autorizzare
singolarmente. Non ripetere IN02, IN03 o le migrazioni già applicate.
I prerequisiti esterni oggi mancanti o da confermare sono dichiarati nella
scheda finale: connessione SQL operativa e destinazioni/accesso Vercel.
La destinazione isolata per il restore deve essere predisposta prima della
prova, senza sovrascrivere il progetto condiviso. Le attivazioni dipendenti
dal deploy e la prima esecuzione Cron sono operazioni del rilascio, non
ulteriori task preparatorie; non sono dichiarate già riuscite.
Un allegato di uno step già concluso resta contesto, salvo richiesta esplicita
di riesecuzione. M07C non richiede ulteriori ripetizioni; il vecchio verificatore
M07 non accetta l'hash audit modificato intenzionalmente da M08. Usare il
verificatore M10 per la baseline cumulativa corrente, solo per verifiche
motivate; nessun replay delle installazioni. Il gate del cestino resta
disabilitato durante le verifiche residue. La sola attività preparatoria
restante è la chiusura finale dello step 16, seguita dalla procedura di rilascio.

## Obiettivo e fonte delle decisioni

Realizzare una dashboard amministrativa separata dalla webapp pubblica, nella stessa repository, con accesso Supabase Auth riservato agli utenti il cui `public.utente.tipologia_utente` è **esattamente `Admin`**.

Questo documento recepisce il piano approvato e le scelte concordate: prima versione con Home, moderazione Annunci, export della pagina corrente e Registro attività; cestino recuperabile; logout nel menu; KPI economico non disponibile; audit conservato per 12 mesi. Integra il [documento architetturale](01-struttura-monorepo-webapp-admin.md), che resta il riferimento per monorepo, ambienti e deploy. In caso di differenze sul perimetro della prima versione, valgono le decisioni di questo master.

## Protocollo di lavoro obbligatorio

1. Leggere questo master e il documento dello step corrente prima di intervenire.
2. Un prompt come **«procedi»** avvia **un solo step**, oppure riprende quello rimasto incompleto. Dal 28 ottobre, su richiesta esplicita dell'utente, questo step è l'intera chiusura finale dello step 16: eseguire tutti i suoi controlli e le correzioni necessarie senza fermarsi per un nuovo prompt a ogni voce. Pubblicazione e attivazioni restano operazioni di rilascio con la propria autorizzazione.
3. Verificare le dipendenze. Passare lo step a **In corso** prima di modificarne l'implementazione.
4. Svolgere le verifiche pertinenti sullo step e aggiornare il suo documento con risultati, file interessati, limitazioni e operazioni manuali residue.
5. Usare **Da terminare** per lavoro parziale, verifiche mancanti o applicazioni manuali necessarie ancora pendenti. Non dichiarare concluso uno step soltanto perché il codice è scritto.
6. Passare a **Concluso** solo al raggiungimento dei criteri di accettazione. Aggiornare sia questo master sia il documento dello step.
7. Concludere ogni risposta con il riepilogo operativo riportato sotto. Attendere un nuovo prompt per avanzare.

Stati ammessi: **Da iniziare**, **In corso**, **Da terminare**, **Concluso**. Un solo step implementativo attivo alla volta. La chiusura finale richiesta dall'utente mantiene una lista interna di controlli, senza trasformarli in nuovi step o prompt. Eventuali accessi mancanti e difetti bloccanti devono essere concreti e documentati.

Il modello e l'impegno sono raccomandazioni per la selezione nell'interfaccia, non cambi automatici. Base: **6.1 Sol, medium**; sicurezza, database e integrazioni delicate: **6.1 Sol, high**. Non introdurre lavoro parallelo tramite altri agenti senza richiesta esplicita.

### Riepilogo obbligatorio a fine step

```text
Step: NN — titolo
Stato: Concluso / Da terminare
Risultato e verifiche: ...
Operazioni manuali: Nessuna / elenco preciso
Prossimo step: NN — titolo (oppure completamento dello step corrente)
Modello consigliato: 6.1 Sol, medium / high
```

Per ogni migrazione o script da applicare indicare: percorso, ambiente destinatario, ordine, prerequisiti, comando o procedura, verifica dell'esito e istruzioni di recupero. Distinguere sempre **file preparato** da **applicato e verificato**. Se manca un prerequisito manuale necessario, non iniziare attività che ne dipendono.

## Struttura documentale

Ogni step dispone di `steps/NN-nome.md`. Se richiede allegati propri, convertirlo in `steps/NN-nome/README.md`, aggiornando tutti i collegamenti; aggiungere nella cartella soltanto risorse pertinenti, per esempio `design.md`, contratti `.yaml` o istruzioni operative. Non creare allegati vuoti per anticipare necessità inesistenti.

Le migrazioni eseguibili restano una sola volta in `supabase/migrations/`; gli script operativi seguono le convenzioni della repository. I documenti degli step li collegano senza duplicarli. I contratti TypeScript restano vicino alla feature; OpenAPI è richiesto solo se si introduce un'API HTTP che ne beneficia, non per ogni Server Action.

## Roadmap

La dipendenza di sviluppo è l'implementazione precedente verificata nell'ambiente
di prova disponibile. Su scelta esplicita dell'utente si prosegue con PGlite:
uno step può restare **Da terminare** per sole prove integrate rinviate senza
bloccare lo sviluppo successivo, purché la sua parte implementativa richiesta
sia verificata. Una funzionalità mancante non è una verifica rinviabile.
I residui restano elencati e obbligatori prima del rilascio nello step 16.
Per la chiusura finale il prompt avvia l'intera task dello step 16.
Le quattordici righe aperte 03–16 condividono questa accettazione finale:
il loro stato non è il conteggio di quattordici task da svolgere in sequenza.

| Step | Risultato | Modello | Impegno | Stato |
| --- | --- | --- | --- | --- |
| [00](steps/00-documentazione.md) | Master e documenti degli step | 6.1 Sol | medium | Concluso |
| [01](steps/01-workspace-web.md) | Workspace npm e trasferimento webapp | 6.1 Sol | high | Concluso |
| [02](steps/02-scheletro-admin.md) | Scheletro Admin, condivisioni minime e ambienti | 6.1 Sol | medium | Concluso |
| [03](steps/03-autorizzazione-database.md) | Ruolo Admin, sessione e protezione dei permessi | 6.1 Sol | high | Da terminare |
| [04](steps/04-audit-persistente.md) | Archivio audit e conservazione | 6.1 Sol | high | Da terminare |
| [05](steps/05-accesso-sessione.md) | Login, rinnovo sessione, logout e guardie server | 6.1 Sol | high | Da terminare |
| [06](steps/06-layout-navigazione.md) | Layout, pagine future, skeleton e link esterni | 6.1 Sol | medium | Da terminare |
| [07](steps/07-annunci-dati.md) | Contratti e query lista/dettaglio annunci | 6.1 Sol | high | Da terminare |
| [08](steps/08-annunci-interfaccia.md) | Tabella, filtri e anteprima annunci | 6.1 Sol | medium | Da terminare |
| [09](steps/09-moderazione.md) | Approva, rifiuta, nascondi e ripristina visibilità | 6.1 Sol | high | Da terminare |
| [10](steps/10-cestino.md) | Cestino recuperabile e compatibilità webapp | 6.1 Sol | high | Da terminare |
| [11](steps/11-export-csv.md) | Export CSV della pagina corrente | 6.1 Sol | medium | Da terminare |
| [12](steps/12-registro-attivita.md) | Registro attività e dettagli | 6.1 Sol | medium | Da terminare |
| [13](steps/13-home-dati.md) | Aggregazioni e definizioni dei KPI | 6.1 Sol | high | Da terminare |
| [14](steps/14-home-interfaccia.md) | Home, KPI, azioni rapide e ultime operazioni | 6.1 Sol | medium | Da terminare |
| [15](steps/15-home-grafici.md) | Grafici selezionabili e caricamento su richiesta | 6.1 Sol | medium | Da terminare |
| [16](steps/16-verifica-rilascio/README.md) | Unica [task finale](steps/16-verifica-rilascio/chiusura-finale.md): residui, correzioni, verifica e decisione «Pronto per il rilascio» o blocchi concreti; esecuzione completa al prossimo procedi | 6.1 Sol | high | Da terminare |

### Completamento graduale dello step 16

| Sottopasso | Risultato | Modello | Impegno | Stato |
| --- | --- | --- | --- | --- |
| [16A](steps/16-verifica-rilascio/16a-verifiche-locali.md) | Test Node/PGlite riproducibili e matrice delle evidenze, senza Docker | 6.1 Sol | high | Concluso |
| [16B](steps/16-verifica-rilascio/16b-runbook.md) | Runbook di rilascio e recupero | 6.1 Sol | high | Concluso |
| [16C](steps/16-verifica-rilascio/16c-browser-anonimo.md) | Login e accessi anonimi nel browser, senza Docker o Supabase reale | 6.1 Sol | high | Concluso |
| [16D](steps/16-verifica-rilascio/16d-produzione-locale.md) | Build Admin isolata e controlli anonimi in modalità produzione | 6.1 Sol | high | Concluso |
| [16E](steps/16-verifica-rilascio/16e-shell-sessione.md) | Shell e sessione nel browser con servizi sintetici | 6.1 Sol | high | Concluso |
| [16F](steps/16-verifica-rilascio/16f-home.md) | Home autenticata: otto gruppi browser, caricamenti/errori/grafici | 6.1 Sol | high | Concluso |
| [16G](steps/16-verifica-rilascio/16g-annunci.md) | Annunci: tabella, filtri, dettaglio, moderazione, cestino ed export nel browser | 6.1 Sol | high | Concluso |
| [16H](steps/16-verifica-rilascio/16h-chiusura-locale.md) | Registro nel browser e chiusura delle verifiche locali | 6.1 Sol | high | Concluso |

Il perimetro locale termina con 16H: non aggiungere altri sottopassi aperti per
le stesse verifiche. Integrazione con servizi Supabase effettivi in ambiente di
test sintetico e rilascio sono fasi separate, con prerequisiti nel runbook 16B;
non sono dichiarati eseguiti dalla chiusura locale. La matrice conserva tutti i
requisiti e i limiti ancora non attestati.

16A non applica migrazioni, non avvia servizi e non attiva gate o job. Il
[runbook 16B](steps/16-verifica-rilascio/runbook-rilascio-recupero.md) è preparato
senza attestare come eseguite le prove mancanti o autorizzare automaticamente
un rilascio. Lo step 16 complessivo resta aperto
finché i suoi criteri effettivi non sono soddisfatti.
16C verifica nel browser il solo login con errori sintetici e gli ingressi
anonimi: non emette sessioni valide e non chiude le prove sulle pagine
autenticate, sul gateway Supabase o sugli header HTML di produzione.
16D verifica la build Turbopack e gli ingressi anonimi con `next start` locale:
HTML private/no-store e noindex confermati; nessuna sessione valida, CDN o HTTPS
attestati. Nessuna migrazione, configurazione esterna o pubblicazione eseguita.
16E verifica shell/sessione con Auth e RPC sintetici, SDK e guardie effettivi:
15 gruppi browser superati, corretti click coperti nella sidebar compatta e
scadenza dei singoli chunk cookie con Next. Audit soltanto in memoria, nessuna
prova su Supabase reale. 16F aggiunge otto gruppi Home nel browser: streaming,
metriche, refresh, vuoti, errori/retry, tastiera/mobile e revoca, con renderer
differito osservato sulla rete dev. Regressione di 1.298 test riuscita, zero
fallimenti/skip. 16G aggiunge dieci gruppi Annunci riusciti, undici anteprime e
due file CSV effettivi desktop/mobile; corretti il falso 403 dell'export su URL
interno Next e la perdita di spazio nella ricerca lenta. Regressione aggiornata:
1.307 test riusciti, zero fallimenti/skip. 16H conclude gli otto gruppi Registro/
chiusura locale e tre controlli tecnici di produzione: build/bundle/header,
renderer differito, errore chunk e recupero. BFcache esclusa da Chrome con
motivi registrati, ripristino nativo non attestato; ritorno ordinario con nuova
lettura. **1.312 test riusciti su 91 file, zero fallimenti/skip**, typecheck/lint
riusciti, screenshot e cleanup verificati. Nessun nuovo sottopasso locale.
Prossima fase separata: **integrazione Supabase nell'ambiente di test
autorizzato**, **6.1 Sol, high**. Condizioni finite e limiti nella [scheda
16H](steps/16-verifica-rilascio/16h-chiusura-locale.md); nessuna migrazione o
attivazione da eseguire adesso.

### Integrazione Supabase — fase esterna

L'utente ha confermato di avere soltanto il progetto Supabase attualmente
usato da `apps/web`, con soli dati di prova personali. Questo è il destinatario
previsto della ricognizione: **Webapp Bacheca Dilettanti**, project ref
`nsytraextbndfyprwzts`, nome/ref forniti dall'utente e associati ai due report.
Cataloghi e cronologia iniziali confrontati dai report utente; da M07C è
disponibile la connessione MCP diretta al progetto verificato.
Nessun nuovo progetto richiesto e nessuna destinazione dedotta
automaticamente dagli env o aggiunta alla lista dei runner di test.

| Attività | Risultato | Modello | Impegno | Stato |
| --- | --- | --- | --- | --- |
| [IN01](integrazione/01-ricognizione.md) | Script in sola lettura e confronto cataloghi/cronologia del progetto esistente identificato | 6.1 Sol | high | Concluso |
| [M02](integrazione/02-audit.md) | Archivio audit: applicazione/verifica strutturale riscontrate; copia manuale successiva verificata, restore non provato | 6.1 Sol | high | Concluso |
| [M03](integrazione/03-audit-backend.md) | Ponte audit backend: applicazione e verifica strutturale riscontrate dai report utente; prove gateway ancora distinte | 6.1 Sol | high | Concluso |
| [M04](integrazione/04-elenco-annunci.md) | Elenco annunci: installazione strutturalmente verificata e protezioni di 10/10 tabelle identiche nel confronto prima/dopo | 6.1 Sol | high | Concluso |
| [M05](integrazione/05-dettaglio-annunci.md) | Dettaglio annunci: sei funzioni strutturalmente verificate e protezioni di 25/25 tabelle identiche nel confronto prima/dopo | 6.1 Sol | high | Concluso |
| [M06](integrazione/06-moderazione-annunci.md) | Moderazione e correzione legacy M06A strutturalmente verificate: 26 oggetti, dodici routine, protezioni/metadati di 27/27 tabelle invariati | 6.1 Sol | high | Concluso |
| [M07](integrazione/07-cestino.md) | A/B/C Conclusi; installazione verificata alle 21:55 UTC, 33/33 impronte invariate, gate disabilitato; attivazione separata pendente | 6.1 Sol | high | Da terminare |
| [M08](integrazione/08-export-csv.md) · [step 11](steps/11-export-csv.md) | Export CSV applicato e verificato: tre routine, 33/33 tabelle e 149/149 altre routine invariate; gate disabilitato | 6.1 Sol | high | Concluso |
| [M09](integrazione/09-registro-attivita.md) · [step 12](steps/12-registro-attivita.md) | Registro attività applicato e verificato: quattro funzioni e indice, 33 tabelle, audit/Auth e 152 altre routine invariati; nessun SELECT API diretto | 6.1 Sol | high | Concluso |
| [M10](integrazione/10-home-dati.md) · [step 13](steps/13-home-dati.md) | Home applicata e verificata: quattro funzioni STABLE, 33 tabelle, audit/Auth e 156 altre routine invariati; gate disabilitato | 6.1 Sol | high | Concluso |
| [IN02](integrazione/auth-accesso-admin.md) | Runtime pronto, policy applicata, account esistente promosso su deroga esplicita con dati conservati e trigger ripristinato; 53 test e verifica MCP positivi | 6.1 Sol | high | Concluso |
| [IN03](integrazione/03-accettazione-auth.md) | 30 controlli riusciti: Auth, audit, revoca, dinieghi non Admin senza mapping e isolamento Web/Admin bidirezionale; unica identità temporanea revocata/cancellata e pulizia verificata | 6.1 Sol | high | Concluso |

M07 procede per sottopassi: **A** raccoglie soltanto cataloghi, firme e impronte
dei consumatori presenti, dopo M06/M06A; **B** prepara i controlli di applicazione
sulle definizioni riscontrate, comprese le varianti legacy; **C** comprende
applicazione unica e verifica delle sole modifiche intenzionali. L'inventario A
non autorizza la migrazione. Il gate resta separato e disabilitato fino alle
verifiche di compatibilità, cache e Storage del rilascio. M08 è concluso;
anche M09, M10 e IN02 sono conclusi nei rispettivi perimetri. L'eccezione IN02
modifica intenzionalmente un vincolo rispetto al checkpoint M10: usare il
verificatore IN02, senza ripristini automatici delle vecchie impronte.
Le verifiche delle installazioni e dei prerequisiti non attestano il rilascio
generale; IN03 è Concluso nel perimetro documentato, con limiti residui nella matrice.

IN01 non riapre le prove locali 16A–16H e non applica le migrazioni. Dopo
il risultato del progetto si riconciliano gli oggetti già presenti e si
individuano le sole migrazioni mancanti, secondo il runbook esistente.
Script/guida preparati, otto nuovi test di ricognizione inclusi nella regressione
di **1.320 test su 92 file riusciti, zero fallimenti/skip**, lint riuscito.
Ricevuto il `baseline_report` del 25 ottobre 13:23 UTC: M01 coerente nei
controlli strutturali, nove impronte di funzione riprodotte; marcatori M02–M10
assenti. Ricevuta anche la cronologia delle 13:35 UTC: sette versioni, tutte
corrispondenti ai file locali, elenco non troncato. M01 non è registrata pur
avendo gli oggetti coerenti; le 70 versioni locali non registrate non sono una
lista di migrazioni da rieseguire. Decisione registrata: conservare M01 senza
replay o riparazioni automatiche; M02–M10 candidate successive dopo verifica
dei prerequisiti. Nome/ref acquisiti: IN01 Concluso, nessuna operazione manuale
residua della ricognizione. Verificati nel sorgente i prerequisiti strutturali
diretti di M02: schema privato e helper M01 presenti nel report. Prossimo:
**M02 — foundation audit**, preparazione dell'applicazione e dei controlli
specifici sul progetto identificato, **6.1 Sol, high**. Nessuna migrazione o
attivazione eseguita in IN01.

M02 avviata su «procedi»: predisposta query di verifica mirata in sola lettura,
prima/dopo la migrazione esistente invariata, e guida operativa sul progetto
identificato. **124 test mirati riusciti, zero fallimenti/skip**, cinque nuovi
test del controllo inclusi; lint riuscito. Ricevuto il controllo iniziale del
progetto alle 14:16 UTC: `ready_for_m02_catalog_checks_only`, prerequisiti
corretti, guardia M01 coerente e zero oggetti M02 presenti. I controlli M02
falsi prima dell'applicazione sono previsti. Ricevuto anche il report finale
delle 14:21 UTC: `m02_structurally_verified`, nove oggetti e tutti i controlli
veri, helper negati ai ruoli API. **Registro M02 Concluso** dopo il riepilogo
di copia manuale delle 18:20:16 UTC: tutti i controlli veri, dimensioni e SHA-256
registrati, checkpoint dopo M02 e prima di M03. Ripristino non provato e copertura
Storage/configurazioni esterne restano condizioni distinte del rilascio.
Nessuna ulteriore query M02 richiesta, né connessione o mutazione remota
dell'agente; nessun passaggio automatico a M03. Prossimo: **M03 — audit dal backend**,
**6.1 Sol, high**.

### Completamento graduale dello step 03

| Sottopasso | Risultato | Modello | Impegno | Stato |
| --- | --- | --- | --- | --- |
| 03A | Base autorizzazione e prove PGlite | 6.1 Sol | high | Concluso |
| [03B.1](steps/03b1-supabase-locale.md) | Preparazione ambiente locale e acquisizione schema | 6.1 Sol | high | Da terminare |
| [03B.2](steps/03b2-ripristino-locale.md) | Ripristino schema e dati sintetici | 6.1 Sol | high | Da iniziare |
| [03B.3](steps/03b3-verifiche-integrazione.md) | Prove Auth/PostgREST/DB integrate | 6.1 Sol | high | Da iniziare |

Il percorso 03B con Docker è conservato come alternativa storica, **fuori dal
percorso scelto dall'utente**: non è un prerequisito di sviluppo o di esecuzione
dei test. Le verifiche correnti usano Node e PGlite come la Webapp, senza Docker.
Le prove Supabase complete non coperte restano esplicite nella matrice 16A, non
diventano prove riuscite. Lo step 03 resta **Da terminare** e 03A è la dipendenza
implementativa disponibile per 04A. L'utente ha dichiarato
applicata la sola migrazione foundation Admin sul progetto reale; non è una
verifica remota dell'agente. L'acquisizione schema-only deve includerne gli
oggetti senza riapplicarla automaticamente. Nessuna attivazione della policy
reale prima del completamento delle verifiche.

### Completamento graduale dello step 04

| Sottopasso | Risultato | Modello | Impegno | Stato |
| --- | --- | --- | --- | --- |
| [04A](steps/04a-audit-database.md) | Archivio, helper privati e retention con PGlite | 6.1 Sol | high | Concluso |
| [04B](steps/04b-audit-server.md) | Ingressi server riservati per Auth e fallimenti | 6.1 Sol | high | Concluso |

Lo step 05 richiede l'implementazione verificata di **04A e 04B**. Le prove
Supabase, l'attivazione e l'esecuzione reale del job Cron restano pendenti fino
all'ambiente integrato; non sono simulate come prove riuscite da PGlite.

### Completamento graduale dello step 07

| Sottopasso | Risultato | Modello | Impegno | Stato |
| --- | --- | --- | --- | --- |
| [07A](steps/07a-annunci-lista.md) | Contratti, filtri e lista autorizzata con PGlite | 6.1 Sol | high | Concluso |
| [07B](steps/07b-annunci-dettaglio.md) | Dettaglio per anteprima e copertura tipologie | 6.1 Sol | high | Concluso |

Lo step 08 richiede entrambe le parti implementative verificate. Per scelta
confermata, la lista e l'anteprima rispettano il nome pubblico/anonimo dell'autore
e usano UUID applicativi, senza recuperare identità Auth o contatti dell'account.
Le migrazioni lista/dettaglio sono preparate e verificate solo con PGlite; applicazione,
compatibilità schema completo e prove integrate restano nel gate 16.

## Architettura e vincoli comuni

- Monorepo npm Workspaces con `apps/web`, `apps/admin`, un lockfile root e migrazioni Supabase condivise. Deploy e sessioni indipendenti; stesso progetto Supabase per le due app all'interno dello stesso ambiente.
- Nessun import tra gli alberi privati delle due app. Tipi database e regole pure effettivamente condivise nei pacchetti dedicati. UI condivisa estratta solo quando utile a entrambe.
- Organizzazione Admin per feature: query server, azioni, validazione, DTO, componenti e stato. I client consumano DTO attraverso ingressi server; non ricevono credenziali privilegiate.
- Stato locale per interazioni locali; filtri e cursori nell'URL. Non introdurre uno store globale per ogni schermata.
- Letture incrementali, skeleton pertinenti, errori distinti dai risultati vuoti e possibilità di riprovare. Nessun ritardo artificiale.
- Liste limitate **sul server a 30 risultati**, ordinamento stabile e paginazione a cursore. Le ultime operazioni Home sono 5. Nessun recupero dell'intero dataset per paginare nel browser.
- Prima di codice Next.js, leggere le guide pertinenti della versione installata in `node_modules/next/dist/docs/`. Riutilizzare le convenzioni Base UI/shadcn esistenti. Niente avvio dev server o build di produzione a ogni modifica.
- Test, seed, preview e prove manuali esclusivamente su locale/staging con dati sintetici. Nessun ripiego sulla produzione. Conservare le modifiche preesistenti dell'utente.
- Dashboard non indicizzabile e assente da navigazione e sitemap della webapp pubblica. Preparare le istruzioni Vercel; non presumere disponibile l'host previsto né configurato uno staging.

## Accesso, sessione e prestazioni

L'identità Supabase Auth deve corrispondere a `utente.auth_user_uuid`; `utente.utente_uuid` è un identificativo applicativo distinto. Accesso consentito solo con email confermata, sessione valida e `tipologia_utente = 'Admin'` esatto. Escludere `admin`, `ADMIN`, valori con spazi, riga mancante ed errori di verifica. Non usare ruolo dichiarato dal browser o `user_metadata` come autorizzazione.

Verificare il token sul server e lo stato attuale di identità, sessione e ruolo nel database. Accorpare il controllo alle operazioni funzionali con procedure dedicate: evitare una chiamata HTTP di autorizzazione per ogni riga o componente. Usare lookup indicizzati; i controlli indipendenti dalle righe vanno valutati una volta per operazione/statement dove applicabile. Deduplicare soltanto nella singola richiesta, mai conservare l'esito del ruolo tra richieste.

Il controllo della sessione deve considerare l'identificativo presente nel token e le condizioni di validità applicabili: l'esistenza della riga sessione da sola non dimostra che ogni limite temporale sia ancora rispettato. La revoca del ruolo o della sessione deve impedire le operazioni successive; non si presume che annulli quelle già iniziate. Non modificare implicitamente i timeout condivisi della webapp.

Pagine protette, Server Actions, endpoint e procedure database devono essere protetti nei propri punti di accesso. Layout e proxy non sono barriere sufficienti. Le procedure dati devono poter respingere anche chiamate dirette. Usare la sessione dell'operatore; eventuali privilegi elevati sono confinati a procedure minime con permessi espliciti. Nessuna cache pubblica di dati o risposte autenticate.

Gli account Admin restano dedicati, senza sottoprofili personali obbligatori, e non usano le funzioni personali della webapp. Deroga esplicita dell'utente del 27 ottobre 2026: consentire una sola promozione dell'identità esistente indicata in IN02, conservandone registrazione, profili e annunci. L'eccezione al vincolo di registrazione deve essere limitata alla coppia di identificativi Auth/applicativo di quell'account; dopo la promozione il trigger originale viene ripristinato e i divieti di nuovo contenuto personale e accesso Web ordinario restano attivi. Nessuna deroga generale o nuovo provisioning pubblico. Provisioning, revoca e recupero credenziali sono procedure riservate documentate. Nessuna pagina Impostazioni o MFA obbligatoria nella prima versione.

Recupero password della prima versione tramite operatore Supabase autorizzato,
con cambio password e revoca delle sessioni. Nessuna pagina pubblica di reset,
callback email aggiuntiva o modifica del Site URL condiviso nello step 05.

Misurare chiamate, piani query e tempi su staging: il numero delle verifiche non deve crescere con le 30 righe visualizzate. Non promettere latenze o risparmi non misurati.

## Design e navigazione

Tema **Light**, font **Arial**, logo banner esistente, icone Lucide coerenti senza sovraccarico. Sidebar su desktop; menu apribile su mobile e contenuto principale adattabile. Tabelle con scorrimento contenuto senza allargare l'intera pagina; pannelli laterali utilizzabili anche su schermi piccoli.

Scelte confermate nello step 06: sidebar desktop riducibile a icone con tooltip,
inizialmente estesa; stato locale mantenuto durante la navigazione, senza nuova
persistenza. Dopo conferma, i contenuti esterni aprono normalmente una nuova
scheda con `noopener noreferrer`, inclusa la webapp pubblica.

Il login centrale contiene logo, Field «Indirizzo admin» e «Password», toggle Eye/EyeOff accessibile e pulsante wide «Accedi» con Key. Una sessione già valida e autorizzata apre la Home; sessione assente o non rinnovabile porta al login. Un account ordinario riceve accesso negato senza dati Admin.

| Gruppo | Voci in ordine e icone Lucide di riferimento |
| --- | --- |
| Nessuno | Home — House |
| Contenuti | Annunci — Megaphone; Segnalazioni — Flag |
| Community | Utenti — Users; Profili — Contact; Codici invito — Ticket |
| Gestione | Pagamenti — CreditCard; Promo e crediti — BadgePercent; Distribuzione — Send |
| Analitiche | Statistiche — ChartNoAxesCombined; Registro attività — ClipboardList; Integrazioni — Plug; Versioni sito web — History |

**Logout — LogOut** resta in fondo al menu. Non includere Impostazioni o il gruppo Altro. I titoli delle sezioni riprendono nome e icona; Home mostra soltanto **«Bentornato, admin!»**.

Tutte le sezioni non implementate, inclusa Statistiche, mostrano **«Presto in arrivo…»** e **«Tranquillo Gabbo, ti prometto che questa sezione arriverà molto presto»**.

Le aperture di link a contenuti esterni gestite dall'app, incluse quelle verso la webapp pubblica, passano da AlertDialog con destinazione visibile. Riutilizzare/adattare il pattern esistente; non definire la webapp ufficiale come sito non affiliato. Anteprime interne nel pannello senza uscita dal sito. Accettare soltanto schemi URL appropriati; non renderizzare HTML utente arbitrario.

## Perimetro funzionale della prima versione

### Annunci

«Azioni rapide» precede la tabella. Creazione annunci disabilitata con indicazione «Presto»; export della pagina corrente operativo allo step 11. Colonne: titolo, autore/profilo, tipologia, stato, visibilità, creazione e azioni. Ricerca per titolo/UUID; filtri per stato, tipologia, visibilità e cestino. Dettaglio recuperato solo all'apertura dell'anteprima.

Approvazione/rifiuto per annunci in revisione, senza aggirare pagamenti. Motivazione obbligatoria per rifiuto, oscuramento ed eliminazione logica. Verificare lo stato corrente e i conflitti di concorrenza sul server; non sovrascrivere modifiche intervenute dopo il caricamento.

«Nascondi» e «Sposta nel cestino» sono operazioni distinte. Il cestino conserva i dati ma impedisce consultazione pubblica e ripubblicazione involontaria. Ripristinare dal cestino non pubblica automaticamente. Nessuna eliminazione definitiva. Verificare anche aggiornamenti dell'autore, feed, anteprime, webhook di pagamento e procedure automatiche. Conservare la semantica esistente di pagamento/priorità; non introdurre rimborsi o notifiche aggiuntive non previsti.

Export CSV: sole righe della pagina corrente, massimo 30, colonne informative della tabella, senza contatti o payload aggiuntivi; autorizzazione attuale, protezione da formule e audit.

### Registro attività

Tre colonne informative: **Data e ora**, **Amministratore**, **Operazione**; azione finale **Mostra dettagli**. Filtri per periodo, operatore, azione ed esito. Pannello laterale per i dettagli, massimo 30 eventi per pagina.

Operatore identificato con l’**email attuale** dell’account Auth, come confermato;
non è una copia storica. In assenza dell’account/email usare UUID applicativo,
altrimenti Auth, e indicare esplicitamente gli eventi non identificati. Non
attestare un ruolo Admin per fallimenti che contengono soltanto un’identità Auth.
Periodi inclusivi in Europe/Rome; filtri e cursore nell’URL, nessun audit delle letture.

Registrare login/logout, modifiche, export e fallimenti significativi, non ogni consultazione. Dettagli: ID evento, timestamp UTC, operatore, azione, risorsa, esito, motivazione, variazioni pertinenti e ID di correlazione. Non salvare credenziali, token o copie integrali di dati personali. Identità/esito derivati sul server, mai accettati come verità dal browser.

Modifica e audit di successo sono atomici: errore di audit impedisce la conferma della modifica. Fallimenti registrati separatamente dalla transazione annullata. Registro non modificabile dalla UI; cancellazione tecnica soltanto tramite procedura riservata dopo **12 mesi**. Nessuna ricostruzione fittizia di eventi precedenti all'attivazione.

### Home e metriche

| KPI | Definizione |
| --- | --- |
| Utenti totali | Account con `tipologia_utente` esattamente `Utente` e `registrato_il` valorizzato |
| Annunci totali | Annunci presenti, escluso il cestino; comprende gli altri stati |
| Annunci da approvare | Stato `in_revisione`, escluso il cestino |
| Profitti totali | «Non disponibile»; nessuno zero o dato simulato |

Azioni rapide: annunci da approvare (lista filtrata), segnalazioni aperte (pagina futura), crea profilo limitato (disabilitato, «Presto»). Ultime 5 operazioni e pulsante «Vedi registro completo».

Il pannello «Grafici - [KPI]» cambia alla selezione della card. Selezione iniziale Utenti. Caricare soltanto i grafici selezionati, con skeleton proprio, usando chart shadcn riutilizzabili in una futura pagina Statistiche.

- **Utenti:** area lineare delle nuove registrazioni mensili e pie con legenda per distribuzione dei profili per tipologia principale.
- **Annunci:** creazioni mensili e distribuzione attuale per stato.
- **Da approvare:** anzianità della coda attuale e distribuzione per tipologia. Non presentare queste misure come storico retroattivo del backlog.
- **Profitti:** stato non disponibile, senza query finanziarie.

Serie mensili: mese corrente e undici precedenti, fuso **Europe/Rome**; timestamp conservati in UTC. Aggregazioni SQL, non conteggi di pagine nel browser. Il denominatore dei profili è distinto dal numero degli utenti e deve essere dichiarato nella UI. Le statistiche derivate dai record ancora presenti non vanno presentate come uno storico immutabile di record eliminati.

Scelta confermata allo step 13: la popolazione Utenti richiede il valore esatto
`Utente` e registrazione completata, senza includere altri ruoli o valori inattesi.
Distribuzioni sull’intera popolazione attuale; serie temporali fino all’istante
della lettura DB. Date mancanti/non finite/future escluse dalle misure temporali
con contatori espliciti; nella coda diventano “Data non disponibile”. L’anzianità
usa giorni di calendario locali. Alcune date di registrazione legacy sono state
ricostruite dalla migrazione Web preesistente: indicare il limite del dato.

## Verifiche trasversali e rilascio

- Negare anonimi, utenti ordinari, varianti di `Admin`, sessioni revocate/scadute, email non confermate e identità senza riga collegata.
- Provare accessi diretti, assegnazione abusiva del ruolo, isolamento delle sessioni e assenza di dati privati nelle cache.
- Verificare audit atomico, conflitti di moderazione, cestino e mancata ripubblicazione involontaria.
- Verificare paginazione stabile, filtri server, export limitato e formula injection, metriche e assenza di dati finanziari fittizi.
- Verificare skeleton, errori, tastiera, focus, toggle password, conferme esterne e uso mobile.
- Misurare chiamate e piani query su dati sintetici; nessun N+1 e caricamento dei grafici su richiesta.
- Controlli mirati durante gli step e integrazione finale; build solo quando richiesta dalla validazione della struttura o dal rilascio, non a ogni modifica.

Il rilascio in produzione è distinto dalle prove e richiede istruzioni concrete per migrazioni, configurazioni, backup e recupero. Non applicare migrazioni in produzione né creare servizi implicitamente durante la stesura dei documenti. Non segnare come svolti deploy o verifiche esterne soltanto perché documentati.

## Riferimenti

- [Architettura locale](01-struttura-monorepo-webapp-admin.md).
- [Supabase: sessioni e revoca](https://supabase.com/docs/guides/auth/sessions).
- [Supabase: SSR e cache](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
- [Supabase: RLS e prestazioni](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [shadcn: Chart](https://ui.shadcn.com/docs/components/base/chart) e [Sidebar](https://ui.shadcn.com/docs/components/base/sidebar).
- [OpenAI: modelli e impegno](https://learn.chatgpt.com/docs/models).

## Registro avanzamento

| Data | Step | Esito |
| --- | --- | --- |
| 2026-10-23 | 00 | Concluso: master, 17 schede e architettura allineata. Verificati collegamenti locali, metadati, fence Markdown e diff. Nessuna implementazione applicativa o migrazione; operazioni manuali: nessuna. Prossimo: step 01, 6.1 Sol, high. |
| 2026-10-23 | 01 | Concluso: webapp in `apps/web`, workspace e lockfile unico, configurazioni e 23 file test aggiornati. Typecheck e CSS riusciti, lint con i 9 avvisi iniziali; 342 casi test verificati, inclusa riesecuzione dei 57 dettagli profilo dopo due correzioni di percorso. Installazione pulita isolata riuscita. Nessuna migrazione; predisporre env locale/staging e aggiornare Root Directory Vercel prima dell'avvio/deploy. Prossimo: step 02, 6.1 Sol, medium. |
| 2026-10-24 | 02 | Concluso: app Admin separata, tipi Supabase in pacchetto condiviso, cookie distinti predisposti, noindex, esempio env e preflight locale/staging. Typecheck delle due app e CSS riusciti; lint senza errori, 9 avvisi preesistenti; preflight e configurazioni verificati con valori sintetici. Nessuna migrazione, connessione DB o deploy; ambiente Admin e progetto Vercel da configurare prima delle prove integrate. Prossimo: step 03, 6.1 Sol, high. |
| 2026-10-24 | 03 | Da terminare, come concordato: migrazione `20261024095639_admin_authorization_foundation.sql`, helper/RPC sessione e ruolo esatto, account dedicati, guardie Web/DB e template manuali. Applicazione e prove solo in PGlite: 49 casi DB, 3 Web e 26 regressioni Auth/consensi, tutti riusciti (78 totali, zero skip). Typecheck delle due app riusciti; lint zero errori e 9 avvisi preesistenti. Nessuna applicazione Supabase o attivazione reale. Completare configurazione Auth e prove integrate su ambiente isolato prima dello step 04; modello 6.1 Sol, high. |
| 2026-10-24 | 03B.1 | Da terminare: configurazione e runner locale separati, guardie su destinazione/runtime, acquisizione schema-only in sola lettura e inventario cataloghi, policy locale non attestata, istruzioni manuali e sottopassi 03B.2/03B.3 documentati. Cinque test mirati riusciti, lint mirato senza rilievi, configurazione letta dalla CLI 2.122.0 senza deprecazioni, preparazione ripetibile verificata. Docker assente e sorgente non compilata: nessun export/import/avvio stack o connessione reale. L'utente dichiara applicata solo la foundation sul reale; non verificato dall'agente. Prossimo: completare Docker e acquisizione 03B.1 prima del ripristino 03B.2; 6.1 Sol, high. |
| 2026-10-24 | Roadmap | Scelta esplicita dell'utente: continuare lo sviluppo con PGlite senza Docker e rinviare 03B prima del rilascio. Le milestone implementative verificate consentono lo sviluppo successivo; gli step con sole prove integrate mancanti restano Da terminare. Separato 04A (DB) da 04B (server); nessuna rinuncia ai controlli di rilascio. |
| 2026-10-24 | 04A | Conclusa l'implementazione su PGlite: archivio audit privato con RLS e revoche API, helper invoker riservati, payload ammessi, successo atomico e fallimenti dopo rollback, indici e retention UTC di 12 mesi di calendario. Migrazione `20261024104822_admin_audit_foundation.sql` generata con CLI; script Cron separato predisposto, non attivato. Test audit/autorizzazione: 119 riusciti, zero fallimenti/skip; lint mirato senza rilievi. Fixture 03 riusata e test policy reso indipendente dai valori compilati dall'operatore, senza modificare il file reale. Nessuna connessione remota o applicazione Supabase, scheduler/advisor integrati pendenti. Step 04 complessivo Da terminare; prossimo 04B, 6.1 Sol, high. |
| 2026-10-24 | 04B | Conclusa l'implementazione: RPC invoker e ponte privato definer riservati al backend, soli successi Auth e fallimenti ammessi; servizi server con sessione/contesto Admin verificati e client tecnico distinto, login subordinato all'audit, logout con pulizia indipendente, timeout e log minimali. Migrazione `20261024110910_admin_audit_server_bridge.sql` generata con CLI, applicata solo in PGlite; placeholder chiave solo nell'esempio env. 200 test riusciti, zero fallimenti/skip; typecheck Web/Admin e lint mirato riusciti. Nessuna connessione Supabase, applicazione remota o attivazione Cron; integrazione cookie/Auth/PostgREST e ACL completi ancora da verificare. Step 04 complessivo Da terminare; nessuna operazione manuale ora. Prossimo 05, 6.1 Sol, high. |
| 2026-10-24 | 05 | Implementati `/accesso`, Home minima protetta, Server Actions, verifica centralizzata condivisa con audit, client SSR per contesto, proxy di rinnovo, cookie di login confermati solo dopo audit, logout locale con pulizia di tutti i chunk Admin e recupero riservato tramite operatore. Componenti shadcn Base UI aggiunti tramite CLI e adattati agli alias locali. 257 test riusciti (54 nuovi), zero fallimenti/skip; typecheck Web/Admin, lint mirato e compilazione CSS riusciti. Nessuna nuova migrazione, connessione al progetto, lettura/modifica `.env.local`, attivazione policy o deploy. Da terminare per prove integrate Auth/PostgREST/browser e misure; parte implementativa disponibile per 06. Operazioni manuali ora: nessuna per proseguire lo sviluppo; prerequisiti di prova nella scheda 05. Prossimo 06, 6.1 Sol, medium. |
| 2026-10-24 | 06 | Implementati gruppo di rotte protette, catalogo di 13 sezioni, sidebar desktop riducibile, Sheet mobile, logout nel footer, pagine future esatte, skeleton/stati comuni e conferma esterna HTTP/HTTPS con nuova scheda. Guardie sia nel layout sia nelle pagine, nessun prefetch delle voci, nessuna nuova persistenza UI o logica dati. 143 test mirati riusciti (37 nuovi), zero fallimenti/skip; typecheck Web/Admin, lint e CSS riusciti. Nessun dev server, build di produzione, collegamento Supabase, modifica env o migrazione. Da terminare per prove visive/focus/browser e integrazione 03–05 rinviata; implementazione disponibile per 07. Operazioni manuali ora: nessuna. Prossimo 07, 6.1 Sol, high. |
| 2026-10-24 | 07A | Conclusa la milestone lista: contratti/filtri e cursore Base64URL vincolato ai filtri, massimo 30 con lookahead interno, date UTC a microsecondi e null in fondo, ricerca letterale/UUID, nome pubblico/anonimo e UUID applicativi. RPC invoker/ponte privato autorizzano l'Admin attuale senza query di contesto aggiuntiva o N+1; indice ordinato e fingerprint della sola riga base. Migrazione `20261024120724_admin_announcement_list.sql` generata con CLI e applicata solo in PGlite. 218 test riusciti (79 nuovi), zero fallimenti/skip; typecheck Web/Admin e lint mirato riusciti. Nessun collegamento Supabase, modifica env, build/dev server o Docker. Step 07 Da terminare per dettaglio e prove integrate; runbook e limiti prestazionali nella scheda 07A. Operazioni manuali ora: nessuna; SQL preparato per futuro ambiente isolato. Prossimo 07B, 6.1 Sol, high. |
| 2026-10-24 | 07B | Conclusa la milestone dettaglio in un unico sottopasso approvato: RPC autorizzata e servizio server per undici tipologie, riepilogo pubblico/anonimo, JSON strutturati proiettati anche nel DB, riferimenti a squadre risolti con nomi pubblici, contatti read only e descrittori URL/media validati. Snapshot privato riservato, SHA-256 completo di base e relazioni e ID bigint senza perdita di precisione; nessun fetch remoto o nuova UI. Migrazione `20261024145954_admin_announcement_detail.sql` generata con CLI, applicata solo in PGlite; nessun grant/RLS tabelle modificato. 289 test riusciti (71 nuovi), zero fallimenti/skip; typecheck Web/Admin e lint mirato riusciti. Nessuna applicazione Supabase, modifica env, build/dev server o Docker. Step 07 Da terminare per sole verifiche integrate; contratti, limiti e runbook nella scheda 07B. Operazioni manuali ora: nessuna. Prossimo 08, 6.1 Sol, medium. |
| 2026-10-24 | 08 | Implementati pagina Annunci protetta, filtri URL con debounce/History, tabella semantica fino a 30 righe, cursori avanti/indietro locali e anteprima Sheet su richiesta per undici tipologie. Handler GET con cookie scrivibili, una RPC funzionale per richiesta valida e no-store; richieste annullabili con protezione dalle risposte superate e pulizia su rifiuto della sessione. Creazione/export/moderazione restano disabilitati. 374 test riusciti (32 nuovi), zero fallimenti/skip; typecheck Web/Admin, lint e CSS riusciti. Nessuna migrazione, applicazione Supabase, modifica env, dev server o build. Da terminare per sole prove integrate/browser trasferite al gate 16; implementazione disponibile per 09. Operazioni manuali ora: nessuna. Prossimo 09, 6.1 Sol, high. |
| 2026-10-24 | 09 | Implementato in unico intervento approvato: approva/rifiuta/oscuramento/ripristino, motivo visibile all'autore, capacità SQL e versione completa ricalcolata dopo lock, audit atomico, priorità e notifiche esistenti preservate. Flag amministrativo protetto anche dal writer Web, trigger sui quindici figli e pagamento compatibile con il flag. Migrazione `20261024155838_admin_announcement_moderation.sql` generata con CLI e verificata solo in PGlite. 532 test riusciti (69 nuovi), zero fallimenti/skip; typecheck Web/Admin, lint mirato e CSS delle due app riusciti, ultime correzioni confermate dai 47 casi DB/interfaccia moderazione. Nessuna applicazione Supabase, modifica env, dev server, build, Docker o nuova dipendenza. Da terminare per sole prove integrate/browser e concorrenza reale; runbook nella scheda 09, residui nel gate 16. Operazioni manuali ora: nessuna; nuova migrazione preparata per futuro ambiente isolato. Prossimo 10, 6.1 Sol, high. |
| 2026-10-24 | 10 | Implementato il cestino Admin completo: motivo interno, ripristino sotto hold, audit atomico, filtro/cursore v2, conservazione di contenuti/media e protezioni Web/RLS/writer privilegiati. Eliminazione fisica dell'autore conservata fuori dal cestino. Migrazione `20261024162714_admin_announcement_trash.sql` generata con CLI e verificata soltanto in PGlite; gate privato inizialmente false e script di attivazione separato non attestato. Query Web, conferma/proxy immagini, sitemap/cache, notifiche, checkout/pagamenti e sincronizzazioni compatibili; regioni revocate conservate ma non riattivabili senza abilitazione. 657 test riusciti, zero fallimenti/skip, inclusi 20 casi della nuova suite DB con corpi reali dei consumatori. Typecheck delle due app, lint mirato e CSS in memoria riusciti. Nessuna connessione/applicazione remota, modifica env, Docker, dev server o build. Da terminare per sole prove integrate e rilascio; inventario, cache/Storage, attivazione e recupero nella scheda 10, residui nel gate 16. Operazioni manuali ora: nessuna; non applicare né attivare sul reale. Prossimo 11 — Export CSV, 6.1 Sol, medium. |
| 2026-10-24 | 11 | Implementato export CSV delle sole righe della pagina corrente, massimo 30 in ordine, sei colonne pubbliche, UTF-8/BOM/separatore punto e virgola e difesa formule. POST interno stessa origine/no-store, sessione umana e nuova RPC che rilegge/confronta la pagina e registra audit atomico con ID/quantità/colonne; nessun file se cambia la pagina o manca audit. Controller protegge doppio invio, risposte superate, navigazione, esiti incerti e pulizia Blob. Migrazione `20261024205423_admin_announcement_export.sql` generata con CLI, applicata solo in PGlite; estensione compatibile degli eventi audit, nessun successo attestabile dal ponte tecnico. 839 test riusciti (80 nuovi), zero fallimenti/skip; typecheck Web/Admin, lint e CSS Admin in memoria riusciti. Nessuna connessione/applicazione remota, modifica env, dev server, build o Docker. Da terminare per sole prove integrate, import Excel/LibreOffice e rollout; runbook nella scheda 11, residui nel gate 16. Operazioni manuali ora: nessuna; non applicare SQL sul reale. Prossimo 12 — Registro attività, 6.1 Sol, medium. |
| 2026-10-24 | 12 | Implementato Registro attività read only con tre colonne informative, filtri URL per periodo/operatore/azione/esito, cursori a microsecondi fino a 30 eventi e dettaglio Sheet su richiesta. Email attuale Auth confermata, fallback UUID e identità non attestata espliciti. Due RPC autorizzate e indice Auth aggiuntivo, nessun grant SELECT audit/Auth, client tecnico o audit delle consultazioni. Migrazione `20261024211431_admin_audit_reads.sql` generata con CLI e applicata solo in PGlite. 953 casi unici riusciti (114 nuovi), zero fallimenti/skip: regressione di 952 e successiva suite DB di 36 con nuovo controllo read only. Typecheck Web/Admin, lint e CSS Admin in memoria riusciti. Nessuna connessione/applicazione remota, modifica env, dev server, build o Docker. Da terminare per sole prove integrate/browser e misure; runbook nella scheda 12, residui nel gate 16. Operazioni manuali ora: nessuna; SQL preparato per futuro ambiente isolato, non applicare sul reale. Prossimo 13 — Dati Home, 6.1 Sol, high. |
| 2026-10-24 | 13 | Implementati riepilogo KPI, ultime cinque operazioni via audit 12 e dataset grafici per singola metrica. Popolazione Utente esatta con registrazione completata confermata; annunci/coda escluso cestino, profitti non disponibili. Serie di dodici mesi Europe/Rome, distribuzioni attuali, denominatori profili distinti, fasce dalla creazione e date anomale esplicite. Due RPC STABLE autorizzate, GET privati/no-store e adapter RSC, nessun N+1, cache globale, client tecnico o lettura economica. Migrazione `20261024212824_admin_home_aggregations.sql` generata con CLI e applicata solo in PGlite; nessun nuovo indice o job. 1.048 test riusciti (95 nuovi), zero fallimenti/skip; typecheck Web/Admin e lint mirato riusciti. Campione di 6.000 utenti/profili/annunci e piani SQL verificati, senza attestare prestazioni remote. Nessuna connessione/applicazione Supabase, modifica env, dev server, build o Docker. Da terminare per sole prove integrate; UI negli step 14–15, runbook nella scheda 13, residui nel gate 16. Operazioni manuali ora: nessuna; non applicare SQL sul reale. Prossimo 14 — Interfaccia Home, 6.1 Sol, medium. |
| 2026-10-24 | 14 | Implementata Home con quattro KPI selezionabili Base UI, azioni rapide e ultime cinque operazioni; dati iniziali RSC paralleli in Suspense distinti, aggiornamento/riprova indipendenti, abort/generazioni e BFcache. Diniego corrente svuota entrambi i blocchi e nasconde Home con redirect unico. Tabella audit condivisa conservando dettagli e trigger nel Registro; pannello grafici predisposto senza richieste serie. 1.081 test riusciti (33 nuovi), zero fallimenti/skip; typecheck Web/Admin, lint mirato e CSS Admin in memoria riusciti. Nessuna nuova migrazione/dipendenza, connessione Supabase, modifica env, build, dev server o Docker. Da terminare per sole prove integrate/browser, elencate nella scheda 14 e nel gate 16. Operazioni manuali ora: nessuna; non applicare SQL sul reale. Prossimo 15 — Grafici Home, 6.1 Sol, medium. |
| 2026-10-25 | 15 | Implementati area lineare e pie Utenti/Annunci, barre per anzianità dalla creazione e pie tipologie della coda, Profitti non disponibile. Una sola metrica richiesta, renderer differito, aggiornamento/riprova indipendenti, generazioni/abort/StrictMode/BFcache e diniego che svuota tutti e tre i blocchi. Parser puro condiviso, componenti e adapter riutilizzabili, tabelle accessibili, denominatori/date/limiti espliciti e vuoti senza dati artificiali. Chart shadcn solo Admin e Recharts 3.10.1 esatto nel lockfile unico. 1.102 test riusciti (21 nuovi), zero fallimenti/skip; typecheck Web/Admin, lint mirato e CSS Admin in memoria riusciti. Nessuna migrazione/script, connessione/applicazione Supabase, modifica env, dev server, build o Docker. Da terminare per sole prove integrate/browser e bundle, documentate nella scheda 15 e nel gate 16. Operazioni manuali ora: nessuna; non applicare SQL sul reale. Prossimo 16 — Verifica e rilascio, 6.1 Sol, high. |
| 2026-10-25 | 16A | Concluso il consolidamento locale senza Docker: PGlite 0.5.8 come dev dependency root, loader comune e 35 file test/fixture migrati dalla cache, 35 guardie skip rimosse senza cambiare SQL o asserzioni. npm test scopre tutti gli 86 file, limita la concorrenza a quattro e propaga gli errori; nove nuove prove del runner, inclusi processo reale e dipendenza assente. Suite completa: 1.275 test riusciti, zero fallimenti/skip. Typecheck Web/Admin, lint sui 38 file interessati e CSS delle due app riusciti; lint su tutti i test con un avviso preesistente in notifiche.test.mjs:135, zero errori. Step 16 convertito in cartella, matrice delle evidenze e residui integrati/browser espliciti; Docker escluso dal percorso scelto, tooling 03B conservato come alternativa storica. Nessuna migrazione/script da applicare, lettura/modifica env, connessione Supabase, deploy, dev server o build. Step 16 complessivo Da terminare. Operazioni manuali ora: nessuna; npm ci solo sulle altre installazioni per allineare il lockfile. Prossimo 16B: runbook di rilascio e recupero, 6.1 Sol, high. |
| 2026-10-25 | 16B | Conclusa la consegna documentale del runbook di rilascio e recupero: destinatari da confermare, baseline Web e foundation dichiarata applicata da riconciliare, registro ordinato delle dieci migrazioni Admin, configurazioni Vercel/Auth senza segreti, provisioning e policy separati dalle attivazioni cestino/retention, backup DB/Storage, accettazione e recupero compatibile con entrambe le app. Verificati percorsi, firme, parametri, transazioni, privilegi descritti e collegamenti contro sorgenti e documentazione ufficiale. Nessun codice/API, dipendenza, migrazione o script eseguibile modificato, nessuna connessione/applicazione Supabase, attivazione, backup/restore, build, dev server, Docker o deploy. Suite applicativa non ripetuta per sole modifiche Markdown: evidenze 16A conservate. Step 16 complessivo Da terminare per prove integrate/browser e configurazioni non attestate. Operazioni manuali ora: nessuna. Prossimo: completamento delle verifiche residue dello step 16, 6.1 Sol, high; nessun rilascio automatico. |
| 2026-10-25 | 16C | Concluso il perimetro browser anonimo: runner separato test:browser:admin, copia .local senza env e con ambiente ammesso, Auth sintetico senza token validi, Chrome/profile/sessione dedicati e cleanup verificato. Undici gruppi browser riusciti: layout desktop/mobile, tastiera/focus/Eye, validazione/pending/errori e recupero, navigazione delle 13 rotte al login, 7 API 403 senza dati e private/no-store, nessuna sessione o errore di idratazione. Supportati i redirect HTML in streaming; HTML dev osservato no-cache/must-revalidate per override Next, produzione non attestata. Regressione completa: 1.283 test riusciti, zero fallimenti/skip, inclusi 8 nuovi del runner; lint mirato pulito. Nessun codice/stile/API delle app, migrazione o env modificato, nessun Supabase reale, Docker o deploy. Step 16 complessivo Da terminare per pagine autenticate, servizi reali e produzione. Operazioni manuali ora: nessuna. Prossimo: completamento delle verifiche residue dello step 16, 6.1 Sol, high. |
| 2026-10-25 | 16D | Conclusa la verifica anonima in produzione locale: nuovo comando test:browser:admin:production, build Admin con Turbopack predefinito e TypeScript riuscita nella copia senza env, quattordici gruppi superati con next start su loopback. HTML login e tredici rotte protette private/no-store/noindex; sette API 403 senza dati, form desktop/mobile e tastiera/errori riusciti, nessun errore di idratazione rilevato. Sentinella tecnica sintetica assente da trenta asset client; nessuna attestazione di deploy o segreti reali. Copia produzione collocata sotto .local a profondità compatibile con la radice monorepo, senza cambiare configurazione dell'app; cleanup verificato. Regressione completa: 1.286 test riusciti, zero fallimenti/skip, inclusi undici del runner; lint mirato pulito. Nessun codice delle app, migrazione o env originale modificato, nessun Supabase reale, Docker o deploy. Step 16 complessivo Da terminare per pagine autenticate, servizi reali e HTTPS/CDN. Operazioni manuali ora: nessuna. Prossimo: pagine autenticate e ulteriori verifiche residue dello step 16, 6.1 Sol, high. |
| 2026-10-25 | 16E | Conclusi shell e sessione nel browser con servizi HTTP sintetici: 15 gruppi superati, SDK/guardie effettivi, JWT ES256/JWKS, audit prima del commit, diniego/revoca, sidebar desktop/compatta/mobile e dieci pagine future. Corretti due difetti reali: etichette invisibili sopra le icone compatte e scadenze con nome base che lasciavano vivi i chunk Admin. Logout normale e degradato verificati, cookie Web conservato; tre checkpoint console, avvisi Base UI Home rinviati esplicitamente a 16F. Regressione finale: 1.293 test riusciti, zero fallimenti/skip; typecheck Admin, lint e CSS riusciti. Report completo e cleanup confermati, nessun processo residuo controllato. Nessun nuovo SQL, dipendenza o env, nessun Supabase reale, Docker o deploy. Step 16 complessivo Da terminare per Home/tabelle e servizi reali. Operazioni manuali ora: nessuna. Prossimo: 16F Home autenticata, 6.1 Sol, high. |
| 2026-10-25 | 16F | Conclusi gli otto gruppi Home nel browser isolato: KPI/cinque eventi/destinazioni, streaming indipendente, chunk renderer differito sulla rete dev, quattro metriche, refresh e selezioni rapide, vuoti, errori/retry dei tre blocchi, tastiera/tooltip/mobile e revoca con API 403 senza dati. Corretti i tre pulsanti-link Base UI Home. Nuovo scenario --home con fixture opt-in, senza cambiare 16E predefinito; nessun timeout applicativo modificato. Regressione completa 1.298 test riusciti su 89 file, zero fallimenti/skip; 22 test tooling/fixture mirati, typecheck Admin e lint riusciti. Screenshot ispezionati e cleanup confermato. Roadmap locale limitata a 16F/16G/16H; integrazione effettiva e rilascio separati. Nessun SQL, env, dipendenza o servizio reale modificato, nessuna build di produzione/Docker/deploy. Operazioni manuali ora: nessuna. Prossimo: 16G Annunci, 6.1 Sol, high. |
| 2026-10-25 | 16G | Conclusi dieci gruppi Annunci nel browser isolato: lista/filtri/History/cursori, undici anteprime, consenso esterno con modificatori e nuova scheda, sei azioni moderazione/cestino, conflitto/esito incerto e revoca letture/scritture, UI mobile e due CSV nativi verificati. Corretti due difetti: export rifiutato per confronto con localhost interno Next e spazio eliminato dal debounce durante ricerca lenta. Scenario --annunci con fixture opt-in e un unico Chrome/CDP; rotte precompilate anonimamente. 1.307 test Node/PGlite riusciti su 90 file, zero fallimenti/skip; typecheck Admin, lint, sei screenshot e due CSV verificati; cleanup confermato. Nessun SQL, dipendenza, env, servizio reale, gate reale, Docker, build di produzione o deploy. Operazioni manuali: nessuna. Prossimo e ultimo locale: 16H Registro e chiusura locale, 6.1 Sol, high. |
| 2026-10-25 | 16H | Conclusi otto gruppi Registro/chiusura locale e tre controlli tecnici su build Turbopack e next start: filtri/date Europe/Rome, cursori/History, sei varianti dettaglio, skeleton/errori/rimozione modellata, focus/mobile e revoca; header autenticati privati, renderer differito, chunk realmente fallito e recupero. BFcache esclusa da Chrome con motivi registrati, ripristino nativo non attestato; ritorno ordinario con nuova RPC. 1.312 test Node/PGlite su 91 file riusciti, zero fallimenti/skip; 28 test mirati inclusi nel totale, typecheck/lint, sei screenshot e cleanup verificati. Nessun codice app, SQL, dipendenza, env, servizio reale, Docker o deploy modificato/eseguito. Verifiche locali terminate, nessun ulteriore sottopasso locale. Sei gruppi finiti di condizioni esterne consegnati nella scheda 16H; step 16 resta Da terminare per integrazione/rilascio. Operazioni manuali ora: nessuna. Prossima fase separata: integrazione Supabase nell'ambiente di test autorizzato, 6.1 Sol, high. |
| 2026-10-25 | IN01 | Avviata la fase esterna sul progetto esistente di apps/web, confermato dall'utente con soli dati di prova personali. Preparati script di ricognizione READ ONLY con timeout/ROLLBACK, cataloghi/impronte/privilegi effettivi, marker M01?M10 senza certificazione automatica e cronologia opzionale di sole versioni, e guida numerata per SQL Editor. Otto nuovi test PGlite riusciti, regressione completa 1.320 test su 92 file, zero fallimenti/skip, lint riuscito. Nessun SQL remoto, migrazione, env, dipendenza, app, build, server, Docker o deploy modificato/eseguito. Stato Da terminare: attendere nome/ref e risultati del progetto per il confronto; sola applicazione M01 resta dichiarata, non verificata. Operazione manuale ora: ricognizione SQL Editor secondo la guida IN01. Prossimo: completare IN01 con i risultati, poi sole migrazioni mancanti previa riconciliazione, 6.1 Sol, high. |
| 2026-10-25 | IN01 confronto | Ricevuto baseline_report dell'utente (13:23 UTC, PostgreSQL 17.6, READ ONLY): M01 coerente nei controlli strutturali, nove hash delle funzioni riprodotti con la sequenza Web e i ritorni a capo originali; trigger, vincolo account e privilegi confrontati. Marcatori M02-M10 assenti. Confronto solo in PGlite, nessuna connessione o mutazione remota dell'agente. Stato Da terminare: mancano nome/project ref e migration_history_report, leggibile secondo il primo risultato. Prossimo: sola query cronologia opzionale e riconciliazione IN01, 6.1 Sol, high. |
| 2026-10-25 | IN01 cronologia | Ricevuto migration_history_report delle 13:35 UTC: READ ONLY, 7 versioni distinte, risultato non troncato, tutte corrispondenti a un solo file locale. Su 77 migrazioni locali, 70 versioni non registrate: non sono una lista da rieseguire. M01 presente e coerente nei controlli strutturali ma non registrata; decisione documentata di conservarla senza replay o riparazione automatica. M02-M10 senza versioni o marcatori, candidate successive previa verifica dei prerequisiti. Nessuna connessione o mutazione remota dell'agente. Stato Da terminare: manca soltanto nome/project ref per associare i due report. Prossimo: identificare il destinatario e chiudere IN01, 6.1 Sol, high. |
| 2026-10-25 | IN01 chiusura | Concluso: nome Webapp Bacheca Dilettanti e project ref nsytraextbndfyprwzts forniti dall'utente e associati a entrambi i report. Cataloghi e cronologia confrontati, M01 coerente nei controlli strutturali ma non registrata, marcatori/versioni M02-M10 assenti; decisione di conservare M01 senza replay o riparazioni automatiche. Letti i prerequisiti diretti M02: schema private e helper M01 presenti; nessuna applicazione remota o nuova prova funzionale. Aggiornati guida, master, matrice, runbook ed evidenze locali di provenienza. Operazioni manuali residue IN01: nessuna. Prossimo step: M02 foundation audit, applicazione e verifiche da preparare sul progetto identificato, 6.1 Sol, high. |
| 2026-10-25 | M02 preparazione | Avviato il solo step M02 su procedi. Migrazione audit esistente invariata (SHA-256 1d96bea14a2313f75ea3c33c145114d6039c6351354426402101de97e4e980ee); preparati controllo cataloghi READ ONLY prima/dopo e guida SQL Editor per Webapp Bacheca Dilettanti, nsytraextbndfyprwzts. Controllati guardia M01, firme/definizioni/owner/grant, colonne/default, vincoli, indici e RLS; nessuna riga audit letta o purge eseguita dal controllo. Cinque nuovi test piu regressioni audit/autorizzazione: 124 riusciti, zero fallimenti/skip; lint riuscito. Nessuna connessione IDE configurata, nessun SQL remoto, modifica env/app, build/server/Docker o attivazione. Stato Da terminare: punto di recupero richiesto, applicazione nel SQL Editor e m02_report finale da acquisire. Prossimo: completare M02, poi M03; 6.1 Sol, high. |
| 2026-10-25 | M02 controllo iniziale | Ricevuto report utente delle 14:16:30 UTC: ready_for_m02_catalog_checks_only, operatore postgres, PostgreSQL 17.6, READ ONLY; prerequisiti corretti, M01 coerente, nessun oggetto M02 presente. I controlli delle strutture M02 falsi sono previsti prima della migrazione. Report conservato localmente, guida/master/matrice aggiornati; nessun nuovo SQL, test o collegamento remoto dell'agente. Stato Da terminare: punto di recupero ancora da documentare, applicazione M02 e verifica finale da ricevere. Prossimo: completare M02, poi M03; 6.1 Sol, high. |
| 2026-10-25 | M02 verifica finale | Ricevuto report finale utente delle 14:21:04 UTC: m02_structurally_verified, nove oggetti presenti, tutti i controlli veri, quattro hash di funzione corrispondenti e helper negati ai quattro ruoli API. M01 ancora coerente; PostgreSQL 17.6, operatore postgres, READ ONLY. Applicazione e confronto strutturale M02 completati, nessun replay o altra query M02 richiesta. Registro Da terminare soltanto per riscontro del punto di recupero ancora non fornito; nessuna attestazione di backup, gateway o Cron. Aggiornati guida, master, matrice, 04A, runbook ed evidenze locali. Nessun nuovo SQL/test o collegamento remoto dell'agente. Prossimo: riscontro backup e chiusura M02, poi M03; 6.1 Sol, high. |
| 2026-10-25 | M02 copia Free | Recepito il piano Supabase Free e la scelta dell'utente di una copia manuale prima di M03. Preparati scripts/dashboard-backup/run.ps1 e funzioni, guida backup-free.md, client portabili PostgreSQL 17.11 da EDB in .local, senza Docker o servizi. Dump intero schema+dati, ruoli senza password, verifica TOC e lettura completa a NUL senza restore, checksum e riepilogo privo di segreti; fallimenti restano incomplete. Undici test sintetici riusciti, zero fallimenti/skip, ESLint riuscito; quattro veri client avviati, pg_restore reale rifiuta file corrotto; 39 documenti e 317 link locali verificati senza mancanti. Migrazione M02 invariata. Stato Da terminare: eseguire nel terminale personale e fornire solo summary.json. Nessun dato o SQL remoto acquisito dall'agente; nessun backup o restore del progetto attestato. Checkpoint dopo M02, non retroattivo; V20 e copertura Storage/configurazioni restano distinti. Prossimo: riscontro copia e chiusura M02, poi M03 su nuovo prompt; 6.1 Sol, high. |
| 2026-10-25 | M02 copia Free: correzione public | Ricevuto primo report utente delle 18:10 UTC: dump, ruoli, indice e lettura completa riusciti; solo copertura falsa. Causa nel verificatore: richiedeva SCHEMA public anche quando pg_dump omette la definizione con owner pg_database_owner. Corretto quel requisito, mantenendo obbligatorie tabelle e dati. Sedici test sintetici riusciti, zero fallimenti/skip, lint riuscito. Indice locale utente controllato sulle cinque tabelle obbligatorie; controllo negativo sui dati public ancora rifiutato. Nessuna riga applicativa letta, connessione remota o modifica degli archivi dell'utente. Da terminare: ripetere il comando per il nuovo riepilogo completo, senza modificare il precedente incomplete. M03 non avviata; prossimo riscontro e chiusura M02, 6.1 Sol high. |
| 2026-10-25 | M02 chiusura | Concluso nel registro operativo: report utente di copia manuale completata alle 18:20:16.8173260 UTC, archive_verified_restore_untested, sei controlli veri, error null. Dump 2.275.263 byte e ruoli 5.956 byte, SHA-256 registrati nella guida Free e nel report locale; server 17.6, client 17.11. Checkpoint dopo M02 e prima di M03, nessuna attestazione retroattiva. Ripristino non provato, Storage binario/configurazioni esterne e password ruoli esclusi; V20 resta aperto. Documenti e provenienza aggiornati; nessun nuovo SQL, test applicativo o collegamento remoto dell'agente, hash acquisiti dal report. Operazioni manuali residue M02: nessuna. Prossimo M03 audit dal backend, non avviato; 6.1 Sol high. |
| 2026-10-25 | M03 preparazione | Avviato solo M03 su procedi. Migrazione ponte audit esistente invariata, SHA-256 0924fb2c6564ed21918758e2832a7401f71de0036c7092356e71b5c38e342d2e. Preparati controllo READ ONLY prima/dopo e guida SQL Editor per nsytraextbndfyprwzts, Free; checkpoint manuale M02 delle 18:20 già acquisito, nessuna nuova copia richiesta. Controlli M01/M02 completi, dipendenza JWT, due funzioni con firme/owner/hash/search_path, invoker/definer, grant ed esecuzioni ereditate, PUBLIC EXECUTE privato, USAGE e overload. Sei nuovi test più regressioni: 211 riusciti, zero fallimenti/skip, lint riuscito. Nessuna connessione IDE disponibile, nessun SQL remoto, env, chiave, build, server o Cron modificati. Da terminare: controllo iniziale, applicazione una sola volta se pronta e report finale utente. Prossimo completare M03, poi M04 su nuovo prompt; 6.1 Sol high. |
| 2026-10-25 | M03 controllo iniziale | Ricevuto report utente delle 18:32:15.786651 UTC: ready_for_m03_catalog_checks_only, PostgreSQL 17.6, operatore postgres, READ ONLY. M01 coerente, M02 con nove oggetti e tutti i controlli positivi, dipendenza JWT disponibile, nessun PUBLIC EXECUTE privato, USAGE tecnico gia presente; due funzioni M03 assenti e zero oggetti, come previsto prima dell'applicazione. Report completo conservato localmente; copia Free delle 18:20 ancora acquisita separatamente. Nessun nuovo SQL/test o collegamento remoto dell'agente. Da terminare: applicazione una sola volta della migrazione invariata e report finale. Prossimo completare M03, poi M04 su nuovo prompt; 6.1 Sol high. |
| 2026-10-25 | M03 chiusura | Concluso nel registro operativo: report finale utente delle 18:34:27.052344 UTC, m03_structurally_verified, due funzioni presenti, hash corrispondenti e tutti i controlli booleani veri. EXECUTE solo a service_role tra i ruoli API verificati; M01/M02 coerenti e nessun PUBLIC EXECUTE privato. Report completo conservato in .local, provenienza dalla chat, confronto zero-due oggetti riscontra applicazione e struttura. Migrazione e verificatore invariati; nessun nuovo SQL, collegamento remoto o test applicativo. Conservati i 211 test mirati e lint precedenti; validati JSON, stati e impronte SQL. Gateway/JWT, esposizione Data API, cronologia, Cron e ripristino completo non attestati; copia Free delle 18:20 ancora acquisita separatamente. Operazioni manuali residue M03: nessuna. Prossimo M04 elenco annunci, non avviato; 6.1 Sol high. |
| 2026-10-25 | M04 preparazione | Avviato solo M04: migrazione elenco esistente invariata, SHA-256 75405cd39c46730f48869cdd78b58a49e55d12b32426cc234c5eed79af11a017. Preparati verificatore READ ONLY prima/dopo e guida SQL Editor per nsytraextbndfyprwzts, Free; M03 verificato e copia manuale delle 18:20 gia acquisita. Controlli M01-M03, 52 colonne su dieci tabelle, due funzioni STABLE con hash/owner/ACL e privilegi ereditati, indice ordinato pronto/valido sulla tabella corretta. Impronte di owner/grant/colonne/RLS/policy da confrontare tra i due report; nessuna lettura dati o chiamata elenco/audit. Sette nuovi test piu regressioni: 297 riusciti, zero fallimenti/skip, lint riuscito. Documenti: 41, link locali validi: 347. Nessuna connessione IDE, SQL remoto, modifica env/app, build, server o Cron. Da terminare: acquisire report iniziale prima dell'applicazione, poi migrazione una sola volta e confronto finale; non basta il solo stato strutturale per attestare invarianza protezioni. Prossimo completare M04, M05 non avviato; 6.1 Sol high. |
| 2026-10-25 | M04 controllo iniziale | Ricevuto report utente delle 18:52:10.766058 UTC: ready_for_m04_catalog_checks_only, PostgreSQL 17.6, postgres, READ ONLY. M01-M03 coerenti, 52 colonne corrispondenti, zero oggetti M04; due funzioni e indice assenti come previsto. Dieci tabelle con RLS attiva, owner postgres, impronte di protezioni e privilegi effettivi conservate nel report completo .local per il confronto finale sullo stesso progetto. Nessuna nuova esecuzione SQL, test applicativo o connessione remota dell'agente. Da terminare: applicare una sola volta la migrazione invariata e acquisire report finale con tre oggetti e protezioni identiche. Prossimo completare M04; M05 non avviato, 6.1 Sol high. |
| 2026-10-25 | M04 chiusura | Concluso nel registro operativo: report finale utente delle 18:55:18.489359 UTC, m04_structurally_verified, tre oggetti contro zero iniziali, hash attesi e tutti i controlli booleani veri. M01-M03 coerenti, 52 colonne corrispondenti, EXECUTE solo ad authenticated tra i ruoli API riportati. Report completo e confronto separato conservati in .local: 10/10 tabelle identiche, zero differenze nelle quattro impronte, owner, RLS e privilegi effettivi. Il limite table_protections_compared=false del report SQL originale resta invariato; confronto riuscito registrato separatamente. Migrazione e verificatore SQL invariati; nessun nuovo SQL remoto o test applicativo. Conservati 297 test mirati e lint precedenti; JSON, stati, hash SQL e 347 link locali su 41 documenti validati. Copia manuale Free delle 18:20 acquisita separatamente, restore non provato; gateway/Auth, esposizione Data API, cronologia e V20 ancora distinti. Operazioni manuali residue M04: nessuna. Prossimo M05 dettaglio annunci, non avviato; 6.1 Sol high. |
| 2026-10-25 | M05 preparazione | Avviato solo M05: migrazione dettaglio esistente invariata, SHA-256 ee96ea99249d2a3e27b1bcb910e397f59fe4b2cca13719d9d6af7b60fea4fdad. Preparati verificatore READ ONLY prima/dopo e guida SQL Editor per nsytraextbndfyprwzts, Free; M04 Concluso e copia manuale delle 18:20 acquisita. Sei funzioni con firme/hash LF-CRLF/owner/settings/ACL ed EXECUTE effettivi, quattro helper interni negati ai ruoli API; 166 colonne su 25 tabelle e undici unicita complete/immediate. Tipi aggiuntivi compatibili espliciti dal contratto SQL/TS, nessuna ricostruzione inventata del DDL iniziale; tipologie_sport servizi dichiarato JSONB. Impronte di owner/grant/colonne/RLS/policy da confrontare prima/dopo su tutte le 25 tabelle, nessuna lettura dati o chiamata applicativa. Otto nuovi test e regressioni: 376 riusciti, zero fallimenti/skip, lint riuscito. Validati JSON, hash e 362 link locali su 42 documenti. Nessuna esecuzione SQL remota, modifica env/app, build, server, deploy o Cron. Stato Da terminare: acquisire report iniziale prima dell'applicazione, poi migrazione una sola volta se pronta e confronto finale. M06 non avviato; prossimo completamento M05, 6.1 Sol high. |
| 2026-10-25 | M05 correzione date/orari | Ricevuto report completo utente delle 19:08:28.849615 UTC: prerequisites_require_review, zero oggetti M05, undici unicita valide e 160/166 colonne corrispondenti. Sei falsi negativi del verificatore su quattro date staff/partita e due time senza fuso partita. Report originale e vecchio verificatore conservati in .local con provenienza e hash; nessun valore retroattivamente corretto. Aggiunte solo sei alternative di tipo, allineato il generatore locale; nuova impronta verificatore 9837d47c4a6c34c041f387487977be4bd69d449b6dcefc09cc08432e2d527e29. Migrazione e sei impronte di funzione invariate, nessuna modifica a schema/permessi/API/DTO o M04. Tre nuove regressioni: pre/post con native temporali e 25 protezioni identiche; SQL-DTO con null/date bisestili/secondi/frazioni e DateStyle ISO/German; rifiuto di tipi temporali incompatibili o su campi estranei. 379 test mirati riusciti, zero fallimenti/skip, undici M05; lint riuscito. Generatore riproduce il verificatore byte per byte. JSON, stati, hash e 362 link locali su 42 documenti validati. Nessun SQL remoto, env, chiave, build, server o Cron. M05 Da terminare: richiedere nuovo report iniziale con il file aggiornato prima della migrazione. Copia Free gia acquisita, restore non provato; M06 non avviato, 6.1 Sol high. |
| 2026-10-25 | M05 controllo iniziale positivo | Ricevuto report completo utente delle 19:16:35.949046 UTC: ready_for_m05_catalog_checks_only, prerequisiti M01-M04 coerenti, 166/166 colonne corrispondenti, undici unicita valide e zero oggetti M05. Sei funzioni assenti come previsto; report completo e 25 protezioni conservati in .local con provenienza separata, mantenendo il precedente report delle 19:08. Stato Da terminare: applicare una sola volta la migrazione esistente invariata, poi report finale e confronto di tutte le protezioni. Nessun SQL remoto, nuova connessione o test applicativo eseguito dall'agente; conservati 379 test mirati e lint precedenti. Validati JSON, hash e 362 link locali su 42 documenti. Copia manuale Free acquisita separatamente, restore non provato; limiti gateway/Auth/Data API e V20 ancora distinti. Prossimo completare M05; M06 non avviato, 6.1 Sol high. |
| 2026-10-25 | M05 chiusura | Concluso nel registro operativo: report finale utente delle 19:19:12.973538 UTC, m05_structurally_verified, sei funzioni contro zero iniziali, hash attesi e tutti i controlli booleani veri. M01-M04 coerenti, 166 colonne corrispondenti e undici unicita valide; quattro helper senza EXECUTE API, authenticated ammesso solo a wrapper/ponte tra i ruoli API riportati. Report completo e confronto separato conservati in .local: 25/25 tabelle identiche, zero differenze nelle quattro impronte, owner, RLS e privilegi effettivi. Il limite table_protections_compared=false del report SQL originale resta invariato; confronto riuscito documentato separatamente. Migrazione e verificatore SQL invariati; nessun nuovo SQL remoto o test applicativo. Conservati 379 test mirati e lint precedenti; validati JSON, stati, hash e 362 link locali su 42 documenti. Copia manuale Free delle 18:20 acquisita separatamente, restore non provato; gateway/Auth, esposizione Data API, autorizzazione funzionale, cronologia e V20 ancora distinti. Operazioni manuali residue M05: nessuna. Prossimo M06 moderazione annunci, non avviato; 6.1 Sol high. |
| 2026-10-26 | M06 preparazione | Completata la preparazione ripresa dopo l'interruzione: migrazione moderazione esistente invariata, SHA-256 52e325e1cf69e9cbfd771c7bcfcc0d53b71ce8198907677c9c771658addd7c99. Verificatore READ ONLY prima/dopo e guida SQL Editor per nsytraextbndfyprwzts, Free, dopo M05 Concluso; copia manuale dopo M02 acquisita separatamente, restore non provato. Controlli M01-M05, 185 colonne su 27 tabelle, undici unicità dettaglio e chiave ricevute; nove nuove funzioni, sedici trigger e un flag (26 oggetti), tre sostituzioni intenzionali di funzioni dettaglio/pagamento. Confronto richiesto delle 27 protezioni normalizzate, 27 metadati invarianti e protezione pagamento; esclusi dalle impronte soltanto nuovo flag e sedici trigger verificati separatamente. Otto nuovi test e regressioni: 458 riusciti, zero fallimenti/skip, lint riuscito. Generatore riproduce il verificatore byte per byte; validati JSON, hash e 382 link locali su 43 documenti. Nessuna connessione DB IDE configurata, SQL remoto, modifica env/app, build, server, deploy o Cron. Stato Da terminare: acquisire prima soltanto il report iniziale completo, poi applicazione una sola volta se pronta e confronto finale. Non riapplicare M05 dopo le modifiche intenzionali M06. Prossimo completare M06; M07 non avviato, 6.1 Sol high. |
| 2026-10-26 | M06 controllo iniziale positivo | Ricevuto report completo utente delle 09:45:00.918396 UTC: ready_for_m06_catalog_checks_only, postgres, PostgreSQL 17.6, READ ONLY. Prerequisiti M01-M05 coerenti, 185/185 colonne corrispondenti, undici unicità dettaglio e chiave ricevute valide; versioni iniziali dettaglio/pagamento attese, EXECUTE pagamento solo service_role fra i ruoli API riportati. Zero oggetti M06, nuove funzioni/colonna/sedici trigger assenti come previsto. Report completo trascritto semanticamente dalla chat in .local con provenienza separata; 27 protezioni e 27 metadati conservati per il confronto finale, protezione pagamento 55a216a83d1c5c204530ec9222a366cb. Migrazione/verificatore invariati; nessuna query remota o nuova esecuzione di test applicativi, conservati 458 test mirati e lint precedenti. Validati JSON, conteggi, hash e 382 link locali su 43 documenti. Da terminare: applicare una sola volta M06 esistente, poi report finale e confronto completo; nessun replay M05. Copia Free acquisita separatamente, restore non provato. Prossimo completare M06; M07 non avviato, 6.1 Sol high. |
| 2026-10-26 | M06 verifica conteggio routine | Ricevuto report completo delle 09:49:06.820357 UTC, m06_partial_or_drift_require_review: tutti i 26 oggetti attesi corrispondenti, undici funzioni elencate con after_matches=true, sedici trigger e colonna coerenti. Protezioni/metadati confrontati separatamente per schema/tabella: 27/27 e 27/27 identici, protezione pagamento invariata. Stato e limiti originali conservati, provenienza e vecchio SQL in .local. Conteggio routine negativo indica firme aggiuntive non elencate dal primo verificatore: identità/numero ancora da acquisire, nessuna attribuzione o innocuità presunta. Aggiunti al report versione 2 numero effettivo, numero atteso e unexpected_routines con firme/genere/owner/hash/settings/ACL ed EXECUTE API; criteri finali conservati e precheck rafforzato sulle firme inattese delle dipendenze. Due nuove regressioni su overload pagamento e procedura/aggregato; 81 test mirati riusciti, zero fallimenti/skip, dieci M06, lint riuscito. Conservata regressione precedente di 458 test, non ripetuta integralmente. Nuovo SHA-256 verificatore 27a20c67546eba980feb49fb4ef25f3293c9734a71bb2ef9d1e5c79b0b3806e8; migrazione e impronte delle funzioni invariate. Nessun SQL remoto, grant, DROP, modifica env/app, build, server o Cron. Da terminare: rieseguire soltanto il verificatore aggiornato e inviare il JSON completo, nessun replay M06/M05. M07 non avviato, 6.1 Sol high. |
| 2026-10-26 | M06 firma legacy e correzione M06A | Report completo versione 2 delle 09:57:05.557687 UTC: dodici routine contro undici attese, unica aggiuntiva public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean), definer postgres e solo service_role tra API. Corpo 44155d0a2a904fe2fb0211c1b3f2bf67, ACL db23e67d6fad77fdfa003856d807d6af. Estratta soltanto questa definizione schema-only dal backup M02 con SHA-256 ricontrollato, senza righe/restore/connessione; hash corpo e ACL riprodotti esattamente in PGlite, quindi firma preesistente. Riprodotto rollback del pagamento sotto hold; preparata con CLI la migrazione separata 20261026100239_admin_m06_legacy_payment_hold_compatibility.sql: due assegnazioni compatibili con flag e motivo, firma/ACL/comportamento restante preservati, controlli su fonte/privilegi/prerequisiti ed errore su replay. Corpo corretto e23890414fe6633d54cd4cb8694901fe. Verificatore versione 3 ammette la sola firma legacy esatta se presente, esigendo il corpo corretto nel finale; nuove firme arbitrarie restano negate. Quattro nuove prove legacy incluse nei 464 test mirati riusciti, zero fallimenti/skip, lint riuscito. Validati JSON, hash e 387 link locali su 43 documenti. Report originali conservati; 27 protezioni e metadati invariati. Migrazione M06 originale/M05 invariate, nessun SQL remoto o grant/DROP, nessuna riga estratta dal backup o nuova copia, build/server/Cron/deploy. Da terminare: applicare una volta soltanto M06A, poi report finale versione 3 e confronto; M07 non avviato. Modello 6.1 Sol high. |
| 2026-10-26 | M06 chiusura | Concluso nel registro operativo: report finale completo utente delle 10:27:00.881719 UTC, versione 3, m06_structurally_verified, postgres, PostgreSQL 17.6, READ ONLY. Ventisei oggetti attesi, dodici routine con after_matches=true, sedici trigger e colonna coerenti, nessuna firma inattesa; prerequisiti M01-M05 e 185 colonne validi. M06A riscontrata dal corpo legacy e23890414fe6633d54cd4cb8694901fe, ACL db23e67d6fad77fdfa003856d807d6af invariato; solo service_role esegue le due firme pagamento tra i ruoli API. Report/provenienza e confronto finale separato conservati in .local: 27/27 protezioni e 27/27 metadati identici alla baseline, zero differenze, protezione pagamento e ACL legacy invariati. I limiti falsi del report SQL originale restano invariati; esito positivo del confronto registrato separatamente. Migrazioni e verificatore invariati, nessun SQL remoto o nuovo test applicativo per questa chiusura documentale; conservati 464 test mirati e lint riusciti. JSON, hash, stati e 387 link locali su 43 documenti validati. Nessuna operazione manuale residua M06; non ripetere M06/M06A/M05. Gateway/Auth/Data API, autorizzazione funzionale, concorrenza, cronologia e restore completo ancora distinti; copia Free acquisita separatamente, V20 aperto. Prossimo M07 cestino recuperabile, non avviato; 6.1 Sol high. |

| 2026-10-26 | M07A preparazione inventario | Avviato solo M07 dopo M06/M06A Conclusi; suddiviso prima del lavoro in A inventario, B controlli prima/dopo sulle definizioni riscontrate, C applicazione/confronto, attivazione separata. Preparati script READ ONLY iniziale e guida SQL Editor per nsytraextbndfyprwzts, Free. Baseline M06 versione 3 riusata nella stessa transazione, sedici nomi monitorati incluse tutte le firme degli undici consumatori Web, owner/settings/ACL ed EXECUTE; procedure/aggregati e assenze esplicite. Trentatre posizioni di tabella: 27 M06 e sei supporti, tutte le colonne/grant/RLS/policy/vincoli/indici e trigger/funzioni nelle nuove impronte senza esclusioni; dettagli dei sei supporti, trigger dei consumatori anche su altre tabelle. Baseline M06 compatta con le esclusioni originali, privilegi ancora coperti da protection_md5. Il JSON non autorizza migrazione e non certifica stato finale o valore gate; segnala presenza parziale e richiede revisione. Nove nuovi casi nei 114 test mirati riusciti, zero fallimenti/skip; lint riuscito, SQL rigenerato byte per byte. Verificati hash e 44 documenti/402 link locali. Migrazione M07 invariata, SHA-256 0afed5cbddb38219037672c6595c725bc3131e2e7287cf27f460609f5d2aa9da, M06/M06A e vecchio verificatore invariati. Metadati preparazione in .local, nessun report remoto M07 ancora ricevuto. Nessuna connessione o esecuzione SQL remota, attivazione gate, modifica env/app, build/server/Docker/deploy/Cron o nuova copia richiesta. Stato Da terminare: eseguire soltanto inventario iniziale intero e acquisire JSON completo m07_report, poi M07B. M08 non avviato; 6.1 Sol high. |

| 2026-10-26 | M07A inventario acquisito e chiusura | Ricevuto report completo versione 1 delle 11:25:16.517713 UTC: m07_inventory_requires_review, postgres, PostgreSQL 17.6, READ ONLY, zero oggetti M07. Tutte le 33 tabelle presenti, ordinarie/permanenti, owner postgres e RLS attiva. M06/M06A ancora strutturalmente coerenti, nessun mismatch o firma inattesa. Trascritti indipendentemente i campi di confronto dal messaggio: 27/27 protezioni e 27/27 metadati identici al finale M06 delle 10:27, zero differenze; protection_md5 comprende ancora i privilegi omessi dal formato compatto. Diciassette funzioni PL/pgSQL su quindici nomi presenti dei sedici monitorati: due firme pagamento (otto/dieci argomenti), due checkout session (sette/nove), snapshot profilo assente, figlio generico presente. Diciotto trigger dei consumatori riportati. Estratto selezionato con tutti i 33 riepiloghi/impronte, 17 routine e baseline 27+27, provenienza esplicita e confronto derivato separato in .local; non etichettato come copia completa del JSON originale, conservato nella conversazione. Limiti/stato sorgente invariati: corpi non ancora revisionati, migrazione non autorizzata, nessun valore gate letto o stato finale M07 attestato. M07A Concluso nel registro operativo; M07 complessivo Da terminare. SQL, generatore, test e migrazioni invariati, sette hash verificati; conservati 114 test e lint precedenti, non ripetuti per la chiusura documentale. Nessun SQL remoto dell'agente, grant, modifica env/app, build/server, deploy o Cron; nessuna nuova copia. Nessuna operazione manuale residua M07A. Prossimo M07B: riesaminare le definizioni effettive e preparare controlli prima/dopo su nuovo prompt, non avviato; M07C/attivazione separate, M08 non avviato. Modello 6.1 Sol high. |

| 2026-10-26 | M07B preparazione verifiche | Avviato solo M07B dopo inventario M07A Concluso. Ricontrollato SHA-256 della copia M02; estratte esclusivamente dodici definizioni FUNCTION con owner/ACL e un trigger pruning, senza dati/restore/connessione. Fixture selezionata separata dai sorgenti eseguibili; dopo M06/M06A in PGlite tutte le 17 definizioni, owner, settings e ACL coincidono con il report M07A. Riprodotte le 18 versioni finali M07, nessuna modifica alla migrazione originale (SHA-256 0afed5cbddb38219037672c6595c725bc3131e2e7287cf27f460609f5d2aa9da), M06/M06A e inventario M07A invariati. Preparati nuovo dashboard_admin_verify_m07.sql prima/dopo, manifest delle impronte, generatore riproducibile, confronto locale su 33 tabelle e READ ONLY separato del gate da usare dopo installazione. Verificati 17/18 corpi, due firme pagamento e due session, 18/19 trigger consumatori anche fuori inventario, snapshot assente, figlio generico presente; finale con 25 marcatori principali, due colonne, 17 policy restrittive, due trigger nuovi, vincolo/indice e catalogo gate. I prerequisiti M01-M06 normalizzano solo corpi finali M07 esatti e il nuovo trigger generico controllato separatamente. Confronto esterno obbligatorio: 33 impronte conservano ogni altro metadato/grant/funzione; valore gate non dedotto dal catalogo. Quattordici nuovi casi nei 128 test mirati riusciti, zero fallimenti/skip; lint riuscito, rigenerazione byte per byte e 44 documenti/415 link locali validati. Legacy checkout a sette argomenti contiene pg_catalog.greatest: errore riprodotto prima/dopo su annuncio attivo, comportamento preesistente conservato e revisione funzionale distinta prima dell'uso; due firme checkout bloccano invece il cestino e due pagamenti tardivi preservano privacy/hold. Stato Da terminare: eseguire ora soltanto il nuovo verificatore READ ONLY nel SQL Editor come postgres, acquisire JSON completo e confrontarlo con M07A prima di M07C. Metadati/provenienza in .local; sette artefatti precedenti invariati e otto nuovi hash registrati. Nessun SQL remoto, grant sul progetto, riga applicativa estratta, modifica env/app, nuova copia, build/server/Docker/deploy/Cron o attivazione. M07C/M08 non avviati; completamento M07B, 6.1 Sol high. |

| 2026-10-26 | M07B checkpoint iniziale e chiusura | Ricevuto report completo versione 2 delle 12:21:10.440937 UTC: ready_for_m07_catalog_checks_only, postgres, PostgreSQL 17.6, READ ONLY. Prerequisiti M01-M06/M06A validi, 17 corpi e protezioni iniziali corrispondenti, 18 trigger esistenti coerenti, nessuna firma/trigger inatteso, zero marcatori M07. Match finali falsi e nuovi oggetti assenti previsti prima dell'installazione. Trascritte indipendentemente tutte le 33 impronte dal messaggio corrente e confrontati i tredici campi per schema/nome con M07A: 33/33 identiche, zero differenze. Hash iniziali, ACL ed EXECUTE effettivo delle 17 funzioni riscontrati anche contro il manifest riesaminato. Estratto selezionato, provenienza con SHA-256/sezioni omesse e confronto derivato separato conservati in .local; report completo originale nella conversazione, limiti sorgente tutti falsi invariati. M07B Concluso, nessuna operazione manuale residua A/B; M07 complessivo Da terminare, C su nuovo prompt, attivazione e M08 non avviati. Quindici hash invariati e JSON/provenienza verificati; 44 documenti e 412 link locali fuori dai blocchi di codice validati. Conservati 128 test mirati e lint della preparazione, non ripetuti per la chiusura documentale. Difetto checkout legacy a sette argomenti resta oggetto di revisione funzionale separata prima dell'uso. Nessuna modifica a SQL, migrazioni, generatori, test o app; nessuna query remota dell'agente, grant, lettura del gate, attivazione, nuova copia, build/server/Docker/deploy o Cron. Prossimo M07C: applicazione unica e verifica dopo installazione, non avviato; modello 6.1 Sol high. |

| 2026-10-28 | IN03 chiusura | Concluso nel perimetro Auth/PostgREST e sessioni Web/Admin: 30 controlli riusciti, inclusi login/rinnovo, tre letture protette, audit persistenti, logout/revoca con JWT ancora temporalmente valido, osservatore indipendente, due RPC e tre API negate all'identità Auth senza mapping, logout Web e Admin indipendenti in entrambe le direzioni. Consenso contestuale al ciclo della singola identità sintetica dopo richiesta specifica; account revocato/cancellato con verifica 404 e cookie rimossi. Helper e server Web di test fermati; Admin disponibile al login. Gate del sito escluso solo nel processo Web locale, env e implementazione app invariati. Evidenze e limiti nella scheda IN03 e nella matrice generale; nessuna migrazione, attivazione cestino, Cron o pubblicazione. Nessuna operazione manuale residua IN03. Prossima revisione compatibilità Web/cache/Storage non avviata; 6.1 Sol high. |

| 2026-10-28 | Decisione di chiusura finale | Su richiesta esplicita dell'utente, sostituito il raggruppamento informale in cinque blocchi con una sola task finale dello step 16. Il prossimo procedi comprende tutti i residui obbligatori, correzioni, validazione del candidato e decisione di rilascio, senza un prompt per ciascun controllo. Nuova scheda chiusura-finale.md con baseline riutilizzabile, prerequisiti dichiarati, lista chiusa riferita a V01-V20 e separazione fra preparazione e operazioni dipendenti dal deploy. SQL non disponibile nei tool/IDE e progetti/host Vercel da confermare: domanda unica posta ora all'utente, senza richiesta di segreti. Nessun requisito obbligatorio omesso, nessun nuovo test applicativo o servizio modificato. IN03 resta Concluso; task finale preparata, non ancora eseguita. |
