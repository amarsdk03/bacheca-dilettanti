# 16C — Login e accessi anonimi nel browser

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16A e 16B conclusi; Chrome installato e CLI DevTools 1.12.0.

[Master](../../master_plan.md) · [Step 16](README.md) · [Matrice](matrice-verifiche.md)

## Perimetro approvato

Browser reale su login e ingressi anonimi, con copia locale isolata dell'Admin,
senza `.env*`, servizi esterni o credenziali reali. Un servizio HTTP sintetico
restituisce soltanto errori Auth: nessuna sessione valida viene emessa. Nessuna
guardia o API dell'app viene sostituita. Home, Annunci e Registro autenticati,
Supabase reale, Storage, Cron, concorrenza e produzione restano fuori da 16C.

## Attività

Runner root `npm run test:browser:admin`, preparazione e processi isolati,
profilo/sessione browser dedicati, prove desktop/mobile, tastiera/focus,
Eye/EyeOff, validazione, errori/pending e blocco degli accessi anonimi alle
rotte/API esistenti. Test Node per isolamento, processi ed errori del runner.

## Risultati

Ambiente di esecuzione: Windows, Node **24.19.0**, Next **16.3.4** installato
nel workspace, CLI Chrome DevTools **1.12.0**, Chrome headless **155.0.0.0**.
Esecuzione conclusiva riuscita il **25 ottobre 2026**:

| Controllo | Risultato |
| --- | --- |
| `npm run test:browser:admin` | **11 gruppi di controlli superati**, exit code 0 |
| Layout desktop/mobile | 1440×900 e 390×844: banner caricato, Arial/light, pulsante wide e nessun overflow orizzontale; screenshot ispezionati |
| Tastiera e password | Tab/Shift+Tab, focus visibile, Enter/Space, Eye/EyeOff e valore password conservato |
| Validazione e invio | Campi obbligatori/email invalida senza richieste Auth; stato pending con quattro controlli utente disabilitati |
| Errori sintetici | Credenziali non valide e servizio indisponibile; recupero del form senza apertura dashboard; **due richieste Auth sintetiche** |
| Pagine protette | **13 rotte**: redirect riconosciuto nel trasporto HTTP e arrivo al form `/accesso` verificato nel browser; nessun contenuto Home riservato |
| API di lettura | **7 endpoint**: 403/ACCESS_DENIED senza dati, `private` e `no-store`; ulteriore diniego verificato dal browser dopo i tentativi di login |
| Sessione e console | Nessuna sessione Admin emessa; nessun errore di idratazione rilevato |
| Cleanup | Browser, albero Next e fixture arrestati; tutti e tre gli esiti `true` nel report |
| `npm test` | **1.283 test riusciti, zero fallimenti/skip**, 87 file; inclusi gli **8 nuovi test** Node del runner |
| Lint mirato e documentazione | Nessun rilievo sui file JS interessati; collegamenti e struttura Markdown verificati |

Artefatti dell'esecuzione valida, ignorati da Git:
[report JSON](../../../../.local/dashboard-browser/run-OdCmTp/evidence/report.json),
[desktop](../../../../.local/dashboard-browser/run-OdCmTp/evidence/login-1440.png),
[mobile](../../../../.local/dashboard-browser/run-OdCmTp/evidence/login-390.png),
[console](../../../../.local/dashboard-browser/run-OdCmTp/evidence/console.txt) e
[log Next](../../../../.local/dashboard-browser/run-OdCmTp/evidence/next.log).
Le altre directory `run-*` contengono tentativi interrotti/falliti e non sono
evidenza di successo. Il riepilogo qui resta versionato anche se gli artefatti
locali vengono rimossi. Log regressione: `node_modules/.cache/dashboard-step16c-regression.log`.

Le modifiche riguardano il comando root, il runner/fixture e i loro test Node,
più la documentazione. Nessun componente, guardia, query, API o stile delle app
è stato modificato per far passare le prove.
Non sono state applicate migrazioni, modificati file d'ambiente o usate
credenziali/progetti Supabase reali. Typecheck delle app non ripetuto per sole
modifiche al tooling JavaScript: restano le evidenze 16A; il codice dell'app è
stato compilato nella copia di test da Next, senza build di produzione.

## Ripetere la prova

Prerequisiti: dipendenze root installate, Chrome nei percorsi standard Windows,
possibilità di avviare processi/worker e named pipe locali. Il runner usa Chrome
headless, un profilo dedicato e un identificativo daemon UUID distinto: non
collega o arresta browser personali. Nel sandbox dell'agente sono serviti i
permessi di esecuzione estesi per Chrome/Next; questo non richiede configurazioni
Supabase o privilegi del database.

Solo se il tool manca dalla cache, installarlo dalla root:

```powershell
npm install --prefix node_modules/.cache/dashboard-browser-tools --no-save --package-lock=false --ignore-scripts chrome-devtools-mcp@1.12.0
```

Poi, dalla root:

```powershell
npm run test:browser:admin
```

Il runner stampa il percorso della singola esecuzione sotto
`.local/dashboard-browser/run-*/evidence`. Conserva screenshot desktop/mobile,
`report.json`, diagnostica console e log Next. Gli artefatti e la cache del tool
sono ignorati da Git; il tool non è una dipendenza delle app. Il comando verifica
la versione richiesta prima di avviare i servizi e fallisce esplicitamente se
non trova Chrome o il tool. `npm ci` può rimuovere la cache: in tal caso basta
ripetere l'installazione del solo tool, non configurare un backend reale.

### Isolamento e copertura

La preparazione copia soltanto sorgenti/asset e configurazioni necessari,
escludendo `.env*`, `.next` e `node_modules`; rifiuta percorsi reindirizzati.
Condivide soltanto le dipendenze già installate tramite un collegamento alla
directory root. La directory di lavoro di Next è il workspace Admin copiato,
con Webpack e porta loopback dedicata. I file originali non vengono riscritti.
L'ambiente del processo usa una lista ammessa di variabili di sistema e valori
Supabase sintetici, senza chiavi tecniche, hook Node o impostazioni ereditate.

Il servizio HTTP locale restituisce solo errori e non emette sessioni. La
risposta del caso pending viene trattenuta e rilasciata dal test, così la verifica
dei quattro controlli visibili non dipende da un ritardo arbitrario. I campi
hidden di React/Server Actions non sono controlli utente da disabilitare.
Questo non sostituisce una verifica dell'effettivo Supabase Auth/PostgREST.

I test Node del runner coprono copia/env e immutabilità delle configurazioni,
output e sorgenti reindirizzati, pulizia delle credenziali ereditate, target
loopback obbligatorio, errori/attesa/rilascio del servizio sintetico, processi
falliti/assenti/timeout e cleanup dei processi posseduti. Il runner chiude
browser, albero Next e fixture in `finally` anche in caso di fallimento; non
arresta servizi o processi di altri workspace.

### Limiti

La prova usa Next in sviluppo con Webpack: non attesta build/bundle di
produzione, cookie Secure su HTTPS, CDN o cache pubbliche reali. Screenshot e
controlli DOM verificano il perimetro visivo/tastiera provato, non l'esperienza
completa con lettore schermo. Non vengono emessi JWT validi, eseguite operazioni
amministrative o interrogate le tabelle Supabase. Tutte le pagine autenticate
e le verifiche residue della matrice restano non eseguite.

Next può emettere il redirect nella risposta HTML già in streaming con stato
200 e meta refresh verso `/accesso`, anziché un 307 con Location. Il runner
controlla la destinazione della stessa origine e verifica tutte le tredici
navigazioni nel browser; un semplice 200 senza redirect non è accettato.
In sviluppo Next sovrascrive Cache-Control dell'HTML con
`no-cache, must-revalidate`: il valore effettivo viene conservato nel report.
**Private/no-store per l'HTML di produzione non è attestato da 16C.** La verifica
anonima in produzione locale è stata successivamente svolta in [16D](16d-produzione-locale.md).
Per le API
di lettura il test continua a richiedere `private` e `no-store`, oltre al diniego
403 senza dati. Noindex viene verificato sulle risposte delle rotte protette.

## Operazioni manuali e prossimo passaggio

Nessuna migrazione o configurazione Supabase. Il tool browser viene installato
una volta nella cache ignorata del workspace; nessuna dipendenza applicativa.

Prossimo: completamento delle verifiche residue dello step 16,
**6.1 Sol, high**, senza rilascio automatico.
