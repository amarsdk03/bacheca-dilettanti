# M08 — Export CSV della pagina corrente

**Stato:** Concluso per applicazione e verifica strutturale sul progetto identificato. Prove integrate e rilascio separati.  
**Modello consigliato:** 6.1 Sol, high.  
**Dipendenze:** [M07C Concluso](07-cestino.md), gate del cestino disabilitato; copia manuale Free M02 acquisita, restore non provato.  
**Passi successivi M09/M10:** Conclusi. Prossimo step operativo [IN02 — Auth e accesso Admin](auth-accesso-admin.md).

[Master](../master_plan.md) · [Contratto export](../steps/11-export-csv.md)
· [Runbook](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md).

Destinatario: **Webapp Bacheca Dilettanti**, `nsytraextbndfyprwzts`, Supabase
Free con dati di prova personali. Connessione verificata tramite MCP
`get_project_url`: `https://nsytraextbndfyprwzts.supabase.co`.

## File e perimetro

| Artefatto | Uso |
| --- | --- |
| [Migrazione esistente](../../../supabase/migrations/20261024205423_admin_announcement_export.sql) | Applicata una sola volta, contenuto invariato |
| [Verificatore M08](../../../supabase/scripts/dashboard_admin_verify_m08.sql) | Cataloghi in READ ONLY, prima/dopo; nessuna chiamata export |
| [Generatore](../../../scripts/dashboard-integration/build-m08-verification.mjs) | Riproduce il verificatore dal sorgente M07 invariato e dal manifest M08 |
| [Impronte](../../../scripts/dashboard-integration/m08-definition-fingerprints.json) | Tre definizioni/ACL/metadata attesi, riprodotti in PGlite |
| [Confronto](../../../scripts/dashboard-integration/compare-m08-reports.mjs) | Tutte le 33 impronte tabella e tutte le altre routine public/private |
| [Test del verificatore](../../../tests/admin-m08-verification.test.mjs) | Prerequisiti, stato iniziale/finale, drift, grant, overload e confronto |

SHA-256 della migrazione:
`df51f80d8d04d08abf67d67cae5f4a7b17820275bdaf2a38ebab11a691b9e467`.
M08 crea il wrapper pubblico invoker e il ponte privato definer, eseguibili
soltanto da `authenticated` fra i ruoli API; il ponte verifica autonomamente
sessione e ruolo Admin. Estende inoltre il validatore audit agli ID esportati.
Non aggiunge tabelle, policy sui contenuti, job o file persistenti.

Il nuovo verificatore riutilizza i controlli M01–M07. Normalizza **solo** il
corpo esatto del validatore audit M08 per il prerequisito M02 e verifica
indipendentemente corpo reale, owner, ACL, EXECUTE effettivo, configurazione,
firma, linguaggio e metadata delle tre routine M08. Il verificatore M07
originale resta invariato: il nuovo hash audit previsto da M08 non deve
provocare replay di M02/M07 o ripristino del vecchio validatore.

## Esito sul progetto — 26 ottobre 2026

1. **22:06:09 UTC:** controllo iniziale `ready_for_m08_catalog_checks_only`,
   `postgres`, READ ONLY. Prerequisiti M01–M07 coerenti; solo il validatore
   audit esistente, con hash/ACL iniziali esatti; entrambe le funzioni export
   assenti. Confronto con il finale M07: 33/33 impronte identiche.
2. Applicata tramite `supabase.apply_migration` l'intera migrazione esistente,
   transazione atomica e lock timeout 10 secondi. Esito positivo. Cronologia
   remota: **`20261026220629_admin_announcement_export`**, versione assegnata
   dal servizio al contenuto del file locale `20261024205423`.
   Le otto voci precedenti sono invariate. Non rinominare o riapplicare il file
   per compensare la differenza di versione; la cronologia manuale precedente
   non viene riconciliata automaticamente.
3. **22:06:50 UTC:** `m08_structurally_verified`, tutti i match finali veri,
   tre corpi e tutte le protezioni corrispondenti. Hash finali:
   validatore audit `62989e15a0d3c83f39e23a600332dc06`, ponte export
   `3ff58ded93b08f40f4ff5000f268e885`, wrapper
   `708210e7709133e6a59ac9e8b5484575`. Nessun overload inatteso.
4. Confronto completo prima/dopo: **33/33 tabelle e 149/149 altre routine
   identiche**, zero differenze. Le impronte delle altre routine includono
   cataloghi, owner, ACL e privilegi effettivi; contengono OID e vanno
   confrontate soltanto sullo stesso database, non fra restore o fixture.
5. **22:06:57 UTC:** controllo separato del gate in READ ONLY, una riga,
   **`gate_disabled=true`**. Nessuna attivazione o funzione export chiamata
   sul progetto per la verifica.
6. Advisor security: 25 riscontri come nel checkpoint M07C, **zero nuovi
   riscontri**. Conservati gli avvisi preesistenti, senza grant o modifiche
   estranee per silenziarli. Dettagli e URL di rimedio nella
   [scheda M07](07-cestino.md#chiusura-m07c--installazione-e-verifica-sul-progetto)
   e nel JSON advisor completo.

## Evidenze e riproduzione

In `.local/dashboard-integration/` sono conservati report completi e risposte
MCP originali, distinti dai confronti derivati:

- `m08-before-20261026T220609Z.json` e `.tool-response.json`;
- `m08-application-20261026T220609Z.json`;
- `m08-after-20261026T220650Z.json` e `.tool-response.json`;
- `m08-comparison-20261026T220650Z.json`;
- `m08-gate-20261026T220650Z.json` e `.tool-response.json`;
- `m08-history-20261026T220650Z.json`;
- `m08-security-advisors-20261026T220650Z.json`;
- `m08-completion-20261026T220650Z.json`, provenienza, hash ed esiti.

Il confronto legge soltanto i file:

```powershell
node scripts/dashboard-integration/compare-m08-reports.mjs .local/dashboard-integration/m08-before-20261026T220609Z.json .local/dashboard-integration/m08-after-20261026T220650Z.json
```

Rigenerazione locale: `node scripts/dashboard-integration/build-m08-verification.mjs`.
Per una nuova verifica motivata, eseguire interamente il verificatore M08
come `postgres` sul destinatario verificato, da BEGIN READ ONLY a ROLLBACK.
Esito atteso `m08_structurally_verified`; il valore del gate resta una verifica
separata. Confrontare il nuovo report con quello finale completo, conservando
i limiti falsi originali e senza equiparare i cataloghi alle prove funzionali.

## Verifiche locali, recupero e limiti

**86 casi pertinenti superati:** 80 export DB/server/CSV/HTTP/controller e
sei nuovi casi del verificatore. Coperti limite 1/30, ordine/cursori, filtri
cestino, input/ID falsificati, grant e ruolo/sessione, audit fallito senza
consegna dati, formula injection, risposte incerte e revoca Blob URL.
I nuovi test verificano anche READ ONLY senza alterare la sessione, corpi
CRLF, assenza di prerequisiti, stato parziale, overload/procedure/aggregati,
drift di altre funzioni/tabelle e confronto incompleto. Lint dei tre nuovi
file JavaScript riuscito; generazione SQL riproducibile byte per byte.
Nessuna modifica a migrazioni precedenti, app o env; nessuna build/server.

In caso di errore o stato parziale conservare la diagnostica e rileggere
cataloghi/cronologia, senza replay. Il file è già applicato: una correzione
richiede una migrazione separata. Per sospendere l'export usare l'Admin
compatibile precedente o revocare EXECUTE a `authenticated` su **entrambi**
wrapper e ponte come operatore autorizzato. Conservare audit e validatore
esteso: gli eventi futuri possono contenere ID. Non rimuovere le protezioni
del cestino o il suo schema per recuperare dall'export.

Nessuna operazione manuale residua per l'installazione M08. Restano nel gate 16
Auth/PostgREST, API exposure effettiva, HTTP/browser e download reale,
Excel/LibreOffice, concorrenza, cache, Storage, recupero e rilascio.
Lo step funzionale 11 resta Da terminare per queste prove; M08 è Concluso
nel registro delle installazioni. M09/M10 sono successivamente conclusi; prossimo IN02.
