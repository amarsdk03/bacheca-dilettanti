# M02 — Applicazione della foundation audit

**Stato:** Concluso — applicazione/verifica strutturale riscontrate e copia manuale dopo M02 verificata; ripristino completo non provato  
**Modello consigliato:** 6.1 Sol, high  
**Destinatario:** Webapp Bacheca Dilettanti — `nsytraextbndfyprwzts`  
**Dipendenze:** [IN01 Concluso](01-ricognizione.md), M01 coerente nei controlli
strutturali; copia manuale dopo M02 e prima di ulteriori modifiche.

[Master](../master_plan.md) · [Matrice](../steps/16-verifica-rilascio/matrice-verifiche.md)
· [Runbook](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md)
· [Implementazione 04A](../steps/04a-audit-database.md)

## Risultato previsto

Applicare e verificare la migrazione esistente M02, senza rieseguire M01 o la
baseline Web non registrata nella cronologia. M02 crea
`private.admin_audit_event_v1`, cinque vincoli CHECK/PK, tre indici espliciti
oltre all'indice primario e quattro helper interni. La tabella usa RLS e
revoche ai ruoli API; gli helper sono invoker e riservati all'operatore.
La migrazione prepara la funzione di retention ma non la chiama né pianifica
job Cron. L'accesso Admin, M03 e il rilascio restano successivi.

## File e stato effettivo

**Piano Supabase Free confermato:** nessun Database Backup automatico o PITR
disponibile. L'utente ha scelto una copia manuale prima di M03 e dispone della
password database da inserire soltanto nel proprio terminale. Procedura e
comando esatto nella [guida backup Free](backup-free.md). Prima copia esportata
con successo dall'utente; il riepilogo è rimasto incomplete per un falso errore
public del verificatore, poi corretto. Secondo report delle 18:20 UTC positivo
su tutti i controlli: copia manuale riscontrata, nessun altro comando M02 richiesto.
Non occorre acquistare Pro per questo passaggio.

| File | Uso | Stato |
| --- | --- | --- |
| [20261024104822_admin_audit_foundation.sql](../../../supabase/migrations/20261024104822_admin_audit_foundation.sql) | Migrazione M02 | Esistente, invariata; applicazione riscontrata nel report finale dell'utente, nove oggetti coerenti |
| [dashboard_admin_check_m02.sql](../../../supabase/scripts/dashboard_admin_check_m02.sql) | Query di verifica prima e dopo M02 | Entrambi i report del progetto ricevuti dall'utente; verifica strutturale finale riuscita |
| [admin-m02-inspection.test.mjs](../../../tests/admin-m02-inspection.test.mjs) | Controlli del verificatore e dei suoi dinieghi | Cinque test riusciti, inclusi nel totale mirato di 124 |

SHA-256 del file di migrazione, calcolato sui byte della copia corrente:
`1d96bea14a2313f75ea3c33c145114d6039c6351354426402101de97e4e980ee`.
Non modificare il SQL per adattarlo a un errore sul progetto.

## Procedura manuale completa

Applicazione e controllo finale risultano già eseguiti, come documentato
sotto. La procedura è conservata come riferimento: **non rieseguire M02**.
Anche la copia manuale della [guida backup Free](backup-free.md) è stata
riscontrata nel report finale delle 18:20 UTC. I punti seguenti restano come
riferimento, senza ulteriori operazioni manuali M02.

1. **Copia manuale attuale.** Su Free non cercare Database Backups o PITR.
   Eseguire lo [script PowerShell](../../../scripts/dashboard-backup/run.ps1)
   secondo la [guida backup Free](backup-free.md), poi fornire solo `summary.json`.
   La copia è **successiva a M02 e precedente a M03**: non certifica un backup
   precedente alla migrazione già applicata. La lettura verificata dell'archivio
   non equivale a un ripristino provato; il [runbook §3](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md#3-backup-e-recuperabilità-prima-delle-modifiche)
   mantiene separata quella evidenza. Non condividere dump, chiavi o password.
2. **Destinatario.** Aprire il progetto dal pannello Supabase; l'URL deve
   contenere `/project/nsytraextbndfyprwzts/`. Aprire **SQL Editor**, nuova
   query, operatore `postgres`. Il ref stampato nel report è un'etichetta
   attesa: il SQL non può verificare da solo l'identità del progetto.
3. **Controllo prima di M02.** Copiare ed eseguire interamente
   `dashboard_admin_check_m02.sql`, senza parametri. Deve restituire una
   colonna `m02_report` con
   **`status="ready_for_m02_catalog_checks_only"`**,
   `checks.prerequisites_match=true` e `checks.m02_named_objects=0`.
   I controlli sugli oggetti M02 ancora assenti saranno falsi: è previsto.
   Se restituisce già `m02_structurally_verified`, conservare il report e
   saltare il punto 4; M02 è già presente nei controlli eseguiti.
4. **Applicazione.** Solo dopo il controllo precedente e il punto di recupero
   documentato, aprire un'altra query ed eseguire **interamente e una sola
   volta** `20261024104822_admin_audit_foundation.sql`. Non ci sono parametri;
   il file contiene `BEGIN`/`COMMIT`. Annotare l'esito del SQL Editor, che può
   essere un successo senza righe. L'esecuzione manuale non aggiunge una
   versione alla cronologia CLI; non modificarla in questo step.
5. **Verifica dopo M02.** Rieseguire interamente la stessa query
   `dashboard_admin_check_m02.sql`. Il risultato atteso è
   **`status="m02_structurally_verified"`**,
   `checks.prerequisites_match=true` e `checks.audit_catalog_matches=true`.
   `checks.m02_named_objects=9` include quattro funzioni, la tabella e i
   quattro indici, compreso quello della chiave primaria.
6. **Riscontro.** Restituire il JSON completo **`m02_report` finale**, l'esito
   dell'applicazione e il riferimento al punto di recupero (tipo/data).
   Non occorre ripetere il grande report IN01 o rieseguire M01.

## Cosa certifica il controllo

La query usa `READ ONLY`, timeout locali 15s/3s, `search_path=pg_catalog` e
`ROLLBACK`. Legge esclusivamente cataloghi e impronte: nessuna riga di audit,
nessuna chiamata agli helper applicativi o purge, nessuna lettura/modifica di
Cron o dei valori della policy sessione. Controlla:

- operatore SQL senza claim applicativi; ruoli attesi e schema privato;
- definizione normalizzata LF/CRLF, owner ed esecuzioni della guardia M01;
- tutte le firme M02, owner, definizioni normalizzate e privilegi effettivi,
  inclusi PUBLIC e privilegi ereditati;
- tredici colonne, tipi, nullabilità/default, assenza di scritture generate,
  ACL per colonna e privilegi API anche ereditati;
- RLS, assenza di grant aggiuntivi/policy/trigger inattesi, cinque vincoli
  validati e quattro indici pronti/validi con definizioni attese.

Le impronte corrispondono alla revisione M02 corrente. Il controllo è per
questo passaggio: migrazioni successive possono modificare legittimamente le
definizioni. Non usarlo dopo M03–M10 per dedurre che M02 vada riapplicata.
Differenze dovute a versione PostgreSQL o definizioni richiedono confronto,
non riparazioni automatiche. Il riscontro locale è PGlite/PostgreSQL 18.3;
il report iniziale M02 conferma PostgreSQL 17.6 e la corrispondenza della guardia M01.

`m02_structurally_verified` non attesta Auth/PostgREST, backup, identità del
progetto o cronologia. La verifica funzionale integrata resta nella matrice;
i casi audit e autorizzazione sono già eseguiti localmente.

## Errori e recupero

Se il controllo restituisce `prerequisites_require_review` o
`m02_partial_or_drift_require_review`, fermare l'applicazione e inviare il
report: non eliminare oggetti o aggiungere grant per farlo passare.

Se la migrazione fallisce prima del commit, conservare codice/messaggio e
fare `ROLLBACK;` nella stessa sessione se risulta ancora in transazione
fallita. Nessun oggetto della transazione fallita va considerato applicato.
Se l'esito del commit è incerto, eseguire prima il controllo: non ripetere
il file alla cieca. Dopo commit verificato, eventuali correzioni vanno
preparate separatamente; nessun DROP di audit o replay di M01/M02.

## Verifiche e avanzamento

**Controllo iniziale sul progetto superato**, report fornito dall'utente in chat:
25 ottobre 2026, **14:16:30.275025 UTC**, operatore `postgres`, PostgreSQL 17.6,
`transaction_read_only=on`. Esito `ready_for_m02_catalog_checks_only`, con
`prerequisites_match=true`, `m01_context_matches=true`,
`private_schema_ready=true`, `roles_expected=true` e `m02_named_objects=0`.
I controlli delle strutture M02 sono falsi perché quegli oggetti sono assenti:
è il risultato previsto prima dell'applicazione, non un errore da correggere.
La copia ricevuta è conservata in
`.local/dashboard-integration/m02-before-20261025T141630Z.json`, esclusa da Git.
Il ref stampato rimane l'etichetta attesa, associata alla precedente
identificazione dell'utente; nessuna connessione remota dell'agente.

**Controllo finale sul progetto superato**, report fornito dall'utente il
25 ottobre 2026, **14:21:04.807294 UTC**, operatore `postgres`, PostgreSQL 17.6,
`transaction_read_only=on`. Stato **`m02_structurally_verified`**:
tutti i controlli booleani veri, `m02_named_objects=9`, guardia M01 ancora
coerente. Corrispondono definizioni e privilegi delle quattro funzioni,
tredici colonne, cinque vincoli CHECK/PK, quattro indici e protezioni della
tabella. EXECUTE negato su tutti e quattro gli helper a `anon`,
`authenticated`, `service_role` e `supabase_auth_admin`, come previsto.

Il passaggio da zero a nove oggetti e il confronto finale riscontrano
l'applicazione M02. La copia completa del report è conservata in
`.local/dashboard-integration/m02-after-20261025T142104Z.json`, esclusa da Git.
Nessun'altra esecuzione SQL M02 richiesta. Restano esclusi dal riscontro
backup, verifica funzionale Auth/PostgREST, cronologia e attivazione Cron,
come dichiarato nei limiti del report. `backup_verified=false` non stabilisce
se un backup esista: il verificatore non lo legge e il riferimento non è
stato fornito dall'utente al momento di quel report. Successivamente l'utente
ha confermato il piano Free e l'assenza di Database Backups disponibili.

**124 test mirati riusciti, zero fallimenti/skip:**
`admin-m02-inspection`, `admin-audit-database`, `admin-authorization-database`.
I cinque nuovi test coprono prerequisiti assenti, ripristino impostazioni,
prima/dopo M02 anche con CRLF, nessuna purge/esposizione di eventi sintetici,
installazione parziale, guardia M01 modificata, grant ereditati per colonna,
PUBLIC EXECUTE, vincoli modificati e RLS disattivata.
ESLint del nuovo file di test riuscito; SHA-256 della migrazione confermato.

Nessuna build, server, Docker, dipendenza, env o app modificati; migrazione
M02 invariata. Nessuna connessione o SQL sul progetto Supabase eseguiti
dall'agente: nell'IDE non risultano connessioni database configurate.

**Registro operativo M02 Concluso.** Applicazione, verifica strutturale e copia
manuale dopo M02 riscontrate dai report dell'utente. Il `summary.json` positivo
delle 18:20:16 UTC è acquisito, annotando esplicitamente
`restore_tested=false`, copertura limitata al database e assenza di backup precedente
a M02. Nessuna attestazione di recuperabilità completa o chiusura V20 deriva dalla
sola verifica degli archivi. La prova di ripristino e gli oggetti Storage restano
requisiti distinti del rilascio, non nuove prove applicative da ripetere su M02.
Il prossimo step dopo M02 verificata è **M03 — audit dal backend**, modello
**6.1 Sol, high**.

**Preparazione della copia Free completata:** client portabili PostgreSQL 17.11
verificati, script PowerShell e guida pronti. Undici test sintetici riusciti,
zero fallimenti/skip, ESLint riuscito. Controllo dei 39 documenti dashboard:
317 collegamenti locali validi, nessuno mancante. Il vero `pg_restore` rifiuta
un archivio sintetico corrotto; nessun dump o ripristino del progetto eseguito.
L'operazione manuale inizialmente residua è stata completata dall'utente nel
secondo tentativo positivo documentato sotto. M03 non avviata.

**Primo tentativo di copia ricevuto:** 25 ottobre, 18:10:03.7369569 UTC,
PostgreSQL 17.6 con client 17.11. Connessione, dump schema+dati, ruoli, indice e
lettura completa positivi; solo schema_data_coverage falso. L'errore
«Schema assente dall'archivio: public» proveniva dal verificatore: in PostgreSQL
17 la voce di definizione public può essere omessa per l'owner predefinito.
Corretto quel requisito, senza ridurre i controlli sulle tabelle o sui dati.
Sedici test sintetici e lint riusciti; controllo mirato sull'indice dell'archivio
utente positivo per le cinque tabelle richieste e relativo controllo negativo.
Nessuna riga applicativa letta o scrittura negli archivi dell'utente; nessuna
connessione remota dell'agente. A quel punto era richiesta una nuova esecuzione
per il confronto completo: riscontro ricevuto nel secondo tentativo sotto.
Il primo riepilogo incomplete resta conservato, senza modificarlo.

**Chiusura M02 — secondo tentativo positivo:** copia eseguita dall'utente il
25 ottobre 2026, dalle **18:20:04.9797493 alle 18:20:16.8173260 UTC**,
stato `archive_verified_restore_untested`, tutti e sei i controlli veri,
`error=null`. Server 17.6, quattro client 17.11; schema+dati custom e inventario
ruoli senza password. Dimensioni e SHA-256 nella [guida backup Free](backup-free.md).
Report fornito in chat conservato in
`.local/dashboard-integration/m02-backup-20261025T182016Z.json`, escluso da Git.
L'agente registra il report, senza nuova connessione remota o esportazione.

Checkpoint **dopo M02 e prima di M03**, non retroattivo. Il report certifica
i controlli degli archivi, non un restore: `restore_tested=false`, file binari
Storage e configurazioni esterne esclusi, password dei ruoli escluse; TLS require
senza verifica dell'identità del peer. V20 e le prove integrate restano aperti.
Nessuna operazione manuale residua M02. Prossimo step: **M03 — audit dal backend**,
**6.1 Sol, high**, da avviare con nuovo prompt. Nessun nuovo test applicativo,
SQL o modifica di migrazioni necessari per questa chiusura documentale.

Fonti consultate: [changelog Supabase](https://supabase.com/changelog),
[privilegi delle funzioni](https://supabase.com/docs/guides/database/functions),
[backup del database](https://supabase.com/docs/guides/platform/backups).
