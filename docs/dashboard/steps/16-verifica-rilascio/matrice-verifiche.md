# Matrice delle verifiche — prima versione dashboard

[Master](../../master_plan.md) · [Step 16](README.md) · [Esecuzione 16A](16a-verifiche-locali.md)

## Come leggere le evidenze

**Decisione del 28 ottobre:** i residui ancora obbligatori V01–V20 confluiscono
nell'unica [task finale dello step 16](chiusura-finale.md). Il prossimo
«procedi» comprende verifica, correzioni e decisione di rilascio, senza
ulteriori sottopassi da avviare singolarmente. Per ogni requisito registrare
evidenza valida, non applicabilità dimostrata, operazione effettivamente
dipendente dal rilascio oppure blocco concreto. Nessun requisito obbligatorio
è cancellato per ridurre il numero degli step.

Sequenza locale concordata: **16F Home**, **16G Annunci** e
**16H Registro/chiusura locale** sono **Conclusi: verifiche locali terminate**. Integrazione Supabase effettiva e
rilascio sono fasi separate. V01–V20 sono requisiti, non ulteriori venti step.

Percorso scelto: **Node + PGlite 0.5.8, senza Docker**, comune a Web e Admin.
Le suite applicano SQL reale a fixture sintetiche in memoria; lo schema delle
fixture è ridotto e non è una copia certificata dello schema Supabase completo.
I claim e i ruoli dei test SQL sono impostati dalle fixture, non da PostgREST.
I test server eseguono moduli reali con dipendenze/trasporti controllati; anche
i casi con SDK effettivo usano risposte sintetiche. Il rendering React statico
non dimostra idratazione, interazioni DOM o accessibilità con lettore schermo.
La prova [16C](16c-browser-anonimo.md) aggiunge il browser reale **soltanto per
login e ingressi anonimi**, su copia isolata con servizio Auth sintetico; non
estende la copertura alle pagine autenticate o a Supabase reale.
La prova [16D](16d-produzione-locale.md) ripete il perimetro anonimo su build
Turbopack e `next start`, verificando anche HTML e asset client compilati;
non attesta un deploy, HTTPS/CDN o sessioni valide.
La prova [16E](16e-shell-sessione.md) aggiunge shell e sessioni autenticate
**sintetiche** con SDK e guardie effettivi. Non verifica Auth/PostgREST reali,
Home completa, Annunci o Registro nel browser.

La prova [16F](16f-home.md) aggiunge gli otto gruppi della Home autenticata:
streaming, grafici, refresh, errori, vuoti, tastiera/mobile e revoca, sempre con
servizi sintetici. Le prove locali terminano con 16H; servizi reali e rilascio
restano separati e non vengono attestati dalla sola chiusura locale.

La prova [16G](16g-annunci.md) aggiunge dieci gruppi Annunci: lista, filtri e
History, undici anteprime, consenso esterno, moderazione/cestino, errori e due
CSV nativi desktop/mobile, UI mobile e revoca letture/scritture. RPC e audit del
browser sono modellati in memoria; concorrenza/atomicità SQL non sono attestate.

La prova [16H](16h-chiusura-locale.md) conclude il percorso locale: otto gruppi
Registro/chiusura e tre controlli tecnici sulla build di produzione, header
autenticati, renderer differito e recupero da chunk fallito. Chrome ha escluso
la BFcache con motivi registrati: il ripristino nativo rimane non attestato.
Nessuna nuova fase locale viene aggiunta; condizioni esterne finite nella scheda 16H.

La colonna «Non eseguito» rimane aperta anche se tutte le prove locali passano.
Nessun residuo degli step 03–15 viene eliminato o promosso a superato soltanto
perché PGlite non richiede Docker. I dettagli originali restano nelle rispettive
schede e nella checklist completa dello step 16.

## Requisiti, copertura locale e limiti

### Evidenza esterna IN03 — 28 ottobre 2026

[IN03](../../integrazione/03-accettazione-auth.md) è Concluso nel suo perimetro:
30 controlli contro Auth/PostgREST del progetto `nsytraextbndfyprwzts` e le app
locali in development. In V01/V03/V05 sono ora provati cookie distinti,
isolamento bidirezionale dei logout con sessioni autentiche, rinnovo reale,
revoca con JWT ancora temporalmente valido e indipendenza di due sessioni
Admin. In V04/V05 sono riscontrati audit persistenti di login negato/riuscito
e logout, letti attraverso Registro lista/dettaglio. V02 riceve i dinieghi
anonimi, tecnici e di un'identità Auth senza mapping, attraverso RPC e tre API.
L'identità temporanea autorizzata è stata revocata e cancellata con verifica.

Non sono attestate tutte le varianti di ruolo/email o un utente ordinario
con registrazione completa; il login Web password è stato eseguito dal client
Auth, mentre i logout sono quelli reali delle app. La Web riconosce sul server
il viewer sintetico senza mapping. Nessun deploy/HTTPS/CDN, Storage, test del
gate del sito, attivazione cestino, Cron o ripristino completo è compreso.
Le righe seguenti mantengono i limiti generali: IN03 non conclude lo step 16.

| ID / step | Requisito e prove locali | Suite di riferimento in `tests/` | Non eseguito / limite |
| --- | --- | --- | --- |
| V01 · 01–02 | Confini Web/Admin, route protette, cookie separati, header/noindex e assenza di link pubblici; build Admin e HTML anonimo private/no-store in produzione locale, sentinella assente dagli asset client; 16H conferma build aggiornata e header autenticati Home/Registro/API Registro | `admin-web-boundary`, `admin-dashboard`, `admin-auth-server`, [16D](16d-produzione-locale.md), [16H](16h-chiusura-locale.md) | Deploy Vercel, host effettivi, cache HTTPS/CDN, altre pagine autenticate in produzione e limiti della scansione sentinella |
| V02 · 03 | Accesso soltanto con `tipologia_utente` esattamente `Admin`; varianti, utente ordinario, mapping assente e account non ammessi negati; ruolo non modificabile dai writer ordinari | `admin-authorization-database`, `admin-auth-server` | Varianti ruolo/email e utente ordinario registrato contro gateway; ACL completo oltre al perimetro strutturale e alle chiamate IN03 |
| V03 · 03 | Sessione e policy non attestate negate; scadenza, revoca e limiti della policy nei dati sintetici | `admin-authorization-database`, `admin-auth-server` | Scadenza naturale e limiti temporali non configurati nel progetto; rinnovo/revoca/isolamento effettivi provati in IN03, impostazioni confrontate in IN02 |
| V04 · 04 | Audit privato, ACL/RLS, payload proiettati, successo atomico e fallimento dopo rollback; limite di dodici mesi di calendario | `admin-audit-database`, `admin-audit-bridge-database`, `admin-audit-server` | ACL preesistenti completi, ruolo tecnico assegnato dal gateway, scheduler/Cron installato e prima esecuzione retention |
| V05 · 05 | Login subordinato all'audit, client umano/tecnico distinti, timeout e risposte incerte; browser con commit dopo audit, diniego/revoca e logout normale/degradato; scadenza dei singoli chunk con header Next reali | `admin-auth-server`, `admin-auth-interface`, `admin-session-fixture`, [16E](16e-shell-sessione.md) | Revoca globale tramite operatore, guasti Auth/audit reali, HTTPS/cookie Secure e deployment; login/rinnovo/logout e audit persistenti riusciti in IN03, audit 16E solo in memoria |
| V06 · 05–06 | Form accesso e skeleton nel rendering; browser login dev/produzione locale; shell desktop/compatta/mobile, tredici voci, dieci pagine future, skip link, tooltip, focus e logout; Home/Annunci/Registro desktop/mobile e fix pulsanti-link; fix icone coperte nella sidebar compatta | `admin-auth-interface`, `admin-dashboard`, [16C](16c-browser-anonimo.md), [16D](16d-produzione-locale.md), [16E](16e-shell-sessione.md), [16F](16f-home.md), [16G](16g-annunci.md), [16H](16h-chiusura-locale.md) | Lettore schermo e boundary globali; deployment/HTTPS; apertura esterna resta in V07 |
| V07 · 06 | Apertura esterna subordinata alla conferma; browser con AlertDialog sopra Sheet, annullamento/focus, tastiera/Control+click/click centrale, nuova scheda loopback e opener nullo | `admin-external-navigation`, [16G](16g-annunci.md) | Menu nativi, popup bloccati, lettore schermo e altri browser/dispositivi |
| V08 · 07A–08 | Liste fino a 30 righe, lookahead/cursori a microsecondi, ricerca/filtri, URL, abort e risposte superate; browser History/back/forward/reload, filtro-cursore e ricerca lenta senza perdita dello spazio | `admin-announcements-database`, `admin-announcements-server`, `admin-annunci-interface`, [16G](16g-annunci.md) | PostgREST, BFcache effettivo, piani e durata indice su volumi reali |
| V09 · 07B–08 | Dettaglio su richiesta per undici tipi; nome pubblico/anonimo, contatti e media proiettati, URL validati, bigint e fingerprint delle relazioni; browser undici anteprime, fallback, skeleton/errori/404 e focus | `admin-announcement-detail-database`, `admin-announcement-detail-server`, `admin-annunci-interface`, [16G](16g-annunci.md) | Schema completo/unicità figli, payload gateway effettivi e download/embed di media reali |
| V10 · 09 | Approva/rifiuta/oscuramento/ripristino; motivo, snapshot, versione dopo lock, protezione writer e audit/notifiche; browser con azioni, conferme, capacità negate, conflitto/esito incerto simulati e revoca prima della scrittura | `admin-moderation-database`, `admin-moderation-server`, `admin-moderation-interface`, [16G](16g-annunci.md) | Connessioni indipendenti realmente concorrenti, gateway, lock NOWAIT su pagamenti/figli e audit/notifiche effettivi |
| V11 · 10 | Cestino recuperabile, hold dopo ripristino, gate inizialmente falso, filtri e consumatori Web/RPC compatibili; browser con gate soltanto sintetico, motivo interno e restore oscurato | `admin-trash-database`, `admin-moderation-server`, `admin-moderation-interface`, `metadata`, `profile-details`, `notifiche`, [16G](16g-annunci.md) | Storage/policy reali, cache pregresse/signed URL, concorrenza pagamenti e attivazione controllata del gate |
| V12 · 11 | Export massimo 30 righe correnti/ordinate, rilettura e audit atomico nelle fixture SQL; browser POST/cookie e due CSV nativi desktop/mobile con byte/ordine/BOM/formule verificati, nessun file su errore. Corretto Origin contro Host reale invece dell'authority interna Next, mantenendo diniego cross-origin | `admin-export-database`, `admin-export-server`, `admin-export-interface`, [16G](16g-annunci.md) | Import Excel/LibreOffice, hardware mobile/altri browser, gateway/audit effettivi e deployment HTTPS/proxy |
| V13 · 12 | Registro read only, tre colonne informative, filtri/cursori, limite 30, identità verificata/UUID e dettaglio su richiesta; browser di produzione con date Europe/Rome, History/reload, 37 eventi su due pagine, sei varianti dettaglio, skeleton/errori/rimozione modellata, focus/Sheet/mobile e revoca | `admin-audit-reads-database`, `admin-audit-reads-server`, `admin-audit-reads-interface`, [16H](16h-chiusura-locale.md) | Gateway Auth/PostgREST, retention concorrente e misure SQL end-to-end; BFcache nativa esclusa da Chrome, motivi registrati |
| V14 · 13 | Popolazione Utente registrata, esclusione cestino, mesi Europe/Rome, denominatori profili distinti, date anomale, coda dalla creazione e profitti non disponibili | `admin-home-database`, `admin-home-server`, `admin-home-http` | Compatibilità schema completo, piani/tempi sul destinatario e scritture concorrenti |
| V15 · 14 | Quattro KPI, azioni rapide, cinque operazioni, blocchi indipendenti; browser con streaming/skeleton, refresh/retry, vuoti, griglia mobile e diniego globale | `admin-home-controller`, `admin-home-interface`, [16F](16f-home.md) | Rinnovo effettivo cookie/Auth, integrazione schema/gateway e lettore schermo; le destinazioni dei link non attestano le pagine dati |
| V16 · 15 | Metrica singola, abort/generazioni e BFcache nei controller; browser aree/pie/barre, denominatori, vuoti, selezioni rapide, resize, tooltip da tastiera e tabelle; renderer richiesto solo dopo dati disponibili anche in produzione, chunk bloccato sulla rete e recupero con ricaricamento completo | `admin-home-charts`, `admin-home-interface`, [16F](16f-home.md), [16H](16h-chiusura-locale.md) | Stress StrictMode, BFcache nativa e lettore schermo non attestati; Chrome ha escluso il Registro per no-store e contesto di navigazione |
| V17 · 08–15 | Numero costante di richieste simulate, nessun N+1 o polling introdotto; Home browser con delta di una sola RPC nel blocco aggiornato; Registro con una RPC per dettaglio e nessuna nuova chiamata nella finestra inattiva osservata | Suite server/controller delle singole feature, [16F](16f-home.md), [16H](16h-chiusura-locale.md) | Latenza, carico, scansioni, contesa e conteggio delle chiamate sulla rete reale; PGlite e fixture HTTP non sono benchmark remoti |
| V18 · Web | Pubblicazione, profili, categorie, regioni, codici invito, interazioni, interessi, notifiche e metadata con le migrazioni/adapter esistenti | Suite Web `*-database`, `*-migration`, validazione e interfaccia; intera suite root | Checkout/webhook Stripe reali in test, Storage, cache esterne e schema completo; nessun servizio esterno coinvolto |
| V19 · 16A | Motore root obbligatorio e versione fissa, discovery deterministica, concorrenza quattro file, percorsi con spazi, exit code/errori e preflight senza dipendenza | `test-runner` e tutte le suite SQL migrate al loader comune | Nessuna installazione completa `npm ci` distruttiva eseguita nel workspace condiviso; lockfile e risoluzione del pacchetto verificati |
| V20 · 16 | Ordine migrazioni, configurazioni Auth/Vercel, backup, compatibilità Web/Admin, attivazione gate/retention e recupero | [Runbook 16B](runbook-rilascio-recupero.md) preparato e confrontato con migrazioni/script/configurazioni; documenti degli step | Consegna documentale conclusa; nessuna applicazione/verifica remota, backup, ripristino o deploy eseguiti |

I nomi delle suite omettono il suffisso `.test.mjs`; sono eseguite da `npm test`
dalla root. L'elenco viene scoperto a ogni avvio, senza mantenere una lista
parziale separata per la dashboard.

La suite `admin-browser-runner.test.mjs`, inclusa nel comando Node, verifica
isolamento, servizio sintetico e processi; **non avvia Chrome**. Le interazioni
browser sono eseguite separatamente con `npm run test:browser:admin` e i loro
risultati effettivi sono registrati nelle schede 16C e 16D (variante
`npm run test:browser:admin:production`). Gli esiti delle esecuzioni
interrotte o fallite non sono attestazioni di successo.

### Evidenza browser 16C — conclusa, perimetro anonimo

**11 gruppi di controlli superati** con Chrome headless 155, Next 16.3.4 dev/
Webpack e CLI 1.12.0. Copertura aggiuntiva per V01/V02/V05/V06: form a 1440×900
e 390×844, tastiera/focus ed Eye/EyeOff, validazione senza chiamate Auth,
pending, errori sintetici e recupero; navigazione delle 13 rotte fino al login,
7 API negate senza dati, nessuna sessione valida emessa o errore di idratazione
rilevato. Report/screenshot nella [scheda 16C](16c-browser-anonimo.md).

Sulle pagine il redirect può essere HTML in streaming con status 200 e meta
refresh, verificato nel browser. L'HTML dev osservato ha `no-cache, must-revalidate`
per override Next: 16C non attesta private/no-store per l'HTML di produzione;
il successivo controllo anonimo locale è registrato in 16D, sotto.
Noindex sulle pagine e private/no-store sulle API sono verificati localmente.
Questo non conclude V01–V06 nel loro insieme: restano i casi con sessioni valide,
ruoli ordinari/revoca reale, pagine autenticate, HTTPS/produzione e lettore schermo.

Regressione aggiornata: **1.283 test Node riusciti, zero fallimenti/skip**,
inclusi 8 test del tooling browser. Nessun nuovo SQL o accesso al progetto.

### Evidenza produzione locale 16D — conclusa, perimetro anonimo

**14 gruppi superati**: build Admin Turbopack/TypeScript, ispezione di 30 asset
client senza sentinella tecnica e undici controlli browser anonimi con verifica
aggiuntiva del login HTML private/no-store/noindex. Tutte le tredici pagine
protette restituiscono gli stessi header di cache privati; sette API negate.
Screenshot desktop/mobile ispezionati, nessun errore di idratazione rilevato e
cleanup riuscito. Report e limiti nella [scheda 16D](16d-produzione-locale.md).

Questo risolve la verifica dell'HTML anonimo in produzione **locale** rimasta
aperta in 16C. Restano HTTPS/CDN e pagine autenticate. La scansione della
sentinella non certifica un diverso deploy o tutti i possibili segreti; il peso
degli asset non misura il download iniziale né il lazy loading dei grafici.
Regressione aggiornata: **1.286 test Node riusciti, zero fallimenti/skip**,
inclusi **11 test** del runner browser. Nessun codice delle app, SQL o env
originale modificato; nessuna applicazione sul progetto reale.

### Evidenza shell/sessione 16E — conclusa, servizi sintetici

**15 gruppi browser superati**, SDK/guardie/Server Actions effettivi e JWT
ES256/JWKS locali: login ordinario negato anche con metadata Admin, audit prima
del commit, redirect/reload, revoca simulata di ruolo/sessione e diniego API,
sidebar desktop/compatta/mobile, dieci pagine future e logout normale/degradato.
Rimossi tutti i chunk Admin preservando il cookie Web sintetico. Corretti sia
il nome delle scadenze cookie negli header Next sia le etichette invisibili
che intercettavano i click. Dettagli e report nella [scheda 16E](16e-shell-sessione.md).

**1.293 test Node riusciti, zero fallimenti/skip**, inclusi sei della nuova
fixture e una regressione con `NextResponse` reale. Typecheck Admin, lint e CSS
riusciti; cleanup confermato. Nessun nuovo SQL, dipendenza o env modificato,
nessuna applicazione sul progetto reale. I checkpoint console non rilevano
errori di idratazione; gli avvisi Base UI dei pulsanti-link Home sono riportati
come residuo da affrontare in 16F, non come problema risolto.

La prova aggiunge copertura parziale a V01–V06, senza chiuderli integralmente.
Audit soltanto in memoria, RPC/ruoli controllati dalla fixture HTTP: non sono
evidenze dell'Auth/PostgREST effettivo o della persistenza SQL. Home completa,
tabelle, rinnovo token, HTTPS/CDN e servizi reali restano non eseguiti.

### Evidenza Home 16F — conclusa, servizi sintetici

**Otto gruppi browser superati**, con contenuti e destinazioni, streaming
indipendente, quattro metriche, aggiornamenti senza richieste agli altri
blocchi, selezioni rapide, vuoti, tre errori/retry, tastiera/tooltip/mobile e
revoca con rimozione della Home e API 403 private/no-store senza dati.
Renderer HomeCharts assente con dati indisponibili e scaricato dopo il recupero
sulla rete dev. Quattro screenshot ispezionati; corretti i tre pulsanti-link
Base UI. Report, prove interrotte e limiti nella [scheda 16F](16f-home.md).

**1.298 test Node/PGlite riusciti su 89 file, zero fallimenti/skip**, inclusi
quattro nuovi test fixture Home e una guardia degli scenari browser. Typecheck
Admin e lint riusciti; cleanup confermato. Nessun SQL, dipendenza o env
modificato, nessun servizio reale o build di produzione avviato. Bundle e
chunk fallito restano in 16H; Supabase/HTTPS/CDN e lettore schermo non attestati.

### Evidenza Annunci 16G — conclusa, servizi sintetici

**Dieci gruppi browser superati** su copia dev/Webpack e un solo Chrome
isolato: lista/filtri/History, undici anteprime, consenso esterno, moderazione,
cestino, conflitti/esiti incerti, due CSV effettivi, mobile e revoca. Corretti
due difetti applicativi: falso 403 dell'export per localhost interno Next e
spazio rimosso dal debounce mentre si digita lentamente. Sei screenshot e due
file da 3.767 byte ispezionati; nessuna sessione o richiesta trattenuta residua,
cleanup riuscito. Report e prove fallite nella [scheda 16G](16g-annunci.md).

**1.307 test Node/PGlite su 90 file riusciti, zero fallimenti/skip**, typecheck
Admin e lint riusciti. RPC e audit del browser sono in memoria, non prove SQL
di concorrenza/atomicità. Nessun SQL, dipendenza, env, gate reale, servizio
Supabase, build di produzione o deploy modificato/eseguito. Al termine di 16G
restava **solo 16H**, ora concluso nell'evidenza seguente; integrazione effettiva
e rilascio restano separati.

### Evidenza Registro e chiusura locale 16H — conclusa

**Otto gruppi browser e tre controlli tecnici di produzione riusciti**, report
`.local/dashboard-browser/run-EJDoLf/evidence/report.json`. Registro con limite
30, filtri/date Europe/Rome, cursori a microsecondi e UUID a parità, History,
sei varianti dettaglio, skeleton/vuoti/errori/rimozione modellata, tastiera e
mobile. Revoca: dati rimossi, API 403 privata senza dati, logout e pulizia locale.

Build Turbopack/`next start`, 30 asset client (29 JS, **1.588.030 byte**) senza
chiave server sintetica. Header privati/no-store/noindex anche su Home e
Registro autenticati e API Registro. Renderer differito in produzione, chunk
bloccato due volte sulla rete e recuperato tramite il pulsante Ricarica pagina;
KPI/attività preservati, due SVG presenti dopo recupero. Console coerente con
i guasti intenzionali, senza errori di idratazione o avvisi dei pulsanti-link.

**BFcache: ripristino nativo non attestato.** Chrome esclude il Registro con
`MainResourceHasCacheControlNoStore`, `JsNetworkRequestReceivedCacheControlNoStoreResource`
e `BrowsingInstanceNotSwapped`; nessun `pageshow.persisted=true`. Il ritorno
ordinario effettua una nuova RPC lista. L'osservazione è riuscita, il ramo
nativo resta aperto per un contesto idoneo, senza ridurre le protezioni cache.

**1.312 test Node/PGlite su 91 file riusciti, zero fallimenti/skip**; typecheck
Admin, lint e 28 test mirati di runner/fixture riusciti (già inclusi nel totale).
Sei screenshot ispezionati; i 146 file src/public della copia finale coincidono
con gli originali. Cleanup confermato per tutti i tentativi, nessun processo
residuo dei percorsi dedicati. Nessun codice delle app, SQL, dipendenza o env
modificato, nessuna operazione remota, Docker o deploy.

**Verifiche locali terminate.** Lo step 16 resta Da terminare per le condizioni
esterne. La [scheda 16H](16h-chiusura-locale.md) consegna sei gruppi finiti di
condizioni per integrazione e rilascio; nessun 16I o ulteriore sottopasso locale.
Operazioni manuali ora: nessuna. Prossima fase separata: **integrazione Supabase
nell'ambiente di test autorizzato — 6.1 Sol, high**.

## Applicazioni e verifiche esterne

**IN01 — ricognizione Conclusa.** L'utente ha confermato che il progetto
Supabase già usato da `apps/web` contiene soltanto propri dati di prova. È il
destinatario identificato: **Webapp Bacheca Dilettanti**, ref
`nsytraextbndfyprwzts`, forniti dall'utente dal pannello e associati ai due report.
Il primo report cataloghi è stato ricevuto
in chat: PostgreSQL 17.6, operatore `postgres`, READ ONLY, 25 ottobre 13:23 UTC.
M01 coerente nei controlli strutturali: nove hash di funzione riprodotti,
trigger/vincolo account e privilegi attesi. Marcatori M02–M10 assenti; non è
una certificazione dell'intera catena né un test funzionale Auth/PostgREST.
Lo [script di ricognizione](../../../../supabase/scripts/dashboard_admin_inspect_baseline.sql)
è preparato e verificato su PGlite; la [guida IN01](../../integrazione/01-ricognizione.md)
riporta anche la cronologia ricevuta alle 13:35 UTC: sette versioni distinte,
tutte corrispondenti ai file locali, READ ONLY, risultato non troncato.
M01 non registrata nonostante i riscontri strutturali; M02–M10 senza versioni
né marcatori. Le 70 versioni locali non registrate non autorizzano replay o
riparazioni automatiche. Nome/ref acquisiti completano la ricognizione:
nessuna operazione manuale residua IN01. Prossimo step M02 foundation audit,
con preparazione dei controlli e precondizioni operative prima dell'applicazione.

**1.320 test Node/PGlite su 92 file riusciti, zero fallimenti/skip**, inclusi
otto nuovi test della ricognizione; lint riuscito. Script con `READ ONLY`,
timeout locali e `ROLLBACK`, cataloghi e hash senza righe applicative o corpi
delle funzioni, privilegi effettivi e presenze parziali; cronologia soltanto
versioni, con limite esplicito. Nessuna connessione SQL al progetto eseguita
dall'agente; il riscontro esterno proviene dal report fornito dall'utente.
La chiusura della ricognizione IN01 non certifica prove funzionali o rilascio V01–V20
e non aggiunge un sottopasso 16I.

M03–M10 restano **preparate e provate nelle fixture**, con marcatori assenti
nel report IN01. M02 ha ora il controllo finale strutturale positivo descritto
sotto. La precedente dichiarazione di applicazione della
foundation M01 è ora corroborata dai controlli strutturali del report, senza
attestazione funzionale. Discrepanza con la cronologia documentata: conservare
M01 senza replay né modifica automatica dei registri; restano da verificare i
prerequisiti prima delle candidate M02–M10. Policy sessione, provisioning Admin, gate cestino e
scheduler retention non vengono eseguiti da `npm test`.

**M02 — Concluso nel registro operativo: applicata/verificata strutturalmente e copia manuale successiva verificata.** Preparati [guida di applicazione](../../integrazione/02-audit.md)
e [controllo cataloghi prima/dopo](../../../../supabase/scripts/dashboard_admin_check_m02.sql),
con verifica della guardia M01, quattro funzioni M02, tredici colonne,
cinque vincoli CHECK/PK, quattro indici compreso il primario, RLS e privilegi
effettivi anche ereditati per colonna. Migrazione esistente invariata.
**124 test mirati riusciti, zero fallimenti/skip**, inclusi cinque nuovi test;
lint riuscito. È una verifica aggiuntiva mirata, non una nuova esecuzione
della regressione completa IN01 di 1.320 test sopra riportata.
Controllo iniziale sul progetto superato, report utente del 25 ottobre
14:16:30.275025 UTC, operatore `postgres`, PostgreSQL 17.6, READ ONLY:
`ready_for_m02_catalog_checks_only`, prerequisiti/guardia M01 coerenti,
nessun oggetto M02 presente. I controlli M02 falsi sono previsti prima della
migrazione. Ricevuto anche il report finale delle **14:21:04.807294 UTC**:
`m02_structurally_verified`, nove oggetti presenti, tutti i controlli veri,
quattro hash di funzione corrispondenti e nessun EXECUTE API sugli helper.
Piano **Supabase Free** confermato dall'utente: niente Database Backups automatici
o PITR. Preparata la [copia manuale](../../integrazione/backup-free.md) con client
PostgreSQL 17 portabili, script PowerShell e controlli dell'intero archivio.
Undici test sintetici aggiuntivi riusciti, zero fallimenti/skip, ESLint riuscito;
nessuna nuova regressione completa. Client reali 17.11 verificati e file corrotto
rifiutato dal vero `pg_restore` locale, senza connessioni al progetto.
Prima esportazione utente ricevuta, 25 ottobre 18:10 UTC: connessione, dump,
ruoli, indice e lettura completa positivi, copertura fermata dalla falsa richiesta
di una voce CREATE public. Verificatore corretto, 16 test mirati e lint riusciti;
copertura di tabelle e dati ancora obbligatoria. Indice locale dell'archivio
utente positivo sulle cinque tabelle richieste; nessuna riga applicativa letta.
Ricevuto il secondo riepilogo utente, completato il **25 ottobre alle 18:20:16.8173260 UTC**:
`archive_verified_restore_untested`, sei controlli veri, nessun errore,
`database.dump` 2.275.263 byte e `roles.sql` 5.956 byte, con SHA-256 registrati
nella guida Free. Checkpoint dopo M02 e prima di M03, registro M02 Concluso,
nessun'altra operazione manuale M02. Un archivio leggibile non attesta
un ripristino completo né chiude V20; Storage binario e configurazioni esterne
richiedono copertura separata. Nessuna prova
Auth/PostgREST, attivazione Cron o applicazione remota dell'agente attestata;
l'applicazione M02 è riscontrata dai cataloghi forniti dall'utente.

**M03 — Concluso nel registro operativo:** [guida](../../integrazione/03-audit-backend.md) e
[verificatore cataloghi](../../../../supabase/scripts/dashboard_admin_check_m03.sql)
per le due funzioni del ponte backend. Include prerequisiti M01/M02 e dipendenza
JWT, owner/hash/search_path, invoker/definer, privilegi effettivi ed ereditati,
overload inattesi, PUBLIC EXECUTE privato e USAGE tecnico. READ ONLY, nessun
evento letto/scritto o helper chiamato. **211 test mirati riusciti**, zero
fallimenti/skip, inclusi sei nuovi; lint riuscito. Migrazione esistente invariata.
Controllo iniziale utente del 25 ottobre **18:32:15.786651 UTC** positivo:
`ready_for_m03_catalog_checks_only`, prerequisiti M01/M02 coerenti,
`m03_named_objects=0`, entrambe le funzioni assenti come previsto. Report finale
utente del **25 ottobre, 18:34:27.052344 UTC** positivo:
`m03_structurally_verified`, `m03_named_objects=2`, tutti i controlli booleani
veri, hash corrispondenti ed EXECUTE vero solo a service_role tra i ruoli API
verificati. M01/M02 coerenti, PUBLIC EXECUTE privato assente. Applicazione e
confronto strutturale riscontrati; nessuna operazione manuale residua M03;
nessuna nuova connessione o mutazione remota, nessuna attestazione gateway/Auth,
esposizione Data API o Cron. La copia Free delle 18:20 resta il checkpoint.

**M04 — Concluso nel registro operativo:** [guida](../../integrazione/04-elenco-annunci.md) e
[controllo cataloghi prima/dopo](../../../../supabase/scripts/dashboard_admin_check_m04.sql).
Prerequisiti M01–M03, 52 colonne su dieci tabelle, due funzioni STABLE con owner,
hash LF/CRLF, search_path/timezone, invoker/definer e privilegi effettivi/ereditati;
indice esatto sulla tabella corretta, pronto e valido. Impronte di owner, grant
tabella/colonna, colonne/default, RLS e policy confrontate tra i due report;
nessuna lettura di annunci o dati applicativi e nessuna invocazione della lista.
**297 test mirati riusciti**, zero fallimenti/skip, sette nuovi; lint riuscito.
Testata la migrazione con impronte invariate e il rilevamento delle variazioni
di grant/RLS/policy. Migrazione esistente invariata. Report iniziale utente del
**25 ottobre, 18:52:10.766058 UTC** positivo: prerequisiti M01–M03 coerenti,
52 colonne corrispondenti, zero oggetti M04 e dieci impronte delle protezioni
conservate. Report finale utente del **25 ottobre, 18:55:18.489359 UTC**:
`m04_structurally_verified`, tre oggetti M04, tutti i controlli booleani veri,
hash attesi e EXECUTE solo ad authenticated tra i ruoli API verificati.
Confronto separato: **10/10 tabelle identiche, zero differenze** nelle quattro
impronte, owner, RLS e privilegi effettivi. Evidenza locale
`.local/dashboard-integration/m04-protection-comparison-20261025T185518Z.json`.
`limits.table_protections_compared=false` resta invariato nel report SQL originale;
il confronto riuscito è registrato separatamente. Nessuna operazione manuale
residua M04, nessuna nuova esecuzione SQL o test applicativo per questa chiusura.
Nessuna attestazione gateway, Data API o funzionale derivata dal solo catalogo;
ripristino completo e V20 restano aperti. Chiusura M05 descritta sotto.

**M05 — Concluso nel registro operativo:** [guida](../../integrazione/05-dettaglio-annunci.md) e
[verificatore prima/dopo](../../../../supabase/scripts/dashboard_admin_check_m05.sql)
pronti. **379 test mirati riusciti**, zero fallimenti/skip, undici del verificatore; lint
riuscito. Verificati prerequisiti M01–M04, sei funzioni con firme/hash LF/CRLF,
owner, settings, invoker/definer ed EXECUTE effettivi, 166 colonne su 25 tabelle
e undici unicità valide/pronte/immediate, non parziali né basate su espressioni.
Tipi aggiuntivi compatibili dichiarati nel report, senza dedurre il DDL storico
completo dai tipi TS. Quattro helper interni negati a tutti i ruoli API;
authenticated ammesso solo a wrapper e ponte, con controlli interni Admin.
Coperti installazioni parziali/overload, drift di definizioni e privilegi,
USAGE mancante, colonne/tipi/unicità errati, variazioni delle protezioni e
assenza di righe/dati sintetici nel report. Migrazione esistente invariata.
Ricevuto report del 25 ottobre, 19:08:28 UTC: zero oggetti M05 e undici unicità
valide, 160/166 colonne corrispondenti. Corretti sei falsi negativi del
verificatore: date dei periodi di Squadra cerca staff/partita e time senza fuso
degli orari partita. Nessun cambio a schema/migrazione/DTO; report originale
conservato. Nuovo report iniziale del **25 ottobre, 19:16:35.949046 UTC** positivo:
`ready_for_m05_catalog_checks_only`, prerequisiti M01–M04 coerenti, 166/166 colonne
corrispondenti, undici unicità valide e zero oggetti M05. Report completo e
protezioni delle 25 tabelle conservati localmente per il confronto finale.
Report finale utente del **25 ottobre, 19:19:12.973538 UTC**:
`m05_structurally_verified`, sei funzioni presenti con hash attesi e tutti i
controlli booleani veri. Quattro helper negati ai ruoli API, authenticated
ammesso solo a wrapper/ponte tra i ruoli API verificati.
Confronto separato: **25/25 tabelle identiche, zero differenze** nelle quattro
impronte, owner, RLS e privilegi effettivi. Evidenza locale
`.local/dashboard-integration/m05-protection-comparison-20261025T191912Z.json`.
Il report SQL originale mantiene `limits.table_protections_compared=false`;
il confronto riuscito è registrato separatamente. Nessuna operazione manuale
residua M05, nessuna nuova esecuzione SQL o test applicativo per questa chiusura.
Gateway/Auth/Data API, autorizzazione funzionale e restore completo restano
non attestati da questo confronto; copia Free delle 18:20 acquisita separatamente.
V20 aperto. Preparazione M06 descritta sotto.

Tre nuove regressioni della correzione M05: prima/dopo con tutte le sei colonne
temporali native e protezioni invariate; SQL → DTO con date, null, secondi e
frazioni sotto DateStyle ISO/German; rifiuto di timestamp/time con fuso e di
tipi temporali nei campi testuali estranei. Nessuna modifica alla migrazione.

**M06 — Concluso nel registro operativo:** [guida](../../integrazione/06-moderazione-annunci.md)
e [verificatore prima/dopo](../../../../supabase/scripts/dashboard_admin_check_m06.sql).
**458 test mirati riusciti**, zero fallimenti/skip, otto nuovi del verificatore;
lint riuscito. Migrazione esistente invariata. Il controllo comprende M01–M05,
185 colonne su 27 tabelle, undici unicità dei dettagli e chiave delle ricevute.
Verifica nove nuove funzioni, sedici trigger e il flag amministrativo (26 oggetti),
oltre alle tre sostituzioni previste delle funzioni dettaglio/pagamento.
Prima/dopo vanno confrontate tutte le 27 protezioni normalizzate, i 27 metadati
invarianti di indici/vincoli/trigger e la protezione della funzione pagamento.
Sono esclusi dalle impronte soltanto nuovo flag e sedici trigger previsti,
verificati separatamente. Corpo pagamento e due corpi M05 hanno versioni
iniziali/finali esplicite; non riapplicare M05 dopo le sostituzioni previste.
Nessuna riga o funzione applicativa/pagamento/audit/Cron acceduta dall'ispettore.
Report iniziale completo del **26 ottobre, 09:45:00.918396 UTC** positivo:
`ready_for_m06_catalog_checks_only`, prerequisiti coerenti, 185/185 colonne,
chiave ricevute valida e zero oggetti M06. Report, 27 protezioni e 27 metadati
conservati localmente. Report delle **09:49:06.820357 UTC** dopo applicazione:
tutti i 26 oggetti attesi coerenti, undici funzioni elencate con `after_matches=true`,
flag e sedici trigger corrispondenti. Confronto separato: 27/27 protezioni e 27/27
metadati identici, protezione pagamento invariata. Stato originale
`m06_partial_or_drift_require_review` conservato: conteggio routine inatteso,
inventario effettivo ancora da acquisire. Verificatore aggiornato senza allentare
i criteri finali; aggiunti numero e firme inattese, anche procedure/aggregati.
81 test mirati e lint riusciti, due nuove regressioni, zero fallimenti/skip.
Gateway, concorrenza reale e rilascio non attestati dai test PGlite. Azione manuale
corrente aggiornata dal report delle **09:57:05.557687 UTC**: dodicesima routine
identificata nella firma pagamento a otto argomenti, già presente nel backup M02
con hash corpo/ACL identici. Lettura schema-only della singola funzione da archivio
verificato, nessuna riga/restore. Riprodotto rollback della ricevuta sotto hold:
M06A integrativa preparata per conservare oscuramento e motivo sulla vecchia firma.
Verificatore versione 3 riconosce solo la firma esatta, esigendo il nuovo hash
per la chiusura; altre firme inattese ancora negate. **464 test mirati riusciti**,
zero fallimenti/skip, quattro nuovi legacy inclusi; lint riuscito.
Ricevuto il report finale completo delle **10:27:00.881719 UTC**, versione 3:
`m06_structurally_verified`, 26 oggetti attesi e dodici routine corrispondenti,
nessuna firma inattesa, M06A riscontrata dal corpo legacy corretto. Confronto
finale separato: **27/27 protezioni e 27/27 metadati identici**, protezione
pagamento a dieci argomenti e ACL legacy invariati. Report originale con i
propri limiti falsi conservato, confronto positivo documentato separatamente.
Nessuna operazione manuale residua M06, nessun replay M06/M06A/M05. Nessun nuovo
SQL remoto o test applicativo per la sola chiusura documentale; file SQL invariati.
Copia Free precedente acquisita separatamente, restore non provato. M07 non
avviato al momento della chiusura M06.

**M07A — Concluso, inventario iniziale:**
[guida](../../integrazione/07-cestino.md) e
[script READ ONLY](../../../../supabase/scripts/dashboard_admin_check_m07.sql)
invariati; report completo delle 11:25:16 UTC acquisito, zero oggetti M07.
Trentatre tabelle presenti e 17 routine su 15 nomi presenti dei 16 monitorati;
due firme sia per pagamento sia per checkout session, snapshot profilo assente,
figlio generico presente. Baseline M06/M06A ancora coerente; confronto esterno
di 27/27 protezioni e 27/27 metadati identici, zero differenze. Estratto selezionato
con provenienza e confronto separato in .local; limiti originali conservati falsi.
Nessuna operazione manuale residua M07A. Il JSON non attesta compatibilità dei
corpi, stato del gate o autorizzazione alla migrazione. M07B Concluso come
descritto sotto; applicazione M07C e attivazione separate, M08 non avviato.
M07 complessivo Da terminare; V11 e rilascio restano aperti.

**M07B — Concluso, controlli e checkpoint iniziale acquisiti:**
[nuovo verificatore prima/dopo](../../../../supabase/scripts/dashboard_admin_verify_m07.sql),
[confronto su 33 tabelle](../../../../scripts/dashboard-integration/compare-m07-reports.mjs)
e [controllo gate dopo installazione](../../../../supabase/scripts/dashboard_admin_check_m07_gate.sql).
Le 17 definizioni inventariate sono state riprodotte da sole definizioni/ACL
schema-only della copia M02 e sorgenti M04/M06/M06A. Nessuna riga o connessione.
Diciotto versioni finali M07 riprodotte, owner/settings/ACL preservati;
18 trigger consumatori iniziali e 19 finali, nuove firme/trigger fuori inventario
negati, snapshot assente. Prima/dopo conserva tutte le 33 impronte salvo le
sole modifiche intenzionali controllate separatamente. **128 test mirati e lint
riusciti**, quattordici nuovi casi inclusi, due firme pagamento e due checkout.
Difetto preesistente `pg_catalog.greatest` nella firma checkout a sette argomenti
riprodotto prima/dopo, documentato e non corretto implicitamente: verifica
funzionale della vecchia firma ancora aperta prima dell'uso.
Report iniziale del progetto versione 2 delle **12:21:10 UTC** acquisito,
`ready_for_m07_catalog_checks_only`: 17 corpi/protezioni iniziali e 18 trigger
esistenti corrispondenti, nessuna firma/trigger inatteso, zero marcatori M07.
Confronto esterno completato: **33/33 impronte identiche a M07A**, tredici campi
per schema/nome e zero differenze. Estratto selezionato, provenienza e confronto
derivato separato conservati in .local; limiti originali tutti falsi, gate non
letto, stato finale e rilascio non attestati. Nessuna operazione manuale residua
M07B. Test della preparazione conservati, non ripetuti per questa chiusura
documentale; quindici hash invariati verificati. M07C su nuovo prompt, M08 e
attivazione non avviati; V11 e accettazione funzionale restano aperti.

Le verifiche esterne mancanti rimangono condizioni non attestate del rilascio,
senza prescrivere Docker. Il [runbook 16B](runbook-rilascio-recupero.md) distingue
prove di accettazione, operazioni di rilascio e verifiche post-rilascio; non usa
il progetto reale come fixture di test e non dichiara conclusi gli step ancora
incompleti. La verifica documentale 16B non aggiorna gli esiti locali di 16A.

## Esecuzione e risultati

Comandi: `npm test`, `npm run typecheck`, `npm run typecheck:admin`, ESLint sui
test e sul runner, compilazione PostCSS/Tailwind in memoria delle due app,
validazione dei collegamenti Markdown e della risoluzione/lockfile PGlite.
Esiti effettivi e problemi preesistenti nella [scheda 16A](16a-verifiche-locali.md).
La suite Node/PGlite non richiede dev server, build, Docker o accesso Supabase.
Le prove browser separate 16C e 16D avviano rispettivamente il server dev e una
build/server di produzione, sempre su copia isolata con fixture loopback.
