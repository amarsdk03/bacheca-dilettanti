# 04A — Archivio audit e conservazione

**Stato:** Concluso — implementazione e verifiche PGlite; integrazione rinviata nello step 04  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 03A implementato con PGlite; 03B rinviato prima del rilascio.

[Master](../master_plan.md) · [Step 04](04-audit-persistente.md)

**Integrazione M02 del 25 ottobre 2026:** applicazione e verifica strutturale
sul progetto `nsytraextbndfyprwzts` **riuscite**, report finale utente delle
14:21 UTC, nove oggetti coerenti e helper negati ai ruoli API.
Il registro M02 è **Concluso**: ricevuto anche il report di copia manuale
Supabase Free delle 18:20:16 UTC, archivio verificato con sei controlli veri.
La [guida operativa M02](../integrazione/02-audit.md)
contiene il controllo cataloghi prima/dopo e la procedura SQL Editor.
124 test mirati riusciti, inclusi cinque nuovi del verificatore, lint riuscito;
checkpoint dopo M02 e prima di M03, nessun'altra operazione manuale M02.
Ripristino non provato; file Storage e configurazioni esterne esclusi.
Lo stato Concluso sopra riguarda l'implementazione PGlite, non l'integrazione.

## Perimetro approvato

Archivio privato, helper interni senza accesso API, validazione dei dettagli,
atomicità con le modifiche e procedura di retention a 12 mesi di calendario UTC.
Script Cron separato e non eseguito automaticamente. Nessuna API pubblica in 04A.
Prove funzionali originarie su dati sintetici PGlite; integrazione M02
strutturale riscontrata successivamente tramite i report forniti dall'utente.

## File e applicazione effettiva

| File | Risultato | Applicato/verificato |
| --- | --- | --- |
| [`20261024104822_admin_audit_foundation.sql`](../../../supabase/migrations/20261024104822_admin_audit_foundation.sql) | Tabella, vincoli, indici, quattro helper privati e revoche | PGlite e confronto strutturale del report Supabase finale M02; prove funzionali gateway ancora pendenti |
| [`dashboard_admin_audit_schedule_retention.sql`](../../../supabase/scripts/dashboard_admin_audit_schedule_retention.sql) | Installazione/aggiornamento del job giornaliero riservato | Predisposto; preflight senza `pg_cron` verificato, job non attivato |
| [`admin-audit-database.test.mjs`](../../../tests/admin-audit-database.test.mjs) | Atomicità, accessi, dettagli e retention | Riuscito |
| [`admin-database-fixture.mjs`](../../../tests/helpers/admin-database-fixture.mjs) | Schema sintetico condiviso con i test di autorizzazione e migrazione 03 reale | Riuscito nei test 03/04A |

Nome della migrazione generato con CLI **2.122.0**, tramite
`supabase migration new admin_audit_foundation`. Nessuna connessione Supabase,
installazione Docker, migrazione remota, lettura/modifica degli env delle app,
modifica della policy reale dell'utente, build o dev server.

## Schema e contratto interno

`private.admin_audit_event_v1` conserva:

- `event_uuid` e `occurred_at`, generati dal database; timestamp finito `timestamptz`;
- `correlation_uuid`, obbligatorio e non unico: più eventi possono appartenere
  alla stessa operazione, mantenendo UUID evento distinti;
- `actor_auth_user_uuid` e `actor_utente_uuid`, distinti e senza FK, così la
  cancellazione di un account non elimina o altera il riferimento storico;
- azione, tipo/UUID risorsa, esito, motivazione, codice di fallimento, `changes`
  e `details` JSON limitati.

Gli eventi di successo richiedono entrambi gli identificativi dell'operatore.
Un fallimento può non avere alcuna identità; un soggetto Auth già verificato può
essere presente anche senza mapping applicativo. L'email tentata non determina
l'identità. Il server futuro dovrà distinguere assenza di identità da identità
effettivamente verificata: il database interno non riceve credenziali.

La tabella ha RLS attiva senza policy di accesso e nessun grant ai ruoli API.
Tutti i nuovi helper sono **SECURITY INVOKER**, proprietario `postgres`, search
path vuoto, senza EXECUTE per PUBLIC, anon, authenticated o service_role.
Neppure un Admin autenticato può leggere, inserire, aggiornare, eliminare o
troncare direttamente il registro. Gli amministratori SQL restano operatori
fidati; questa protezione non pretende di sottrarre la tabella al suo proprietario.

### Scrittura atomica

Firma della primitiva riservata:

```sql
private.append_admin_audit_event_v1(
  p_actor_auth_user_uuid uuid, p_actor_utente_uuid uuid,
  p_action text, p_resource_type text, p_resource_uuid uuid,
  p_outcome text, p_correlation_uuid uuid,
  p_reason text default null, p_failure_code text default null,
  p_changes jsonb default '{}', p_details jsonb default '{}'
) returns uuid
```

È un dettaglio interno, **non una RPC del browser o del service client**. Il
chiamante riservato deve ricavare il contesto con
`private.require_admin_context_v1()` una volta all'ingresso della stessa
operazione e passare quei due UUID, mai valori scelti dal client. La primitiva
non ripete i lookup Auth/ruolo, non apre transazioni autonome e non consente
di scegliere timestamp o UUID evento. Non concederle EXECUTE ai ruoli API.

La modifica e l'append di successo condividono la transazione: un errore del
registro annulla anche la modifica; un errore successivo annulla entrambi.
Un fallimento viene inserito soltanto dopo il rollback, in una nuova transazione.
Il relativo ponte server riservato sarà implementato in 04B. Le procedure di
moderazione saranno integrate nei rispettivi step; le procedure pubbliche
`test_admin_approve_v1` e gli altri oggetti `test_*` esistono **solo nella fixture**.

Nessuna nuova API pubblica né modifica dei tipi generati pubblici: il registro
è privato. Le procedure di lettura e l'interfaccia arrivano nello step 12.

### Azioni e dati ammessi

| Azioni | Risorsa | Contenuto di successo |
| --- | --- | --- |
| `auth.login`, `auth.logout` | `session` con UUID sessione | Nessun dettaglio o payload |
| `auth.access_denied` | `session`, UUID facoltativo | Solo fallimento |
| `announcement.approve`, `announcement.reject` | `announcement` con UUID | Variazione `status`; valori finali rispettivamente `pubblicato` e `rifiutato` |
| `announcement.hide`, `announcement.show` | `announcement` con UUID | Variazione `hidden`, finale true/false |
| `announcement.trash`, `announcement.restore` | `announcement` con UUID | Variazione semantica `trashed`, finale true/false |
| `announcement.export` | `announcement_export`, senza UUID risorsa | Conteggio 0–30 e, facoltativamente, colonne esportate |

`changes` accetta solo `status`, `hidden`, `trashed`, ciascuno con esattamente
`before` e `after`, tipi controllati e valori diversi. Il valore precedente può
essere null per dati storici; il successivo deve essere valido. I nomi sono
semantici: `trashed` non aggiunge una colonna cestino, prevista dallo step 10.
Una modifica può descrivere più variazioni effettive, mantenendo quella
obbligatoria della sua azione. Il controllo dello stato/transizione/ownership
effettivi resta alla procedura funzionale, non a un JSON dichiarato dal client.

Motivazione obbligatoria per rifiuto, oscuramento e cestino; se presente deve
contenere testo e non superare 1.000 caratteri. È solo una nota di moderazione,
non un contenitore per eccezioni, credenziali o risposte tecniche.

`details` è vuoto salvo export: `row_count` intero da 0 a 30 e `columns` opzionale
con 1–6 valori tra `title`, `author`, `type`, `status`, `visibility`, `created_at`.
Niente contatti, righe esportate, ricerca libera o filtri testuali nel registro.
Il totale dei due JSON serializzati è limitato a 16 KiB. Chiavi sconosciute e
oggetti annidati ulteriori sono rifiutati, non copiati e poi ripuliti.

Gli esiti sono `success` e `failure`. Un fallimento non contiene motivazione
libera, cambiamenti o dettagli e richiede uno dei codici:
`INVALID_CREDENTIALS`, `ACCESS_DENIED`, `SESSION_INVALID`, `AUTH_UNAVAILABLE`,
`VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `STATE_CONFLICT`, `OPERATION_FAILED`,
`AUDIT_UNAVAILABLE`, `EXPORT_FAILED`, `LOGOUT_FAILED`.
Il chiamante server tradurrà gli errori in questi codici, senza salvare messaggi
grezzi. Ampliare il vocabolario richiederà una modifica esplicita del contratto.

## Retention e indici

`private.admin_audit_retention_cutoff_v1(timestamptz)` è un helper aritmetico
privato: sottrae 12 mesi di calendario sul riferimento convertito in UTC.
`private.purge_admin_audit_events_v1()` non accetta argomenti, usa il timestamp
della transazione e cancella soltanto `occurred_at < cutoff`, restituendo il
conteggio. Un evento esattamente sulla soglia rimane; una seconda esecuzione
senza nuovi eventi scaduti restituisce zero. Nessun client sceglie il cutoff.

Indici: tempo + UUID per ordinamento stabile e retention, operatore + tempo/UUID
per il filtro del registro, correlazione per gli eventi collegati. La prova
EXPLAIN sintetica dimostra l'utilizzabilità dell'indice temporale, non una
latenza o un costo di produzione. L'append non aggiunge query di autorizzazione.

## Verifiche effettuate

```powershell
node --test tests/admin-audit-database.test.mjs tests/admin-authorization-database.test.mjs
node node_modules/eslint/bin/eslint.js tests/admin-audit-database.test.mjs tests/admin-authorization-database.test.mjs tests/helpers/admin-database-fixture.mjs
```

**119 test riusciti, zero fallimenti o skip**; lint mirato senza rilievi.
I test audit comprendono 69 scenari più il contenitore; le regressioni
autorizzazione contano 49 test. Provati:

- migrazioni reali 03 e 04A su schema sintetico e uso del vero helper di
  autorizzazione in una procedura funzionale di prova;
- modifica/audit atomici, errore di storage audit, rollback successivo e
  fallimento persistito in una nuova transazione;
- diniego dopo revoca ruolo/sessione o policy non attestata, UUID distinti,
  identità non inventata per tentativi anonimi, conservazione dopo eliminazione;
- permessi effettivi per anon, authenticated/Admin, service_role con BYPASSRLS
  e supabase_auth_admin; nessuna lettura, scrittura o esecuzione helper;
- payload incompleti/alterati, limiti e dati sensibili fuori dal contratto,
  motivazioni richieste, variazioni tipizzate e massimo 30 righe export;
- calendario bisestile, fine mese, timezone diverse, soglia esatta e ±1 μs,
  ripetibilità della pulizia e timestamp non finiti rifiutati;
- preflight dello script Cron senza estensione: errore esplicito, rollback,
  nessuna cancellazione o falsa installazione di un sostituto.

La fixture DB dei test 03 è stata estratta e condivisa. Il test del template
session policy ora imposta valori sintetici sulla copia in memoria: non assume
che il file dell'operatore sia ancora da compilare e non ne cambia i valori.

**Non verificati su Supabase:** trasporto/JWT, schema completo, ACL effettivi
del target, advisor, attivazione/esecuzione del job e impatto su volumi reali.
Questi residui restano nello step 04 complessivo e nel gate dello step 16.

## Operazioni manuali future — nessuna richiesta adesso

I due file SQL sono **preparati**, non applicati a Supabase. Per lo sviluppo
attuale non installare Docker né applicarli al progetto reale. Prima del
rilascio usare un ambiente isolato con dati sintetici, poi il runbook autorizzato.

1. Verificare destinazione, backup e baseline completa; la foundation Admin
   deve essere già presente. Non riapplicare la migrazione 03 sul reale soltanto
   perché è prerequisito di questa nuova migrazione.
2. Come operatore SQL riservato `postgres`, applicare una volta
   `20261024104822_admin_audit_foundation.sql` dopo la foundation. È transazionale:
   su errore eseguire `ROLLBACK` se la sessione è rimasta in transazione fallita;
   non avanzare e non concedere privilegi API per risolvere un errore.
3. Verificare tabella, vincoli, indici, owner/RLS e ACL degli helper. Su ambiente
   nuovo il registro è vuoto; non ricostruire eventi precedenti all'attivazione.
   Eseguire i test integrati e gli advisor sul target sintetico.
4. Controllare `pg_cron` e le sue funzioni supportate. Soltanto quando è prevista
   l'attivazione su quel target, eseguire come `postgres`
   `dashboard_admin_audit_schedule_retention.sql`. Il file non crea l'estensione,
   non cambia il fuso globale e non esegue immediatamente la pulizia.
5. Lo script crea/aggiorna e attiva il job **`dashboard-admin-audit-retention-v1`**
   alle **03:17 nel fuso configurato di pg_cron** (GMT se non impostato), mentre
   la soglia dei 12 mesi è sempre UTC. Il nome è riservato; un conflitto visibile
   di proprietario/database provoca errore. Lock transazionale serializza le
   attivazioni concorrenti; ripeterlo aggiorna lo stesso job di `postgres`.
6. Controllare configurazione e una vera esecuzione del worker. Verificare owner
   `postgres`, database destinatario, comando esatto, job attivo e stato riuscito.

Query di verifica, soltanto come operatore SQL riservato nell'ambiente indicato:

```sql
select c.relrowsecurity, c.relowner::regrole as owner
from pg_catalog.pg_class c where c.oid='private.admin_audit_event_v1'::regclass;
select has_table_privilege('authenticated','private.admin_audit_event_v1','INSERT') as api_insert,
  has_table_privilege('service_role','private.admin_audit_event_v1','SELECT') as service_select,
  has_function_privilege('authenticated','private.purge_admin_audit_events_v1()','EXECUTE') as api_purge;
select extversion from pg_catalog.pg_extension where extname='pg_cron';
select jobid,jobname,schedule,command,database,username,active from cron.job
where jobname='dashboard-admin-audit-retention-v1';
select jobid,status,return_message,start_time,end_time from cron.job_run_details
where jobid in (select jobid from cron.job where jobname='dashboard-admin-audit-retention-v1')
order by start_time desc limit 10;
```

### Recupero

Un errore della migrazione prima del commit annulla gli oggetti introdotti.
Dopo applicazione riuscita conservare gli eventi e correggere con una nuova
migrazione verificata; non eliminare il registro per riprovare l'installazione.
Non rimuovere le revoche o esporre lo schema `private`.

Per sospendere un job già attivato, come `postgres` e sul target verificato:

```sql
select cron.alter_job(jobid, active := false) from cron.job
where jobname='dashboard-admin-audit-retention-v1' and username='postgres';
```

Per rimuovere soltanto la pianificazione, senza eliminare eventi o helper:

```sql
select cron.unschedule('dashboard-admin-audit-retention-v1');
```

La cancellazione degli eventi scaduti è definitiva sul database corrente;
l'eventuale recupero richiede il backup previsto dal runbook. Nessuna pulizia
di `cron.job_run_details` o altri job del progetto è introdotta da questo step.

## Fonti

- Skill Supabase/Postgres della repository, con riferimenti a privilegi minimi,
  RLS e indici; [changelog Supabase](https://supabase.com/changelog).
- [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart) e
  [API pg_cron](https://github.com/citusdata/pg_cron#altering-a-cron-job).
- [Aritmetica temporale PostgreSQL 17](https://www.postgresql.org/docs/17/functions-datetime.html).

## Prossimo sottopasso

[04B — Audit server](04b-audit-server.md), **6.1 Sol, high**.
