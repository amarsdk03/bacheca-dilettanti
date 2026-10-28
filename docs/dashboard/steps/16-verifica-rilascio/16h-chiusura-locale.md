# 16H — Registro e chiusura locale

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16G Concluso.

[Master](../../master_plan.md) · [Step 16](README.md)

Verificare Registro read only, filtri/cursori, dettaglio e interazioni browser;
chiudere controlli locali trasversali e documentazione. Includere verifica dei
bundle di produzione, caricamento differito e recupero da chunk grafici fallito.
Registrare separatamente il comportamento BFcache effettivamente osservato.
Non introdurre altri sottopassi locali dopo 16H: consegnare la lista finita
delle condizioni di integrazione Supabase/HTTPS/CDN e del rilascio, preservando
i requisiti non attestati. Nessuna applicazione remota automatica.

## Otto gruppi di accettazione

1. Registro read only: tre colonne informative più pulsante dettagli, massimo
   30 eventi, identità/fallback e nessun dettaglio anticipato.
2. Filtri: date Europe/Rome, email/UUID, non identificato, operazione/esito,
   validazione e ripristino.
3. Cursori legati ai filtri, ordinamento a microsecondi con UUID a parità di
   timestamp, pagine senza duplicati, History, reload e prima pagina.
4. Dettagli su richiesta per sessione, moderazione, export e identità mancanti;
   una RPC per apertura, tastiera e ritorno focus.
5. Skeleton, vuoti, indisponibilità/retry, evento rimosso, annullamento,
   risposte superate e assenza di polling nella finestra osservata.
6. Desktop/mobile, tastiera, Sheet e revoca con eliminazione dei dati, API
   negata privata senza dati, ritorno al login e pulizia cookie.
7. Grafici in produzione: renderer differito fino ai dati disponibili, errore
   di rete del chunk effettivo e recupero con ricaricamento completo; altri
   blocchi Home ancora utilizzabili.
8. BFcache nativa: uscita completa e ritorno, `pageshow.persisted` effettivo e
   motivi Chrome se esclusa. Nessuna attestazione tramite eventi simulati.

Comando: `npm run test:browser:admin:registro` (`--registro`, esclusivo rispetto
agli altri scenari). Build Turbopack e `next start` su copia isolata, un solo
Chrome dedicato e fixture HTTP sintetica opt-in con SDK/guardie reali. Fixture
con 37 eventi e due timestamp uguali sul confine di pagina; Home mantiene il
riepilogo da cinque eventi. Nessun servizio Supabase reale o SQL applicato.

La CLI gestisce le interazioni; CDP sul medesimo Chrome integra soltanto
intercettazione mirata del chunk e osservazione BFcache. L'asset viene cercato
nel build corrente, senza hash memorizzati. Report, screenshot e console vanno
conservati; processi e risorse dedicati devono essere arrestati anche su errore.

Operazioni manuali ora: nessuna. Prossima fase separata: integrazione Supabase
nell'ambiente di test autorizzato, **6.1 Sol, high**. Il completamento locale
non applica le migrazioni e non attiva cestino o retention sul progetto.

## Consegna finita per integrazione e rilascio

Queste sono condizioni esterne, non nuovi sottopassi locali. Il [runbook](runbook-rilascio-recupero.md)
contiene ordine dei file, prerequisiti, verifiche e recupero; la [matrice](matrice-verifiche.md)
conserva i limiti puntuali V01–V20 e quelli degli step 03–15.

1. **Destinatario e baseline:** identificare un ambiente Supabase di test
   autorizzato con soli dati sintetici; confrontare schema completo, cronologia,
   definizioni e ACL. Verificare M01 già dichiarata applicata, senza replay
   automatico, e riconciliare M02–M10 nell'ordine del runbook (§2–5).
2. **Auth e autorizzazione effettive:** verificare provisioning dell'Admin,
   impostazioni Auth reali prima dell'attestazione della policy, rinnovo/revoca
   delle sessioni, ruoli non esatti negati e separazione dei client (§7).
3. **Database e gateway:** provare RPC/PostgREST, ACL/RLS, audit atomico e
   concorrenza con connessioni indipendenti, retention concorrente, notifiche,
   piani/tempi/chiamate su volumi rappresentativi e CSV nei fogli di calcolo (§8).
4. **Compatibilità Web/Storage:** verificare tutti i consumer e writer,
   pagamenti/webhook in test, bucket/policy, media, URL precedenti e cache,
   mantenendo il gate cestino falso finché mancano le evidenze (§6, §8.1).
5. **Preview HTTPS:** verificare host e proxy effettivi, Origin/Host export,
   cookie Secure e separazione Web/Admin, HTML/API/RSC/CDN, browser/dispositivi
   previsti e accessibilità con lettore schermo. Se il browser locale esclude
   la BFcache, la prova nativa resta da attestare in un contesto idoneo (§6–8).
6. **Rilascio esplicito:** fissare revisione, backup recuperabile e punto di
   ritorno; distribuire Web/Admin compatibili. Attivare cestino e retention
   solo dopo i rispettivi prerequisiti; registrare la prima esecuzione Cron,
   controlli successivi e monitoraggio (§3, §8–10).

Il riepilogo non autorizza SQL/deploy sul reale. Una condizione non verificata
resta aperta anche dopo la chiusura locale; non viene trasformata in successo
né in un nuovo 16I.

## Risultati effettivi — 25 ottobre 2026

**Otto gruppi browser superati**, più tre controlli tecnici: build di produzione,
asset client senza chiave sintetica server e header del login. Comando eseguito
`npm run test:browser:admin:registro`; report finale valido:
`.local/dashboard-browser/run-EJDoLf/evidence/report.json` (`passed: true`,
11 risultati). Next **16.3.4**, Chrome **155**, CLI **1.12.0**, Node **24.19.0**.

- Build Admin Turbopack con `next start`, 30 asset statici, 29 JavaScript,
  **1.588.030 byte** complessivi; chiave tecnica sintetica assente. Non è una
  misura del download iniziale o una certificazione di tutti i possibili segreti.
- Home e Registro autenticati, API Registro e login restituiscono header
  `private`/`no-store` e `noindex` nella produzione locale.
- Registro: limite 30, 37 eventi su due pagine senza duplicati, timestamp uguali
  al confine risolti per UUID, filtri/History/reload/cursori verificati. Date
  Europe/Rome: incluso l'evento a mezzanotte, escluso quello immediatamente prima.
- Sei varianti di dettaglio, una RPC per apertura, skeleton, errori/retry,
  rimozione modellata di un evento, annullamento e risposte tardive. Nessun
  polling nella finestra inattiva osservata. Contatori finali: **28 liste,
  12 dettagli**, nessun waiter residuo o RPC sconosciuta. Questi conteggi
  riguardano tutta la sequenza sintetica, non un benchmark del gateway reale.
- Desktop 1440×900 e mobile 390×844, Arial, nessun overflow della pagina;
  tabella mobile con scroll interno, Sheet e focus da tastiera verificati.
  Revoca sintetica: dati rimossi, API 403 senza contenuti con header privati,
  logout e nessun cookie Admin visibile residuo; zero sessioni sintetiche attive.
- Renderer grafici assente dalla rete prima dei dati. Il chunk effettivo della
  build, `/_next/static/chunks/3q30oapkzuac8.js`, è stato bloccato due volte da
  CDP: boundary di errore visibile, KPI e ultime cinque operazioni preservati.
  Dopo sblocco e pulsante **Ricarica pagina**, asset trasferito e due SVG dei
  grafici presenti. Il nome hash è soltanto evidenza di questa build: il runner
  lo scopre nuovamente a ogni esecuzione.
- Sei screenshot conservati e ispezionati: Registro desktop/dettaglio/mobile,
  dettaglio mobile, errore chunk e pagina Home dopo il recupero. L'ultimo
  screenshot mostra la viewport iniziale; SVG e recupero asset sono verificati
  separatamente dal report DOM/rete. Console senza errori di idratazione o
  avvisi `nativeButton`; 503/404/403, `ERR_FAILED` e `ChunkLoadError` appartengono
  ai guasti intenzionali e sono conservati nelle evidenze.

**BFcache osservata, ripristino nativo non attestato.** Chrome ha escluso il
Registro dalla BFcache: `MainResourceHasCacheControlNoStore`,
`JsNetworkRequestReceivedCacheControlNoStoreResource`, `BrowsingInstanceNotSwapped`.
La Navigation Timing API conferma `back_forward` e i motivi no-store; nessun
`pageshow.persisted=true`. Il ritorno ordinario ha effettuato **una nuova RPC
lista**. Il gruppo verifica l'osservazione e la rilettura effettiva, non dichiara
riuscito il ramo di ripristino BFcache. Le protezioni della cache restano invariate.

Regressione: **1.312 test Node/PGlite riusciti su 91 file, zero fallimenti e zero
skip**, log `node_modules/.cache/dashboard-step16h-regression.log`;
**28 test mirati** di runner/fixture Registro, Home e Annunci riusciti (inclusi
nella suite, non da sommare). Typecheck Admin e lint dei sette file JS coinvolti
riusciti. Verificati **278 collegamenti locali in 36 documenti dashboard**,
senza destinazioni mancanti. I 146 file `src`/`public` della copia finale
coincidono con gli originali.
Cleanup browser/Chrome CDP/Next/fixture riuscito, nessun processo dei tentativi
16H residuo secondo controllo dei percorsi esatti tramite CIM.

I tentativi `run-1YPvRF`, `run-HQGF8C` e `run-ZwwyY2` sono diagnostici falliti,
non evidenze di accettazione: selettore dell'etichetta invece del campo data e
`fill` della CLI che assegna `.value` senza aggiornare il value tracker React.
Il runner usa il campo `Date`, una modifica/ripristino da tastiera nativa e
verifica le date nell'URL. La selezione dei menu usa tastiera e popup visibile.
Tutti i tentativi hanno cleanup riuscito; nessun difetto applicativo ha richiesto
modifiche in 16H.

## Stato finale e limiti

**16H Concluso: verifiche locali terminate.** Lo step 16 resta **Da terminare**
per le condizioni esterne elencate sopra. SDK, route, componenti e guardie sono
effettivi; Auth/RPC e dati del browser sono sintetici. Restano non attestate
integrazione Supabase, concorrenza/retention effettive, HTTPS/CDN, altri browser,
lettore schermo e ripristino BFcache nativo. Non vengono chiusi i residui degli
step 03–15 soltanto per il successo locale.

Nessuna modifica al codice delle app, SQL, dipendenze o env; nessuna applicazione
remota, attivazione reale del gate, Docker o deploy. Le aggiunte sono limitate
a runner/fixture/test e documentazione. **Operazioni manuali ora: nessuna.**
Prossima fase: **integrazione Supabase nell'ambiente di test autorizzato —
6.1 Sol, high**, distinta dal rilascio.
