# M09 — Registro attività

**Stato:** Concluso per installazione e verifica strutturale sul progetto identificato. Prove integrate separate.  
**Modello consigliato:** 6.1 Sol, high.  
**Dipendenza:** [M08 Concluso](08-export-csv.md).  
**Passo successivo M10:** [Concluso](10-home-dati.md). Prossimo step operativo [IN02 — Auth e accesso Admin](auth-accesso-admin.md).

[Master](../master_plan.md) · [Contratto funzionale](../steps/12-registro-attivita.md)
· [Runbook](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md).

Destinatario: **Webapp Bacheca Dilettanti**, `nsytraextbndfyprwzts`, Supabase Free
con dati di prova personali. Connessione verificata tramite MCP `get_project_url`.
La copia manuale M02 resta acquisita; il ripristino non è provato.

## Sorgenti e verifiche

| Artefatto | Uso |
| --- | --- |
| [Migrazione esistente](../../../supabase/migrations/20261024211431_admin_audit_reads.sql) | Quattro funzioni e un indice, applicata una sola volta, contenuto invariato |
| [Verificatore M09](../../../supabase/scripts/dashboard_admin_verify_m09.sql) | Cataloghi READ ONLY prima/dopo; nessuna lettura di eventi o identità Auth |
| [Generatore](../../../scripts/dashboard-integration/build-m09-verification.mjs) | Riutilizza M08 invariato e il manifest M09 |
| [Impronte](../../../scripts/dashboard-integration/m09-definition-fingerprints.json) | Corpi, ACL, metadata e indice riprodotti in PGlite |
| [Confronto](../../../scripts/dashboard-integration/compare-m09-reports.mjs) | 33 tabelle, audit/Auth e tutte le altre routine |
| [Test](../../../tests/admin-m09-verification.test.mjs) | Prerequisiti, prima/dopo, grant, indice, overload e confronto |

SHA-256 della migrazione:
`05e49150a129d5a8af3ef2941cd00e077714441cd01158f7e6f090750eb86a2e`.
Le RPC pubbliche sono SECURITY INVOKER; i ponti privati sono SECURITY DEFINER,
owner postgres e search_path vuoto. Solo `authenticated` può eseguirle fra
i ruoli API, con controllo autonomo di sessione e ruolo Admin nei ponti.
Nessun grant SELECT su audit o Auth, nessuna modifica agli eventi, alla
retention o al gate del cestino. Le funzioni conservano la volatilità `v`
del sorgente esistente; le letture funzionano anche in transazione READ ONLY.

Il nuovo indice parziale è
`private.admin_audit_event_auth_time_v1(actor_auth_user_uuid, occurred_at DESC, event_uuid DESC)`
con predicato `actor_auth_user_uuid IS NOT NULL`.
Il verificatore M09 lo esclude soltanto dal vecchio conteggio dei quattro
indici audit e dall'impronta normalizzata di quella tabella; verifica
separatamente tabella padre, definizione completa, owner e stati dell'indice.
Non esclude altri indici o altre modifiche. M08 e i suoi sorgenti restano
invariati: dopo M09 usare il nuovo verificatore cumulativo, senza ripristinare
il precedente numero di indici per ottenere un vecchio stato positivo.

## Esito sul progetto — 26 ottobre 2026

1. **22:13:44 UTC:** `ready_for_m09_catalog_checks_only`, `postgres`, READ ONLY.
   Prerequisiti M01–M08 validi; quattro funzioni e indice assenti. SELECT su
   tabelle e singole colonne audit/Auth negato ad anon, authenticated e
   service_role. Colonne Auth `id` UUID ed `email` testuale disponibili.
   Le 33 impronte e le 149 routine confrontabili con M08 sono invariate;
   le tre routine M08 sono controllate indipendentemente e incluse nella
   nuova baseline di 152 routine non modificate da M09.
2. Applicata una sola volta l'intera migrazione esistente tramite
   `supabase.apply_migration`, transazione atomica e lock timeout 10 secondi.
   Cronologia remota: **`20261026221418_admin_audit_reads`**, versione assegnata
   dal servizio al contenuto del file locale `20261024211431`.
   Le nove voci precedenti sono invariate. Non rinominare o riapplicare il
   sorgente per compensare la differenza di versione; cronologia manuale
   precedente non riconciliata automaticamente.
3. **22:14:31 UTC:** `m09_structurally_verified`, quattro corpi e tutte le
   protezioni corrispondenti, indice corretto, nessun overload inatteso,
   SELECT API su audit/Auth ancora negato. Hash corpi:
   ponte dettaglio `dd131c46630324cdaa3a825f8705ad5b`, ponte lista
   `cdae8b9e6cc187adb973ba946af110ef`, wrapper dettaglio
   `108cec6ff9a7bfdc0b075ea8f8c5c80b`, wrapper lista
   `f435781e6c58f209421452db28f5640b`.
4. Confronto completo prima/dopo: **33/33 tabelle, due impronte audit/Auth e
   152/152 altre routine identiche**, zero differenze. Le impronte contengono
   OID: confrontarle soltanto sullo stesso database, non fra restore o fixture.
5. **22:14:36 UTC:** gate letto separatamente in READ ONLY, una riga,
   **`gate_disabled=true`**. Nessuna funzione di lettura audit chiamata sul
   progetto durante la verifica; nessuna riga Auth o evento esportato.
6. Advisor security: **25 riscontri come prima, zero nuovi**. Restano gli
   avvisi preesistenti documentati nella [scheda M07](07-cestino.md), senza
   modifiche estranee per silenziarli. Riferimenti ai rimedi:
   [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
   [EXECUTE anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
   [EXECUTE authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
   [password compromesse](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Evidenze e riproduzione

In `.local/dashboard-integration/`: `m09-before-20261026T221344Z.json`,
`m09-after-20261026T221431Z.json` e relative risposte MCP complete;
`m09-application-20261026T221344Z.json`; confronto, gate, cronologia,
advisor, log test e riepilogo `m09-completion-20261026T221431Z.json`.
I report SQL e i loro limiti falsi restano invariati: identità connessione,
confronti derivati e valore gate sono evidenze separate.

```powershell
node scripts/dashboard-integration/compare-m09-reports.mjs .local/dashboard-integration/m09-before-20261026T221344Z.json .local/dashboard-integration/m09-after-20261026T221431Z.json
```

Rigenerazione: `node scripts/dashboard-integration/build-m09-verification.mjs`.
Per una nuova verifica motivata eseguire il file SQL **intero**, come postgres
sul destinatario verificato, da BEGIN READ ONLY a ROLLBACK. Atteso
`m09_structurally_verified`; confrontare tutte le impronte con il finale.

## Test, recupero e limiti

**120 test riusciti, zero fallimenti/skip**, inclusi sei nuovi casi del
verificatore; lint dei tre nuovi file JavaScript riuscito. Coperti ACL e
ruolo esatto, sessioni revocate, ponte diretto, pagine 1/30, timestamp
coincidenti/microsecondi, confini Europe/Rome e ora legale, email corrente,
operatori sconosciuti, dettaglio rimosso dalla retention, nessun evento
creato dalle consultazioni, proiezione dati, HTTP/DTO/controller e stati UI.
I nuovi test verificano READ ONLY, corpi CRLF, stato parziale, indice errato,
grant EXECUTE e SELECT di singole colonne, overload/procedure/aggregati,
drift di audit/Auth e delle funzioni M08, confronto incompleto e duplicato.
SQL rigenerato byte per byte. Migrazione e sorgenti precedenti invariati;
nessuna modifica ad app o env, nessun build, server, deploy o job Cron.

In caso di errore conservare diagnostica e rileggere cataloghi/cronologia;
non riapplicare il file già committato. Le correzioni richiedono una
migrazione separata. Per sospendere le letture, usare l'Admin compatibile
precedente o revocare EXECUTE ad authenticated su entrambi i wrapper e
entrambi i ponti, come operatore autorizzato. Conservare archivio, eventi,
helper di scrittura, indice e protezioni precedenti; nessun DROP o restore
rapido sul progetto sorgente per recuperare la pagina Registro.

Nessuna operazione manuale residua per M09. Prove Auth/PostgREST/browser,
API exposure, cookie, revoca e retention concorrente, piani su volumi
rappresentativi, cache e rilascio restano nel gate 16. Lo step funzionale 12
rimane Da terminare per queste prove; **M09 installazione è Concluso**.
M10 è successivamente concluso; prossimo IN02 — Auth, policy sessione e accesso Admin.
