# 04 — Audit persistente e conservazione

**Stato:** Da terminare — 04A e 04B conclusi; verifiche integrate e attivazione Cron pendenti  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze di sviluppo:** 03A implementato e verificato con PGlite. Prove Supabase 03B rinviate per scelta esplicita dell'utente, obbligatorie prima del rilascio.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Creare l'archivio audit e gli ingressi server/procedure per login, logout, modifiche, export e fallimenti significativi. Le semplici consultazioni non generano eventi.

Definire record con ID evento, timestamp UTC, operatore verificato, azione, tipo/ID risorsa, esito, motivazione, variazioni pertinenti e ID di correlazione. Per tentativi non autenticati, operatore assente e contesto minimo: non attribuire l'identità sulla sola email inviata. Non salvare password, token, payload personali completi o dati tecnici senza utilità operativa.

## Contratto e integrità

- Le procedure di modifica inseriscono l'evento di successo nella stessa transazione: se l'audit fallisce, la modifica non viene confermata.
- I fallimenti vengono registrati separatamente dopo il rollback, evitando un'eccezione che cancelli anche la loro traccia.
- Gli ingressi di audit non permettono al browser di inventare operatore, successo o modifiche avvenute. Limitare anche inserimenti diretti con sessione Admin.
- Login completato e export consegnato richiedono la relativa registrazione; se non riesce, non dichiarare completata l'operazione protetta. Il logout deve comunque rimuovere l'accesso locale anche se la scrittura audit fallisce; registrare il problema operativo senza credenziali.
- Nessun aggiornamento/cancellazione dal registro UI. La sola procedura tecnica di retention può eliminare eventi oltre 12 mesi.

Predisporre pulizia giornaliera riservata con cutoff di 12 mesi di calendario, idempotente e in UTC. Il job non concede privilegi di cancellazione agli Admin della dashboard.

## Criteri di completamento e verifiche

Testare successo atomico, errore della scrittura audit, rollback, evento di fallimento persistente, payload alterati e divieto di modifica diretta. Provare retention su date appena prima/dopo la soglia e assicurare che gli eventi recenti restino presenti. Non inventare storico precedente all'attivazione.

## Migrazioni e operazioni manuali

Previste migrazioni per archivio, permessi, indici, procedure e pianificazione della retention. Documentare disponibilità del servizio di scheduling, applicazione locale/staging e successiva attivazione in produzione. Registrare il nome effettivo del job e come verificarne l'esecuzione.

## Avanzamento

Suddivisione approvata:

- [04A — Audit database](04a-audit-database.md): concluso su PGlite; archivio,
  helper privati, retention e script Cron separato predisposti.
- [04B — Audit server](04b-audit-server.md): concluso con PGlite e fixture server;
  ingressi riservati per eventi Auth/fallimenti pronti per lo step 05.

La verifica integrata e il job Cron effettivo restano pendenti e non bloccano
lo sviluppo dopo il completamento implementativo dei due sottopassi.

**Risultati 04A:** migrazione `20261024104822_admin_audit_foundation.sql` applicata
soltanto a fixture PGlite in memoria; 119 test audit/autorizzazione riusciti,
zero fallimenti/skip, lint mirato senza rilievi. Nessuna connessione/applicazione
Supabase né attivazione del job. Contratto SQL, operazioni manuali future e
recupero documentati nella scheda 04A. Nessuna API pubblica aggiunta.

**Risultati 04B:** migrazione `20261024110910_admin_audit_server_bridge.sql`
applicata solo in PGlite; RPC pubblica invoker eseguibile soltanto dal backend,
ponte privato ristretto e servizi server con client tecnico separato dalla sessione
umana. Login subordinato all'audit e logout con pulizia obbligatoria indipendente.
200 test complessivi audit/autorizzazione/server riusciti, zero fallimenti/skip;
typecheck Web/Admin e lint mirato riusciti. Nessuna applicazione Supabase o
lettura/modifica degli env locali. Contratti per cookie e Auth collegati poi
nello step 05 e verificati con risposte sintetiche; integrazione Supabase reale
ancora pendente. Runbook e verifiche residue nelle schede 04B e 05.

## Prossimo step

[05 — Accesso e sessione](05-accesso-sessione.md), **6.1 Sol, high**.
