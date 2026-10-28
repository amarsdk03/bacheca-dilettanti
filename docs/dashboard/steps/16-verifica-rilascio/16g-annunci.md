# 16G — Annunci nel browser

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16F Concluso.

[Master](../../master_plan.md) · [Step 16](README.md)

Verificare nel browser isolato tabella e limite 30, ricerca/filtri/cursori,
dettaglio su richiesta, moderazione, cestino ed export. Servizi sintetici;
conservare nella matrice i limiti SQL, concorrenza e gateway non attestati.
## Dieci gruppi di accettazione

1. Lista: skeleton, sette colonne, ordine e massimo 30 senza letture dettaglio.
2. Filtri: ricerca, stato, tipologia, oscuramento/cestino, reset, vuoti e invalidi.
3. Paginazione e History: successiva/precedente/prima, reload e back/forward, cursori a microsecondi legati ai filtri.
4. Anteprima: undici tipologie su richiesta, fallback/anonimato, skeleton, errore/retry, 404 e focus.
5. Link esterni: AlertDialog sopra Sheet, annullamento/conferma, tastiera/modificatori/click centrale e nuova scheda solo loopback.
6. Moderazione: approva/rifiuta/nascondi/ripristina visibilità, motivi e conferme, refresh dati.
7. Esiti problematici: capacità negate, dettaglio incompleto, conflitto, indisponibilità/esito incerto, nessun reinvio automatico/doppio invio.
8. Cestino: gate inizialmente falso nella fixture, motivo interno, esclusione e ripristino sotto hold.
9. Export: file effettivo desktop/mobile, righe correnti e ordine fino a 30, BOM/formule e assenza file su errore/conflitto.
10. Interfaccia/sessione: desktop/mobile, scroll contenuto, tastiera/focus/dialoghi, revoca che nega dati e operazioni successive.

Nuovo scenario `test:browser:admin:annunci`/`--annunci`, fixture opt-in con 35
annunci ordinari e 2 nel cestino. SDK, route, Server Actions e controller reali;
RPC e audit sintetici in memoria, senza attestare atomicità/concorrenza SQL.
Adattatore CDP sul medesimo Chrome soltanto per download/input non esposti dalla
CLI; nessuna dipendenza applicativa. Nessun env, SQL o servizio reale coinvolto.
Ritardi entro il timeout applicativo esistente. Criterio: tutti i dieci gruppi
superati, test fixture/regressione, typecheck/lint, screenshot/CSV ispezionati e
cleanup confermato. Risultati da registrare dopo esecuzione effettiva.

Operazioni manuali previste: nessuna. Prossimo: **16H**, **6.1 Sol, high**.

## Correzioni applicative verificate

- Export CSV: Next esponeva nel Route Handler un URL interno `localhost`, mentre
  il browser inviava l'origine `127.0.0.1`. Il confronto rifiutava il POST
  legittimo con 403 e provocava il ritorno all'accesso. Ora il protocollo URL e
  l'header HTTP `Host` determinano l'origine attesa; `X-Forwarded-Host` non viene
  considerato attendibile. Origine assente/nulla, altro host, porta/protocollo
  diversi e Host malformato restano negati prima del servizio dati. La fallback
  sull'URL vale solo per chiamanti `Request` senza header Host. Nessuna query di
  autorizzazione aggiuntiva. Prova diagnostica sulla copia isolata e regressione
  HTTP incluse; HTTPS/proxy del destinatario rimangono da verificare al rilascio.
- Ricerca: il debounce normalizzava anche il campo controllato, eliminando uno
  spazio finale se l'utente faceva una pausa tra due parole. Ora conserva il
  testo digitato per l'aggiornamento automatico, mantenendo canonici URL e query;
  filtri e navigazione espliciti conservano la normalizzazione prevista. Nuovo
  test riprodotto in fallimento prima della correzione e poi superato; la prova
  browser include una pausa esplicita dopo `sintetico ` prima di completare `11`.

Modifiche applicative limitate a
[export-http.ts](../../../../apps/admin/src/features/annunci/server/export-http.ts)
e [controller.ts](../../../../apps/admin/src/features/annunci/client/controller.ts).
Riferimenti: [sicurezza Next](https://nextjs.org/docs/app/guides/data-security#built-in-server-actions-security-features)
e [Origin nello standard Fetch](https://fetch.spec.whatwg.org/#origin-header).

## Verifiche complementari concluse

**1.307 test Node/PGlite riusciti su 90 file, zero fallimenti/skip**, log
`node_modules/.cache/dashboard-step16g-regression-final.log`. Typecheck Admin e
lint degli undici file applicativi/test/tooling interessati riusciti. Verifiche
mirate: 29 test runner/fixture, 60 export server/interfaccia e 69 interfaccia
Annunci/export/moderazione; questi gruppi si sovrappongono, non vanno sommati.
Sette nuovi test fixture e due regressioni applicative inclusi nella suite root.

Tooling aggiunto: `annunci-fixture.mjs`, `annunci-checks.mjs`, `annunci-cdp.mjs`;
runner e fixture sessione estesi senza cambiare i precedenti scenari predefiniti.
Il vocabolario dei campi viene letto dal modulo puro applicativo; nessuna copia
di SQL o nuovo adapter database. I download CDP usano la libreria del tool CLI
già disponibile e un unico Chrome, profilo e ambiente isolati. File CSV nella
sola sottocartella `evidence/downloads`, mai nella cartella Download personale.

## Evidenza browser finale — 2026-10-25

**Tutti i dieci gruppi superati**, Next 16.3.4 dev/Webpack, Chrome headless 155 e
CLI 1.12.0, servizi HTTP sintetici. Il CSV è stato verificato subito dopo la
lista per anticipare il controllo del difetto trovato; il perimetro resta quello
dei dieci gruppi approvati, non sono stati introdotti ulteriori sottopassi.

| Gruppo | Risultato effettivo |
| --- | --- |
| Lista | 30 righe ordinate, sette colonne, skeleton durante aggiornamento, zero chiamate dettaglio iniziali |
| Filtri | Ricerca con pausa dopo uno spazio, stato/tipologia/oscuramento/cestino, reset, vuoti, parametri invalidi ed errore lista con Riprova |
| Paginazione | Seconda pagina di cinque righe, precedente/prima, History back/forward, URL diretto e cursore incompatibile con filtri negato; timestamp di sei cifre preservati |
| Anteprime | Tutte le undici tipologie con una lettura per apertura, dati sintetici coerenti, autore anonimo/fallback, skeleton, cancellazione, 404 e 503/Riprova; focus restituito al trigger |
| Apertura esterna | AlertDialog sopra Sheet, Annulla inizialmente a fuoco; tastiera, Control+click e click centrale senza visita anticipata, conferma con una sola scheda loopback e `opener === null`, ritorno focus |
| Moderazione | Approva/rifiuta/nascondi/ripristina visibilità con motivi, annullamento senza scrittura, risultato e refresh effettivi |
| Esiti problematici | Capacità incompleta negata, fingerprint obsoleto in conflitto, richiesta pendente con comandi disabilitati/Escape bloccato; effetto modellato salvato ma risposta incerta, nessun reinvio e rilettura che nega un secondo Nascondi |
| Cestino | Gate falso iniziale negato; abilitazione soltanto in memoria, motivo interno, esclusione dall'elenco, filtro dedicato e ripristino conservando l'oscuramento amministrativo |
| CSV | Due download nativi effettivi di 30 righe correnti nello stesso ordine, desktop e viewport mobile; sei colonne/BOM/virgolette/formule/righe multiple verificati nei file. Nessun file su 409/503 |
| Mobile/sessione | 390×844, Arial, scorrimento orizzontale confinato alla tabella, Sheet/AlertDialog utilizzabili; revoca prima della conferma nega la scrittura, rimuove i dati, porta all'accesso e restituisce API 403 private/no-store senza dati |

**Unico report finale valido:** `.local/dashboard-browser/run-VVn3JV/evidence/report.json`.
Nella stessa cartella: `annunci-desktop.png`, `annunci-preview.png`,
`annunci-external-confirmation.png`, `annunci-mobile.png`,
`annunci-preview-mobile.png`, `annunci-dialog-mobile.png`, `console-annunci.txt`,
`console.txt` e `next.log`. Tutti i sei screenshot sono stati ispezionati.

File effettivi in `evidence/downloads`: `annunci-pagina-20261025-120549.csv` e
`annunci-pagina-20261025-120623.csv`, ciascuno **3.767 byte**, 31 record inclusa
l'intestazione e sei colonne. Verifica aggiuntiva dei byte e del parsing riuscita.
I file sono precedenti alle mutazioni della fixture, non esportazioni di dati
reali. I checkpoint console non rilevano errori di idratazione o `nativeButton`;
restano i 404/409/503/403 intenzionali delle prove e i messaggi dev previsti.

Report: **zero richieste inattese, zero sessioni attive, zero attese residue**;
cleanup di CLI, Chrome CDP, Next e fixture riuscito. I contatori dei soli RPC
autorizzati non misurano tutte le chiamate di rete né le prestazioni remote.
Verifica finale: 146 file `src/public` della copia identici agli originali,
36 documenti con 266 collegamenti locali validi, diff senza errori di whitespace;
ispezione Windows senza processi residui delle cinque esecuzioni e delle sonde.

## Prove interrotte, limiti e operazioni manuali

`run-qiOvpW`, `run-ea4CO6`, `run-qepfem` e `run-VcbaTb` sono prove fallite, non
evidenze di completamento. Hanno individuato rispettivamente la porta CDP da
specificare esplicitamente, il Fast Refresh durante la prima compilazione del
dettaglio e i due difetti applicativi descritti sopra. Le rotte sono ora compilate
anonimamente prima della prova per evitare interferenze HMR, senza credenziali
o letture funzionali. Le sonde diagnostiche usano solo copie/profili locali.

I conflitti, commit incerti, gate e audit del browser sono **modellati in memoria**:
non certificano atomicità SQL, lock/concorrenza, notifiche/pagamenti o Storage.
Restano nella matrice schema completo/Auth/PostgREST, BFcache effettivo,
HTTPS/proxy/CDN, popup bloccati/menu nativi, lettore schermo, dispositivi fisici
e import Excel/LibreOffice. Mobile significa emulazione Chrome, non prova su
hardware Android/iOS. Build/bundle/chiusura locale appartengono al solo 16H.

**Operazioni manuali: nessuna.** Nessuna migrazione, nuova dipendenza, modifica
env, connessione Supabase reale, attivazione del gate reale, Docker o deploy.
Prossimo: **16H — Registro e chiusura locale**, **6.1 Sol, high**, con un nuovo prompt.
