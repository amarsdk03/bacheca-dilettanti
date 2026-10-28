# 16D — Produzione locale isolata

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16A–16C conclusi; dipendenze root e tool Chrome già disponibili.

[Master](../../master_plan.md) · [Step 16](README.md) · [Matrice](matrice-verifiche.md)

## Perimetro

Ripetere i controlli anonimi di 16C su una build Admin ottimizzata, avviata con
`next start` soltanto su loopback. Verificare cache private/no-store dell'HTML
effettivo e delle API, noindex, errori del login e idratazione, conservando
log di compilazione e report. Ispezionare gli asset client compilati per
l'eventuale presenza di una chiave tecnica sintetica usata come sentinella.

Usare la copia isolata senza `.env*` e l'ambiente ammesso del runner 16C.
Nessuna sessione valida, credenziale reale, modifica a Supabase, Docker,
deploy o build della Web pubblica. L'HTTP locale non attesta HTTPS, cookie
Secure, CDN o il funzionamento delle pagine autenticate.

## Attività e accettazione

1. Aggiungere una modalità produzione esplicita al runner esistente, mantenendo
   la modalità sviluppo di 16C e il cleanup dei soli processi posseduti.
2. Compilare la copia, registrare bundler/esito e avviare il server di produzione.
3. Eseguire i controlli browser anonimi e richiedere `private`/`no-store` anche
   sull'HTML del login e sulle tredici rotte protette.
4. Registrare l'ispezione degli asset client e i limiti della sentinella:
   non è una scansione di credenziali reali né una prova di pagine autenticate.
5. Eseguire test pertinenti del tooling, aggiornare evidenze e stati.

## Esecuzione e risultati

Esecuzione valida del **25 ottobre 2026**, Windows, Node **24.19.0**, Next
**16.3.4**, Turbopack predefinito, Chrome headless **155.0.0.0**, CLI **1.12.0**.

| Controllo | Evidenza |
| --- | --- |
| Build ottimizzata Admin | `next build` riuscito, inclusa verifica TypeScript; `next start` avviato soltanto su `127.0.0.1` |
| Runner produzione | **14 gruppi superati**, exit code 0; comprende gli undici controlli anonimi di 16C |
| Cache HTML | Login e tutte le **13 rotte protette** con `private, no-cache, no-store, must-revalidate, max-age=0` e `noindex, nofollow, noarchive` |
| Diniego | Tredici navigazioni al login; **7 API** 403 senza dati, private/no-store; nessuna sessione valida emessa |
| Form e rendering | Desktop 1440×900 e mobile 390×844, Arial/light, nessun overflow; tastiera/focus/Eye, validazione, pending, errori e recupero riusciti; nessun errore di idratazione rilevato |
| Asset pubblici | **30 file**, inclusi **29 JavaScript**, **1.587.754 byte**; nessuna occorrenza della sentinella tecnica sintetica |
| Cleanup | Browser, albero Next e fixture arrestati; tutti e tre gli esiti `true` |
| Test del runner | **11 test riusciti**, zero fallimenti/skip; tre nuovi casi per copia produzione e ispezione degli asset; ambiente produzione aggiunto al controllo esistente |
| Regressione completa | **1.286 test riusciti**, zero fallimenti/skip, 87 file; log `node_modules/.cache/dashboard-step16d-regression.log` |
| Lint mirato | Nessun rilievo sui tre file JavaScript interessati |
| Sorgenti e documentazione | 150 file di sorgenti/asset/configurazioni identici fra Admin originale e copia compilata; 33 Markdown e 222 collegamenti locali verificati; diff senza errori di whitespace |

Artefatti locali ignorati da Git:
[report](../../../../.local/dashboard-browser/run-Z08DX7/evidence/report.json),
[build](../../../../.local/dashboard-browser/run-Z08DX7/evidence/build.log),
[server](../../../../.local/dashboard-browser/run-Z08DX7/evidence/next.log),
[console](../../../../.local/dashboard-browser/run-Z08DX7/evidence/console.txt),
[desktop](../../../../.local/dashboard-browser/run-Z08DX7/evidence/login-1440.png),
[mobile](../../../../.local/dashboard-browser/run-Z08DX7/evidence/login-390.png).
Entrambi gli screenshot sono stati ispezionati. Il report contiene soltanto
esiti e metadati: non conserva il valore della sentinella o credenziali.
La compilazione iniziale `run-tQ7KNc` è fallita per il collegamento alle
dipendenze fuori dalla radice Turbopack; non è un'evidenza di successo.

### Ripetere la prova

Dalla root, con gli stessi prerequisiti/tool nella cache dello [step 16C](16c-browser-anonimo.md):

```powershell
npm run test:browser:admin:production
```

Il comando di sviluppo `npm run test:browser:admin` resta disponibile. Il nuovo
comando esegue una build finale dedicata; `npm test` continua a non avviare
Chrome, server o build. Nessun pacchetto aggiunto o aggiornato in questo step.

### Isolamento della produzione

Il runner copia l'Admin in `.local/dashboard-production-admin-*`, senza `.env*`,
`.next` o collegamenti ai sorgenti delle app. Questa posizione mantiene il
significato di `../..` nel `next.config.ts` copiato: la radice monorepo comprende
le dipendenze root già installate e il pacchetto database condiviso. Turbopack
può così risolverli senza modificare configurazione o bundler. Sorgenti Admin,
file generati, tipi e build restano nella copia. Le dipendenze e il pacchetto
database sono letti dal workspace esistente. Il comando non legge i file
d'ambiente delle due app originali.

Il report e il profilo Chrome dedicato restano sotto
`.local/dashboard-browser/run-*`. I percorsi di output sono controllati;
sorgenti reindirizzati e file env sono esclusi dalla copia come in 16C.
L'ambiente figlio è ammesso esplicitamente, con `NODE_ENV=production`, URL Auth
loopback e chiavi sintetiche generate dal runner. Nessuna chiave ereditata.

La chiave tecnica sintetica serve per cercare la sua eventuale inclusione negli
asset client. Il servizio locale rifiuta anche le richieste di audit: il report
conta **quattro richieste alla fixture**, due tentativi Auth e due audit negati.
I due messaggi sanitizzati `ADMIN_AUDIT_WRITE_UNAVAILABLE` nel log sono attesi;
non attestano audit persistito. La fixture non registra i corpi delle richieste
e non emette token o dati. La scansione fallisce con asset mancanti, collegamenti
simbolici o sentinella presente; i relativi casi negativi sono provati nei test.
Il timeout dei comandi arresta l'albero del processo posseduto, inclusi i worker
di compilazione su Windows.

### Limiti e residui

Verificati build e comportamento anonimo in **modalità produzione locale**.
Nessun deploy, HTTPS/CDN, sessione valida, pagina autenticata o Supabase reale.
La sentinella assente da `.next/static` è un controllo su questa compilazione:
non certifica tutti i possibili segreti, i log futuri o un diverso deploy.
I byte contati sono l'intero insieme statico della build, non il download
iniziale del login né la prova del caricamento differito dei grafici autenticati.
Il redirect delle pagine resta HTML in streaming con stato 200 e meta refresh,
verificato fino all'arrivo effettivo al login nel browser.

I residui degli step 03–15 restano nella matrice. L'HTML di produzione locale
private/no-store è ora verificato per il perimetro anonimo; il controllo dev
di 16C conserva i propri valori osservati e non viene riscritto come produzione.

## Operazioni manuali e prossimo passaggio

Nessuna migrazione o configurazione esterna da applicare per questo sottopasso.
Il rilascio rimane separato e le verifiche residue della matrice restano aperte.
Prossimo: pagine autenticate e ulteriori verifiche residue dello step 16,
**6.1 Sol, high**; nessun rilascio automatico.
