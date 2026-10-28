# 16F — Home autenticata nel browser

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16E Concluso; fixture HTTP sintetica, Chrome e runner isolato esistenti.

[Master](../../master_plan.md) · [Step 16](README.md) · [Matrice](matrice-verifiche.md)

## Perimetro approvato e criteri di chiusura

1. Contenuti: quattro KPI, cinque eventi sintetici e destinazioni delle azioni rapide.
2. Caricamento progressivo: skeleton e indipendenza di indicatori, attività e grafici.
3. Selezione: dodici mesi Utenti/Annunci, coda per anzianità e distribuzioni coerenti.
4. Richieste: sola metrica selezionata, aggiornamenti indipendenti, selezioni rapide senza risultati obsoleti e assenza di polling.
5. Vuoti: zero, distribuzioni e coda vuote senza dati inventati.
6. Errori: fallimento isolato e recupero tramite pulsanti di riprova effettivi.
7. Sessione: revoca sintetica, rimozione della Home e ritorno all'accesso alla successiva richiesta negata.
8. Interfaccia: desktop/mobile, tastiera, tabelle alternative, resize, assenza degli avvisi Base UI e di errori di idratazione.

Aggiungere lo scenario `npm run test:browser:admin:home`, estendendo la fixture
senza cambiare lo scenario 16E predefinito. Correggere i tre pulsanti-link Home
con `nativeButton={false}`. Nessuna modifica prevista a contratti pubblici o SQL.

Controllare sulla rete il caricamento differito del renderer. Bundle compilati,
recupero da chunk fallito e verifiche finali di produzione appartengono a 16H.
La fixture non attesta Auth/PostgREST, persistenza o prestazioni Supabase reali.
Nessuna lettura/modifica degli env, nuova migrazione o applicazione remota.

## Risultati

Esecuzione del **2026-10-25**: **otto gruppi browser superati**, Chrome headless
155, CLI 1.12.0, Next 16.3.4 dev/Webpack. SDK, route Next, guardie, controller e
componenti effettivi; Auth e RPC rimangono servizi HTTP sintetici, senza SQL.

| Gruppo | Evidenza effettiva |
| --- | --- |
| Contenuti | KPI 120 utenti / 60 annunci / 6 in revisione, profitti non disponibili, cinque eventi di tre colonne, tre destinazioni corrette e creazione profilo disabilitata |
| Streaming e lazy loading | Osservatore DOM installato prima del reload: entrambi gli skeleton iniziali, poi KPI disponibili mentre attività ancora in skeleton, infine attività e grafici. Nessuna risorsa HomeCharts con dati grafico indisponibili; un chunk richiesto dopo il recupero |
| Metriche | Utenti e Annunci area/pie, coda barre/pie, Profitti senza grafici. Popolazione Utenti 120 e profili 150 distinti; annunci 60 e coda 6 |
| Richieste | Selezione invariata senza nuova richiesta; Annunci trattenuto e poi sostituito da Coda senza sovrascrittura tardiva; refresh di ciascun blocco con una sola RPC funzionale e nessuna sugli altri due; nessuna nuova chiamata nella finestra inattiva osservata |
| Vuoti | Tre KPI zero, attività vuota, coda vuota senza chart, dodici mesi zero e distribuzione senza pie artificiale |
| Errori e recupero | Fallimento 503 isolato e Riprova tramite interazione reale per indicatori, attività e grafici; nessun refresh degli altri blocchi |
| Interfaccia | Selezione con tastiera, apertura tabella con dodici mesi e due categorie, tooltip da freccia tastiera, resize 390/1440, nessun overflow pagina e font Arial; screenshot ispezionati |
| Revoca | Successiva richiesta indicatori 403, Home rimossa e ritorno ad `/accesso`; API senza dati con private/no-store, pulizia tramite Logout e zero sessioni sintetiche attive |

**Report valido:** `.local/dashboard-browser/run-Tu6pGK/evidence/report.json`.
Nella stessa cartella: `home-desktop.png`, `home-charts-desktop.png`,
`home-mobile.png`, `home-charts-mobile.png`, `console-home.txt`, `console.txt`
e `next.log`. Gli artefatti sono ignorati da Git. Il report attesta cleanup
riuscito di Chrome, Next e fixture; nessuna risposta Home rimasta trattenuta.

I checkpoint console non rilevano errori di idratazione, avvisi `nativeButton`
o dimensioni invalide dei grafici. Conservano i 503/403 intenzionali e gli avvisi
dev sul preload CSS: non si dichiara una console priva di qualsiasi messaggio.
I tre pulsanti-link Home sono stati corretti con `nativeButton={false}`.

Verifiche complementari: **1.298 test Node/PGlite riusciti, zero fallimenti e
skip**, su **89 file**, log `node_modules/.cache/dashboard-step16f-regression.log`;
**22 test mirati** runner/fixture riusciti, typecheck Admin e lint degli otto
file applicativi/tooling interessati riusciti. Quattro nuovi test verificano
parser effettivi, dati vuoti, attese indipendenti, snapshot tardivi, errori,
retry, cancellazione e diniego; un nuovo test impedisce scenari CLI combinati.
Controllo finale: 146 file `src/public` della copia identici agli originali,
36 documenti Markdown con collegamenti locali verificati e diff senza errori
di whitespace. Ispezione dei processi Windows: nessun processo proprio residuo
delle tre esecuzioni 16F.

## Implementazione e limiti

Nuovo scenario `--home` alternativo a `--session`/`--production`; fixture Home
separata e opt-in, lasciando invariati i dati minimi del precedente 16E. Controlli
per dati pieni/vuoti, errori, attese e ritardi massimi di cinque secondi; nessuna
chiave, token o valore cookie nei report diagnostici.

Le due prime esecuzioni (`run-Tbxrx7`, `run-B4p1Ns`) sono interrotta/fallita,
non attestazioni di successo. Hanno portato a correggere il test: i timeout
applicativi restano a dieci secondi, lo streaming è osservato durante un reload
con ritardi brevi, e il pending UI non viene confuso con l'arrivo della richiesta
alla fixture mentre Next compila la rotta. Nessun timeout applicativo allargato.

Il conteggio delle chiamate vale per le interazioni sintetiche osservate:
non misura prestazioni Supabase, non attesta l'assenza di ogni futura richiesta
e non usa HMR/compilazione come benchmark. Le destinazioni delle azioni rapide
sono verificate come URL; le loro pagine dati appartengono a 16G/16H.
Rimangono in 16H bundle/produzione, chunk fallito e BFcache effettivo. Lettore
schermo, Auth/PostgREST reali, HTTPS/CDN e persistenza sono ancora non attestati.
Nessuna build di produzione, migrazione, nuova dipendenza o modifica env.

## Operazioni manuali e prossimo step

Operazioni manuali previste: **nessuna**. Nessun SQL da applicare.
Prossimo: **16G — Annunci**, **6.1 Sol, high**, solo con un nuovo prompt.
