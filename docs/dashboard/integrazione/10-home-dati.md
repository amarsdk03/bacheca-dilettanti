# M10 — Dati della Home

**Stato:** Concluso per installazione e verifica strutturale sul progetto identificato. Prove integrate separate.  
**Modello consigliato:** 6.1 Sol, high.  
**Dipendenza:** [M09 Concluso](09-registro-attivita.md).  
**Prossimo step:** [IN02 — Auth, policy sessione e accesso Admin](auth-accesso-admin.md), al prossimo «procedi».

[Master](../master_plan.md) · [Contratto Home](../steps/13-home-dati.md)
· [Runbook](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md).

Destinatario: **Webapp Bacheca Dilettanti**, `nsytraextbndfyprwzts`, Supabase Free
con dati di prova personali. Connessione verificata tramite MCP `get_project_url`.
Copia manuale M02 acquisita, ripristino non provato.

## File e perimetro

| Artefatto | Uso |
| --- | --- |
| [Migrazione esistente](../../../supabase/migrations/20261024212824_admin_home_aggregations.sql) | Quattro funzioni Home, applicata una sola volta, contenuto invariato |
| [Verificatore M10](../../../supabase/scripts/dashboard_admin_verify_m10.sql) | Cataloghi READ ONLY prima/dopo, senza leggere popolazioni o chiamare aggregazioni |
| [Generatore](../../../scripts/dashboard-integration/build-m10-verification.mjs) | Riutilizza M09 invariato e il manifest M10 |
| [Impronte](../../../scripts/dashboard-integration/m10-definition-fingerprints.json) | Corpi, ACL e metadata riprodotti in PGlite |
| [Confronto](../../../scripts/dashboard-integration/compare-m10-reports.mjs) | 33 tabelle, metadati audit/Auth e tutte le altre routine |
| [Test](../../../tests/admin-m10-verification.test.mjs) | Prerequisiti, colonne, STABLE, ACL, overload, prima/dopo e confronto |

SHA-256 della migrazione:
`fd7cc905e9ce81c90dc1023c27dcf5bf40144276c4af152f6c2bb3fa2ead71aa`.
Nessuna nuova tabella, indice, policy, job o integrazione finanziaria.
Wrapper pubblici SECURITY INVOKER e ponti privati SECURITY DEFINER; tutti
STABLE, owner postgres e search_path vuoto, EXECUTE solo authenticated fra
i ruoli API. I ponti verificano autonomamente sessione umana e ruolo Admin.

Popolazioni conservate: utenti esattamente `Utente` con registrazione
completata; annunci fuori dal cestino; annunci in revisione fuori dal cestino.
Profitti non disponibili, nessuna query economica. Grafici per una metrica
alla volta, calendario Europe/Rome, dodici mesi o fasce di anzianità della
coda; distribuzioni dei profili contano profili, non utenti o sottoprofili.

## Esito sul progetto — 26 ottobre 2026

1. **22:21:28 UTC:** `ready_for_m10_catalog_checks_only`, postgres, READ ONLY.
   M01–M09 coerenti, quattro funzioni Home assenti. Dodici colonne sorgente
   presenti con tipi compatibili, inclusa `profilo.tipologia_principale`.
   Nessuna modifica dello schema sorgente necessaria sul progetto.
   Confronto con M09: 33 tabelle, metadati audit/Auth e 152 routine
   confrontabili invariati; quattro routine M09 controllate separatamente e
   incluse nella nuova baseline di 156 routine non modificate da M10.
2. Intera migrazione esistente applicata una sola volta tramite
   `supabase.apply_migration`, transazione atomica e lock timeout 10 secondi.
   Cronologia remota: **`20261026222201_admin_home_aggregations`**, versione
   assegnata dal servizio al contenuto del file locale `20261024212824`.
   Le dieci voci precedenti sono invariate. Non rinominare o riapplicare il
   file per compensare la differenza di versione; nessuna riconciliazione
   automatica della cronologia manuale precedente.
3. **22:22:14 UTC:** `m10_structurally_verified`, quattro corpi, STABLE,
   owner, search_path, firme e ACL corrispondenti; nessun overload inatteso.
   Hash finali: ponte grafico `4be1cb4b412e4a59a7fd65a0a653e429`, ponte
   riepilogo `1d15061006cff84a33a02034891c858f`, wrapper grafico
   `8bc4c9f1e2f7c00ddcd43d9a84668b72`, wrapper riepilogo
   `49bccf5793a43c6706618ee4db73714b`.
4. Confronto completo prima/dopo: **33/33 tabelle, due impronte audit/Auth
   e 156/156 altre routine identiche**, zero differenze. Nessuna nuova
   esclusione di tabelle/indici rispetto a M09. Le impronte contenenti OID
   vanno confrontate sullo stesso database, non fra restore o fixture.
5. **22:22:19 UTC:** controllo gate separato READ ONLY, una riga,
   **`gate_disabled=true`**. Nessun KPI, profilo, evento o identità Auth letto
   sul progetto per la verifica. Nessuna attivazione del cestino o della retention.
6. Advisor security: 25 riscontri come in M09, **zero nuovi riscontri**.
   Restano gli avvisi preesistenti e i rimedi documentati nella
   [scheda M09](09-registro-attivita.md), senza modifiche estranee per silenziarli.

## Evidenze e riproduzione

In `.local/dashboard-integration/`: `m10-before-20261026T222128Z.json`,
`m10-after-20261026T222214Z.json` e relative risposte MCP complete;
`m10-application-20261026T222128Z.json`; confronto, gate, cronologia,
advisor, log test e riepilogo `m10-completion-20261026T222214Z.json`.
I limiti falsi dei report SQL originali restano invariati: confronto,
connessione e valore del gate sono evidenze separate.

```powershell
node scripts/dashboard-integration/compare-m10-reports.mjs .local/dashboard-integration/m10-before-20261026T222128Z.json .local/dashboard-integration/m10-after-20261026T222214Z.json
```

Rigenerazione: `node scripts/dashboard-integration/build-m10-verification.mjs`.
Per una nuova verifica motivata eseguire il file SQL **intero** come postgres
sul destinatario verificato, da BEGIN READ ONLY a ROLLBACK. Atteso
`m10_structurally_verified`; confrontare tutte le impronte con il finale.
M10 è la baseline cumulativa corrente. Le installazioni precedenti sono
concluse; non ripetere automaticamente i vecchi script a ogni «procedi».

## Test, recupero e limiti

**101 test riusciti, zero fallimenti/skip**, inclusi sei nuovi casi del
verificatore; lint dei tre nuovi file JavaScript riuscito. Coperti ACL e
ruolo esatto, revoca/scadenza, STABLE e transazioni READ ONLY, zero reali,
popolazioni/denominatori, nascosti/cestino/date anomale, finestre mensili e
ora legale, fasce della coda, profitti indipendenti dalle tabelle metriche,
ultime cinque operazioni senza N+1, proiezione DTO e HTTP private/no-store.
Il campione prestazionale usa soltanto 6.000 record sintetici per tabella
in PGlite; non attesta latenza o piani sul progetto remoto.
I nuovi test coprono corpi CRLF, colonne mancanti/tipi incompatibili,
volatilità alterata, grant tecnici, stato parziale, overload/procedure/aggregati,
drift M09/Auth e confronto incompleto/duplicato. SQL riprodotto byte per byte.
Migrazione e sorgenti precedenti invariati; nessuna modifica ad app/env,
nessuna build, server o distribuzione.

Per errori o esiti incerti conservare la diagnostica, verificare cataloghi e
cronologia e non riapplicare il file committato. Le correzioni richiedono una
migrazione separata. Per sospendere Home usare l'Admin compatibile precedente
o revocare EXECUTE ad authenticated su entrambi i wrapper e sui rispettivi
ponti come operatore autorizzato. Conservare tabelle, autorizzazione, audit,
indice M09 e protezioni del cestino; nessun DROP o restore rapido sul sorgente.

Nessuna operazione manuale residua per M10. Restano separati Auth/PostgREST,
API exposure, cookie, browser/deploy, correttezza su dati sintetici tramite
gateway, concorrenza, misure su volumi rappresentativi, recupero e rilascio.
Lo step funzionale 13 resta Da terminare per queste prove. Installazioni
previste fino a M10 strutturalmente verificate; **IN02 non avviato**.
