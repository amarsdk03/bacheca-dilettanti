# 07B — Dettaglio Annunci per anteprima

**Stato:** Concluso — milestone implementativa verificata con PGlite e trasporti sintetici  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 07A implementato e verificato.

[Master](../master_plan.md) · [Step 07](07-annunci-dati.md)

**Integrazione M05 Conclusa il 25 ottobre 2026:**
[guida operativa](../integrazione/05-dettaglio-annunci.md) e
[controllo prima/dopo](../../../supabase/scripts/dashboard_admin_check_m05.sql)
pronti per Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`, Supabase Free.
M04 e copia manuale Free già acquisiti; migrazione 07B invariata.
**379 test mirati riusciti**, zero fallimenti/skip, undici del verificatore
inclusi tre nuovi casi temporali; lint riuscito.
Sei funzioni, 166 colonne su 25 tabelle e undici unicità controllate. Report
iniziale positivo del progetto acquisito il 25 ottobre alle 19:16:35 UTC:
166/166 colonne corrispondenti, M01–M04 coerenti e zero oggetti M05.
Report finale delle 19:19:12 UTC strutturalmente verificato: sei funzioni con
hash e privilegi attesi. Confronto prima/dopo: **25/25 tabelle identiche, zero
differenze** nelle protezioni. M05 **Concluso**, nessuna operazione manuale
residua; M06 non avviato.
Lo stato Concluso di 07B riguarda l'implementazione locale; gateway e prove
integrate rimangono distinti. Nessuna esecuzione remota dell'agente.

Report M05 del 25 ottobre alle 19:08:28 UTC: zero oggetti, unicità valide,
160/166 colonne corrispondenti. Verificatore corretto per i sei falsi negativi
su date/orari nativi di Squadra cerca staff/partita, senza modificare migrazione,
database o DTO. Controllo aggiornato positivo delle 19:16 acquisito;
report originale conservato, nessuna riapertura di M04.

## Obiettivo e confini

DTO/procedura di dettaglio su richiesta, con autorizzazione attuale e copertura
delle undici tipologie supportate. Separare dato assente, diniego e indisponibilità.
Nome pubblico/anonimo e UUID applicativi, senza identità Auth o contatti account.
Definire proiezioni esplicite di contenuti, media/contatti dell'annuncio e link
sicuri prima dell'interfaccia dello step 08. Nessun payload arbitrario o HTML.

Precisare il confronto completo del contenuto per la futura moderazione: il
fingerprint di 07A copre la sola riga base, non le relazioni del dettaglio.
Verificare chiamate dirette, revoca, dati mancanti, URL e tutte le tipologie con
PGlite/risposte sintetiche; integrazione Supabase prima del rilascio.

## Decisioni confermate e risultato

Svolto in **un unico sottopasso**, come richiesto. Il dettaglio riguarda il
contenuto dell'annuncio, le sue località, contatti, media e link, con il solo
riepilogo pubblico/anonimo dell'autore di 07A. Non include approfondimenti del
profilo, contatti dell'account, UUID Auth, annunci simili o salvataggi.
La pagina Annunci resta provvisoria: tabella, Sheet e relativi ingressi HTTP/UI
sono lavoro dello step 08. Nessuna mutazione o audit di semplice consultazione.

Migrazione generata con Supabase CLI 2.122.0:
[20261024145954_admin_announcement_detail.sql](../../../supabase/migrations/20261024145954_admin_announcement_detail.sql).
Inizialmente applicata e verificata in PGlite; installazione su Supabase
strutturalmente verificata dal report finale utente M05 del 25 ottobre 2026,
19:19:12 UTC, con protezioni delle 25 tabelle invariate rispetto alla baseline.
Non aggiunge indici, estensioni, grant su tabelle o modifiche alle policy Web.

## Percorso di lettura e permessi

`getAdminAnnouncementDetail(id)` usa il client SSR della sessione umana, verifica
i claim e fa una sola RPC `admin_get_announcement_v1(p_id uuid)`. Non aggiunge
`admin_get_context_v1`, fetch per relazione, richieste media o cache condivise.
Come per 07A, il conteggio riguarda la RPC funzionale: Auth/JWKS, proxy e guardie
pagina possono avere traffico proprio. Ingressi Action/Route Handler futuri
devono usare un client con scrittura cookie, non il factory di rendering.

La RPC pubblica è invoker; `private.get_admin_announcement_v1` è definer, owner
`postgres`, search path vuoto e fuso UTC. Prima di leggere o distinguere una
risorsa assente richiede ruolo SQL originale `authenticated` e chiama una volta
la foundation: mapping Auth/applicativo, email confermata, sessione corrente,
revoca/timeout e ruolo **esattamente `Admin`**. Varianti, spazi e metadata del
browser non autorizzano. Il ponte resta protetto anche quando invocato direttamente.

Solo `authenticated` può eseguire wrapper e ponte, sempre subordinatamente ai
controlli interni. I quattro helper privati `admin_announcement_detail_spec_v1`,
`admin_announcement_snapshot_v1`, `admin_announcement_author_v1` e
`admin_announcement_field_v1` sono riservati a `postgres`: nessun EXECUTE a
PUBLIC, `anon`, `authenticated` o `service_role`. Lo snapshot grezzo non è una
RPC accessibile ai client. Tutti gli oggetti hanno search path vuoto.

Il preflight richiede 07A, colonne usate e unicità valida, completa e non parziale
su `uuid_annuncio` delle undici tabelle di dettaglio. Non sceglie silenziosamente
una riga fra duplicati. Lo schema completo del target va comunque verificato in
03B/16, incluse tipologie delle colonne, indici e vincoli effettivi.

## Contratto del dettaglio

Input server: UUID testuale, con trim e normalizzazione minuscola; formato errato
rifiutato prima di creare il client. Esiti:

| Stato | Significato |
| --- | --- |
| `ok` | Dettaglio disponibile, eventualmente incompleto con segnalazioni |
| `invalid` | `INVALID_ANNOUNCEMENT_ID` |
| `not_found` | `ANNOUNCEMENT_NOT_FOUND`, solo dopo autorizzazione riuscita |
| `denied` | `ACCESS_DENIED`, senza indicazione dell'esistenza della risorsa |
| `unavailable` | `ANNOUNCEMENTS_UNAVAILABLE` e correlazione, senza errori grezzi |

La RPC restituisce JSON `null` per una riga base assente; errori di policy non
attestata sono indisponibilità, non risultato vuoto o password errata.

Il DTO espone:

- `summary`: lo stesso contratto di riga di 07A, con date UTC a sei cifre
  frazionarie e fingerprint base; nome pubblico/anonimo o fallback sicuro.
- `metadata`: nota di moderazione, livello, priorità e intervallo temporale,
  UUID applicativo dell'ultimo modificatore. Nessun dato di pagamento/account.
- `content`: unione discriminata delle undici tipologie con campi espliciti;
  `annuncio_creators` legge la tabella `annuncio_creator`. Colonne tecniche e
  JSON opachi come `info_mostrate` non sono inoltrati.
- `locations`, `contacts`, `links`, `media`: proiezioni dedicate ordinate per ID;
  ID bigint serializzati come stringhe, senza perdita di precisione JavaScript.
- `contentFingerprint`, `complete`, `issues`: confronto completo della fonte e
  segnalazioni utilizzabili dalla futura interfaccia.

I contratti sono in `features/annunci/contracts.ts`; il registro dei campi e i
tipi discriminati sono in `detail-fields.ts`. `server/detail-response.ts` valida
la risposta e costruisce nuovi oggetti, senza propagare proprietà aggiuntive.
Il servizio/entrypoint esistente viene esteso; tipi RPC aggiunti al solo schema
`public` di `packages/database/src/index.ts`.

Tipologia non supportata o dettaglio tipizzato mancante conservano riepilogo e
metadati, con `UNSUPPORTED_TYPE`/`DETAIL_MISSING` e `complete=false`. Non sono
trattati come annuncio inesistente. Nulli opzionali e autore non risolvibile non
inventano valori o identità e non nascondono l'annuncio.

### JSON strutturati e anonimato

Anche la RPC proietta i JSON prima della risposta: esperienze/qualifiche, orari e
premi contengono soltanto proprietà note. Campi scalari non interpretabili sono
nulli o proiettati parzialmente, con `INVALID_FIELD:<campo>`. La validazione TS
controlla ulteriormente struttura, giorni/orari, periodi e stati delle esperienze;
una risposta fuori contratto causa indisponibilità, non forwarding arbitrario.

Riferimenti strutturati a squadre risolti in una query per storico, con lookup
indicizzati, senza chiamate PL/pgSQL per ogni voce. Il nome salvato viene
sostituito con quello pubblico attuale, rispettando l'istanza del sottoprofilo.
Squadra anonima, nascosta, mancante, anonimato sconosciuto, istanza diversa o
riferimento invalido: «Squadra». Vengono sostituite anche copie identiche negli
altri campi nominativi della voce. Il testo libero dell'annuncio resta testo
dell'utente: non si promette di riconoscere automaticamente ogni nome scritto
in descrizioni non strutturate.

Limiti della proiezione: 5.000 caratteri per campo testuale di contenuto,
32 stringhe per selezione, 60 voci per storico (incluse qualifiche legacy
accorpate), 7 giorni per orari e 20 premi. Fino a 100 località per annuncio,
come già ammesso dalla pubblicazione, e 30 record per ciascuna altra relazione.
I limiti non cambiano quelli della tabella lista: sempre massimo 30 annunci.
Eccedenze legacy non sono silenziose: `INVALID_FIELD` oppure
`COLLECTION_TRUNCATED:<relazione>`, con contenuto incompleto. Lo snapshot del
fingerprint comprende anche le righe/campi esclusi dalla presentazione.

### Contatti, URL e media

I contatti provengono solo da `contatto_annuncio`; sono dati read only senza
`mailto:`/`tel:` attivi. Email/telefono validati, valori legacy non validi
segnalati con `INVALID_CONTACT`; nessun recupero alternativo dall'account.

Link/media restituiscono testo salvato e `url` normalizzato oppure `null`.
Destinazioni apribili soltanto se URL assoluti HTTP/HTTPS entro 2048 caratteri,
senza controlli ASCII o credenziali incorporate. Relativi, `javascript:`, `data:`,
schemi diversi e URL invalidi producono `UNSAFE_LINK`/`UNSAFE_MEDIA`; nessun URL
relativo viene risolto sull'origine Admin. I valori rimangono testo inerte.

Nessun fetch, proxy, download, decodifica, HTML o embed nel 07B. Il MIME è una
descrizione, non un'autorizzazione a renderizzare SVG o documenti. Lo step 08
deve usare il dialogo esterno condiviso per le aperture e gestire i descrittori
senza caricare implicitamente contenuti remoti.

`complete` descrive la proiezione del contenuto, non l'autorizzazione o la sua
approvabilità. Le future mutazioni devono rivalutare dati e condizioni sul server;
non fidarsi del flag o del fingerprint inviati dal browser.

## Fingerprint completo e concorrenza futura

Formato `content-v1:<64 cifre esadecimali SHA-256>`, calcolato in PostgreSQL con
funzioni native senza nuova estensione. Copre riga base completa, riga della
tipologia pertinente e tutte le località, contatti, link e media ordinati per ID.
Include colonne opache e righe oltre il limite di presentazione. Le funzioni
STABLE leggono lo snapshot dello statement chiamante, con serializzazione UTC.

Un cambiamento nelle relazioni invalida il confronto anche senza aggiornare
`ultima_modifica_il`; una modifica dell'autore/profilo esterno allo snapshot può
cambiare il riepilogo pubblico, senza cambiare questo fingerprint. Il vecchio
`rowFingerprint` resta il confronto della sola riga base e coincide con 07A.

Nessuna promessa di lock o protezione concorrente in una semplice lettura.
Lo step 09 deve ricalcolare lo stesso snapshot nella transazione autorizzata e
garantire serializzazione anche rispetto ai writer delle relazioni. Bloccare
solo il parent, senza verificare i percorsi di scrittura dei figli, non basta.
Il fingerprint non è un token segreto né una prova di accesso.

## Verifiche del 2026-10-24

**289 test riusciti, zero fallimenti/skip**, di cui **71 nuovi** (48 database,
23 server), 79 di 07A e 139 regressioni Auth/audit/autorizzazione/confine Web.

```powershell
node --test tests/admin-announcement-detail-database.test.mjs tests/admin-announcement-detail-server.test.mjs tests/admin-announcements-database.test.mjs tests/admin-announcements-server.test.mjs
node --test tests/admin-auth-server.test.mjs tests/admin-audit-server.test.mjs tests/admin-authorization-database.test.mjs tests/admin-web-boundary.test.mjs
npm run typecheck:admin
npm run typecheck
```

Typecheck Web/Admin e lint mirato riusciti. Verificati codice TS effettivo,
roundtrip PostgreSQL → DTO per undici tipi, spec SQL/TS allineate, autorizzazione
prima dell'assenza, diniego tecnico anche via wrapper privilegiato, anonimato e
riferimenti, JSON malformati/proprietà extra, URL pericolosi, bigint, revoca al
successivo accesso, hash stabile in altri fusi e sensibile a insert/update/delete
di ogni relazione e a colonne non presentate. ACL/RLS tabelle invariati;
prerequisiti mancanti o dettaglio non univoco provocano rollback senza helper/RPC
parzialmente installati.

Su 12.000 righe sintetiche, EXPLAIN dei lookup parent/dettaglio/località usa gli
indici esistenti e restituisce una riga per ricerca. Misura iniziale della RPC
completa nel processo PGlite: circa 3,58 ms. Non è EXPLAIN dell'intera RPC né
misura Auth/PostgREST/rete; nessuna garanzia di latenza sul target reale.

La fixture estende 07A e ricava colonne/tipi dal pacchetto database: non ricrea
la storia completa delle migrazioni o tutti i vincoli del progetto. Restano
obbligatori nello step 07 complessivo e nel gate 16 schema completo, tipi e
unicità effettivi, advisor/ACL, Auth/JWT/PostgREST, prove browser dello step 08,
piani interni e costi su contenuti/relazioni rappresentativi.

Non eseguiti Docker, dev server, build di produzione, collegamenti al progetto,
deploy o modifiche ai file dell'operatore e agli env.

## Operazioni manuali di integrazione

Il percorso M05 nella guida collegata sopra è completato: report iniziale,
installazione strutturalmente verificata dal report finale e confronto delle
25 protezioni acquisiti. Nessuna operazione manuale residua M05; non riapplicare
la migrazione su questa installazione. Le indicazioni sotto restano riferimento
storico per lo sviluppo e le prove integrate su target isolati, senza riaprire M01–M05.

1. Per sviluppare 08 continuare senza applicare SQL al progetto reale.
   Riprendere l'ambiente isolato locale/staging e la baseline completa in 03B
   prima delle prove integrate. Controllare destinazione, backup e cronologia:
   non riapplicare la foundation dichiarata già presente sul reale.
2. Ordine degli oggetti mancanti: foundation 03A → audit 04A → ponte audit 04B →
   lista 07A `20261024120724_admin_announcement_list.sql` → questa migrazione
   `20261024145954_admin_announcement_detail.sql`. Audit/ponte servono al login;
   la dipendenza diretta del dettaglio è la base autorizzativa più 07A/schema Web.
3. Su destinazione isolata verificata, applicare una volta come operatore SQL
   `postgres` l'intero file 07B tramite SQL editor/runner. Non fare `db push`
   indiscriminato. Il commit notifica il reload dello schema PostgREST.
4. Verificare i sei oggetti, privilegi e schema privato non esposto; confrontare
   ACL/RLS con la baseline, unicità `uuid_annuncio` e tipi condivisi con il target.
   Non concedere EXECUTE agli helper grezzi e non usare una chiave tecnica per
   leggere i dettagli al posto della sessione umana.
5. Eseguire le prove integrate con dati e account sintetici secondo 03B/16,
   inclusa la policy attestata solo dopo la sua verifica. Nessuna nuova env,
   configurazione Auth o attivazione Cron richiesta da questa migrazione.

Controllo di catalogo come operatore nell'ambiente isolato verificato:

```sql
select n.nspname,p.proname,p.prosecdef,p.proowner::regrole as owner,p.proconfig,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as human,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon,
  has_function_privilege('service_role',p.oid,'EXECUTE') as technical
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where p.proname in ('admin_get_announcement_v1','get_admin_announcement_v1',
  'admin_announcement_detail_spec_v1','admin_announcement_snapshot_v1',
  'admin_announcement_author_v1','admin_announcement_field_v1');
```

Atteso: sei funzioni, owner `postgres`, search path vuoto; definer solo il ponte,
EXECUTE umano solo su wrapper/ponte, nessun EXECUTE tecnico o anonimo.

### Recupero

Errore prima del commit: `ROLLBACK` se la sessione rimane in transazione fallita,
correggere il prerequisito/baseline e ripetere la prova isolata. Non rimuovere
unicità o controlli di accesso per aggirare il preflight. Dopo applicazione
riuscita, correggere con una nuova migrazione verificata conservando i dati.
Per sospendere soltanto questa lettura, come `postgres` sul target verificato:

```sql
revoke execute on function public.admin_get_announcement_v1(uuid) from authenticated;
revoke execute on function private.get_admin_announcement_v1(uuid) from authenticated;
```

Non cambiare globalmente USAGE su `private` o grant/policy di lista, Auth e Web.
Ripristinare i due EXECUTE solo dopo correzione e prove riuscite. Un rollback
applicativo non rimuove automaticamente la migrazione.

## Prossimo step implementativo (storico)

[08 — Interfaccia Annunci](08-annunci-interfaccia.md), **6.1 Sol, medium**.

Il percorso operativo attuale di integrazione prosegue invece con
**M06 — moderazione annunci**, non avviato; **6.1 Sol, high**, come indicato nella guida M05.
