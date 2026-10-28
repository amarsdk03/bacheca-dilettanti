# 12 — Registro attività e dettagli

**Stato:** Da terminare (sole verifiche integrate; implementazione verificata)  
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze:** Implementazione dello step 11 verificata; prove integrate rinviate al gate 16. Archivio audit già alimentato dagli step precedenti.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Implementare lista read only con tre colonne informative «Data e ora», «Amministratore», «Operazione» e pulsante «Mostra dettagli». Filtri per periodo, operatore, azione ed esito, mantenuti nell'URL.

Massimo 30 eventi per pagina, ordine timestamp decrescente e ID come discriminante stabile. Timestamp UTC nel dato, presentazione in Europe/Rome. Operatore sconosciuto/non autenticato indicato esplicitamente senza inferirlo dall'input del login.

Pannello laterale con ID evento, operatore, risorsa, esito, motivazione, variazioni pertinenti e correlazione. Caricare i dettagli su richiesta; rendere come testo i valori provenienti dai contenuti.

## Contratti e comportamento

Moduli di query server nella feature audit; DTO di lista separato dal dettaglio. Autorizzazione per entrambe le letture. Nessuna azione modifica/elimina; la retention resta riservata al job tecnico.

Nessun evento audit per la semplice apertura del registro. Se un evento viene rimosso dalla retention tra lista e dettaglio, mostrare stato non disponibile e aggiornamento della lista. Prima dell'attivazione non esiste storico: stato vuoto esplicativo, non righe simulate.

## Criteri di completamento e verifiche

Filtri combinati, paginazione, timestamp coincidenti, assenza operatore, eventi falliti, retention concorrente e sessione revocata. Verificare che il dettaglio non riveli campi esclusi dal modello audit. Tastiera, mobile, skeleton e retry.

## Migrazioni e operazioni manuali

[20261024211431_admin_audit_reads.sql](../../../supabase/migrations/20261024211431_admin_audit_reads.sql),
generata con Supabase CLI, applicata e verificata in M09 sul progetto
`nsytraextbndfyprwzts`, versione remota `20261026221418`. Nessuna modifica alla retention o al gate
del cestino; nessun nuovo script da eseguire o variabile d’ambiente da compilare.

## Avanzamento

### Integrazione esterna M09 — Concluso

[Scheda M09](../integrazione/09-registro-attivita.md): applicazione unica via
MCP e verifica strutturale delle 22:14:31 UTC positiva. Quattro funzioni e
indice corrispondenti; SELECT API su audit/Auth negato, 33 tabelle, due
impronte audit/Auth e 152 altre routine invariati. Gate cestino disabilitato,
nessun nuovo riscontro advisor. 120 test mirati e lint riusciti.
Nessuna operazione manuale residua per l'installazione; prove funzionali
integrate dello step 12 ancora nel gate 16. Prossimo M10 — Dati della Home.

### Risultato implementato

Pagina protetta `/registro-attivita`, tabella con tre colonne informative e
azione finale, badge esito e Sheet read only. Caricamenti distinti per lista
e dettaglio, skeleton, errore/riprova, storico vuoto reale, evento rimosso dalla
retention con aggiornamento elenco. Nessun evento simulato né apertura implicita
di contenuti o link esterni. Date visibili in Europe/Rome; nel dettaglio anche
il timestamp UTC originale con i microsecondi.

**Decisione confermata dall’utente: email attuale.** L’operatore è risolto tramite
`auth.users.id = actor_auth_user_uuid`, senza dedurlo dall’indirizzo digitato al
login, dall’email del profilo pubblico o dal ruolo attuale dell’autore dell’evento.
L’email può cambiare e non è una fotografia storica. In sua assenza si mostra
l’UUID applicativo abbreviato, altrimenti l’UUID Auth; entrambi completi nel
dettaglio. Con soli riferimenti Auth si distingue “Account verificato”, senza
attestare un’identità Admin. Senza entrambi i riferimenti: “Non identificato”.
La cancellazione dell’account non cancella l’identità conservata nell’audit.

Filtri applicati insieme dal form e mantenuti nell’URL: date `from`/`to`,
`operator` (email attuale esatta senza distinzione maiuscole/minuscole, UUID Auth
o applicativo), `action` ed `outcome`. Il pulsante “Non identificato” seleziona
`operator=unknown`; campo vuoto include tutti. Nessuna directory account o
autocompletamento. Date inclusive di calendario Europe/Rome, intervallo SQL
UTC semiaperto fino alla mezzanotte del giorno successivo, con cambio dell’ora.
Nessun filtro predefinito che nasconda parte dello storico conservato.

Massimo 30 risultati sul server, 31 solo per lookahead interno, senza conteggio
globale. Ordine `(occurred_at DESC, event_uuid DESC)`, cursore Base64URL v1
vincolato ai cinque filtri normalizzati, timestamp a sei decimali e UUID.
Cambi di filtri ripartono dalla prima pagina. Avanti/indietro locale, prima
pagina, History/popstate e rivalidazione al ripristino dalla BFcache. Cursori,
duplicati URL e date malformati mostrano un errore esplicito.

Il controller annulla le richieste e usa generazioni indipendenti per evitare
che risposte superate sostituiscano i dati correnti o causino redirect tardivi.
Un diniego corrente pulisce lista e dettaglio e porta a `/accesso`. Il pannello
ha nome/descrizione accessibili, focus iniziale al titolo e ritorno al pulsante
se ancora presente, altrimenti al titolo dell’elenco. Nessuna modifica ottimistica
o azione di scrittura nel registro.

### Autorizzazione e dati esposti

RPC `public.admin_list_audit_events_v1(jsonb)` e
`public.admin_get_audit_event_v1(uuid)`, wrapper SECURITY INVOKER. I rispettivi
ponti privati SECURITY DEFINER, owner postgres/search_path vuoto, verificano
ruolo SQL originale authenticated e chiamano **una volta per operazione**
`private.require_admin_context_v1()`: identità, sessione umana e valore attuale
esattamente `Admin`. Anche la chiamata diretta al ponte richiede lo stesso
controllo. Nessuna chiave tecnica usata nelle letture e nessun grant SELECT
su audit o `auth.users` ai ruoli API. Lo schema private resta non esposto.

Una query di lista risolve le identità con join; nessuna RPC/query aggiuntiva
per riga. Indice parziale aggiunto su
`(actor_auth_user_uuid, occurred_at DESC, event_uuid DESC)`; conservati gli
indici tempo e UUID applicativo esistenti. I confronti UUID non trasformano
le colonne in testo. Il costo effettivo di filtri, join e piani su volumi
rappresentativi resta da misurare nello staging: nessuna latenza garantita.

Lista: solo ID/data/azione/esito e riferimenti operatore/email attuale.
Dettaglio su richiesta: ID evento, UTC, operatore con UUID, risorsa/correlazione,
motivo/codice errore, variazioni consentite `status`, `hidden`, `trashed`
con prima/dopo. Export: quantità 0–30, colonne ammesse e UUID annunci quando
registrati; eventi storici senza UUID mostrano “ID non disponibili per questo
evento storico”. L’evento export attesta la preparazione autorizzata, non il
salvataggio del file sul dispositivo. Nessuna lettura dei contenuti della risorsa.
SQL e servizio proiettano DTO distinti e limitati; mai JSON arbitrario,
credenziali, messaggi SQL o email tentate. I valori sono resi come testo React.

I GET interni `/api/registro-attivita` e `/api/registro-attivita/[id]` usano
cookie scrivibili per il rinnovo; il caricamento RSC iniziale usa il client
di lettura dopo la guardia della pagina. Una RPC funzionale per richiesta
HTTP valida, senza RPC di contesto aggiuntiva. La pagina conserva la guardia
deduplicata per richiesta già prevista dall’architettura, oltre al controllo
indipendente nella RPC. Tutte le risposte 200/400/403/404/503 sono private/no-store,
Vary Cookie. Consultazioni e fallimenti di consultazione non scrivono audit,
evitando una catena di eventi generata dal registro stesso.

### File e verifiche locali

Moduli dedicati `read-contracts`, validazione/URL/presentazione, servizi
`server/read-*`, controller/trasporto `client/read-*` e componenti audit.
I contratti e servizi di scrittura audit preesistenti restano separati.
Tipi delle due RPC aggiunti al pacchetto database; nessuna nuova dipendenza.

**953 casi unici riusciti, zero fallimenti/skip**, inclusi **114 nuovi**:
36 database (incluso il contenitore della suite), 48 server/DTO/HTTP e 30
controller/UI/trasporto. Regressione complessiva: 952 test; ultima verifica
DB: 36 riusciti, con un caso read-only aggiunto dopo la regressione.
Coperti: ACL, ruolo esatto e revoca, ponte diretto, rifiuto tecnico/proprietario
senza ruolo operatore, transazione read only, nessun audit sulle letture,
limiti 1/30, pareggi e microsecondi, filtri combinati, cambio dell’ora primaverile
e autunnale, email aggiornata/account cancellato, operatori senza identità o
solo Auth, eventi falliti, export storico e recente, retention fra lista e
dettaglio, proiezione dei campi, SSR protetto, cookie-client scrivibile,
risposte superate, pulizia su diniego, HTML escapato e assenza di fetch esterni.

`npm run typecheck:admin` e `npm run typecheck` riusciti, lint mirato senza
rilievi, CSS Admin compilato in memoria. Nessuna build di produzione, avvio
dev server, Docker, modifica/lettura `.env.local` o connessione al progetto reale.
Le fixture applicano i corpi SQL reali 03–12 su tabelle sintetiche; PGlite e
rendering statico non attestano integrazione Auth/PostgREST, focus reale o prestazioni.

### Applicazione futura e recupero

**Procedura storica di sviluppo isolato.** M09 è già applicato e verificato
sul progetto identificato: non riapplicare il file. Nessuna attivazione
automatica di retention o cestino; seguire la scheda M09 per le evidenze.

1. Preparare l’ambiente **isolato con dati sintetici** del gate 03B/16, controllare
   destinazione, backup, schema completo e impostazioni Auth. Applicare/verificare
   baseline Web e prerequisiti 03, 04A/04B, 07A/07B, 09, 10 e 11 nell’ordine
   documentato. Non riapplicare una migrazione già presente; il gate del cestino
   può rimanere disabilitato.
2. Come postgres, nel SQL Editor isolato eseguire **l’intero file 12 collegato
   sopra una sola volta**, dopo 11. È transazionale, con lock timeout 10 secondi.
   In caso di errore fare ROLLBACK, verificare prerequisiti/definizioni e correggere
   la causa; non forzare i controlli. Nessun nuovo script o env richiesto.
3. Verificare firme RPC, wrapper invoker/ponti definer, owner/search path,
   EXECUTE riservato ad authenticated e assenza di SELECT API su audit/Auth.
   Lo schema private deve restare escluso dagli schemi Data API esposti.
   Provare Admin, ordinario, anonimo, tecnico, revoca, filtri/pareggi e dettaglio
   rimosso, controllando che il numero di eventi non cresca durante la consultazione.
4. Distribuire l’Admin compatibile **dopo lo schema** e svolgere le prove
   integrate del gate 16. Se manca la RPC il registro segnala indisponibilità;
   nessun ripiego su tabella diretta o client tecnico.

Recupero: tornare alla versione Admin precedente oppure revocare EXECUTE ad
authenticated sia sui due wrapper pubblici sia sui due ponti privati di lettura.
Conservare archivio, eventi, helper di scrittura, retention e protezioni degli
step precedenti. La migrazione non riscrive eventi; l’indice può restare presente.
Applicazione e advisor remoti sono registrati in M09; nessun deploy
applicativo eseguito durante questa installazione.

### Residui obbligatori del gate 16

Auth/PostgREST reali su ambiente sintetico, cookie rinnovati, ACL/advisor e schema
completo; revoca tra richieste e retention realmente concorrente. Misurare piani,
tempi e chiamate per 1/30 righe, email/UUID/periodi e cursori profondi con volumi
rappresentativi, includendo la guardia SSR; nessun N+1. Browser desktop/mobile,
scroll tabella/pannello, tastiera/focus, skeleton/errori/retry, History/BFcache e
revoca con dettaglio aperto. Verificare cache/header effettivi sul deployment.
L’attivazione/esecuzione Cron resta un obbligo separato dello step 04.

## Prossimo step

[13 — Dati Home](13-home-dati.md), **6.1 Sol, high**.
