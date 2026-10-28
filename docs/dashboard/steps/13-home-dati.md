# 13 — KPI e aggregazioni Home

**Stato:** Da terminare (sole verifiche integrate; implementazione verificata)  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** Implementazione dello step 12 verificata; prove integrate rinviate al gate 16. Stati Annunci e audit stabilizzati.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Creare query aggregate server dedicate alla Home. Scelta confermata: utenti con `tipologia_utente` esattamente `Utente` e `registrato_il` valorizzato; annunci escluso cestino; annunci in revisione escluso cestino; profitti non disponibili. Non contare i record di una pagina né chiamare servizi finanziari.

Predisporre lettura delle ultime 5 operazioni, riutilizzando il DTO audit. Una richiesta aggregata per i KPI evita quattro lookup separati del ruolo. Contratto grafici separato e selezionato per metrica, così la UI non scarica tutte le serie all'apertura.

## Definizioni dei grafici

- Utenti: nuove registrazioni nei 12 mesi per data di registrazione completata, stessa popolazione del KPI. Distribuzione dei profili non nascosti collegati a questi utenti per tipologia principale; valori mancanti in «Non specificata». Si contano profili, non utenti o singoli sottoprofili.
- Annunci: creazioni mensili dei record non nel cestino e distribuzione attuale per stato; date mancanti escluse dalla serie e dichiarate come limite del dato.
- Da approvare: anzianità degli annunci attualmente in revisione per data di creazione, con fasce 0–2, 3–7, 8–30, oltre 30 giorni e data non disponibile; distribuzione per tipologia.
- Profitti: stato non disponibile, senza query economiche.

Mese corrente e undici precedenti in Europe/Rome; mesi senza eventi a zero solo quando la query è riuscita. La coda per data di creazione non misura il tempo dall'ultima entrata in revisione e va etichettata correttamente. Nessuno storico del backlog inventato.

## Contratti e prestazioni

DTO di riepilogo e DTO discriminato per grafico con serie, distribuzioni, periodo e definizioni. Distinguere zero reale, non disponibile ed errore. Aggregazioni nel database protette dal controllo Admin; nessuna cache condivisa che permetta accesso dopo revoca. Indici solo dove giustificati dai piani query.

## Criteri di completamento e verifiche

Fixture sintetiche con Admin, registrazioni incomplete, più profili, tipologia mancante, annunci in vari stati/cestino, date mancanti e confini mese/anno/ora legale. Confrontare conteggi attesi, mesi vuoti e distribuzioni. Misurare aggregazioni senza N+1 né trasferimento delle righe grezze.

## Migrazioni e operazioni manuali

[20261024212824_admin_home_aggregations.sql](../../../supabase/migrations/20261024212824_admin_home_aggregations.sql),
generata con Supabase CLI, applicata e verificata in M10 sul progetto
`nsytraextbndfyprwzts`, versione remota `20261026222201`. Nessun indice aggiuntivo,
tabella, job, variabile env o script di attivazione. Nessuna integrazione pagamenti.

## Avanzamento

### Integrazione esterna M10 — Concluso

[Scheda M10](../integrazione/10-home-dati.md): applicazione unica via MCP e
verifica finale delle 22:22:14 UTC positiva. Quattro funzioni STABLE e ACL
corrispondenti, dodici colonne compatibili; 33 tabelle, metadati audit/Auth
e 156 altre routine invariati. Gate cestino disabilitato, nessun nuovo
riscontro advisor. 101 test mirati e lint riusciti. Nessuna operazione manuale
residua per l'installazione; prove funzionali integrate ancora nel gate 16.
Prossimo IN02 — Auth, policy sessione e accesso Admin.

### Risultato implementato

Nuova feature `apps/admin/src/features/home` con contratti discriminati,
validazione delle metriche e moduli server per query, proiezione DTO e HTTP.
Disponibili riepilogo, ultime cinque operazioni e un singolo dataset grafico
per richiesta. La pagina Home non viene ancora collegata: UI nello step 14,
componenti grafici e controller di selezione nello step 15.

**Popolazione confermata dall’utente:** `tipologia_utente COLLATE "C" = 'Utente'`
e `registrato_il IS NOT NULL`. Non basta essere diversi da Admin. Nessun filtro
sullo stato Auth dell’account o sull’esistenza/visibilità del profilo: il KPI
misura registrazioni, non utenti attivi. Account solo pubblicazione e valori
di ruolo inattesi esclusi. Annunci totali: `eliminato_il IS NULL`, compresi
privati, nascosti e tutti gli stati; da approvare: stessa popolazione e stato
esattamente `in_revisione`. Profitti sempre non disponibili, mai zero fittizio.

### Serie, distribuzioni e limiti

Serie utenti: `registrato_il`; serie annunci: `creato_il`. Mese corrente e
undici precedenti in Europe/Rome, fino al timestamp della lettura DB, con
dodici punti ordinati e mesi senza eventi a zero solo dopo lettura riuscita.
Il DTO conserva `asOf` UTC con sei decimali e il periodo UTC effettivo.
Fuso e confini non dipendono da browser, session timezone o parametri client.

Distribuzioni su **tutta la popolazione attuale**, non limitate ai dodici mesi:
profili per tipologia principale, annunci per stato, coda per tipologia annuncio.
Si contano record di `profilo` non nascosti appartenenti agli utenti eleggibili,
non sottoprofili. Il modello corrente ammette un profilo posseduto per utente;
utenti senza profilo/profili nascosti possono comunque rendere diversi i due
denominatori. Nessuna join ai sottoprofili che moltiplichi i conteggi.

Cataloghi esistenti: otto tipologie profilo, quattro stati e undici tipologie
annuncio. Dati null/vuoti in `unspecified` (“Non specificata”); codici inattesi
in `other` (“Altro”), senza distribuire stringhe arbitrarie o categorie illimitate.
Le distribuzioni vuote sono array vuoti; il totale è esplicito e verificato dal
servizio. Il loro ordine è stabile per codice, le fasce coda hanno ordine fisso.

Coda attuale per anzianità **dalla creazione**, in giorni di calendario locali:
`0_2`, `3_7`, `8_30`, `over_30`, `unknown`. Nessuno storico mensile del backlog
né misura del tempo dall’ultima entrata in revisione. Date mancanti, non finite
o future non producono età negativa: vanno nella fascia non disponibile.

Date non utilizzabili escluse dalle serie, con contatori separati
`excludedDates.missingOrNonFinite` e `excludedDates.future`. Gli utenti con data
null sono già esclusi dalla popolazione perché non registrati; le altre date
anomale non rimuovono i record dal KPI. Date valide precedenti alla finestra
restano nei totali, senza comparire nella serie. Nessuna nuova correzione dei dati.

Metadati restituiti dal servizio: definizione `REGISTERED_USERS`,
`NON_TRASHED_ANNOUNCEMENTS` o `PENDING_BY_CREATION_DATE`; limiti
`CURRENT_RECORDS_ONLY`, `LEGACY_REGISTRATION_DATES`, `PROFILES_NOT_USERS`,
`CREATION_NOT_REVIEW_ENTRY` secondo la metrica. La migrazione Web preesistente
ha ricostruito alcune registrazioni storiche dalla data del profilo/utente:
queste date non attestano il giorno reale di registrazione. Record eliminati,
profili nascosti o annunci cestinati possono modificare retroattivamente le
aggregazioni: non sono uno storico immutabile. Le UI successive devono rendere
visibili queste definizioni e i denominatori.

### RPC, autorizzazione e trasporto

- `public.admin_get_home_summary_v1()`: tre conteggi, profitti con
  `available: false` e timestamp lettura.
- `public.admin_get_home_chart_v1(p_metric text)`: una sola metrica fra
  `users`, `announcements`, `pending`, `profits`. Le prime due hanno serie e
  periodo; la coda ha fasce di età; profits ha stato non disponibile e nessun
  dataset economico. DTO distinti per ciascuna metrica.
- Ultime operazioni: riuso diretto del servizio audit 12 con `limit: 5`,
  ordinamento/identità/DTO già verificati. Nessuna nuova RPC audit, lettura di
  dettagli o query per riga; lookahead interno di sei eventi al massimo.

Wrapper pubblici SECURITY INVOKER e ponti privati SECURITY DEFINER, owner
postgres/search path vuoto, funzioni STABLE. Ogni procedura controlla il ruolo
SQL originale authenticated e chiama **una volta** `require_admin_context_v1()`
prima di leggere: sessione umana corrente e valore esattamente `Admin`.
La chiamata diretta al ponte resta protetta. Anche profits passa dal controllo
attuale, poi restituisce subito indisponibilità senza leggere le tabelle metriche.
Nessun grant aggiuntivo sulle tabelle e nessun ripiego sul client tecnico.

Il riepilogo usa una scansione utenti e una annunci con conteggio filtrato
della revisione nella stessa aggregazione. Non avvia quattro controlli di ruolo
né chiama i grafici. Le funzioni STABLE usano lo snapshot della singola chiamata;
richieste diverse espongono il proprio `asOf` e non promettono uno snapshot comune.
Nessun audit per consultazioni o relativi errori, nessuna cache globale di ruolo/dati.

GET interni `/api/home/summary`, `/api/home/activity`,
`/api/home/charts?metric=…`: handler con cookie scrivibili e una RPC funzionale
per richiesta valida. Metriche sconosciute, parametri inattesi/duplicati o
parametri su summary/activity respinti prima del client. Risposte 200/400/403/503
private/no-store, Vary Cookie, Pragma no-cache. Adapter RSC separati con client
di lettura: `getAdminHomeSummary`, `getAdminHomeActivity`, `getAdminHomeChart`.

Zero valido, indisponibilità prevista dei profitti, diniego e guasto sono esiti
distinti. Il servizio valida/proietta numeri interi non negativi entro la
precisione sicura JS, somme/denominatori, dodici mesi coerenti, periodo, fasce e
metrica richiesta. Dati incongruenti non diventano zero. I diagnostici contengono
soltanto codice e correlazione; campi aggiuntivi del backend non entrano nel DTO.
I tre ingressi sono indipendenti e non avviano recuperi delle altre metriche.

### Verifiche locali e campione prestazionale

**1.048 test riusciti, zero fallimenti/skip**, inclusi **95 nuovi**:
31 database (incluso contenitore), 51 server/DTO e 13 HTTP. Regressioni audit,
autorizzazione, login, annunci, moderazione/cestino/export e consumatori Web
comprese. Typecheck Web/Admin e lint mirato riusciti. Nessuna build, avvio dev,
Docker, nuova dipendenza, lettura/modifica env o connessione al progetto reale.

Copertura: popolazioni esatte, registrazioni incomplete, base profilo contro
sottoprofili, nascosti/orfani/tipologia mancante, stati/cestino, date non finite
e future, dodici mesi e confini UTC/locali di anno, cambio dell’ora primaverile
e autunnale, fasce 2/3, 7/8 e 30/31 giorni, categorie sconosciute, input/DTO
incongruenti, ruoli tecnici/varianti/revoca/scadenza/email non confermata,
ponti diretti, transazione read only e nessun audit. Verificati cinque eventi
ordinati senza dettagli/N+1, mancata query alle metriche non richieste e
profits indipendente anche dall’indisponibilità della tabella annunci.

Le prove applicano la migrazione originale a fixture sintetiche. Solo per
scenari di calendario vengono sostituite temporaneamente le due sorgenti
`statement_timestamp()` delle metriche con un orologio test SQL e poi ripristinate;
nessuna formula di aggregazione simulata o parametro temporale in produzione.

Campione PGlite isolato: **6.000 utenti, 6.000 profili e 6.000 annunci**;
2.000 annunci in revisione. Payload SQL users/announcements/pending/profits:
751/765/395/100 byte, senza righe grezze. EXPLAIN ANALYZE/BUFFERS delle query
interne campionate: aggregazione su Seq Scan per i totali e la serie mensile,
Hash Join per profili/utenti. Un’esecuzione locale ha misurato circa 4,8/2,7 ms
per i conteggi, 10,2 ms per la serie e 9,2 ms per la distribuzione. Sono campioni
del motore sintetico, senza Auth/gateway/rete e non previsioni di latenza remota.

Nessun indice aggiunto: i totali richiedono l’intera popolazione e il campione
non giustifica ulteriori indici. La verifica di indici/piani su volumi e schema
completi resta nel gate 16; non viene promessa una complessità costante dei
conteggi. Nessuna cache/materializzazione o scheduler introdotto implicitamente.

### Applicazione futura e recupero

**Procedura storica di sviluppo isolato.** M10 è già applicato e verificato
sul progetto identificato: non riapplicare il file. Seguire la scheda M10
per evidenze e limiti; nessuna attivazione del cestino inclusa.

1. Predisporre l’ambiente **isolato con dati sintetici** di 03B/16. Verificare
   destinazione, backup, baseline completa e prerequisiti 03–12 già documentati;
   non riapplicare quelli già presenti. Servono in particolare `registrato_il`,
   `tipologia_principale`, metadati cestino e RPC audit 12. Il gate cestino può
   restare disabilitato e non viene attivato da questo file.
2. Come postgres nel SQL Editor isolato, eseguire **l’intero file 13 collegato
   sopra una volta, dopo 12**. Transazione con lock timeout 10 secondi e guardia
   sui prerequisiti. In caso di errore fare ROLLBACK e correggere la causa senza
   forzare i controlli; nessun nuovo env/script/job da configurare.
3. Controllare firme, STABLE, wrapper invoker/ponti definer, owner/search path,
   EXECUTE soltanto authenticated e schema private non esposto. Confrontare
   conteggi/serie con fixture note, provare ordinario/tecnico/revoca e verificare
   assenza di nuovi eventi audit. Eseguire advisor sull’ambiente isolato.
4. Distribuire l’Admin compatibile dopo lo schema e completare le verifiche
   integrate. Senza RPC la funzione deve fallire come indisponibile, senza
   interrogare direttamente le tabelle o restituire conteggi presunti.

Recupero: tornare all’Admin precedente oppure revocare EXECUTE ad authenticated
su entrambi i wrapper Home e sui rispettivi ponti privati. Conservare tabelle,
helper/autorizzazioni/audit e protezioni degli step precedenti. Nessun dato è
riscritto da questa migrazione; non rimuovere le RPC audit riutilizzate dalla Home.
Applicazione e advisor remoti sono registrati in M10; nessuna attivazione
del cestino o distribuzione applicativa eseguita durante questa installazione.

### Residui obbligatori del gate 16

Schema completo, ACL/advisor, Auth/PostgREST/cookie reali; revoca tra richieste e
concorrenza con scritture. Misurare scansioni, piani, tempi e conteggio richieste
su dataset rappresentativi, includendo guardia SSR e verifica funzionale; valutare
eventuali indici solo con nuove evidenze. Verificare header/cache del deployment
e nessun dato dopo diniego. Collegamento UI, skeleton, errori indipendenti e
caricamento della sola metrica selezionata restano negli step 14–15.

## Prossimo step

[14 — Interfaccia Home](14-home-interfaccia.md), **6.1 Sol, medium**.
