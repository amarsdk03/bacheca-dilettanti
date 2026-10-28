# 08 — Tabella e anteprima Annunci

**Stato:** Da terminare — implementazione verificata; prove integrate/browser rinviate al gate 16  
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze di sviluppo:** 07A e 07B implementati e verificati; non basta la sola lista 07A. Le prove integrate di 07 rinviate seguono il gate 16.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Comporre «Azioni rapide» e tabella con colonne titolo, autore/profilo, tipologia, stato, visibilità, creazione e azioni. Usare componenti shadcn coerenti con Base UI, senza recuperare tutti i dati per filtrarli in memoria.

Implementare ricerca e filtri nell'URL, paginazione avanti/indietro a cursore e reset del cursore quando cambiano i filtri. Input di ricerca con debounce; evitare che una risposta vecchia sovrascriva quella della ricerca più recente.

Pulsante anteprima apre Sheet e carica il dettaglio su richiesta con skeleton. Gestire titolo lungo, autore mancante, risorsa non più disponibile, errori e retry. I collegamenti esterni usano il dialogo condiviso.

Consumare i DTO di 07A/07B: dettaglio incompleto/legacy esplicitamente segnalato,
mai confuso con annuncio assente. Nessun approfondimento del profilo o recupero
di contatti account. I media sono descrittori: non caricare implicitamente URL
remoti, interpretare HTML o rendere SVG/documenti in base al solo MIME. URL nulli
non sono cliccabili; aperture esterne passano dal dialogo condiviso. I contatti
sono testi read only validati, senza URI `mailto:`/`tel:` introdotti da 07B.

## Funzionalità progressive

«Crea annuncio» resta disabilitato con indicazione «Presto». Export e azioni mutative restano chiaramente non disponibili fino agli step 09–11, senza conferme di successo simulate. I filtri cestino sono introdotti con lo step 10.

La tabella mostra fino a 30 righe, menu azioni compatto e nomi accessibili per i pulsanti con sola icona. Su mobile preservare consultazione e accesso alle azioni senza allargare l'intera pagina.

## Criteri di completamento e verifiche

URL condivisibile con filtri, back/forward, pagine vuote, reset filtri e risposte fuori ordine. Dettaglio non recuperato prima dell'apertura. Verificare skeleton, errori, tastiera, chiusura/ripristino focus dello Sheet e mobile.

## Migrazioni e operazioni manuali

Nessuna prevista. Eventuali dipendenze UI vanno aggiunte solo se necessarie, senza cambiare la base dei componenti esistenti.

## Avanzamento

Implementata la parte applicativa del piano approvato, in un solo step. Disponibile
per lo sviluppo della moderazione 09; restano obbligatorie le prove integrate
elencate sotto prima del rilascio.

### Pagina e organizzazione

- Rotta protetta dedicata `/annunci`, con guardia diretta e `loading.tsx` propri.
  La lista server iniziale alimenta il client senza una seconda richiesta
  all'idratazione. Un nuovo ingresso server con filtri diversi rimonta lo stato.
- `features/annunci/url-state.ts` adatta e valida l'URL; `presentation.ts`
  raccoglie etichette, valori mancanti, date Europe/Rome e importi.
- `client/controller.ts` gestisce stato e ciclo delle richieste per singola pagina;
  `client/transport.ts` contiene il trasporto HTTP. Nessuno store globale,
  localStorage, cache di ruolo o cache condivisa dei risultati.
- `components/AnnunciWorkspace.tsx` compone azioni rapide, filtri, tabella e Sheet;
  `AnnouncementDetailContent.tsx` presenta le undici tipologie, con sezioni
  amministrative, liste strutturate, contatti testuali e descrittori media.
  `AnnunciSkeleton.tsx` copre il caricamento iniziale; lista e dettaglio hanno
  caricamenti ed errori indipendenti.
- Aggiunti Select, Badge e DropdownMenu tramite CLI shadcn ufficiale, con alias
  `cn` ricondotto a `@/lib/utils`. Riutilizzati Table, Sheet e gli altri componenti
  Base UI esistenti; nessuna nuova libreria dati o dipendenza runtime necessaria.

La tabella semantica ha sette colonne e mostra al massimo 30 righe dal server;
nessun conteggio totale o caricamento dell'intero dataset. L'overflow resta nel
contenitore della tabella. Il pannello occupa tutta la larghezza su mobile e ha
larghezza massima su desktop, intestazione e corpo scorrevole separati.

Creazione, export e comandi mutativi del menu sono disabilitati con «Presto».
Non sono implementati moderazione, cestino o export anticipati.

### URL e ciclo delle richieste

Parametri ammessi: `search`, `status`, `type`, `visibility`, `cursor`.
Il limite è fissato a 30 e non è configurabile nell'URL. Parametri ripetuti,
sconosciuti o malformati danno uno stato esplicito con ripristino; il server
07A continua a decodificare il cursore e a verificarne il legame con i filtri.

La ricerca applica trim e massimo 200 code point, debounce di 350 ms e invio
immediato tramite Enter/pulsante. Ricerca con `replaceState`; selezioni e pagine
con `pushState`, usando l'integrazione History di Next. Non si forza una nuova
renderizzazione server a ogni digitazione. Cambiare filtro elimina il cursore;
la selezione applica anche l'eventuale ricerca appena digitata.

«Precedente» usa solo la sequenza dei cursori visitati durante il montaggio:
un URL condiviso di pagina intermedia non contiene il predecessore, quindi
quel pulsante resta disabilitato e «Prima pagina» è disponibile. Non si
aggiungono RPC inverse o persistenza. Back/forward e ripristino BFcache
richiedono nuovamente i dati, senza riusare una pagina memorizzata dal controller.

Lista e dettaglio hanno AbortController e contatori di generazione distinti:
una risposta superata non può sostituire quella corrente, anche se il trasporto
ignora l'annullamento. Cambiare lista chiude l'anteprima. Ogni apertura/riprova
richiede il dettaglio; nessun prefetch al passaggio del puntatore. Rifiuto della
sessione attiva: cancellazione delle richieste, rimozione dei dati locali e
ritorno a `/accesso`. Errori di rete mostrano retry senza dettagli grezzi.

### Ingressi HTTP e sessione

`server/http.ts` compone il servizio esistente con il client SSR **scrivibile**
per permettere l'aggiornamento dei cookie nei route handler. Nessun client
tecnico, query diretta alle tabelle o RPC di contesto preliminare:
ciascuna richiesta funzionale valida usa `getClaims()` e una sola RPC
lista/dettaglio, che autorizza l'operatore attuale con ruolo esattamente `Admin`.
L'ingresso della pagina mantiene anche la guardia del rendering protetto.

| Metodo e percorso | Input | Risposta |
| --- | --- | --- |
| `GET /api/annunci` | Parametri URL sopra, limite server 30 | `AnnouncementListResult` di 07A |
| `GET /api/annunci/[id]` | UUID annuncio | `AnnouncementDetailResult` di 07B |

Stati HTTP: `200` ok, `400` input non valido, `403` accesso negato,
`404` dettaglio assente, `503` indisponibilità. Tutte le risposte hanno
`Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`,
`Pragma: no-cache`, `Expires: 0`, `Vary: Cookie`. Il browser richiede
`cache: no-store` con credenziali same-origin. Si tratta di ingressi interni
della feature, senza contratto pubblico indipendente dai DTO TypeScript.

Una sola RPC funzionale non equivale a una sola chiamata di rete complessiva:
proxy, rinnovo cookie e verifica delle claim seguono il ciclo Auth esistente.
Prestazioni reali e numero complessivo di chiamate richiedono le misure integrate.

### Anteprima e collegamenti

Titolo lungo, autore mancante, stato/visibilità nulli, dettaglio incompleto,
risorsa assente ed errore sono presentati esplicitamente. Valori strutturati
sono resi come testi e liste, senza HTML utente o dump JSON; fingerprint e
contatti dell'account non sono mostrati. URL non apribili rimangono testo.
Nessuna immagine, iframe, documento o SVG remoto viene caricato implicitamente.
I collegamenti validi usano `ExternalLink` e l'AlertDialog condiviso della shell.

Lo Sheet riceve focus iniziale sul titolo e restituzione al pulsante anteprima
se ancora montato, altrimenti all'intestazione dell'elenco. Queste impostazioni
non attestano ancora il comportamento effettivo del browser.

### Verifiche eseguite

```powershell
node --test tests/admin-annunci-interface.test.mjs tests/admin-announcement-detail-database.test.mjs tests/admin-announcement-detail-server.test.mjs tests/admin-announcements-database.test.mjs tests/admin-announcements-server.test.mjs tests/admin-auth-server.test.mjs tests/admin-auth-interface.test.mjs tests/admin-audit-server.test.mjs tests/admin-authorization-database.test.mjs tests/admin-web-boundary.test.mjs tests/admin-dashboard.test.mjs tests/admin-external-navigation.test.mjs
npm run typecheck
npm run typecheck:admin
npx --no-install eslint apps/admin/src tests/admin-annunci-interface.test.mjs tests/admin-dashboard.test.mjs
```

**374 test riusciti**, zero fallimenti/skip, inclusi **32 nuovi**: controller
effettivo con promesse controllate, timer, abort e risposte fuori ordine;
URL/cronologia/cursori, pulizia su rifiuto, rendering React statico dei vari
stati e di tutte le tipologie, pagina iniziale protetta, route handler reali
con trasporto Supabase sintetico e client scrivibile, header e trasporto browser.
Aggiornato il test delle pagine provvisorie per escludere Annunci.

Typecheck Web/Admin e lint senza rilievi; CSS Admin compilato in memoria con
PostCSS/Tailwind. Nessun dev server, build di produzione, modifica env,
collegamento Supabase, Docker o nuova migrazione.

### Residui obbligatori nel gate 16

Provare nel browser autenticato: navigazione Next e History, URL condivisi,
back/forward/BFcache, sessione scaduta/revocata e cookie rinnovati, zero richiesta
lista duplicata all'idratazione, una RPC funzionale per interazione, focus e
tastiera dello Sheet/Select/menu, AlertDialog esterno annidato con ritorno al
link, viewport mobile/desktop, overflow e skeleton durante latenza reale.
I test statici e sintetici non attestano DOM, focus, viewport o Auth/PostgREST.

**Operazioni manuali ora: nessuna.** Nessuna migrazione da applicare per 08.
Quelle preparate in 03–07 restano destinate alle prove isolate documentate e
al runbook di rilascio: non sono state applicate né attivate da questo step.

## Prossimo step

[09 — Moderazione](09-moderazione.md), **6.1 Sol, high**.
