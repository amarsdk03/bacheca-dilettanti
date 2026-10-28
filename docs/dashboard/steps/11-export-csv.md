# 11 — Export CSV della pagina corrente

**Stato:** Da terminare — implementazione verificata; sole prove integrate nel gate 16  
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze:** Implementazione 10 verificata; prove integrate rinviate al gate 16.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Attivare «Esporta pagina CSV» per le sole righe visibili, massimo 30, rispettando ordine e selezione della pagina corrente. Non esportare automaticamente tutto il dataset filtrato.

Esportare colonne informative della tabella, escludendo azioni, contatti, credenziali e payload del dettaglio. Generare il CSV sul server dopo una nuova verifica di autorizzazione. Gli ID inviati dal browser rappresentano una selezione, non una prova di accesso: verificarli e rileggere le righe attuali.

## Contratto e sicurezza

Validare numero massimo, duplicati e identificativi; gestire risorse non più disponibili senza includere altre righe sostitutive. Informare l'utente se la pagina è cambiata e richiedere aggiornamento, evitando esportazioni silenziosamente diverse.

Escapare correttamente separatori, virgolette e nuove righe; neutralizzare celle interpretabili come formule dai fogli di calcolo, compresi prefissi e spazi di controllo. File UTF-8 con intestazioni leggibili, nome prevedibile privo di dati personali e download non memorizzato in cache pubblica.

Registrare operatore, risorse esportate, quantità, esito e correlazione, non una copia del CSV. Se non è possibile registrare il successo, non consegnare il file.

## Criteri di completamento e verifiche

Pagina vuota, 1/30 righe, limite alterato, autorizzazione revocata, ID arbitrari, record modificato/rimosso, errori audit, caratteri accentati, multilinea e formula injection. Verificare esatta corrispondenza con la pagina e assenza di query non limitate.

## Migrazioni e operazioni manuali

Preparata la migrazione
[`20261024205423_admin_announcement_export.sql`](../../../supabase/migrations/20261024205423_admin_announcement_export.sql):
nuova RPC autorizzata e contratto audit esteso agli ID esportati. Il piano
approvato richiede questa estensione rispetto alla previsione iniziale.
Nessuna nuova tabella, policy sui contenuti, coda, job o storage temporaneo.
File applicato e verificato in M08 sul progetto `nsytraextbndfyprwzts`:
versione remota `20261026220629`, contenuto locale invariato.

## Avanzamento

### Integrazione esterna M08 — Concluso

[Scheda operativa M08](../integrazione/08-export-csv.md): migrazione applicata
una sola volta via MCP, report finale delle 22:06:50 UTC
`m08_structurally_verified`. Tre corpi e privilegi corrispondenti; 33/33
tabelle e 149/149 altre routine invariate. Gate del cestino verificato falso,
nessun nuovo riscontro advisor. 86 casi pertinenti e lint riusciti.
Nessuna operazione manuale residua per l'installazione; le prove funzionali
integrate dello step 11 restano nel gate 16. Prossimo M09 — Registro attività.

### Comportamento implementato

Pulsante «Esporta pagina CSV» nelle azioni rapide, con icona/stato di attesa,
istruzione sul limite e messaggi accessibili. Esporta la pagina corrente nella
sua interezza e nel suo ordine, **non tutto il dataset filtrato**, senza caselle
di selezione aggiuntive. Il filtro cestino dello step 10 si applica anche al CSV.

| Colonna | Contenuto |
| --- | --- |
| Titolo | Titolo o «Annuncio senza titolo». |
| Autore / Profilo | Lo stesso nome pubblico/anonimo della tabella, senza identità Auth o contatti account. |
| Tipologia | Etichetta della tabella, con fallback esplicito per valori legacy. |
| Stato | Etichetta corrente, incluso stato sconosciuto/non specificato. |
| Visibilità | Oscuramento e privacy distinti; «Nel cestino» quando presente. |
| Creazione (Europe/Rome) | Stessa formattazione data/ora della tabella; mancanza esplicita. |

UTF-8 con BOM, separatore `;`, tutte le celle tra virgolette e terminazioni
record CRLF. Le virgolette interne sono raddoppiate; accenti e multilinea sono
conservati. Un apostrofo iniziale neutralizza formule `= + - @`, anche precedute
da whitespace/controlli/caratteri invisibili e nelle varianti fullwidth; i NUL
sono rimossi. I valori inizialmente tab/CR/LF sono anch'essi neutralizzati.
Nome `annunci-pagina-YYYYMMDD-HHmmss.csv`, timestamp UTC senza dati personali.
Il formato è destinato principalmente a Excel italiano; importazione effettiva
Excel/LibreOffice rimane da provare nel gate 16.

### Autorizzazione, confronto e audit

Nuovo **POST `/api/annunci/export`**. Richiede JSON e Origin esattamente uguale
all'origine della richiesta; lettura del body limitata a 1 MiB, anche senza
Content-Length. Nessun GET con effetti audit, URL di download pubblico o job
asincrono. Il client umano scrivibile gestisce i cookie come gli altri handler.

Il browser invia `{query, selection}`: query della pagina (cursore v2 incluso,
limite fisso 30) e 1–30 oggetti ordinati `{id, rowFingerprint, authorName}`.
Validazione chiusa di chiavi, tipi, UUID canonici, fingerprint, duplicati e nome
pubblico fino a 5.000 code point; **nessun titolo/dettaglio inviato dal browser
diventa contenuto del CSV**. Gli ID sono selezione, mai autorizzazione.

Una sola RPC funzionale `admin_export_announcements_v1` per export valido:
wrapper pubblico invoker, ponte privato definer con owner postgres/search path
vuoto e ACL del modello 07–09. Solo authenticated può eseguire wrapper e ponte;
quest'ultimo verifica autonomamente ruolo SQL originale, sessione umana e ruolo
esattamente `Admin`, anche nelle chiamate dirette. `private` resta non esposto.
Il CSV non usa il client tecnico né l'attestazione di successo del ponte 04B.

Il ponte riutilizza la lettura **autorizzata** della lista. C'è una seconda
verifica di contesto interna a quel lettore riusato: costo costante per richiesta,
nessuna verifica/query per riga e nessuna RPC di contesto aggiuntiva dal server.
Non è stato duplicato o indebolito il lettore per eliminare questo controllo.
La lista conserva limite 30 e lookahead interno 31, senza conteggio globale.

Il risultato riletto viene confrontato con tutta la selezione ordinata:
fingerprint della base **e nome pubblico**, perché un profilo può cambiare
senza aggiornare l'annuncio. Differenze di pagina/ordine/righe o dati rilevanti
producono conflitto e nessun file o successo audit; non vengono cercati
sostituti. Il confronto base è conservativo: può richiedere aggiornamento anche
se cambia un campo base non esportato. I contenuti dei figli, che non sono nel
CSV, non richiedono il fingerprint completo del dettaglio.

Lo snapshot verificato resta in memoria nella funzione; una successiva modifica
concorrente non lo sostituisce. La stessa transazione registra `announcement.export`
con operatore derivato dal DB, risorsa tipo `announcement_export`, UUID risorsa
singolo null, correlazione e dettagli `{row_count, columns, announcement_ids}`.
Gli ID sono ordinati, distinti, canonici e in numero uguale a row_count, massimo
30. Nessun CSV, nome pubblico o filtro/ricerca viene copiato nell'audit.
Gli eventi storici senza `announcement_ids` restano validi; il nuovo endpoint li
scrive sempre. La conservazione continua a seguire i 12 mesi dello step 04.

Se l'inserimento audit fallisce, la sotto-transazione viene annullata e la RPC
non restituisce le righe. Dopo il ritorno il server valida/proietta di nuovo il
DTO, ricontrolla la selezione e costruisce il CSV esclusivamente da quel risultato.
I fallimenti significativi usano separatamente 04B, senza payload della selezione;
JSON malformati o input invalidi prima del client non provocano richieste audit.
Il ponte tecnico continua a rifiutare **ogni successo export**.

**Significato del successo audit:** è stato preparato uno snapshot autorizzato
per l'esportazione. Non attesta consegna HTTP, avvio del browser o salvataggio
locale: questi possono fallire dopo il commit. Non è un errore di audit se
l'utente annulla il download. Nessun retry automatico dopo esiti incerti.

### Interfaccia e trasporto

200 CSV con Content-Disposition attachment e nome validato anche nel client;
400 input invalido, 403 accesso/origine negati, 409 pagina cambiata, 503 servizio
indisponibile. Errori JSON minimali con correlazione, senza righe o SQL diagnostico.
Tutte le risposte sono private/no-store, Vary Cookie/Origin e nosniff.
Fetch POST con credenziali della stessa origine, cache no-store e redirect error;
l'SDK PostgREST installato non ritenta i POST non idempotenti.

Il pulsante è disabilitato per elenco vuoto/invalido/in caricamento, ricerca
non applicata, conferma di moderazione aperta o export già in corso. Doppio
invio bloccato anche nel controller. Durante l'export non si avvia moderazione;
cambi di URL/ricerca o smontaggio annullano la lettura client e ignorano i
risultati superati, anche se il trasporto non rispetta AbortSignal. L'annullamento
del browser **non annulla** una RPC che abbia già scritto l'audit.

Conflitto, errore e risposta persa richiedono aggiornamento esplicito dell'elenco
prima di un altro export. Nessun cambio ottimistico di dati e nessuna ricarica
automatica dopo un successo. Diniego pulisce risultati/pending e reindirizza
all'accesso. Il download usa Blob e un link temporaneo; link rimosso e object URL
revocato dopo l'avvio, anche se il click fallisce. Nessun AlertDialog esterno:
è un file generato internamente, non l'apertura di un sito.

### Verifiche locali

Nuove suite DB/server/controller/trasporto e prova del pulsante nell'interfaccia.
Copertura: 1/30 righe e pagina successiva, duplicati/ID arbitrari/input alterati,
limite fisso, ordine, inserimento/rimozione/modifica/autore, filtri e cestino,
ruolo esatto/sessione revocata/ACL, audit fallito e ponte tecnico, assenza di
contenuti nell'audit, CSV/formule/Unicode, body limit e origine, cookie-client
scrivibile, rete incerta e risposte superate, pulizia Blob URL.
Le fixture usano i corpi reali 03–10 e 04B con tabelle sintetiche; non chiamano
Auth/PostgREST/Storage remoti. **839 test riusciti, zero fallimenti/skip**, inclusi
**80 nuovi casi** (20 DB, 40 server/CSV/HTTP, 19 controller/trasporto e un caso UI).
La suite complessiva include anche le regressioni audit 04A/04B, autorizzazione,
login, lista/dettaglio, moderazione, cestino e consumatori Web.

`npm run typecheck` e `npm run typecheck:admin` riusciti; lint mirato su feature,
route, tipi e test modificati senza rilievi; CSS Admin compilato in memoria.
Nessuna build di produzione, dev server, Docker, dipendenza aggiunta o modifica
di `.env.local`. Nessuna connessione al progetto reale.

### Applicazione futura e recupero

**Procedura storica di sviluppo isolato.** Per il progetto identificato M08
è già applicato e verificato: non rieseguire la migrazione. Il gate del
cestino rimane separato e disabilitato; seguire la scheda M08 per le evidenze.

1. Preparare il progetto **isolato con dati sintetici** e verificare destinazione
   e configurazione Auth secondo 03B. Applicare/verificare baseline Web e
   prerequisiti 03, 04A/04B, 07A/07B, 09 e 10 nell'ordine documentato. Il cestino
   può rimanere disabilitato: l'export non abilita operazioni di moderazione.
2. Come postgres nel SQL Editor isolato eseguire l'intero file 11 collegato sopra,
   **una volta**, dopo controllo schema e backup della destinazione. È
   transazionale, lock timeout 10 secondi; se fallisce fare ROLLBACK, verificare
   prerequisiti/definizioni e correggere la causa senza forzare i controlli.
3. Verificare firma RPC `(jsonb,jsonb)`, wrapper invoker/ponte definer, owner,
   search path, ACL e private non esposto. Provare ordinario/tecnico/revoca,
   1/30 righe, conflitto e audit fallito senza file; controllare un solo evento
   successo con ID/quantità/colonne corretti e compatibilità degli eventi vecchi.
4. Distribuire l'Admin compatibile **dopo** lo schema e completare le prove HTTP,
   cookie, browser e fogli di calcolo del gate 16. Nessuna nuova variabile env o
   job da configurare. Il codice non contiene fallback al client tecnico se
   manca la RPC: l'export fallisce e non consegna file.

Per recuperare, disabilitare il pulsante/tornare all'Admin compatibile precedente
oppure revocare come operatore EXECUTE su **entrambi** wrapper pubblico e ponte
privato ad authenticated. Non rimuovere archivio/eventi né ripristinare il vecchio
validatore audit: i nuovi eventi contengono ID. Conservare tutte le protezioni
Web/cestino dello step 10. Un rollback UI non annulla audit già registrati.
L'applicazione e gli advisor remoti sono registrati nella scheda M08;
nessuna attivazione del cestino o distribuzione applicativa eseguita in M08.

### Residui obbligatori del gate 16

Schema completo, ACL/advisor e gateway reale; POST/Origin/cookie rinnovati,
revoca e concorrenza reale fra lettura pagina/export/moderazione; misure della
RPC su filtri/cursori profondi e delle due verifiche di contesto. Nessun N+1.
Browser desktop/mobile, tastiera/stato di attesa/errori, download Blob dopo POST,
annullamento navigazione e audit dopo risposta persa. Importare il file con
Excel/LibreOffice verificando separatore, BOM, date, multilinea e neutralizzazione
formule senza eseguire contenuti non fidati. Header/cache effettivi del deployment.
Queste prove non sono sostituite da PGlite o dal rendering statico.

## Prossimo step

[12 — Registro attività](12-registro-attivita.md), **6.1 Sol, medium**.
