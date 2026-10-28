# 05 — Login, sessione e logout

**Stato:** Da terminare — implementazione verificata con risposte sintetiche; prove integrate Supabase/browser pendenti  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze di sviluppo:** 04A e 04B implementati e verificati con PGlite/fixture server. Prove integrate degli step 03–04 obbligatorie prima del rilascio; il solo rinvio di queste prove non blocca lo sviluppo, secondo la scelta aggiornata del master.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Implementare il login centrale con logo banner, Field «Indirizzo admin», Field «Password» con Eye/EyeOff e pulsante wide «Accedi» con icona Key. Usare email/password Supabase Auth, attributi autocomplete corretti, label accessibili, messaggi di errore e stato di invio che eviti duplicazioni.

La root apre Home solo dopo verifica della sessione e del ruolo esatto. Sessione assente o non rinnovabile porta al login; account autenticato ordinario riceve diniego e possibilità di uscire. Nessun dato amministrativo è restituito prima della verifica.

Gestire rinnovo cookie secondo la versione SSR installata, creando client per richiesta e propagando correttamente header/cookie. Le due app mantengono sessioni distinte. Logout della sessione della dashboard, senza terminare indiscriminatamente altre sessioni dell'account.

## Contratto e sicurezza

Guardia server centralizzata per ogni pagina protetta, azione ed endpoint. Le query funzionali accorpano il controllo database; le pagine senza query usano l'ingresso minimo dello step 03. Deduplicazione solo dentro la richiesta; non usare esclusivamente layout/proxy, stato React o metadata del browser.

Verificare token e controllo database senza replicare la catena di query del viewer ordinario, che carica anche dati profilo non necessari agli Admin. Niente cache condivisa delle risposte. Redirect successivi al login soltanto verso percorsi interni consentiti. Nessun signup pubblico o pagina Impostazioni.

Recupero password riservato a un operatore Supabase autorizzato, secondo la scelta
confermata: nessuna pagina pubblica di reset, callback email o modifica del Site URL
condiviso. Registrare accessi/logout attraverso lo step 04.

### Integrazione del servizio audit predisposto in 04B

Usare `createAdminAuditService()` da `features/audit/server` soltanto nel codice
server fidato. Dopo `signInWithPassword` riuscito, chiamare
`recordLoginSuccess(clearLocalSession)`; concedere l'accesso soltanto con
`status: "recorded"`. Diniego o indisponibilità richiedono di rispettare gli esiti
di revoca/pulizia restituiti, senza dichiarare sessione rimossa se la callback fallisce.
Per credenziali errate usare `recordAuthFailure` con codice ammesso, senza inviare
email tentata, credenziali o UUID dell'operatore ricevuti dal browser.

Implementare la callback obbligatoria in un contesto autorizzato a scrivere cookie:
rimuovere tutti i chunk dei cookie della sola sessione Admin, anche se mancano
chiave tecnica o client valido e anche se Auth/audit falliscono. Per il logout
usare `logoutWithAudit(clearLocalSession)`: verifica e snapshot precedono la revoca
locale; la scrittura audit segue la pulizia. Controllare distintamente esiti di
revoca, pulizia e audit; nessuna revoca globale delle altre sessioni.

Il trasporto audit ha timeout di cinque secondi e nessun retry POST; una risposta
incerta può corrispondere a un evento già persistito. Non ritentare automaticamente
il login per compensare l'audit. Il servizio non sostituisce guardie delle pagine
o autorizzazione DB delle operazioni. Cookie SSR reali, refresh, gateway tecnico
e failure handling integrato devono essere verificati oltre alle fixture di 04B.

## Criteri di completamento e verifiche

Login valido/errato, accesso diretto, email non confermata, ruolo non esatto, scadenza con e senza refresh, revoca ruolo/sessione, errore database, logout e tentativo di riuso del token. Verificare cookie separati in locale, tastiera, toggle password e assenza di segreti nei log.

## Migrazioni e operazioni manuali

**Nessuna nuova migrazione o script SQL da applicare in questo step. Nessuna
operazione manuale richiesta ora per continuare lo sviluppo.** Non sono stati
letti/modificati `.env.local`, collegati progetti Supabase o attivate policy.

### Prima di provare il login su un ambiente integrato

1. Usare esclusivamente Supabase locale/staging isolato con schema completo e
   account sintetici. Seguire il percorso 03B per acquisizione/ripristino schema:
   le fixture PGlite non costituiscono uno stack Auth/PostgREST utilizzabile dal sito.
2. Configurare `apps/admin/.env.local` solo se non già predisposto, senza copiare
   automaticamente l'env Web. Servono `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e **server-only** `SUPABASE_SECRET_KEY`
   del medesimo target. Compilare anche destinazione/allowlist di test ed eseguire
   `npm run check:test-target:admin`. Non inviare chiavi/password in chat o nei log.
3. Sul target verificato applicare soltanto le migrazioni mancanti, in ordine:
   `20261024095639_admin_authorization_foundation.sql`,
   `20261024104822_admin_audit_foundation.sql`,
   `20261024110910_admin_audit_server_bridge.sql`. Seguire i runbook
   [03](03-autorizzazione-database.md), [04A](04a-audit-database.md) e
   [04B](04b-audit-server.md), inclusi backup, ACL, esposizione schema e recupero.
   Non rieseguire foundation già installate; nessun `db push` sul progetto reale.
4. Provisionare l'account Auth dedicato e confermato e la mappatura `utente` con
   `tipologia_utente = 'Admin'` esatto tramite procedura riservata dello step 03.
   Verificare versione/impostazioni Auth del target e solo allora attestare la
   policy con la sua configurazione locale/staging. Il file reale già compilato
   dall'operatore non attesta il target di prova e **non va eseguito ora sul reale**.
   La policy non attestata mantiene il login bloccato con errore controllato.
5. Dalla root avviare manualmente `npm run dev:admin`, aprire
   `http://localhost:3001/accesso` e provare accesso, refresh e logout. Per staging,
   distribuire soltanto dopo aver configurato il progetto Admin separato.
   Email/password non richiedono nuovi redirect email; lasciare invariati Site URL
   e template della Web. Cron resta un'operazione separata di 04A.

### Recupero password — soltanto operatore autorizzato

Procedura riservata da verificare prima su account sintetico; non eseguita
dall'agente. Non usare form pubblici della Web, metadata o conversione di account
ordinari per ripristinare l'accesso.

1. Verificare fuori dall'app l'identità del richiedente, il target e l'UUID Auth
   dedicato, confrontandolo con `utente.auth_user_uuid`. Il recupero non assegna
   né modifica `tipologia_utente`.
2. In un contesto operativo server riservato usare un client Supabase tecnico
   separato, senza persistenza/refresh automatici, e
   `auth.admin.updateUserById(authId, { password: nuovaPassword })`. Fornire la
   password mediante un canale riservato, mai come argomento di shell, file
   versionato o output. Controllare l'errore prima di proseguire.
3. Il cambio password non basta ad attestare la revoca delle sessioni. Se manca
   un JWT valido dell'account, ottenere una sessione temporanea usando la nuova
   password con **un altro client operativo** a chiave pubblica, senza cookie o
   persistenza condivisi con le app. Verificare che l'utente restituito coincida
   con l'UUID approvato. Passare quel JWT a
   `clientTecnico.auth.admin.signOut(jwt, "global")`, controllando l'esito.
   Questo logout globale è riservato al recupero; il pulsante della dashboard
   usa sempre scope locale. Non conservare JWT o password nei documenti.
4. Verificare con l'operatore SQL che non restino sessioni di quell'UUID e, nelle
   prove integrate, che un vecchio token venga respinto dal controllo DB anche
   prima della propria scadenza JWT. Non considerare sufficiente il solo esito
   del cambio password. Eliminare la sessione e i segreti temporanei dal contesto
   operativo e verificare un nuovo login tramite dashboard, con relativo audit.

Se cambio password o revoca falliscono, non dichiarare completato il recupero:
gestire il problema nel contesto riservato, senza disabilitare le protezioni o
modificare implicitamente la policy condivisa. Un rollback applicativo non annulla
un cambio password né ripristina sessioni revocate; i runbook DB restano quelli
degli step 03–04. Nessun intervento sul reale è stato eseguito.

## Avanzamento

### Implementato

- `/accesso`: logo, Field email/password, Eye/EyeOff, Key, invio pendente,
  errori accessibili, skeleton e messaggi controllati. Nessuna credenziale o errore
  grezzo restituito dalla Server Action. Light/Arial mantenuti.
- `/`: verifica server prima della Home minima «Bentornato, admin!» e del Logout.
  Sessione assente/token non valido senza identità verificata → `/accesso`;
  sessione verificata ma non autorizzata → diniego con Logout; indisponibilità →
  stato riprovabile. Login di Admin già valido → `/`. Redirect fissi, nessun `next`
  arbitrario ricevuto dal browser. Layout/KPI non anticipati.
- `features/auth/server/context.ts`: verifica `getClaims` e singola RPC
  `admin_get_context_v1`; stessa logica usata dall'audit. Email confermata, ruolo
  esatto e sessione attuale sono verificati dal DB. Policy non attestata distinta
  dalle credenziali errate; nessuna cache del ruolo tra operazioni.
- `getAdminContext`: deduplicazione React limitata al rendering della richiesta.
  `requireAdminSession`: guardia per azioni/endpoint con client scrivibile e
  verifica nuova a ogni invocazione; le future RPC dati dovranno continuare a
  verificare l'autorizzazione nella transazione, senza un controllo per riga.
- Client SSR di lettura/scrittura separati, proxy solo per refresh GET/HEAD,
  nessun refresh preliminare che ritardi le Server Actions POST. Accumulo di tutti
  i batch cookie e propagazione degli header SDK; risposte Admin private/no-store.
  Timeout di dieci secondi per singola richiesta Auth/DB, cinque per audit.
  Non sono una garanzia sulla durata complessiva di un flusso o sui retry refresh
  interni all'SDK; nessun retry applicativo automatico del login/audit.
- Buffer per login nuovo, senza ereditare l'identità di vecchi cookie; nuovi cookie
  inviati solo dopo verifica e audit `recorded`. Cookie precedenti non più necessari
  scaduti alla conferma. Errori, anche durante il commit cookie, tentano revoca
  locale e pulizia senza concedere il login.
- Logout: snapshot, scope locale, pulizia anche su errore Auth/configurazione/audit;
  copre cookie base, tutti i chunk e storage accessorio Admin. Cookie Web preservati.
  Esiti revoca/pulizia/audit distinti: se la pulizia fallisce nessun redirect che
  dichiari uscita completata; possibile riprovare da un form Logout separato.
- `createAdminAuditService(getSessionClient?)` accetta un client fornito dal server
  per la medesima operazione; mantiene il client tecnico di audit distinto e pigro.
  Nessun nuovo ingresso HTTP pubblico oltre alle Server Actions di login/logout.

Componenti generati tramite CLI shadcn dal registro ufficiale: Field, InputGroup,
Button, Alert, Skeleton, Spinner e relative dipendenze locali. Corretti gli import
`cn` generati usando l'utility già presente, senza dipendenza aggiuntiva Admin.
Nessun import dai sorgenti privati Web.

### Verifiche eseguite

```text
node --test tests/admin-auth-server.test.mjs tests/admin-auth-interface.test.mjs tests/admin-audit-server.test.mjs tests/admin-audit-bridge-database.test.mjs tests/admin-audit-database.test.mjs tests/admin-authorization-database.test.mjs tests/admin-web-boundary.test.mjs
npm run typecheck:admin
npm run typecheck
```

**257 test riusciti, zero fallimenti/skip**, inclusi 54 nuovi casi Auth/UI.
TypeScript di entrambe le app e lint mirato senza errori/avvisi. Compilazione
PostCSS/Tailwind dell'Admin riuscita in memoria, con Arial e selettori componenti
presenti, senza generare un build di produzione. I test eseguono i moduli reali con risposte
sintetiche, includono SDK SSR installato e adapter NextRequest/NextResponse per
login con più chunk, refresh da token scaduto e logout. Le regressioni DB restano
esclusivamente su PGlite in memoria. UI verificata tramite rendering statico con
stati sintetici: label, autocomplete, toggle, errori, invio, diniego e redirect.

Nessun dev server, build di produzione, connessione Supabase o prova su dati reali.
Queste verifiche non dimostrano firma JWT remota, gateway, configurazione Auth,
revoca reale, comportamento browser o tempi su un progetto integrato.

### Residui obbligatori prima del rilascio

Provare su ambiente isolato: login ammesso/negato ed email non confermata, revoca
ruolo/sessione e riuso token, scadenza con/senza refresh, concorrenza tra schede,
chiave audit mancante/errata, timeout/risposte incerte, cleanup cookie dopo errori,
HTTP/RSC/Server Actions e cache effettive del deployment. Verificare recupero
riservato, assenza di segreti nei bundle/log, isolamento Web/Admin anche su
localhost, tastiera/focus/toggle e mobile nel browser. Misurare chiamate e latenze;
il solo controllo sintetico di una RPC contesto per login non è un benchmark.
Riprendere anche i residui 03–04; nessuna attivazione della policy reale ora.

Riferimenti: documentazione Next.js installata su autenticazione, forms, cookies,
proxy e sicurezza; [SSR Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[cache e SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide),
[logout locale](https://supabase.com/docs/reference/javascript/auth-signout),
[cambio password riservato](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid),
[revoca riservata](https://supabase.com/docs/reference/javascript/auth-admin-signout).

## Prossimo step

[06 — Layout e navigazione](06-layout-navigazione.md), **6.1 Sol, medium**.
La parte implementativa verificata consente di proseguire lo sviluppo secondo
il master; lo step 05 resta Da terminare fino alle prove integrate sopra elencate.
