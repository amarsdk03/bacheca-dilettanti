# 00 — Documentazione della roadmap

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze:** Nessuna; è la prima operazione del piano approvato.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Creare prima di qualsiasi implementazione il master, i documenti degli step 00–16 e i collegamenti reciproci. Allineare il documento architetturale alle decisioni ormai approvate, evitando indicazioni obsolete su perimetro, audit e cancellazione.

Il master deve contenere protocollo «un prompt, uno step», quattro stati ammessi, modello/impegno, ordine e dipendenze, requisiti comuni e riepilogo obbligatorio. Ogni step deve specificare risultato, verifiche e possibili applicazioni manuali.

## Criteri di completamento e verifiche

- Tutti i 17 step hanno un documento e una riga della roadmap con modello, impegno e stato.
- Collegamenti locali risolti e nessuna contraddizione sul ruolo esatto `Admin`, prima versione, cestino, export, audit e navigazione.
- Modifiche limitate a `docs/dashboard`; nessuna migrazione, modifica applicativa o test di runtime.
- Lo step 00 è segnato Concluso soltanto dopo la verifica documentale; gli altri restano Da iniziare.

## Migrazioni e operazioni manuali

Nessuna. Nessun ambiente o account viene creato.

## Avanzamento

Concluso il 2026-10-23. Creato prima il master, poi le 17 schede operative e aggiornato il documento architetturale con le decisioni approvate.

Verifica documentale su 19 file Markdown: 17 step presenti, collegamenti locali risolti, metadati richiesti presenti e fence bilanciate. Revisione della coerenza tra perimetro, autorizzazione, navigazione, audit, cestino e roadmap; controllo diff senza errori di whitespace. Modifiche di questo step limitate a `docs/dashboard`. Nessun test applicativo, build, migrazione o operazione su servizi esterni eseguiti.

Operazioni manuali: **nessuna**. Gli step 01–16 restano **Da iniziare**.

## Prossimo step

[01 — Workspace e webapp](01-workspace-web.md), **6.1 Sol, high**.
