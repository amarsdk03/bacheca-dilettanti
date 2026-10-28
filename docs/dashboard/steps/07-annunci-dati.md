# 07 — Contratti e query Annunci

**Stato:** Da terminare — 07A e 07B conclusi come milestone; verifiche integrate pendenti  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze di sviluppo:** Step 06 implementato e verificato con test mirati; guardie e audit disponibili. Prove browser/integrate 03–06 rinviate secondo il master e obbligatorie prima del rilascio.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Creare la feature Annunci con moduli server per lista/dettaglio, validazione dei filtri e DTO dedicati. Separare le query dai componenti e dalle future mutazioni.

Lista con titolo, autore/profilo, tipologia, stato, visibilità, creazione, UUID e versione/confronto per concorrenza. Non caricare media, contatti e payload completi per ogni riga. Recuperare il dettaglio soltanto su richiesta autorizzata.

Ricerca titolo/UUID; filtri stato, tipologia e visibilità. Il filtro cestino viene attivato allo step 10 quando esiste il relativo schema, senza fingere che sia già operativo.

## Contratti e paginazione

Limitare sul server a 30 elementi e validare cursore/filtri. Ordinamento iniziale creazione decrescente con UUID come discriminante stabile; gestire in modo esplicito le date mancanti ammesse dal modello. Prevedere `items`, `nextCursor` e stato di ulteriore pagina, senza conteggio completo obbligatorio per ogni richiesta.

Il dettaglio restituisce un DTO con informazioni necessarie alla moderazione e collegamenti sicuri. Distinguere accesso negato, risorsa assente ed errore operativo. Nessun dato Admin passa attraverso query pubbliche meno restrittive.

Autorizzazione attuale accorpata alla procedura; join/batch per autore e tipologie, evitando richieste per singola riga. Considerare tutti i tipi di annuncio già supportati dalla webapp.

## Criteri di completamento e verifiche

Limite massimo anche con input alterato, cursori non validi, filtri combinati, ricerca UUID, ordinamento con date uguali/mancanti, lista vuota e risorsa cancellata. Provare chiamate dirette con ruolo/sessione non validi. Misurare query/chiamate su 1 e 30 risultati per escludere N+1.

## Migrazioni e operazioni manuali

Possibili procedure di lettura e indici mirati; documentare piani query e permessi. Applicare e verificare su ambiente sintetico prima dell'interfaccia. Aggiornare tipi condivisi secondo il workflow del repository.

## Avanzamento

Suddivisione approvata per svolgere un solo sottopasso per prompt:

- [07A — Lista Annunci](07a-annunci-lista.md): Concluso come milestone con PGlite;
  contratti, filtri, cursore, RPC autorizzata e servizio server. 218 test riusciti,
  typecheck Web/Admin e lint mirato riusciti. Migrazione preparata, applicata solo
  in PGlite; nessuna operazione manuale richiesta ora.
- [07B — Dettaglio Annunci](07b-annunci-dettaglio.md): Concluso come milestone
  con PGlite; RPC/sessione umana, undici tipologie, proiezioni strutturate,
  nomi anonimi e riferimenti pubblici, descrittori URL validati e fingerprint
  completo. 289 test riusciti (71 nuovi), typecheck Web/Admin e lint riusciti.
  Migrazione preparata, applicata solo in PGlite; nessuna operazione manuale ora.

Identità autore: nome pubblico e UUID applicativi anche per profili anonimi;
nessun nome reale anonimizzato, UUID Auth o contatto dell'account nei DTO.
La pagina Annunci resta provvisoria fino allo step 08.

Restano obbligatori prima del rilascio: applicazione su ambiente isolato con
schema completo, JWT/Auth/PostgREST, advisor/ACL effettivi e misure dei piani
interni/filtri/cursori profondi. I risultati PGlite non sostituiscono questi
controlli. Runbook, contratti e migrazioni nelle schede 07A/07B. La parte
implementativa dello step 07 è disponibile per lo sviluppo 08.

## Prossimo step

[08 — Tabella e anteprima Annunci](08-annunci-interfaccia.md), **6.1 Sol, medium**.
