# IN03 — Accettazione reale Auth/PostgREST e Web/Admin

**Stato:** Concluso.  
**Ultimo aggiornamento:** 2026-10-28, trenta controlli riusciti e identità temporanea rimossa.  
**Modello consigliato:** 6.1 Sol, high.  
**Dipendenza:** [IN02 Concluso](auth-accesso-admin.md), progetto autorizzato `nsytraextbndfyprwzts`.

[Master](../master_plan.md) · [Runbook §8](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md#8-accettazione-e-attivazioni-finali).

Un solo step: verifiche effettive Auth/PostgREST, audit e isolamento Web/Admin.
Nessun replay di migrazioni, attivazione cestino, Cron o deploy.
Non sostituire le prove reali con PGlite o claim JWT impostati nel SQL Editor.

## Esiti verificati: 30 controlli

| Gruppo | Esito | Controlli |
| --- | --- | --- |
| Auth pubblico | Impostazioni raggiungibili, HTTP 200 | 1 |
| RPC umane anonime | Contesto Admin e riepilogo Home negati: HTTP 401, codice 42501 | 2 |
| Schema privato | Content-Profile private rifiutato: HTTP 406, PGRST106 | 1 |
| RPC umane con client tecnico | Contesto Admin e riepilogo Home negati: HTTP 403, codice 42501 | 2 |
| Pagine locali anonime | Home, Annunci e Registro riportano al login tramite redirect HTML in streaming | 3 |
| API locali anonime | Home summary, Annunci e Registro rispondono HTTP 403 | 3 |
| Login sintetico negato nel browser | Credenziali fittizie rifiutate, /accesso e nessun cookie Admin | 1 |
| Letture con login umano | Home summary, Annunci e Registro: HTTP 200, status ok, private/no-store | 3 |
| Audit persistente | Tentativo negato e login umano riuscito riscontrati tramite lista/dettaglio del Registro | 2 |
| Rinnovo reale | Rotazione refresh/access token da parte dell'app, identità conservata e lettura Home riuscita | 1 |
| Logout dall'interfaccia | Pulsante reale, ritorno a /accesso e cookie Admin rimossi | 1 |
| Revoca effettiva | Sessione autentica disconnessa rifiutata: HTTP 403 denied, JWT ancora temporalmente valido | 1 |
| Sessioni indipendenti | Osservatore distinto ancora autorizzato dopo il logout locale della primaria | 1 |
| Audit del logout | Evento success persistente della sessione primaria letto dall'osservatore | 1 |
| RPC con identità non Admin | Identità Auth reale priva di mapping applicativo: contesto e Home negati, HTTP 403/42501 | 2 |
| API con identità non Admin | Home summary, Annunci e Registro negati: HTTP 403/denied | 3 |
| Logout Web indipendente | Cookie Web rimossi e refresh revocato; cookie Admin invariato e API Admin ancora autorizzata | 1 |
| Logout Admin indipendente | Cookie Admin rimossi; cookie Web invariato, viewer Web sul server e sessione Auth ancora validi | 1 |

I primi tredici esiti erano già salvati prima della conferma di accesso e
non sono stati ripetuti senza motivo. Il login dell'utente è stato confermato
dalle risposte protette delle **22:10:43 UTC**, oltre che dalla navigazione
effettiva nella dashboard. Nessuna password o token esportato.

Il test tecnico usa la chiave server soltanto verso due RPC umane, senza
richieste di scrittura. Il caso negativo usa un indirizzo inesistente in una
scheda isolata, poi chiusa: non ha creato un account Auth.
Evento del tentativo negato riscontrato con correlazione
`c9233247-69eb-4cf4-8163-3c4eca9dac5f`.
Evento del login riuscito riscontrato alle **22:17:37 UTC**, correlazione
`2f4909ab-c954-4903-846a-c79b5d005241`, confrontando in memoria la risorsa
sessione dell'audit con la sessione corrente. Nei report restano soli esiti
e riferimenti di correlazione, senza email, contenuti o credenziali.

### Metodo del rinnovo

Alle **22:13:57 UTC** è stata anticipata esclusivamente la proprietà
`expires_at` nella cache cookie della sessione di prova. JWT firmato e refresh
token erano quelli autentici già emessi da Auth. La richiesta reale a
`/api/home/summary` ha attivato SDK/proxy: refresh token e access token
ruotati, stessa identità, nuova scadenza futura, risposta 200/ok e cookie
aggiornati dall'app. Il controllo non simula la firma e non disabilita limiti
del progetto; non è una prova di attesa naturale di un'ora.

Le pagine sono osservate in **development**: Cache-Control
`no-cache, must-revalidate` e robots `noindex, nofollow, noarchive`.
Le API hanno private/no-store. Non attestare header di produzione, HTTPS,
CDN o bundle di deploy da questi esiti.

## Logout, revoca e osservatore indipendente

Il 28 ottobre il browser e il server precedenti risultavano chiusi. Sono stati
riavviati dopo averne verificato lo stato. L'utente ha autenticato nuovamente
l'osservatore; la sessione primaria conservata nel profilo è stata recuperata
e confrontata con l'audit originario, correlazione
`2f4909ab-c954-4903-846a-c79b5d005241`. Non è stato necessario un altro login
manuale della primaria.

Alle **17:06:22 UTC** l'osservatore risultava autorizzato e con sessione
distinta. Il pulsante Logout reale della primaria ha riportato a `/accesso`
con cookie Admin assenti. Alle **17:06:57 UTC** il replay temporaneo della
sessione autentica appena disconnessa, conservata soltanto in memoria browser,
ha ricevuto **HTTP 403, status denied**, mentre il JWT era ancora temporalmente
valido. Il probe ha rimosso i cookie riprovati e il materiale in memoria.

Alle **17:07:23 UTC** l'osservatore era ancora autorizzato e ha riscontrato
l'evento `auth.logout`, outcome `success`, associato alla stessa sessione
primaria. Il primo controllo dell'audit filtrava solo il 27 ottobre: il probe
è stato corretto includendo la data corrente e la lettura ripetuta, senza
ripetere il logout. Nessuna revoca globale.

Il confronto dei cookie Web durante il primo replay riguardava liste vuote;
resta evidenza storica e non è usato come prova di isolamento. La prova con
sessione Web valida è stata eseguita separatamente, come descritto sotto.

## Identità sintetica autorizzata e isolamento Web/Admin

La prima esecuzione era stata respinta dalla revisione automatica per mancanza
di consenso specifico al ciclo di creazione e cancellazione. Il 28 ottobre
l'utente ha risposto **«procedi» alla domanda esplicita immediatamente precedente**,
che descriveva creazione, test, revoca, cancellazione e rischio di pulizia
incompleta. L'autorizzazione contestuale è registrata; la nuova esecuzione è
stata approvata. Il precedente rifiuto non è stato aggirato.

`.local/dashboard-integration/in03-live-fixture.mjs` ha creato **una sola**
identità Auth casuale su `nsytraextbndfyprwzts` alle **17:13:07 UTC**:
email example.invalid confermata, password casuale, nessun registration intent,
mapping `utente` assente e nessun profilo o annuncio. Non sono state inviate
email né modificati ruoli, password o dati degli account esistenti.
Si tratta del caso **identità Auth senza mapping applicativo**, non di un
account ordinario già registrato con profilo completo.

Il client pubblico ha effettuato un login autentico, senza claim simulati.
Le RPC contesto/Home hanno restituito **403/42501**. Alle **17:14:39 UTC**,
in un contesto browser isolato, le tre API Admin hanno risposto **403/denied**.
I cookie sintetici di quel contesto sono stati rimossi subito dopo.

Nel contesto dell'osservatore Admin sono state installate, tramite bridge
loopback temporaneo, le credenziali della sessione Auth Web nel formato SSR
effettivo, senza esportarle nei report. I due cookie, le identità e le sessioni
sono distinti. La Web locale ha renderizzato il viewer sintetico sul server.
La fase di immissione delle credenziali nel form Web non è oggetto di questa
prova: il login password è stato eseguito dal client Auth e le due azioni di
logout sono quelle reali delle app.

1. **Web → Admin:** pulsante `Esci` effettivo della Web, ritorno a `/accedi`,
   cookie Web rimossi. Alle **17:15:32 UTC** il cookie Admin era identico e
   `/api/home/summary` ancora **200/ok**. Il refresh della sessione Web
   disconnessa è stato rifiutato; un secondo login della medesima identità
   temporanea ha preparato la prova inversa, senza creare un altro account.
2. **Admin → Web:** pulsante Logout effettivo dell'osservatore Admin.
   Alle **17:16:05 UTC** cookie Admin assenti, cookie Web identico,
   nuova risposta server Web con viewer sintetico e `auth.getUser()` riuscito.
   Il risultato non dipende da una pagina già renderizzata in cache.

### Ambiente e pulizia verificata

La Web è stata avviata una sola volta su `http://127.0.0.1:3000`, con il solo
gate del sito escluso mediante `SITE_ACCESS_RESTRICTED=false` nel processo di
test. File env, policy Supabase e configurazione normale non sono cambiati.
La prova non certifica il gate del sito o il deployment di produzione.
Il processo Web di collaudo è stato fermato dopo le verifiche.

Alle **17:16:26 UTC** la sessione sintetica è stata revocata; l'account è stato
cancellato solo dopo confronto di UUID, email casuale e tag della fixture.
Una lettura amministrativa per il medesimo UUID ha restituito **404**:
`deleted=true`, `fixtureSessionRevoked=true`, nessun errore di cleanup.
Cookie Web eliminati; helper loopback terminato e credenziali in memoria
rilasciate. Le due sessioni Admin di collaudo sono disconnesse, senza revoca
globale. Il server Admin su `http://127.0.0.1:3001` resta disponibile al login;
PID/log nel relativo report locale. Nessuna operazione manuale residua IN03.

## Evidenze e criterio di uscita

In `.local/dashboard-integration/`, ignorata da Git:

- `in03-public-preflight.json`: quattro controlli HTTPS anonimi del 27 ottobre,
  12:00:39 UTC.
- `in03-transport-checks.json`: due controlli tecnici e sei ingressi locali,
  12:04:19 UTC.
- `in03-negative-browser.json`: diniego browser sintetico precedente; il
  suo campo audit non verificato resta storico.
- `in03-authenticated-routes.json`: tre letture protette e audit del tentativo
  sintetico riscontrato dopo il login reale.
- `in03-login-audit.json`: login riuscito della sessione corrente riscontrato.
- `in03-refresh.json`: rinnovo reale tramite SDK/proxy e risultato.
- `in03-primary-resumed.json`: sessione primaria recuperata e audit originario.
- `in03-observer-before-logout.json`: osservatore indipendente prima del logout.
- `in03-logout-click.json` e `in03-after-logout.json`: azione UI e stato anonimo.
- `in03-revocation.json`: replay negato con JWT ancora temporalmente valido.
- `in03-observer-after-logout.json`: osservatore autorizzato e audit del logout.
- `in03-fixture-approval.json`: rifiuto iniziale, autorizzazione contestuale ed esecuzione.
- `in03-live-fixture-report.json`: due dinieghi RPC, revoca e cancellazione verificata.
- `in03-live-fixture-controller.json`: UUID/tag di pulizia e helper terminato; nessuna credenziale.
- `in03-non-admin-browser.json`: tre API negate con identità Auth autentica.
- `in03-isolation-before.json` e `in03-web-before-logout.json`: coesistenza e viewer Web reale.
- `in03-web-after-web-logout.json`, `in03-admin-after-web-logout.json` e
  `in03-web-renewal.json`: logout Web, Admin invariato e refresh Web revocato.
- `in03-web-after-admin-logout.json`: Web ancora autorizzata dopo logout Admin.
- `in03-fixture-cleanup.json`: rimozione dell'identità temporanea e dei cookie.
- `in03-web-server.json`: avvio e arresto del processo di collaudo Web.
- `in03-admin-server.json` e log: risorse locali della prova.
- `in03-checkpoint.json`: trenta controlli e completamento del perimetro IN03.

Nessun codice delle app, schema, ruolo, policy o allowlist dei runner
modificato intenzionalmente. Sono avvenuti login, rinnovo, logout locali,
scritture audit previste dall'app e il ciclo autorizzato di un'identità
temporanea, poi rimossa. Nessuna migrazione, revoca globale, build o pubblicazione.

**IN03 Concluso nel perimetro sopra verificato.** Il checkpoint valida
asserzioni, report, hash e collegamenti della documentazione, senza ripetere
le prove già riuscite o esporre credenziali. Nessun test applicativo aggiuntivo
necessario: non è cambiata l'implementazione delle app.

Restano nella [matrice generale](../steps/16-verifica-rilascio/matrice-verifiche.md)
i casi non coperti da questa sessione, comprese le varianti di ruolo/email e
i flussi di un utente ordinario con registrazione completa, oltre a prestazioni,
compatibilità Web, cache/Storage e recupero. IN03 non chiude lo step 16 generale
e non autorizza cestino, Cron o deploy. IN02 resta Concluso. Prossimo lavoro:
revisione compatibilità Web, cache e Storage, non avviata automaticamente.
