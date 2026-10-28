# 04B — Ingressi server riservati per audit

**Stato:** Concluso — implementazione verificata con PGlite e dipendenze server sintetiche  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 04A implementato e verificato con PGlite.

[Master](../master_plan.md) · [Step 04](04-audit-persistente.md)

**Integrazione M03 avviata il 25 ottobre 2026:**
[guida operativa M03](../integrazione/03-audit-backend.md) e
[controllo cataloghi prima/dopo](../../../supabase/scripts/dashboard_admin_check_m03.sql)
predisposti per Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`, Supabase Free.
M02 e copia manuale dopo M02 già riscontrati; nessuna nuova copia richiesta ora.
211 test mirati e lint riusciti, inclusi sei nuovi del verificatore. Registro M03
**Concluso**: controllo iniziale delle 18:32:15 UTC con zero oggetti e report
finale delle 18:34:27 UTC `m03_structurally_verified`, due funzioni presenti,
hash e privilegi corrispondenti, esecuzione solo a service_role tra i ruoli API
verificati. M01/M02 ancora coerenti. Nessuna operazione manuale residua M03 e
nessuna esecuzione remota dell'agente; gateway e prove integrate non attestati.
Lo stato Concluso di 04B sopra riguarda l'implementazione locale, non il gateway.

## Obiettivo e confini

Predisporre gli ingressi server riservati necessari a login/logout e fallimenti
significativi, integrabili nello step 05 e nelle successive operazioni funzionali.
Gli helper di 04A non sono callable dai ruoli API, nemmeno con service key.
Non concedere accesso diretto al registro per aggirare questo confine.

- Definire un ponte server verificabile che impedisca al browser di inventare
  operatore, esito o variazioni. Derivare l'identità da verifiche server effettive,
  non dall'email dichiarata o da UUID ricevuti dal form.
- Registrare fallimenti dopo il rollback dell'operazione originale. Usare
  soltanto codici d'errore ammessi; non salvare messaggi grezzi, credenziali o token.
- Login/export richiedono audit prima di dichiarare successo; logout rimuove
  comunque l'accesso locale se la scrittura audit fallisce.
- Conservare gli eventi delle modifiche nelle relative transazioni DB: il ponte
  server non può sostituire un audit atomico con una chiamata successiva.
- Verificare contratti server con dipendenze sintetiche e permessi con PGlite;
  documentare Auth/PostgREST/trasporto come ancora da verificare su Supabase.

## Implementazione e contratti

La migrazione [20261024110910_admin_audit_server_bridge.sql](../../../supabase/migrations/20261024110910_admin_audit_server_bridge.sql),
generata con Supabase CLI 2.122.0, introduce:

- `public.admin_record_server_audit_v1`: RPC `security invoker`, eseguibile solo
  da `service_role`, che delega al ponte privato.
- `private.record_admin_server_audit_v1`: `security definer`, proprietario
  `postgres`, `search_path` vuoto; richiede sia il ruolo SQL originale sia il
  claim tecnico `role` uguali a `service_role`. Il controllo sul ruolo originale
  impedisce di entrare da un'altra funzione definer chiamata da `authenticated`.
- Successi ammessi soltanto per `auth.login` e `auth.logout`; fallimenti limitati
  alle azioni e ai codici di 04A. Tipo di risorsa derivato dall'azione; nessun
  parametro per testo libero, timestamp, motivazioni o variazioni.

Gli ID dell'operatore sono attestati dal backend fidato. Il ponte **non verifica
la sessione umana** e non autorizza operazioni amministrative: ciò permette di
scrivere il logout anche dopo la revoca della sessione. Il codice server deve
derivare questi ID dal contesto verificato, mai dal form o dai metadata del browser.
Successi di moderazione/export non sono accettati da questo ingresso: restano
da implementare atomicamente nelle rispettive procedure funzionali.

Non vengono concessi accesso diretto alla tabella, esecuzione dell'append privato
o della retention, né autorizzazione umana tramite la chiave tecnica. Viene
concesso `USAGE` sullo schema `private` a `service_role`: gli ACL degli altri oggetti
già presenti e la mancata esposizione dello schema vanno verificati sul target.

Il servizio [server/index.ts](../../../apps/admin/src/features/audit/server/index.ts)
espone `createAdminAuditService()` per codice server fidato, senza Server Action
o endpoint browser in questo step. I contratti sono in
[contracts.ts](../../../apps/admin/src/features/audit/contracts.ts), la logica in
[service.ts](../../../apps/admin/src/features/audit/server/service.ts) e il trasporto in
[transport.ts](../../../apps/admin/src/features/audit/server/transport.ts).

- Client di sessione per richiesta: `getClaims()` verifica il token tramite SDK;
  controlli su subject, session ID, ruolo e scadenza; `admin_get_context_v1`
  verifica sul DB sessione e ruolo esattamente `Admin`. Gli ID Auth/app devono
  essere coerenti. Nessuna cache di autorizzazione tra invocazioni.
- Client tecnico distinto, creato pigramente con `SUPABASE_SECRET_KEY`, senza
  cookie utente, persistenza o refresh automatico. La chiave è privilegiata a
  livello di progetto, non limitata dal provider al solo audit; il modulo ne
  limita l'uso alla singola RPC. Mai prefisso `NEXT_PUBLIC_` per questa variabile.
- Richiesta audit con `cache: no-store`, timeout di cinque secondi, parametri
  espliciti e nessun retry delle scritture. La versione PostgREST installata non
  ritenta gli RPC POST, inclusi errori di rete. Un timeout può comunque lasciare
  un evento già scritto: la correlazione serve a indagare, non è idempotenza.
- `recordLoginSuccess(clearLocalSession)`: usare solo dopo `signInWithPassword`
  riuscito. Restituisce `recorded` solo con contesto Admin e audit persistito;
  altrimenti tenta revoca locale e pulizia obbligatoria, riportandone l'esito.
- `recordAuthFailure` e `recordOperationFailure`: codici ammessi, nessun messaggio
  grezzo o identità dichiarata; fallimenti funzionali soltanto **dopo il rollback**.
  Un errore audit non sostituisce l'errore originale dell'operazione.
- `logoutWithAudit(clearLocalSession)`: verifica e conserva il contesto per questa
  operazione, tenta `signOut({ scope: "local" })`, esegue la pulizia nel `finally`,
  poi scrive l'audit. Se manca un Admin verificato non inventa un logout riuscito.
  Fallimenti di revoca/pulizia sono distinti dall'esito della registrazione.

La callback di pulizia cookie è obbligatoria; lo step 05 deve implementarla nel
contesto che può scrivere cookie, rimuovendo tutti i chunk della sola sessione
Admin. Qui è verificato il contratto con callback sintetiche, non la pulizia SSR
integrata. Anche le chiamate Auth/contesto e il comportamento di rete reale
restano da misurare; il timeout riguarda la richiesta di scrittura audit.

**Aggiornamento step 05:** callback, buffer cookie, Server Actions e client SSR
sono ora implementati e verificati anche con SDK installato e HTTP sintetico.
Le prove Supabase/browser reali restano pendenti; vedere [05](05-accesso-sessione.md).

I log contengono soltanto codice operativo fisso e UUID di correlazione; errori
di SDK/trasporto, URL, chiavi, email, password e token non vengono propagati.
I tipi RPC condivisi in `packages/database/src/index.ts` sono allineati manualmente
alla nuova migrazione; confronto/rigenerazione da schema completo rinviati al 16.

## Verifiche eseguite

Comandi eseguiti con successo, senza Docker o connessioni Supabase:

```text
node --test tests/admin-audit-bridge-database.test.mjs tests/admin-audit-server.test.mjs tests/admin-audit-database.test.mjs tests/admin-authorization-database.test.mjs
npm run typecheck:admin
npm run typecheck
node node_modules/eslint/bin/eslint.js apps/admin/src/features/audit packages/database/src/index.ts tests/admin-audit-bridge-database.test.mjs tests/admin-audit-server.test.mjs tests/helpers/admin-server-loader.mjs
```

**200 test riusciti, zero fallimenti o skip**, TypeScript di entrambe le app e
lint mirato senza rilievi. Migrazioni applicate soltanto alle fixture PGlite.
Verificati ACL, invoker/definer, diniego ai ruoli API ordinari anche con claim
contraffatti, chiamata tramite proxy definer di prova, rifiuto dei successi
funzionali, rollback senza foundation e mancato accesso diretto all'archivio.
I test server eseguono i moduli TypeScript con SDK/risposte sintetiche: login
bloccato su errore audit, pulizia indipendente, ordine del logout, identità
derivate, assenza di retry/cache e redazione degli errori.

Queste prove non attestano gateway PostgREST, firma JWT, Auth remoto, cookie SSR
reali o gli ACL dello schema completo. Nessun build di produzione o dev server.

## Operazioni manuali e verifiche integrate residue

**Per lo sviluppo locale non erano richieste operazioni manuali.** Il percorso
di applicazione attualmente avviato su richiesta dell'utente è nella guida M03
collegata sopra: controllo iniziale, migrazione e controllo finale nel SQL Editor
del progetto identificato, senza replay M01/M02. Il report finale utente delle
18:34:27 UTC ne riscontra applicazione e confronto strutturale; nessun replay M03.
L'esempio env Admin contiene
solo il nome della chiave; nessun `.env.local` letto o modificato. Lo step 04
complessivo resta **Da terminare** per le prove integrate e l'attivazione Cron.

Prima delle prove integrate, usare un target locale/staging isolato con dati
sintetici e schema completo, seguendo i prerequisiti 03B:

1. Verificare backup/baseline, schema `private` non esposto e ACL dei suoi oggetti
   preesistenti, inclusi eventuali `EXECUTE` ereditati da `PUBLIC`. Il nuovo `USAGE`
   non deve aprire funzioni estranee. Non applicare grant indiscriminati.
2. Applicare come `postgres`, tramite SQL Editor del target o runner locale
   verificato, nell'ordine: foundation autorizzazione
   `20261024095639_admin_authorization_foundation.sql`, foundation audit
   `20261024104822_admin_audit_foundation.sql`, quindi la nuova migrazione 04B.
   Applicare solo quelle mancanti: non rieseguire una migrazione già installata.
   La dichiarazione dell'utente sulla foundation del progetto reale non è una
   verifica di questo target isolato; non autorizza applicazioni sul reale.
3. Configurare **solo l'app Admin** con URL/chiave pubblica e `SUPABASE_SECRET_KEY`
   dello stesso target, tramite `.env.local` locale o segreti del deployment di
   staging. Non copiare credenziali della webapp reale né esporre la chiave tecnica.
4. Verificare cataloghi: wrapper invoker, ponte definer di proprietà `postgres`,
   search path vuoto e `EXECUTE` solo tecnico; nessun nuovo accesso alla tabella,
   all'append privato o alla retention. Provare il diniego con anonimo e utente
   ordinario/Admin autenticato anche chiamando direttamente la RPC pubblica.
5. Verificare che il gateway associ alla chiave tecnica ruolo SQL e claim attesi;
   le fixture li simulano, non dimostrano il comportamento del progetto. Con una
   sessione Admin autentica, verificare `getClaims` + contesto DB separatamente
   dalla scrittura tecnica, e controllare l'evento persistito.
6. Dopo l'integrazione nello step 05, provare errori Auth/DB/audit, timeout, revoca,
   pulizia di tutti i chunk Admin e conservazione dei cookie Web. Verificare che
   il browser non riceva segreti e che un audit fallito impedisca il login.
   Misurare tempi/chiamate senza aggiungere controlli per ogni riga della lista.

Lo script `dashboard_admin_verify_session_policy.sql` compilato dall'operatore
non è stato modificato né eseguito: attivazione e attestazione rimangono nel
percorso 03B. Il job di retention resta separato, secondo il runbook di 04A.

### Recupero

La migrazione è transazionale: su errore eseguire `ROLLBACK` se il client mantiene
la transazione aperta, correggere il prerequisito e riprovare sul target isolato.
Dopo un'applicazione riuscita preferire una migrazione correttiva, preservando
gli eventi. Per sospendere l'ingresso tecnico, come `postgres`:

```sql
revoke execute on function public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text) from service_role;
revoke execute on function private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text) from service_role;
```

Non revocare globalmente `USAGE` sullo schema, che potrebbe servire ad altri
oggetti. Durante la sospensione il login integrato fallisce senza concedere
accesso, mentre il logout tenta comunque la pulizia locale. Ripristinare solo
gli `EXECUTE` puntuali dopo correzione verificata. Non cancellare l'archivio.

## Prossimo step

[05 — Accesso e sessione](05-accesso-sessione.md), **6.1 Sol, high**.
Attendere un nuovo prompt; nessuna interfaccia login implementata in 04B.
