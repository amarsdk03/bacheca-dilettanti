# 16 — Verifica integrata e istruzioni di rilascio

**Stato:** Da terminare  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** Implementazione degli step 03A–15 verificata per 16A; i controlli integrati mantengono i propri prerequisiti, non ancora verificati.

[Master plan](../../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Decisione corrente — una sola task finale

Su richiesta dell'utente del 28 ottobre 2026, il prossimo «procedi» avvia
l'intera [chiusura finale e decisione di rilascio](chiusura-finale.md).
Comprende tutti i residui ancora obbligatori, le relative correzioni, la
verifica del candidato e la consegna operativa. Non creare nuovi sottopassi
o richiedere un nuovo prompt per ciascun controllo. IN02/IN03 e 16A–16H
restano conclusi nei rispettivi perimetri; riutilizzarne le evidenze valide.

La scheda finale fissa i prerequisiti, la lista chiusa di accettazione e i due
esiti consentiti: **Pronto per il rilascio** oppure **blocchi concreti con
azione risolutiva**. Le operazioni che dipendono dalla pubblicazione sono
esplicitamente distinte dai controlli necessari prima del via libera.
Le checklist storiche sotto restano riferimenti di copertura, non un nuovo
conteggio di task o un ordine di ripetizione delle prove già riuscite.

## Percorso scelto e sottopassi

L'utente ha scelto **Node e PGlite, senza Docker**, anche per le verifiche della
dashboard. 03B e il relativo tooling rimangono un'alternativa storica, non un
passaggio da completare obbligatoriamente. Le prove integrate elencate sotto
restano da verificare quando manca una copertura equivalente: non sono
attestate dal solo successo della suite locale.

| Sottopasso | Risultato | Modello e impegno | Stato |
| --- | --- | --- | --- |
| [16A](16a-verifiche-locali.md) | Test locali riproducibili e [matrice delle evidenze](matrice-verifiche.md) | 6.1 Sol, high | Concluso |
| [16B](16b-runbook.md) | [Runbook operativo di rilascio e recupero](runbook-rilascio-recupero.md) | 6.1 Sol, high | Concluso |
| [16C](16c-browser-anonimo.md) | Login e accessi anonimi nel browser locale isolato | 6.1 Sol, high | Concluso |
| [16D](16d-produzione-locale.md) | Build Admin e controlli anonimi in produzione locale isolata | 6.1 Sol, high | Concluso |
| [16E](16e-shell-sessione.md) | Shell e sessione nel browser con servizi sintetici | 6.1 Sol, high | Concluso |
| [16F](16f-home.md) | Home autenticata: otto gruppi browser | 6.1 Sol, high | Concluso |
| [16G](16g-annunci.md) | Annunci: tabelle, dettaglio e operazioni nel browser | 6.1 Sol, high | Concluso |
| [16H](16h-chiusura-locale.md) | Registro nel browser e chiusura locale | 6.1 Sol, high | Concluso |

La sequenza locale termina con 16H. Le successive prove con servizi Supabase
effettivi e il rilascio sono fasi separate; i limiti nella matrice restano
condizioni non attestate, senza aggiungere sottopassi locali indefiniti.

Il completamento di 16A non conclude lo step 16 né gli step precedenti con
residui integrati. Nessuna prova o applicazione sul progetto reale è inclusa.

## Obiettivo e attività

Verificare la prima versione integrata, raccogliere evidenze e preparare istruzioni concrete per rilascio e recupero. Rileggere i requisiti del master e i residui di ogni step; nessun elemento necessario può essere perso tra i documenti.

## Matrice di verifica

- Chiudere i residui rinviati degli step 03–04: schema completo e baseline
  precedente attendibile per la prova della migrazione, Auth/PostgREST/JWT reali,
  rinnovo/revoca e concorrenza, ACL effettivi e advisor, ingressi audit server,
  scheduler installato, attivazione e almeno un'esecuzione riuscita della retention.
  Le fixture PGlite e i test del solo cutoff non sostituiscono questi controlli.
- Per 04B verificare ruolo SQL e claim assegnati dal gateway alla chiave tecnica,
  ACL preesistenti sullo schema `private` dopo il grant `USAGE` a `service_role`,
  schema non esposto e diniego della RPC a tutti i client browser. Confrontare i
  tipi RPC con lo schema completo. Provare separazione fra client tecnico e umano,
  timeout/risposte incerte senza retry, login negato se manca audit e logout con
  pulizia di tutti i chunk Admin indipendente da errori, preservando i cookie Web.
- Login, rinnovo, logout, email non confermata, ordinario, ruolo non esatto, riga mancante, revoca ruolo/sessione e accessi diretti a pagine/azioni/RPC.
- Chiudere i residui 05: browser e deployment HTTP/RSC/Server Actions reali,
  refresh concorrente/scaduto, commit dei cookie dopo audit, errori durante commit
  e pulizia, diniego con policy non attestata, cache effettive e assenza di segreti
  nei bundle/log. Verificare recupero password tramite operatore e revoca globale
  delle vecchie sessioni; il Logout UI mantiene scope locale. SDK con risposte
  sintetiche e rendering statico non sostituiscono queste prove.
- Protezione del ruolo, assenza di privilegi tecnici nel browser, isolamento sessioni/cookie e cache, non indicizzabilità e assenza di collegamenti pubblici.
- Liste/filtri/cursori, limite 30, dettaglio su richiesta, moderazione concorrente, audit atomico e cestino non aggirabile tramite autore/webhook/feed/preview.
- Chiudere i residui 07A: migrazione lista e tipi sullo schema completo, grant e
  policy tabelle invariati, private non esposto, wrapper invoker/ponte definer,
  ruolo SQL tecnico negato anche con claim umani. Provare chiamate PostgREST
  dirette, anonimato/fallback, sei cifre frazionarie e roundtrip cursori. Misurare
  RPC interna, filtri selettivi, ricerca titolo e cursori profondi; il piano della
  sola scansione ordinata e i tempi PGlite non attestano prestazioni end-to-end.
  Misurare anche lock/durata della creazione transazionale dell'indice.
- Chiudere i residui 07B: schema completo e unicità delle undici tabelle dettaglio,
  quattro helper grezzi non eseguibili dai client, wrapper/ponte e sessione umana
  via PostgREST, niente contatti account/Auth IDs. Provare riferimenti a squadre
  anonime/nascoste/istanze sostituite, contenuti incompleti, URI rifiutati, bigint
  e hash completo delle relazioni. Misurare piani interni, payload e costi reali;
  il DTO non autorizza embed/download impliciti. Nello step 09 verificare che il
  confronto sia ricalcolato nella transazione e che anche i writer dei figli
  rispettino la serializzazione: il solo fingerprint di lettura non dà lock.
- Export limitato e sicuro, registro read only, retention a 12 mesi, metriche coerenti e nessun dato finanziario fittizio.
- Tastiera, focus, AlertDialog, Eye/EyeOff, skeleton, errori, mobile e navigazione.
- Chiudere i residui 06 nel browser: sidebar riducibile/tooltip, menu mobile con
  chiusura/focus e footer accessibile, skip link, viewport stretti e overflow,
  loading/error boundary persistenti, Logout compatto anche fallito. Provare link
  esterni con tastiera/modificatori/click centrale, Annulla/Escape e una sola nuova
  scheda dopo conferma, inclusa la Web ufficiale. Rendering statico e handler
  sintetici non attestano comportamento DOM/focus o viewport reali.
- Chiudere i residui 08: pagina Annunci autenticata e route handler con cookie
  rinnovabili, URL condivisi/invalidi, debounce e cronologia Next nativa,
  back/forward/BFcache, assenza di richiesta lista duplicata all'idratazione e
  una RPC funzionale per richiesta. Provare revoca/scadenza durante elenco e
  anteprima, risposte fuori ordine, tastiera e focus Sheet/Select/menu,
  AlertDialog esterno annidato con ritorno al link, viewport/overflow/skeleton.
  Le 32 prove nuove su controller, HTTP sintetico e rendering React statico
  non attestano integrazione Auth/PostgREST, DOM, focus o viewport reali.
- Chiudere i residui 09: migrazione moderazione su schema completo, advisor e
  ACL, due connessioni SQL/Admin realmente concorrenti, lock NOWAIT delle
  ricevute/parent e trigger di tutti i figli, spostamenti e cascata, snapshot
  corrente e conflitti senza duplicazione. Misurare costo su pubblicazione/import.
  Provare priorità/rimborsi/webhook reali in test, preservazione dell'oscuramento
  e audit/notifiche atomici. Un autore non può riattivare il flag neanche passando
  dal writer Web privilegiato o intervenendo dopo la lettura di proprietà.
  Verificare Server Action/cookie/rendering Next, errori dopo commit e rilettura,
  audit di fallimento separato, focus/Escape/Annulla/AlertDialog sopra Sheet,
  viewport e motivazione nel profilo/notifica autore. PGlite seriale e handler
  sintetici non attestano questi comportamenti integrati; deploy Web dopo schema.
- Chiudere i residui 10 secondo [inventario e runbook cestino](../10-cestino.md):
  migrazione con gate inizialmente false, schema completo, policy restrittive e
  writer privilegiati, figli legacy/cascata, pruning/snapshot e regioni revocate.
  Provare autore/URL diretto/metadata/immagini/salvati/profilo/notifiche senza
  contenuti cestinati, pagamento tardivo e rimborsi/scadenza senza rimuovere hold.
  Usare connessioni realmente concorrenti, incluse ricevute/checkout, revoca e
  audit fallito. Confermare cursori v2 e recupero esplicito dei vecchi cursori.
  Distribuire Web e Admin compatibili prima dell'attivazione separata; verificare
  bucket privato e policy/API Storage, purge o scadenza delle vecchie cache
  immagini/sitemap/HTML/RSC e signed URL già emessi. Il nuovo no-store non ritira
  risposte pregresse. Non attestare i tre booleani dello script di attivazione
  senza evidenze integrate. Verificare disabilitazione del gate senza riesporre
  contenuti e senza rollback a vecchi reader privilegiati. Browser/focus/mobile
  e comportamento HTTP/CDN rimangono da provare; PGlite e trasporti sintetici non
  sostituiscono questi controlli.
- Chiudere i residui 11 secondo il [runbook export CSV](../11-export-csv.md):
  migrazione dopo 03–10/04B, schema completo/advisor/ACL e private non esposto;
  snapshot e audit nella RPC umana, nessuna attestazione di successo tecnico.
  Verificare gli ID ordinati e la compatibilità degli eventi storici. Provare
  pagina cambiata, revoca, concorrenza e audit fallito senza file sostitutivo;
  misurare query/cursori e le due verifiche di contesto costanti, senza N+1.
  POST/Origin/cookie/headers/cache reali, download Blob desktop/mobile, tastiera,
  navigazione e risposta persa dopo commit (audit di preparazione, non consegna).
  Import Excel/LibreOffice con BOM, separatore punto e virgola, date Europe/Rome,
  accenti/multilinea e neutralizzazione formule/controlli. Distribuire Admin dopo
  la migrazione; nessun job, storage o variabile env aggiuntivi. Non attivare il
  gate del cestino come effetto collaterale dell'export.
- Chiudere i residui [12 — Registro attività](../12-registro-attivita.md): applicare
  la migrazione di lettura dopo 11 nell’ambiente isolato, verificare ACL/advisor,
  schema private non esposto, Auth/PostgREST e cookie reali. Controllare email
  attuale/UUID e account eliminati, ruolo esatto/revoca su RPC e ponti diretti,
  limiti/filtri/cursori e cambi dell’ora Europe/Rome, retention concorrente e
  assenza di nuovi eventi sulle letture. Browser/focus Sheet, scroll mobile,
  History/BFcache, skeleton/errori/retry e diniego con dettaglio aperto. Misurare
  piani/tempi per email, UUID, intervalli e cursori profondi, includendo guardia
  SSR e verifica funzionale; nessun SELECT API su audit/Auth o client tecnico.
- Chiudere i residui [13 — Dati Home](../13-home-dati.md): migrazione aggregate dopo
  12 nell’ambiente isolato, schema completo, ACL/advisor, Auth/PostgREST e cookie.
  Confrontare la popolazione esatta Utente registrata e l’esclusione del cestino,
  serie Europe/Rome, date anomale, denominatori dei profili e coda dalla creazione.
  Provare revoca e scritture concorrenti; misurare piani/tempi su volumi realistici
  e verificare gli indici prima di aggiungerne. Una RPC per blocco richiesto,
  ultime cinque operazioni senza dettagli/N+1, nessuna query economica o cache
  condivisa che sopravviva alla revoca; header reali private/no-store. Il campione
  PGlite su 6.000 record per tabella non attesta latenza o comportamento remoto.
- Chiudere i residui [14 — Interfaccia Home](../14-home-interfaccia.md): streaming
  Next.js e idratazione con blocchi indipendenti lenti/falliti e diniego durante
  la lettura; rinnovo cookie/header reali. Tastiera e focus del ToggleGroup,
  griglia/scroll mobile, skeleton e messaggi accessibili, BFcache/blocchi tardivi,
  annullamento e pulizia globale su diniego. Confermare guardia e due RPC iniziali
  senza duplicazione all’idratazione, dettagli audit/N+1 o polling, né chiamate
  grafici server anticipati; il montaggio client aggiunge la sola metrica Utenti
  nello step 15. Riprovare dettagli e ritorno focus nel Registro
  dopo l’estrazione della tabella condivisa. Nessuna nuova migrazione per 14.
- Chiudere i residui [15 — Grafici Home](../15-home-grafici.md): verificare nel
  browser idratazione/StrictMode e una richiesta iniziale Utenti; selezione
  rapida, abort, diniego in ciascuno dei tre blocchi, BFcache e retry separato.
  Confermare bundle differito solo con dataset disponibile, nessun Recharts
  per Profitti, recupero da chunk/rete/rendering falliti e nessuna query economica.
  Resize desktop/mobile, tooltip/legenda, etichette con anno, tastiera/focus e
  lettore schermo, tabelle Mostra dati e assenza di overflow. Provare serie
  completamente nulle, distribuzione vuota, coda vuota/date anomale e snapshot
  distinti dai KPI. Nessuna nuova migrazione o configurazione per 15.
- Chiamate su 1 e 30 righe, piani query e tempi su dataset sintetici rappresentativi; nessun N+1, grafici soltanto per selezione.

Eseguire i controlli delle app e dei pacchetti condivisi pertinenti, incluse build di validazione finale se necessarie. Documentare ambiente, fixture, risultati e limitazioni; nessuna prova sui dati reali.

## Consegna operativa

Il [runbook 16B](runbook-rilascio-recupero.md) è preparato: ordine delle dieci migrazioni Admin e baseline Web, compatibilità fra versioni, configurazioni Vercel/Auth, host effettivi ancora da confermare, variabili senza segreti, provisioning Admin, policy sessioni e attivazioni separate di cestino/retention. Include verifiche, registro di applicazione e recupero; nessuna procedura è stata eseguita sul destinatario.

Specificare backup, ripristino e rollback applicativo/database: tornare al deploy precedente non annulla una migrazione e non deve riesporre il cestino. Separare la validazione staging dal rilascio in produzione. Se manca un identificativo o accesso esterno necessario, registrarlo come pendente; non affermare di aver distribuito l'app.

La preparazione del runbook non autorizza automaticamente operazioni sul database reale o pubblicazione. Un rilascio eventualmente richiesto sarà un passaggio esplicito con istruzioni già concrete e reviewabili.

## Criteri di completamento

Prima versione verificata su ambiente sintetico, documentazione e stati aggiornati, runbook completo e nessuna verifica obbligatoria omessa. Eventuali configurazioni di produzione non ancora eseguite risultano elencate come successive operazioni di rilascio, non come prove riuscite.

## Migrazioni e operazioni manuali

Consolidare i percorsi effettivi prodotti negli step precedenti con stato preparato/applicato/verificato per ambiente. Non duplicare SQL nei documenti. Indicare in chiusura ogni applicazione manuale ancora richiesta.

## Avanzamento

16A concluso: **1.275 test riusciti, zero fallimenti/skip**, typecheck Web/Admin
e CSS delle due app riusciti. ESLint sui test/runner: zero errori e un avviso
preesistente; file interessati da 16A senza rilievi. Risultati e limiti nella
scheda 16A e nella matrice. 16B concluso come consegna documentale: percorsi,
ordine, firme e parametri controllati contro i sorgenti; nessuna modifica al
codice o nuova esecuzione della suite applicativa per sole modifiche Markdown.
Nessuna migrazione o script da applicare ora. Lo step 16 resta Da terminare per
le verifiche integrate/browser non eseguite e le configurazioni non attestate.

16C concluso: **11 gruppi browser superati**, login desktop/mobile e tastiera,
validazione/pending/errori sintetici, redirect di tutte le 13 rotte protette e
diniego delle 7 API di lettura senza dati. Nessun errore di idratazione rilevato;
processi isolati arrestati. Regressione completa: **1.283 test, zero fallimenti/skip**,
inclusi 8 nuovi test del runner; lint mirato pulito. Screenshot/report nella
scheda 16C. Il browser usa Next dev/Webpack e nessuna sessione valida: pagine
autenticate, Supabase reale e HTML private/no-store in produzione restano da
verificare. In dev l'HTML osservato ha `no-cache, must-revalidate`, mentre sulle
API sono verificati `private`/`no-store`. Nessun codice delle app modificato.

16D concluso: build Admin con **Turbopack predefinito e TypeScript** riuscita
nella copia senza env; **14 gruppi** superati con `next start` locale. HTML del
login e delle tredici rotte protette confermato private/no-store e noindex;
sette API negate senza dati. Sentinella tecnica sintetica assente dai trenta
asset client compilati; screenshot desktop/mobile ispezionati, nessun errore
di idratazione rilevato, cleanup riuscito. Regressione: **1.286 test, zero
fallimenti/skip**; lint mirato pulito. Nessun codice o configurazione delle app
modificato. HTTPS/CDN, Supabase reale e pagine autenticate restano da verificare.
Dettagli, isolamento e limiti nella [scheda 16D](16d-produzione-locale.md).

16E concluso: **15 gruppi browser superati**, login subordinato all'audit,
diniego ordinario/metadata Admin, revoca simulata di ruolo e sessione, sidebar
desktop/compatta/mobile, dieci pagine future, skip link, focus e logout normale
o degradato. Corretti due difetti: etichette invisibili sopra le icone compatte
e opzioni di scadenza che riscrivevano il nome base anziché i singoli cookie.
Regressione finale: **1.293 test, zero fallimenti/skip**; typecheck/lint/CSS
riusciti. Cleanup dei processi verificato. Dettagli ed evidenze nella [scheda
16E](16e-shell-sessione.md). Solo Next dev e fixture HTTP; Home completa,
tabelle, Supabase reale e HTTPS/CDN restano aperti. Gli avvisi Base UI della
Home sono un residuo esplicito del sottopasso successivo.

## Chiusura locale e prossima fase

16F concluso: **otto gruppi Home browser superati**, quattro screenshot
ispezionati, renderer differito osservato sulla rete dev, tre pulsanti-link
Base UI corretti. **1.298 test Node/PGlite riusciti, zero fallimenti/skip**,
typecheck Admin e lint riusciti; cleanup confermato. Dettagli e limiti nella
[scheda 16F](16f-home.md). Supabase reale e produzione autenticata non attestati.

16G concluso: **dieci gruppi browser riusciti**, undici anteprime e due file CSV
nativi desktop/mobile verificati. Corretti falso 403 dell'export dovuto all'URL
interno Next e perdita di spazi durante ricerca lenta. **1.307 test Node/PGlite
riusciti, zero fallimenti/skip**, typecheck e lint riusciti; sei screenshot
ispezionati e cleanup confermato. Limiti nella [scheda 16G](16g-annunci.md).

16H concluso: **otto gruppi browser e tre controlli tecnici di produzione
riusciti**, Registro desktop/mobile e sessione, build/bundle/header autenticati,
renderer differito e recupero da chunk realmente fallito. Chrome esclude la
BFcache con motivi registrati: il ripristino nativo resta non attestato, mentre
il ritorno ordinario rilegge i dati. **1.312 test Node/PGlite su 91 file riusciti,
zero fallimenti/skip**, typecheck/lint, sei screenshot e cleanup verificati.
Dettagli, limiti e sei gruppi finiti di condizioni esterne nella [scheda
16H](16h-chiusura-locale.md).

**Verifiche locali terminate, senza ulteriori sottopassi locali.** Lo step 16
rimane **Da terminare** per integrazione e rilascio. Prossima fase separata:
**integrazione Supabase nell'ambiente di test autorizzato — 6.1 Sol, high**.
Nessuna operazione manuale, migrazione, attivazione o pubblicazione da eseguire ora.
Al termine dello step 16 non sono previste altre funzionalità della prima versione.
Un eventuale rilascio richiede un passaggio esplicito; non avviare nuove sezioni.
