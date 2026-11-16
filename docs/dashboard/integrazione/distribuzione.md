# Distribuzione degli annunci

Implementazione del 16 novembre 2026. La pagina `/distribuzione` organizza le
condivisioni manuali WhatsApp; non invia messaggi e non richiede credenziali Meta.
Usa autorizzazioni, tema, filtri URL e registro attività della Dashboard.

## Conferma degli import senza link

Dalla migrazione `20261116172357_admin_whatsapp_import_confirmation.sql`, creare un annuncio **Da WhatsApp** senza link originale registra automaticamente **Considera pubblicato senza link** sul solo canale attivo della **Regione del canale**. Si conserva il testo originale, senza generare un URL; il timestamp di conferma è quello dell’operazione, indipendente dalla data di pubblicazione eventualmente retrodatata. Il dialog seleziona il canale d’origine e mostra la checkbox già spuntata. Una conferma vale per l’intero gruppo regionale, non per ogni copia.

Il canale d’origine è indipendente dalle zone di ricerca dell’annuncio. La registrazione dell’origine resta consultabile anche se non è disponibile una nuova esportazione su quel canale; non amplia le destinazioni esportabili e non approva l’annuncio sul sito. **Ricondividi** crea una nuova registrazione senza conferma automatica, conservando l’originale nello storico.

Se il canale manca, è archiviato o non è identificabile univocamente, la creazione viene bloccata con un messaggio nella tab Autore. Il server controlla il canale prima dell’upload e il database lo verifica nuovamente nella transazione di creazione. Annuncio, conferma, revisione e audit sono atomici; ripetere lo stesso invio non duplica la conferma, nemmeno dopo l’archiviazione del canale. Gli import con link e gli annunci già esistenti mantengono il comportamento precedente.

Applicare la migrazione dopo quelle precedenti, inclusa `20261116162039_admin_announcement_publication_date.sql`, prima di distribuire il nuovo writer. Le RPC nuove sono `admin_resolve_whatsapp_import_channel_v1` e `admin_create_announcement_v4`, riservate agli amministratori verificati. Nessun messaggio viene inviato a WhatsApp.

## Utilizzo

1. In **Canali**, registrare nome, URL del canale WhatsApp e ambito regionale o
   nazionale. Non vengono creati canali automaticamente. Archiviare un canale lo
   esclude dalle nuove preparazioni, conservando pubblicazioni e revisioni;
   può essere riattivato. Il limite è 200 canali attivi.
2. **Da condividere** elenca soltanto annunci anche in revisione o rifiutati, purché non privati, non oscurati
   e non cestinati, compatibili con almeno un canale attivo. Le copie regionali di
   una stessa pubblicazione sono raggruppate. Un canale regionale riceve soltanto
   le località pubbliche della propria regione; quello nazionale le raccoglie tutte.
   Gli annunci senza località possono essere preparati per un canale nazionale.
3. Aprire **Prepara**, scegliere il canale e controllare il messaggio generato dai
   [template esistenti](../../../../apps/admin/src/features/annunci/whatsapp/templates.ts).
   Le correzioni sono modificabili; riaprendo una bozza viene mantenuto il testo salvato.
   La selezione multipla lavora sulle sole righe della pagina corrente, massimo 30,
   con un dialog sequenziale. Ogni annuncio richiede il proprio salvataggio.
4. **Copia messaggio** copia soltanto il testo. Dopo la condivisione manuale,
   inserire il link di un messaggio del canale selezionato oppure selezionare
   **Considera pubblicato senza link**, che disabilita il campo URL. Solo il
   salvataggio registra la conferma. Senza entrambi viene conservata una bozza.
   La checkbox appartiene alla singola pubblicazione e non è una preferenza globale.
5. **Pubblicazioni** conserva bozze, conferme, condivisioni precedenti e revisioni.
   **Ricondividi** avvia una nuova registrazione, mantenendo la precedente nello
   storico. Togliere una conferma richiede un passaggio esplicito; nessuna azione
   elimina o modifica messaggi già presenti su WhatsApp.

La ricerca testuale si applica con **Filtra**; gli altri filtri aggiornano subito
URL e risultati senza applicare il testo ancora in bozza. Date dello storico per
giornata intera in Europe/Rome. Filtri e schede sono condivisibili tramite URL.
I dialog avvertono prima di scartare modifiche; la chiusura della scheda usa anche
il controllo nativo del browser. Le modifiche non salvate non costituiscono una
bozza persistente.

## Stati e provenienza

- **Da preparare**: nessuna registrazione per la coppia pubblicazione/canale.
- **Bozza pronta**: testo salvato, senza conferma di pubblicazione.
- **Pubblicato**: conferma manuale con link oppure esplicitamente senza link.
- **Da aggiornare**: dati che alimentano il messaggio cambiati dopo la conferma.
  Non viene sovrascritto il testo modificato dall'amministratore.
- **Già all’origine**: il link sorgente dell'importazione identifica il canale
  selezionato. Escluso dalla coda predefinita; una ricondivisione richiede conferma.
- **Da assegnare**: esportazione precedente, conservata senza inventare una
  destinazione. Scegliere il canale corretto e salvare per assegnarla.
- **Non più pubblico**: lo storico rimane consultabile, ma non modificabile.

La colonna **Distribuzione** di `/annunci` e del CSV conserva quattro valori:
Solo sito web, Da WhatsApp, Su WhatsApp, N/A. L'origine Da WhatsApp prevale anche
dopo una ricondivisione; Su WhatsApp richiede almeno una conferma registrata, non
la sola copia del messaggio. Una condivisione precedente resta tale anche quando
si prepara una nuova bozza. La colonna non certifica la presenza attuale di un
messaggio su WhatsApp, né la visibilità attuale dell'annuncio sul sito.

Anche l'azione **Esporta su WhatsApp** in `/annunci` usa questo editor e gli stessi
canali. La preparazione è disponibile anche per annunci non ancora pubblicati o rifiutati, se non privati né oscurati;
approvazione e moderazione rimangono operazioni separate.

## Database e rilascio

Applicare la migrazione
[`20261116130709_admin_distribution_workspace.sql`](../../../../supabase/migrations/20261116130709_admin_distribution_workspace.sql)
**prima del deploy Admin**. Presuppone la sequenza esistente del progetto, incluse
creazione/provenienza, esportazione WhatsApp, community, utenti/profili e
`20261116120439_admin_directory_sort_and_filter_defaults.sql`. Se queste sono già
applicate, serve soltanto la nuova migrazione. Non rieseguire le precedenti.

La migrazione crea in `private` canali, pubblicazioni, revisioni e ricevute di
idempotenza; le uniche nuove RPC pubbliche sono `admin_distribution_read_v1` e
`admin_distribution_write_v1`. Richiedono una sessione umana Admin valida;
le tabelle e gli helper non sono direttamente accessibili ai client. Nessuna
credenziale aggiuntiva o modifica ai bucket.

I salvataggi verificano versione e contenuto attuale, serializzano gli aggiornamenti
della stessa pubblicazione e registrano audit/ricevuta nella stessa transazione.
Un retry identico recupera la ricevuta; riusare l'identificatore con dati diversi
produce conflitto. L'audit non contiene messaggi, contatti o URL. Le operazioni
`distribution.save` e `distribution.channel_save` compaiono nel Registro attività.

Le esportazioni precedenti vengono importate come **Da assegnare**, preservando
testo e link. Durante il passaggio di versione, i vecchi salvataggi vengono
sincronizzati come non assegnati; se l'esportazione è già stata assegnata dal nuovo
editor, il vecchio writer viene rifiutato per impedire sovrascritture.

## Verifiche locali

### Canali regionali forniti il 16 novembre 2026

La migrazione `20261116144004_admin_distribution_regional_channels.sql`, da
applicare dopo quella della pagina, inserisce i 18 canali forniti dall'utente.
Mantiene i nomi indicati (Friuli, Trentino AA e Valle D'Aosta), associandoli alle
regioni canoniche dei filtri. I canali già presenti con lo stesso identificatore
WhatsApp conservano UUID, storico e stato di archiviazione. Mancano ancora i link
di **Basilicata e Molise**: nessun canale fittizio viene inserito per queste regioni.

### Comandi ed esiti

- `node --test tests/admin-distribution-database.test.mjs tests/admin-distribution-server.test.mjs`
  verifica migrazione reale in PGlite, controlli di accesso, raggruppamento,
  provenienza, versioni, retry, ricondivisione, migrazione dello storico e rollback
  se l'audit fallisce.
- `node scripts/dashboard-browser/distribution-checks.mjs` usa un'istanza Admin
  isolata e servizi sintetici locali, senza file `.env` o credenziali remote.
- Typecheck Admin e lint dei file interessati; nessuna build di produzione.

Esito del 16 novembre 2026: 202 test di regressione superati, inclusi nove casi
dedicati a Distribuzione; dieci scenari browser locali superati (filtri, conferme,
storico, sequenza multipla, canali, integrazione Annunci/Profili e temi/responsive).
Typecheck e lint superati. Dopo l'ultimo aggiornamento DDL, ripetuti con successo
anche i sei casi database dedicati.

Nessuna migrazione applicata a Supabase remoto dall'agente. Le conferme live
dell'utente del 28 ottobre restano distinte dalle verifiche locali. Cestino,
retention/Cron e prova completa di ripristino restano operazioni manuali separate.

La migrazione `20261116145739_admin_distribution_all_statuses.sql` abilita la distribuzione anche per stati diversi da Pubblicato. Un annuncio non pubblicato può non essere visibile tramite il link al sito incluso nel messaggio.
