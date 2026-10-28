# 03 — Autorizzazione Admin nel database

**Stato:** Da terminare — autorizzazione verificata nelle fixture; prove Supabase complete non eseguite, percorso Docker fuori dal flusso scelto
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** Step 02 concluso. Prima fase autorizzata su PGlite; ambiente Supabase completo ancora da verificare.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Realizzare la base riutilizzabile di autorizzazione delle procedure Admin. Consultare le skill Supabase/Postgres, la documentazione corrente e lo schema ricostruito dalle migrazioni.

- Verificare identità Auth, email confermata, sessione corrente e collegamento tramite `utente.auth_user_uuid`.
- Ammettere solo `tipologia_utente` esattamente `Admin`, senza trim o confronto case-insensitive.
- Verificare `session_id` e condizioni temporali applicabili, revoca e blocco dell'identità. Non equiparare automaticamente la presenza di una riga sessione a validità completa.
- Proteggere la colonna ruolo da registrazione pubblica, aggiornamenti ordinari, payload manipolati e procedure con privilegi.
- Verificare che gli Admin possano esistere senza sottoprofili e che gli ingressi personali della webapp non li trattino da account ordinari.
- Predisporre lookup indicizzati e helper privati minimi; permessi espliciti e search path sicuro per eventuali funzioni con privilegi elevati. Non esporre tabelle Auth.
- Documentare provisioning manuale, rimozione ruolo, revoca sessioni e recupero credenziali senza riportare segreti.

## Contratto e prestazioni

Le procedure funzionali successive useranno la sessione del chiamante e deriveranno l'operatore dal contesto verificato. Nessun parametro `actorId` deciso dal client autorizza l'operazione. Un ingresso minimo di controllo serve pagine senza query funzionali.

Accorpare autorizzazione e operazione nella stessa chiamata database; controlli indipendenti dalle righe una volta per operazione/statement ove possibile. Non usare cache del ruolo tra richieste o un ruolo JWT come unica fonte. Eventuali errori negano l'accesso.

## Criteri di completamento e verifiche

Provare anonimo, ordinario, Admin valido, email non confermata, riga mancante, `admin`, `ADMIN`, spazi, sessione scaduta/revocata e ruolo revocato dopo il login. Provare assegnazione abusiva e chiamata diretta delle procedure. Controllare piani dei lookup e permessi degli helper.

La revoca blocca la richiesta successiva; non annulla un'operazione già iniziata. Non cambiare implicitamente i timeout globali del progetto condiviso.

## Migrazioni e operazioni manuali

Migrazioni additive per helper, grant/RLS e indici necessari, più eventuali correzioni al provisioning. Generare i file secondo il workflow della repository, registrarli qui e verificarli su dati sintetici. Produzione separata dal test e dal completamento locale dello step. Su scelta successiva dell'utente, 03A applicato/verificato su PGlite è la dipendenza di sviluppo per 04A. Il percorso 03B con Docker è oggi un'alternativa storica, non un prerequisito; le prove integrate non eseguite restano nella [matrice 16A](16-verifica-rilascio/matrice-verifiche.md).

## Avanzamento

### Fase 03A implementata — 24 ottobre 2026

Su indicazione dell'utente, partire con **PGlite** e lasciare lo step **Da terminare**
fino alle prove su Supabase completo. La configurazione Auth remota non è nota:
non si presume l'assenza di limiti e non si cambiano le impostazioni globali.

#### File preparati e applicazione effettiva

| File | Scopo | Applicato |
| --- | --- | --- |
| [`20261024095639_admin_authorization_foundation.sql`](../../../supabase/migrations/20261024095639_admin_authorization_foundation.sql) | Helper, RPC, policy privata, protezione ruolo e account dedicati | Solo nei database PGlite sintetici, non su Supabase locale/remoto |
| [`dashboard_admin_provision.sql`](../../../supabase/scripts/dashboard_admin_provision.sql) | Provisioning riservato di una riga Admin associata a un'identità Auth dedicata | Solo in PGlite con UUID sintetici; template manuale lasciato con placeholder |
| [`dashboard_admin_verify_session_policy.sql`](../../../supabase/scripts/dashboard_admin_verify_session_policy.sql) | Attestazione delle impostazioni Auth verificate nell'ambiente destinatario | Solo in PGlite con impostazioni sintetiche; template non attivabile senza compilazione esplicita |

**Aggiornamento successivo dell'operatore:** l'utente ha dichiarato di avere
applicato la sola migrazione foundation al progetto reale e compilato i parametri
del relativo template policy, senza completare provisioning/attivazione.
L'agente non ha verificato lo stato remoto. La tabella sopra descrive le sole
applicazioni effettuate dall'agente durante 03A; non sovrascrivere la configurazione
reale compilata dall'utente.

La CLI **Supabase 2.122.0**, scaricata in una cache locale ignorata, ha generato
il nome del file tramite `supabase migration new admin_authorization_foundation`.
Nessun progetto collegato, servizio creato, migrazione remota applicata o account
reale modificato. Nessun file `.env.local` letto, copiato o modificato dall'agente.

#### Contratto e sicurezza

- `public.admin_get_context_v1()` non accetta parametri. Restituisce una sola
  riga con `auth_user_uuid` e `utente_uuid`; i due UUID restano distinti.
  Firma aggiunta al pacchetto TypeScript condiviso. È una RPC SQL invoker,
  eseguibile da `authenticated`, non da `anon` o `service_role`.
- `private.require_admin_context_v1()` contiene i privilegi minimi necessari
  ai lookup Auth ed espone solo i due identificativi. Search path vuoto,
  nomi qualificati e timezone UTC locale alla funzione. Il ruolo e i metadati
  proposti dal browser non autorizzano nulla.
- Il contesto deve provenire dal JWT verificato da PostgREST. La funzione
  controlla ruolo tecnico `authenticated`, `sub`, `session_id`, `exp`, eventuale
  `nbf`, corrispondenza con `auth.uid()`, riga applicativa, ruolo **`Admin`
  esatto**, email confermata, identità non eliminata/anonima/bloccata e sessione
  appartenente all'identità. Il confronto del ruolo usa collation `C`.
- Sessione assente/revocata, `not_after` raggiunto o limite temporale raggiunto
  negano l'accesso. Il timeout di inattività considera l'ultimo rinnovo registrato
  dal server, non `iat` o un heartbeat dal browser. Per versioni Auth precedenti,
  il fallback usa soltanto i timestamp dei refresh token non revocati; non legge
  né restituisce i valori dei token. La compatibilità con la versione installata
  e i tipi temporali effettivi resta da verificare nella fase 03B.
- `private.admin_session_policy_v1` nasce **disabilitata**: `verified_at = NULL`
  e `unsupported_auth_settings = true`. Nessun grant dati ai ruoli API; RLS
  attiva. Configurazione assente, sconosciuta o verificata nel futuro nega accesso.
  Durata e inattività sono valori server attestati dall'operatore, non parametri
  della RPC. `NULL` significa limite esplicitamente verificato come disabilitato.
- **Limite intenzionale della fase 03A:** single-session, session tags e altri
  limiti Auth aggiuntivi, inclusi eventuali timeout AAL, non sono ancora supportati.
  Se presenti, non attivare l'accesso: il template e l'helper bloccano la
  configurazione dichiarata non supportata. Completarne il supporto nella fase
  03B se l'ambiente li richiede; non disabilitare i limiti del progetto per
  aggirare questo prerequisito. MFA obbligatoria non introdotta.
- Nessuna cache tra richieste. Le procedure funzionali successive devono
  chiamare l'helper **una volta all'ingresso della stessa operazione** e derivare
  l'operatore dal risultato; non chiamare prima la RPC e poi presumere autorizzata
  una seconda operazione. Pagine senza query funzionali possono usare la RPC.
- Riutilizzato un indice unico esistente su `utente.auth_user_uuid` se presente;
  altrimenti viene creato quello necessario. Auth user/session usano lookup per
  chiave primaria. Un EXPLAIN sintetico verifica l'utilizzabilità dell'indice,
  non dimostra tempi o costi su produzione.

L'accesso all'helper richiede `USAGE` sullo schema privato per `authenticated`:
questo non concede SELECT sulle tabelle private/Auth, né espone `private` nella
Data API. La fase 03B deve controllare gli ACL effettivi delle funzioni private
preesistenti prima del rilascio, oltre alla configurazione degli schemi esposti.

#### Confine con gli account ordinari

- Tolti anche eventuali grant INSERT/UPDATE a livello di colonna di `utente`
  per i ruoli ordinari. Le policy di lettura esistenti restano invariate.
- Un trigger protegge modifiche del ruolo e ricollegamenti dell'identità Admin.
  Le operazioni SQL riservate possono intervenire; richieste API, comprese le
  RPC definer invocate da `authenticated`/`service_role`, non possono assegnare
  o cambiare il ruolo. Il controllo considera il ruolo SQL esterno e il contesto
  JWT, senza scambiare `current_user` della funzione definer per l'operatore.
- Gli Admin dedicati conservano `registrato_il = NULL` e non possiedono profili
  o annunci personali. La migrazione si interrompe senza correggere dati se
  trova un Admin incompatibile. Vincoli e trigger impediscono di creare questi
  legami o promuovere account personali; i lock sull'account serializzano le
  scritture di ownership contro la promozione. Verifica concorrente reale in 03B.
- Guardie aggiunte a provisioning, completamento registrazione, identificazione
  dell'utente registrato e pubblicazione. Si conserva il corpo effettivamente
  installato, incluse le modifiche intermedie: una funzione o un punto di
  inserimento sconosciuto fa fallire la migrazione invece di sostituire la logica.
- Il viewer server della Web legge il ruolo nello stesso lookup già esistente
  e restituisce `null` per Admin prima di leggere il profilo. I controlli database
  restano necessari per chiamate dirette. Non è stata implementata la UI di login
  Admin; percorsi e messaggi Auth dedicati appartengono allo step 05.

### Verifiche della fase 03A

Test aggiunti: `tests/admin-authorization-database.test.mjs` e
`tests/admin-web-boundary.test.mjs`. Il runner DB usa esclusivamente PGlite in
memoria, non accetta URL e non carica env; un motore mancante causa errore,
non uno skip. Sono usati corpi reali delle funzioni precedenti e tabelle sintetiche
minime: il completo workflow di profili, registrazione e pubblicazione resta da
provare su schema completo.

- **49 casi DB**: ruolo esatto e varianti, mapping, identità, token, sessione,
  revoca tra statement, durata/inattività e fallback, policy ignota/non supportata,
  privilegi, escalation tramite RPC definer, account dedicati, guardie sulle
  funzioni personali, indice e template manuali. Verificato anche rollback
  transazionale su dati Admin incompatibili.
- **3 casi Web**: Admin escluso prima del lookup profilo, utenti ordinari con
  identificativi invariati ed errore del lookup che nega l'accesso.
- Verifiche pertinenti Auth/email/consensi esistenti eseguite insieme ai nuovi
  test: **78 casi riusciti, nessun fallimento o skip**. Typecheck delle due app
  riusciti; lint senza errori, con i 9 avvisi preesistenti. Risultato riportato
  anche nel registro del master.
- Nessuna prova di firma JWT, PostgREST, refresh reale, sessioni HTTP, concorrenza
  tra connessioni o prestazioni su schema completo può essere dichiarata conclusa
  sulla base di PGlite. Nessun dev server o build di produzione avviato.

Per rieseguire le verifiche isolate dalla root:

```powershell
node --test tests/admin-authorization-database.test.mjs tests/admin-web-boundary.test.mjs tests/auth-email-flow.test.mjs tests/registration-consents.test.mjs tests/registration-consents-database.test.mjs
npm run typecheck
npm run typecheck:admin
npm run lint
```

### Fase 03B — alternativa locale storica fuori dal percorso corrente

**Aggiornamento 25 ottobre:** l'utente ha scelto i test Node/PGlite per Web e
Admin senza Docker, consolidati in 16A. I file predisposti restano un'alternativa
storica: non è richiesto avviare questo percorso. Le prove integrate ancora
non eseguite restano nella matrice 16A, senza attestazioni sostitutive.

Il precedente percorso locale ha un proprio documento per ogni sottopasso e
richiede un nuovo prompt per passare al successivo:

1. [03B.1 — Preparazione e acquisizione schema](03b1-supabase-locale.md): tooling
   predisposto, Docker e schema sorgente ancora necessari.
2. [03B.2 — Ripristino e dati sintetici](03b2-ripristino-locale.md): da iniziare.
3. [03B.3 — Prove integrate](03b3-verifiche-integrazione.md): da iniziare.

**Verifiche 03B.1 effettuate:** 5 test mirati riusciti, zero skip; catalogo SQL
eseguito su PGlite con trigger e policy sintetici. Lint mirato senza errori.
Configurazione accettata dalla CLI 2.122.0 senza deprecazioni; `prepare` eseguito
e verificato ripetibile, file esistenti conservati, policy locale non attestata.
Preflight bloccato per Docker assente; export bloccato con sorgente non compilata.
Nessuna esportazione, importazione o connessione al progetto reale effettuata.

Lo schema acquisito dal reale contiene già la foundation. Non applicare di nuovo
la migrazione su quel ripristino. La prova di upgrade su schema completo precedente
resta separata e richiede una baseline attendibile. Il dump schema-only non copia
la riga singleton della policy, che va ricreata **disabilitata** nel locale.
Le impostazioni dichiarate nel file reale non attestano quelle del locale.

### Operazioni manuali residue — soltanto locale/staging autorizzato

**Non applicare ora questi file in produzione.** Per completare lo step:

1. Predisporre un progetto Supabase isolato con dati sintetici e baseline/schema
   completo. La repository non contiene una migrazione iniziale autosufficiente
   di tutte le tabelle; non presumere che un reset da cartella vuota ricostruisca
   il database. Lo schema Auth deve provenire dalla versione Supabase effettiva,
   non dalle fixture ridotte dei test.
2. Compilare la destinazione Admin locale/staging e la allowlist; eseguire
   `npm run check:test-target:admin`. Verificare separatamente che SQL Editor/CLI
   siano collegati **alla stessa destinazione**: il preflight non seleziona il
   progetto e non autorizza un successivo `db push` implicito. Controllare backup,
   migrazioni preesistenti e ACL; nessun reset o seed su dati reali.
3. Registrare versione Auth e impostazioni effettive: durata massima, inattività,
   sessione unica, session tags e limiti aggiuntivi/AAL. Confrontare schema,
   timestamp e fallback con il sorgente della versione distribuita. In presenza
   di impostazioni non supportate, completare il relativo codice e test prima
   dell'attivazione. Non assumere valori remoti da `config.toml` locale.
4. **Solo su una baseline completa precedente alla foundation**, applicare
   la migrazione `20261024095639_admin_authorization_foundation.sql`
   come operatore SQL riservato, sul progetto isolato, dopo le migrazioni precedenti.
   È transazionale: su errore non proseguire; se la sessione SQL rimane in
   transazione fallita eseguire `ROLLBACK`. Se segnala account Admin non dedicati,
   non cancellarne dati per farla passare: risolvere esplicitamente il provisioning.
   Se segnala funzioni sconosciute, confrontare lo schema installato.
   Su una copia dello schema reale già migrato, verificare gli oggetti presenti
   e seguire 03B.2 senza riapplicarla; ciò non verifica il percorso di upgrade.
5. Creare da Supabase Auth un account **dedicato**, email/password, con email
   confermata e senza registration intent o metadati di ruolo. Nessuna password
   nei file SQL/documenti. Nel template `dashboard_admin_provision.sql` sostituire
   soltanto `v_auth_user_id` con l'UUID Auth verificato; eseguirlo come operatore
   SQL riservato, non tramite API/service key. Il template impedisce di convertire
   un account personale registrato o con contenuti e conserva la mappatura UUID.
6. Solo dopo la verifica delle impostazioni, compilare il template
   `dashboard_admin_verify_session_policy.sql`: attestazione esplicita, durate
   in secondi oppure NULL per limiti verificati come assenti, flag espliciti per
   sessione unica e altri limiti. Il file non deve essere eseguito come seed.
   Per provare il ramo positivo attivarlo **solo nell'ambiente isolato**.
7. Verificare con token reali e chiamate dirette: caso positivo, tutti i dinieghi,
   grant/RLS delle funzioni private, registrazione/pubblicazione ordinaria completa,
   rinnovo sessione, revoche e cambi ruolo tra richieste, ownership concorrente.
   Misurare piani e chiamate su dati sintetici; nessun N+1. Eseguire gli advisor
   Supabase sul progetto isolato e risolvere i rilievi pertinenti.
8. Registrare ambiente e risultati, rigenerare/confrontare i tipi condivisi
   sullo schema verificato e aggiornare lo stato a **Concluso** solo dopo tutti
   i controlli. Prima di allora è ammesso lo sviluppo 04A/04B con PGlite, come
   scelto dall'utente; resta esclusa l'attivazione reale senza verifica integrata.

#### Verifica dell'esito e recupero operativo

Come operatore SQL, verificare ruolo esatto, UUID collegato e assenza di profili:

```sql
select u.utente_uuid, u.auth_user_uuid, u.tipologia_utente, u.registrato_il,
  exists(select 1 from public.profilo p where p.uuid_utente=u.utente_uuid) as ha_profilo
from public.utente u where u.tipologia_utente collate "C" = 'Admin';
select verified_at, timebox_seconds, inactivity_timeout_seconds,
  single_session_per_user, unsupported_auth_settings
from private.admin_session_policy_v1;
```

La prova positiva usa la RPC con **sessione dell'operatore Admin**, non una
chiave service role. Risultato atteso: due UUID, nessun profilo necessario.

Per sospendere subito l'accesso Admin, senza toccare la Web ordinaria:

```sql
update private.admin_session_policy_v1
set verified_at = null, unsupported_auth_settings = true where singleton;
```

Prima di modificare impostazioni Auth condivise, sospendere l'accesso Admin,
aggiornare la verifica della policy e ripetere le prove. La tabella non rileva
automaticamente cambiamenti effettuati nel pannello Auth: evitarne la deriva è
un requisito operativo, senza polling HTTP a ogni operazione.

Per revocare un singolo Admin, come operatore SQL riservato, rimuovere il ruolo
con `UPDATE public.utente SET tipologia_utente='Utente' WHERE auth_user_uuid=...`
usando l'UUID verificato. Questo nega già la richiesta Admin successiva; non
crea un profilo personale e non annulla operazioni già iniziate. Invalidare anche
le sessioni tramite Supabase Auth con logout globale usando l'API Admin supportata
dalla versione installata, in un contesto server riservato, senza salvare token
nel registro o nei documenti. In fase 03A non esiste ancora un comando applicativo
di logout/revoca; integrazione e verifica operativa nello step 05.

Per recuperare le credenziali usare la procedura riservata di Supabase Auth,
verificare l'identità dell'operatore e revocare le sessioni esistenti. Non usare
registrazione pubblica o metadati per ricreare il ruolo; prima del login Admin
dello step 05 non sono ancora disponibili callback di recupero dedicati all'app.

In caso di errore dopo un'applicazione riuscita, lasciare la policy disabilitata,
conservare schema e dati e preparare una migrazione correttiva verificata sullo
stesso ambiente isolato. Non eliminare le protezioni del ruolo o ripristinare
vecchi corpi funzione alla cieca: potrebbero sovrascrivere cambiamenti successivi.
L'eventuale rilascio/recupero in produzione è un'attività separata dello step 16.

### Fonti consultate

- Skill Supabase/Postgres della repository; guida autenticazione della versione
  Next.js installata in `node_modules/next/dist/docs/`.
- [Supabase changelog](https://supabase.com/changelog),
  [sessioni e timeout](https://supabase.com/docs/guides/auth/sessions),
  [osservabilità](https://supabase.com/docs/guides/observability).
- [Modello sessioni Auth](https://github.com/supabase/auth/blob/master/internal/models/sessions.go):
  riferimento per durata, `not_after` e ultimo rinnovo; il branch master consultato
  non dimostra quale versione sia installata nell'ambiente dell'utente.

## Prossimo step

**Sviluppo attuale:** [04 — Audit persistente](04-audit-persistente.md),
**6.1 Sol, high**, sulla base 03A verificata con PGlite.
**Residuo prima del rilascio:** prove Supabase integrate non eseguite, elencate
nella [matrice 16A](16-verifica-rilascio/matrice-verifiche.md); nessun obbligo Docker.
