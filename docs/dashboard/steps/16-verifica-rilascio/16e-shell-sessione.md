# 16E — Shell e sessione nel browser

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16A–16D conclusi; Chrome e CLI del runner disponibili.

[Master](../../master_plan.md) · [Step 16](README.md) · [Matrice](matrice-verifiche.md)

## Perimetro approvato

Shell e sessione, con servizi locali sintetici: login riuscito dopo audit,
sidebar desktop/mobile, dieci pagine future, diniego/revoca e logout. SDK,
guardie e Server Actions effettivi. Next dev su copia senza env, senza build
di produzione, Docker, credenziali/progetti reali o nuove dipendenze.

Home riceve dati minimi validi per il redirect, ma KPI/grafici completi,
Annunci, Registro, rinnovo token e Supabase reale restano fuori da 16E.

## Implementazione e accettazione

Fixture HTTP separata con JWT ES256 e JWKS temporanei, sessioni revocabili,
contesto, letture minime Home e audit soltanto in memoria. Comando separato
`npm run test:browser:admin:session`, isolamento e cleanup del runner esistente.

Verificare login subordinato all'audit e diniego, reload e redirect login,
ordine delle tredici voci, sidebar/tooltip/skip link, pagine future, mobile
con chiusura/focus, logout normale e degradato, pulizia di tutti i chunk Admin
preservando cookie Web sintetici. Report/screenshot senza token o chiavi.
Test Node della fixture con SDK reale, lint e regressione completa.

## Ripetere la prova

Dalla root, con dipendenze installate e Chrome disponibile nei percorsi Windows
supportati, usare il tool CLI **1.12.0** già preparato in [16C](16c-browser-anonimo.md):

```powershell
npm run test:browser:admin:session
```

Il comando avvia una sola copia Next dev/Webpack, fixture HTTP su `127.0.0.1`,
Chrome headless con profilo/sessione dedicati e cleanup in `finally`. Non legge
gli env originali e non modifica componenti o guardie per simulare l'accesso.
I comandi anonimi di 16C e produzione di 16D mantengono i propri scenari;
la combinazione sessione/produzione non è inclusa e viene rifiutata dal runner.

La fixture sessione è separata dalla fixture anonima: chiavi EC temporanee,
JWKS e token firmati verificati dall'SDK; controllo del contesto a ogni RPC
ammessa. Il valore `Admin` nei metadata utente non concede accesso. Sono
supportati solo password, JWKS, utente, logout locale, contesto, audit tecnico
e le tre letture minime Home. Gli altri endpoint vengono negati e contati.
Nessun refresh viene simulato come riuscito.

L'audit usa una chiave tecnica sintetica distinta dal JWT dell'operatore;
le credenziali umane non possono sostituirla e la chiave tecnica non può
leggere il contesto umano. Il test può trattenere la risposta dell'audit
per controllare che i cookie non siano ancora stati consegnati al browser.
Gli eventi vengono conservati solo in memoria come azione/esito, non come
record SQL. I metadata sintetici sono volutamente grandi per generare più
chunk di cookie e verificare la pulizia.

Il report conserva soltanto risultati, nomi delle sezioni e contatori sanitizzati;
non salva token, chiavi, header o corpi delle richieste. Screenshot e diagnostica
restano nella singola directory `.local/dashboard-browser/run-*/evidence`,
ignorata da Git. La fixture non riceve credenziali ereditate o URL remoti.

## Correzione della sidebar compatta

La prova con click effettivi ha rilevato un difetto: le etichette dei gruppi
usavano opacità zero e margine negativo, ma restavano bersagli del puntatore
sopra l'ultima icona del gruppo precedente. Segnalazioni e Codici invito,
per esempio, non navigavano pur apparendo interattivi. La diagnostica del
centro del link identificava `sidebar-group-label` come elemento sovrapposto.

Nel componente Admin `SidebarGroupLabel` è stata aggiunta soltanto la variante
`group-data-[collapsible=icon]:pointer-events-none`. Le etichette della sidebar
estesa mantengono il comportamento precedente. Il test controlla che il centro
di ciascuna icona punti effettivamente al link e ne prova il click e la destinazione;
non sostituisce la navigazione con un aggiornamento programmatico dell'URL.

Il runner ora respinge anche gli errori testuali del CLI restituiti con exit
code zero. Il controllo del tooltip usa il popup Base UI effettivamente aperto
e visibile, senza presumere un attributo `role` non presente su quel nodo.

Nei due scenari desktop di logout degradato il runner assegna e verifica il
focus al pulsante effettivo, quindi preme Enter: il badge degli avvisi Next dev
può coprire il centro del footer. Non viene chiamato `submit()` né simulato il
redirect o cancellato un cookie dal test al posto dell'app. Il logout mobile
rimane verificato con click. Console raccolta in tre checkpoint, con storico
di 25 navigazioni supportato dal tool, per includere anche l'accesso iniziale.

## Correzione della scadenza dei cookie

La prova mobile ha rilevato anche cookie Admin rimasti nel browser dopo la
revoca riuscita. Il buffer passava `name` nelle opzioni di scadenza: Next lo
sovrappone al nome posizionale e serializzava più volte il cookie base anziché
i singoli chunk. Le vecchie mappe sintetiche dei test non riproducevano questa
precedenza. Un nuovo test con `NextResponse` e header `Set-Cookie` effettivi
falliva prima del fix e passa dopo, sia per la pulizia sia per un login fresh.

Il buffer ora separa il nome base dalle opzioni di scope. La prova mobile
mirata conferma rimozione di tutti i chunk, compreso `.99`, ritorno al form e
conservazione del cookie Web sintetico. Nessuna modifica a ruoli o policy DB.

## Verifiche Node e statiche

- Regressione finale dopo entrambi i fix: **1.293 test riusciti, zero fallimenti/skip**,
  88 file; inclusi sei nuovi test della fixture e la regressione cookie con Next
  effettivo. Log: `node_modules/.cache/dashboard-step16e-regression-final.log`.
  La precedente esecuzione da 1.292 test è nel log `dashboard-step16e-regression.log`.
- Dopo la correzione CSS: **70 test mirati riusciti**, zero fallimenti/skip,
  per dashboard, Auth UI, navigazione esterna e tooling browser/sessione.
- Typecheck Admin e lint sui file interessati riusciti. CSS compilato in memoria:
  presenza verificata della regola pointer-events per le etichette compatte.
- Dopo il fix cookie: **94 test mirati riusciti**, zero fallimenti/skip, inclusa
  la regressione sugli header Next reali; typecheck e lint ripetuti con successo.
- Nessuna nuova build di produzione: la prova corrente usa Next dev. Nessuna
  modifica alla Web pubblica, a SQL, dipendenze o file d'ambiente.

## Risultato browser conclusivo

Esecuzione valida del **25 ottobre 2026**, Windows, Node **24.19.0**, Next
**16.3.4** dev/Webpack, Chrome headless **155.0.0.0**, CLI **1.12.0**:

| Verifica | Esito |
| --- | --- |
| Comando sessione | **15 gruppi superati**, exit code 0 |
| Login | Ordinario respinto anche con metadata Admin; audit indisponibile impedisce commit; risposta trattenuta prima del commit, poi sessione valida con più chunk |
| Shell desktop | Tredici link e gruppi in ordine, voce attiva, logo, skip link, tooltip e sidebar compatta persistente durante navigazione |
| Pagine future | Dieci destinazioni raggiunte con click, titolo/icona/testo previsti; nessuna icona coperta da etichette invisibili |
| Mobile 390×844 | Menu, chiusura/Escape/navigazione, ritorno del focus, footer visibile e nessun overflow orizzontale |
| Logout mobile | Pending, revoca e cancellazione di tutti i chunk compreso `.99`; cookie Web conservato |
| Revoca simulata | Ruolo revocato: pagina e API negati senza dati; sessione revocata: pagina successiva negata |
| Logout degradato | Audit o revoca indisponibili: cookie locali comunque rimossi e messaggio appropriato; attivazione desktop da tastiera |
| Console e fixture | Nessun errore di idratazione rilevato nei tre checkpoint; zero endpoint inattesi; zero sessioni sintetiche attive alla fine |
| Cleanup | Browser, Next e fixture: tutti `true`; nessun processo residuo delle esecuzioni/diagnostiche controllate |

Artefatti ignorati da Git dell'unica esecuzione conclusiva qui attestata:
[report JSON](../../../../.local/dashboard-browser/run-xug0pY/evidence/report.json),
[desktop](../../../../.local/dashboard-browser/run-xug0pY/evidence/shell-desktop.png),
[compatto](../../../../.local/dashboard-browser/run-xug0pY/evidence/shell-desktop-compact.png),
[menu mobile](../../../../.local/dashboard-browser/run-xug0pY/evidence/shell-mobile-menu.png),
[contenuto mobile](../../../../.local/dashboard-browser/run-xug0pY/evidence/shell-mobile-content.png),
[console accesso](../../../../.local/dashboard-browser/run-xug0pY/evidence/console-accesso.txt),
[console shell](../../../../.local/dashboard-browser/run-xug0pY/evidence/console-shell.txt),
[console finale](../../../../.local/dashboard-browser/run-xug0pY/evidence/console.txt),
[log Next](../../../../.local/dashboard-browser/run-xug0pY/evidence/next.log).
Tutti e quattro gli screenshot sono stati ispezionati. Le altre directory
contengono tentativi interrotti/falliti o diagnostiche mirate e non equivalgono
al successo della sequenza completa. L'interruzione precedente ai crediti non
ha prodotto un report finale: la verifica browser è stata ripetuta integralmente.

La fixture registra sette tentativi password, dieci richieste di audit e sette
richieste logout; i contatori diagnostici non sono un benchmark o un conteggio
di query Supabase. L'audit del caso indisponibile non è registrato come riuscito.

## Limiti e operazioni manuali

La fixture non è Supabase Auth/PostgREST e l'audit in memoria non è persistente.
La Home minima genera avvisi Base UI per pulsanti resi come link senza
`nativeButton={false}`: sono registrati come residuo della Home, da verificare
nel sottopasso successivo. Non sono errori di idratazione e non si attestano
come risolti qui. Il browser usa Node/Next dev: HTTPS/CDN e sessioni effettive
Supabase, rinnovo token, cookie Secure e persistenza SQL rimangono da verificare.
Nessuna migrazione o configurazione esterna da applicare. Lo step 16 resta
Da terminare. Prossimo sottopasso: **16F — Home autenticata**, **6.1 Sol, high**, soltanto
dopo un nuovo prompt.
