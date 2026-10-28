# 03B.1 — Preparazione di Supabase locale

**Stato:** Da terminare — tooling predisposto; Docker e acquisizione schema mancanti  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** fase 03A implementata; Docker e sorgente schema ancora da predisporre.

[Master](../master_plan.md) · [Step 03](03-autorizzazione-database.md)

**Alternativa storica fuori dal percorso corrente:** dal 25 ottobre l'utente
ha escluso Docker dal proprio flusso di lavoro. Usare i test Node/PGlite dello
[step 16A](16-verifica-rilascio/16a-verifiche-locali.md); questa scheda e il tooling
sono conservati e non devono essere avviati come prerequisito. Le verifiche
integrate mancanti restano elencate nella matrice, senza attestarne il successo.

**Decisione precedente:** dopo la preparazione del tooling, l'utente ha scelto di
continuare lo sviluppo con PGlite senza Docker. Le operazioni di questa scheda
non sono richieste per avviare 04A/04B; resteranno da riprendere per le prove
integrate prima del rilascio, oppure da sostituire con uno staging isolato.

## Obiettivo e situazione accertata

Predisporre Supabase completo per le prove di Auth, PostgREST e PostgreSQL.
I test Web/DB esistenti usano mock e PGlite in memoria: non costituiscono uno
stack Supabase locale. Nel controllo iniziale Docker non era nel PATH né nella
directory standard di Docker Desktop; nessuna connessione database IDE configurata.

L'utente ha confermato di avere applicato **solo** la migrazione
`20261024095639_admin_authorization_foundation.sql` al progetto reale.
Questa informazione proviene dall'operatore, non da una verifica remota dell'agente.
Il file della policy reale è compilato; provisioning e attivazione restano pendenti.

## File predisposti

- `scripts/dashboard-local/run.mjs`: preparazione, preflight, avvio/arresto,
  esportazione in sola lettura e inventario dell'acquisizione. Nessun comando di importazione.
- `scripts/dashboard-local/config.toml`: progetto separato
  `bacheca-dashboard-integration`, PostgreSQL 17, migrazioni e seed disabilitati,
  schema `private` escluso dalla Data API, conferma email e rotazione refresh attive.
- `guard.mjs` e template env nella stessa cartella: destinazioni locale e sorgente
  remota distinte. Nessun caricamento degli env delle app.
- `capture-catalog.sql`: inventario di tipi Auth, estensioni, funzioni/ACL e
  trigger/policy di Auth e Storage, leggendo soltanto i cataloghi PostgreSQL.
- `.local/dashboard-supabase/`: directory generata, ignorata da Git e dal lint.
  Conserva configurazione operativa, credenziali, acquisizioni e home CLI.

Porte: **55321** API, **55322** PostgreSQL, **55323** Studio, **55324** casella
email di prova. Nessun collegamento al progetto hosted. La CLI fissata è
**2.122.0**, riutilizzata dalla cache locale senza installazioni implicite.
Il wrapper imposta una home CLI interna alla directory ignorata e disattiva
la telemetria: evita il precedente tentativo di scrittura in `%USERPROFILE%\.supabase`.

## Procedura manuale — eseguire in questo ordine

Tutti i comandi seguenti partono da PowerShell nella root della repository.

### 1. Installare e avviare il runtime

Installare [Docker Desktop per Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
seguendo i suoi controlli su WSL 2/virtualizzazione. Riavviare Windows se richiesto,
aprire Docker Desktop e attendere che il motore Linux sia pronto. Poi riaprire
il terminale dell'IDE, affinché rilevi il nuovo PATH.

```powershell
docker version
```

Devono essere presenti sia Client sia Server. Se manca Server, avviare Docker;
non cambiare le destinazioni della Web o usare un database remoto per aggirare il problema.

### 2. Preparare e controllare i file locali

```powershell
npm run dashboard:local:prepare
npm run dashboard:local:check
```

`prepare` è già eseguibile prima di installare Docker: crea soltanto file locali,
senza connessioni. È ripetibile e non sovrascrive file esistenti. `check` verifica
la configurazione, il motore Docker locale e la disponibilità della CLI; non
si connette al database. `target.env` ammette solo gli endpoint loopback fissati.

Se la CLI non è più nella cache, ripristinarla con la versione esatta:

```powershell
npm exec --cache ./node_modules/.cache/supabase-cli --package=supabase@2.122.0 -- supabase --version
```

Il comando scarica il pacchetto nella cache ignorata, senza cambiare le dipendenze
dell'app. Se il wrapper segnala problemi di telemetria, impostare nella sola
sessione PowerShell `$env:DO_NOT_TRACK = '1'` e ripetere. I comandi del runner
configurano già home e telemetria per i propri processi figli.

### 3. Compilare la sorgente per la sola esportazione

Aprire `.local/dashboard-supabase/source.env`, creato da `prepare`.
Nel progetto reale, aprire **Connect** e leggere i parametri della connessione
diretta o del **Session pooler**. Inserire:

- `PROJECT_REF`: riferimento del progetto Supabase.
- `HOST` e `ALLOWED_HOST`: lo stesso hostname riportato da Connect, senza URI.
- `PORT=5432`, `DATABASE=postgres`.
- `USER`: `postgres` per connessione diretta oppure `postgres.<project-ref>`
  per Session pooler.
- `PASSWORD`: password del database; non la password Admin né una API key.

I nomi effettivi hanno il prefisso `BACHECA_SCHEMA_SOURCE_`, già presente nel
file. Usare virgolette dotenv se necessario. **Non riportare password in chat,
negli argomenti dei comandi o nei documenti.** Se la connessione diretta IPv6 non
è raggiungibile dal PC, usare il Session pooler sulla porta 5432; la porta 6543
del Transaction pooler è rifiutata.

### 4. Esportare e controllare lo schema

Eseguire durante un intervallo senza modifiche allo schema:

```powershell
npm run dashboard:local:export
```

L'unico accesso al progetto reale previsto da questo sottopasso è la lettura
dello schema. Il runner usa un container client `postgres:17`, `pg_dump
--schema-only`, TLS e `default_transaction_read_only=on`; non esporta account,
sessioni, refresh token o righe applicative. Password passata nell'ambiente del
processo, senza URI o valori negli argomenti/log. Sono rifiutati motori Docker
TCP/SSH o named pipe verso altri computer. L'immagine client può essere scaricata
al primo utilizzo; non avvia un server PostgreSQL remoto.

L'output indica una cartella, per esempio `.local/dashboard-supabase/captures/DATA`:

```powershell
npm run dashboard:local:inspect -- .local/dashboard-supabase/captures/DATA
```

Sostituire `DATA` con il nome effettivo. Un'acquisizione riuscita contiene:

- `schema.sql`: DDL di `public`, `private`, `extensions`, proprietari e permessi;
- `catalog.json`: inventario dei cataloghi, definizioni/stato dei trigger e
  policy sugli schemi gestiti, ACL e versioni delle estensioni;
- `manifest.json`: versione client, project ref, checksum dei due file e stato
  **non pronto per importazione automatica**.

`inspect` controlla checksum, PostgreSQL 17 e presenza degli oggetti Admin
fondamentali; **non dimostra** la compatibilità o sicurezza dell'intero SQL.
Se il server sorgente non è PostgreSQL 17, fermarsi e adattare esplicitamente
versione client/configurazione prima del ripristino. Il catalogo e il dump sono
letti in sessioni separate: se c'è stato DDL concorrente, acquisire nuovamente.

Le definizioni SQL possono contenere URL di servizi, webhook o segreti scritti
nei corpi funzione. I file restano ignorati: revisionarli nel sottopasso 03B.2,
insieme a eventuali schemi applicativi aggiuntivi elencati nel catalogo.
Non eseguire automaticamente trigger/job/webhook contro servizi reali.

### 5. Fermarsi qui e registrare l'esito

Per chiudere 03B.1 servono Docker pronto, preflight riuscito e acquisizione
integra disponibile. Le credenziali possono rimanere soltanto nel file locale;
comunicare all'agente il percorso dell'acquisizione e l'esito dei comandi.

Non eseguire adesso i template di provisioning/policy sul progetto reale.
Non sono richieste nuove migrazioni remote.

## Avvio/arresto predisposti per il passaggio successivo

```powershell
npm run dashboard:local:start
npm run dashboard:local:stop
```

Sono comandi per lo stack locale separato; non eseguono l'importazione, non
applicano le migrazioni della root e non caricano seed. Il primo avvio scarica
le immagini Supabase. L'arresto conserva i dati locali. Non è previsto alcun
reset o cancellazione automatica. L'avvio effettivo e la verifica runtime sono
parte di 03B.2 e non sono dichiarati riusciti in questo sottopasso.

## Ripristino previsto e limiti delle prove successive

Lo schema acquisito contiene già la foundation Admin. Non rieseguire quella
migrazione sullo stesso schema: contiene DDL non idempotente. Non importare lo
schema Auth gestito dalla produzione: sarà inizializzato dalla versione Supabase
locale. Confrontarne versione e struttura e registrare le differenze.

Il dump schema-only non contiene la riga singleton di
`private.admin_session_policy_v1`, né dati di riferimento. In 03B.2 si ricreerà
la riga con `verified_at = NULL` e `unsupported_auth_settings = true`, usando
soltanto dati di riferimento sintetici. La copia `session-policy.local.sql` nasce
non attestata e non eseguibile senza compilazione esplicita: non eredita i valori
del file reale dell'utente. L'attivazione locale per il ramo positivo appartiene
alle prove 03B.3, dopo verifica dei suoi parametri.

Le prove su uno schema successivo alla migrazione dimostrano il comportamento
attuale, non l'upgrade da una baseline precedente. La prova di applicazione della
migrazione su schema completo richiederà una baseline precedente attendibile e
resterà documentata come mancante finché non disponibile; niente rollback dedotto
dai soli tipi TypeScript o dai corpi delle fixture PGlite.

## Recupero operativo

In caso di errore di esportazione non importare file parziali: solo una cartella
con manifest e checksum verificati è un'acquisizione completa. Correggere i
prerequisiti e ripetere: il runner crea una nuova cartella e conserva la precedente.
Le connessioni sorgente sono in sola lettura; non esiste una migrazione remota
da annullare. Non usare `db push`, `db reset` o `link` nella directory di prova.

## Verifiche e avanzamento

Verifiche effettive del 24 ottobre 2026:

- **5 test mirati riusciti, nessun fallimento/skip** in
  `tests/dashboard-local-tooling.test.mjs`: destinazioni remote/miste e parametri
  di connessione rifiutati; Docker remoto rifiutato; inventario incompleto/versione
  diversa rifiutati; query cataloghi eseguita su PGlite con trigger disabilitato
  e policy restrittiva sintetici, senza account/dati reali.
- Lint dei due moduli, test e configurazione ESLint: nessun errore o avviso.
- Configurazione letta dalla **CLI 2.122.0** fino al controllo runtime, senza
  errori di parsing/deprecazioni; usata la sezione corrente `local_smtp`.
- `prepare` eseguito; seconda esecuzione verificata tramite checksum: nessuna
  sovrascrittura di file esistenti o della policy reale compilata dall'utente.
  Copia locale della policy verificata non attestata. Artefatti esclusi da Git.
- `check` fermato per Docker non disponibile; `export-schema` fermato prima della
  connessione per sorgente non compilata. Sono blocchi attesi, non prove runtime riuscite.
- Nessuno stack avviato, esportazione/importazione eseguita, connessione al
  progetto reale, migrazione applicata dall'agente o env delle app letto/modificato.
  Nessuna build o dev server avviato.

Operazioni manuali residue: punti **1–4** di questa procedura. Il sottopasso
resta **Da terminare** fino a runtime pronto e acquisizione integra disponibile.
Ripristino e prove integrate restano nei sottopassi successivi.

**Prossimo:** completamento dei prerequisiti 03B.1, poi
[03B.2 — Ripristino locale](03b2-ripristino-locale.md). **6.1 Sol, high**.

## Riferimenti

- [Supabase CLI e requisiti runtime](https://supabase.com/docs/guides/local-development/cli/getting-started).
- [Configurazione CLI](https://supabase.com/docs/guides/local-development/cli/config).
- [pg_dump PostgreSQL 17](https://www.postgresql.org/docs/17/app-pgdump.html).
