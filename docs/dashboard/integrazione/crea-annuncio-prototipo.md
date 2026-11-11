# Crea annuncio

La pagina `/crea-annuncio` usa la shell Admin e la breadcrumb **Annunci / Crea annuncio**. Il precedente prototipo è ora collegato alle operazioni server.

## Compilazione

Cinque tab: **Autore → Profilo → Annuncio → Contatti e media → Riepilogo**. La navigazione è libera; l’invio controlla tutta la compilazione e porta al primo errore. Gli asterischi obbligatori sono rossi.

- **Utente registrato:** ricerca reale per email, nome o UUID. Il server rilegge l’autore all’invio. Il profilo resta in sola lettura; dati incompleti, profili nascosti e abilitazioni mancanti bloccano la creazione.
- **Senza account:** profilo anonimo gestito dall’Admin, senza utente Auth, OTP o verifica email. Email di riferimento facoltativa e privata, almeno un contatto pubblico autorizzato. Servizi e Creators richiedono un profilo esistente abilitato.
- **Da WhatsApp:** regione del canale e contenuto obbligatori, link facoltativo e incolla dagli appunti accanto all’etichetta Contenuto. **Analizza messaggio** riconosce e precompila in un unico passaggio, restando nella prima tab. Qui si correggono Tipologia profilo e Tipologia annuncio (modificabile solo per Squadra), senza duplicati nella tab Annuncio. Il percorso senza account è iniziale; l’attribuzione a un profilo esistente conserva i suoi dati in sola lettura.

La regione del canale completa una regione assente; regioni discordanti o multiple richiedono una scelta esplicita. Comuni, province, identità e date incomplete non vengono inventati. Le modifiche alla fonte richiedono una nuova analisi prima dell’invio; sostituire correzioni manuali richiede conferma. Testo originale e dati senza campo dedicato restano privati nel riepilogo e nel dettaglio Admin. Il server verifica il contesto dell’importazione prima di upload e creazione. Non sono richieste migrazioni aggiuntive per questa semplificazione.

Rosso indica dati invalidi o obbligatori mancanti, giallo dati parziali o ambigui. Le segnalazioni si aggiornano modificando i valori. Cataloghi e normalizzazione sono condivisi con Web in `@bacheca/announcements`; i precedenti moduli Web rimangono come re-export compatibili. Il comando **Crea annuncio** attesta la responsabilità dell’Admin senza checkbox di autorizzazione aggiuntivi: autenticazione e audit restano obbligatori e non vengono simulati consensi dell’utente.

Il riepilogo usa lo stesso rendering e le stesse proiezioni pubbliche del Web, condivisi nel package con adattatori locali per UI e navigazione. Mostra dettagli, contatti, immagine e anteprime regionali separate. La fonte WhatsApp rimane fuori dalla scheda pubblica.

## Bozza e invio

Zustand conserva i campi in `sessionStorage`, con versione e chiave per UUID Auth dell’Admin verificato. Navigazione e ricarica nella stessa scheda ripristinano percorso, campi e tab. I file restano in memoria: dopo una ricarica occorre selezionarli nuovamente o rimuoverli. Se lo storage non è disponibile resta lo stato in memoria e appare un avviso.

I collegamenti della dashboard chiedono conferma prima di lasciare una compilazione modificata. Il logout elimina la bozza e le preferenze. **Svuota bozza / Nuovo annuncio** richiede conferma e conserva regione del canale e preferenza **Approva direttamente l’annuncio**, per gli inserimenti consecutivi nella stessa scheda. Le preferenze sono separate per Admin e non usano localStorage. Il successo conserva campi e ricevuta e blocca un secondo invio della stessa compilazione. **Verifica invio** recupera la ricevuta dopo una risposta incerta. I retry identici restituiscono il risultato già salvato; cambiare payload o scelta di approvazione con lo stesso identificativo dà conflitto.

Ogni azione e RPC verifica l’Admin. La creazione SQL è transazionale: profilo anonimo, dettagli, località, contatti, riferimenti ai media, provenienza e audit vengono salvati insieme. Per più regioni viene creato un annuncio per regione, con gruppo comune. La ricerca sponsor non ha regioni. La checkbox **Approva direttamente l’annuncio** è inizialmente disattivata: normalmente gli annunci entrano in revisione. Se attiva, tutti i membri regionali vengono approvati nella stessa transazione tramite i controlli di moderazione esistenti; un errore annulla l’intera creazione nel database. Le notifiche seguono la normale approvazione. L’Admin non diventa proprietario: `creato_da` è l’autore effettivo oppure nullo; l’operatore è registrato nell’audit privato.

## Esportazione WhatsApp

La colonna **Annuncio WhatsApp?**, presente anche nel CSV, mostra **Solo sito web**, **Da WhatsApp**, **Su WhatsApp** o **N/A**. L’origine importata prevale sulle successive esportazioni. Gli storici senza provenienza certa mostrano N/A; le nuove creazioni del sito vengono tracciate. Testo originale, link sorgente ed email di riferimento restano privati e separati dal messaggio esportato.

L’azione di riga **Esporta su WhatsApp** è disponibile per annunci pubblicati o in revisione, non privati, non nascosti e non cestinati. Il dialog permette di modificare il testo, copiarlo e salvare un link HTTPS WhatsApp facoltativo. Copiare non salva né invia nulla. Senza link il testo resta una bozza; salvare un link conferma la pubblicazione manuale e produce Su WhatsApp. Rimuovere il link ripristina lo stato derivato dall’origine. L’operazione non approva l’annuncio. Salvataggi identici non duplicano l’audit; revisioni concorrenti o contenuto cambiato richiedono verifica prima di salvare.

I template si aggiornano in `apps/admin/src/features/annunci/whatsapp/templates.ts`: ogni definizione contiene `heading`, righe con `emoji`, `label` e chiavi dei dati pubblici, e `tags`. Aumentare `WHATSAPP_TEMPLATE_VERSION` quando cambia la struttura. Arbitro, Servizi e Creators sono marcati `temporary`; esiste un fallback per le tipologie senza formato assegnato. I dati assenti vengono omessi, mai inventati. L’Admin può rigenerare un messaggio già preparato dal template corrente, confermando la sostituzione delle correzioni. Nessun accesso aggiuntivo al bucket immagini.

Le immagini PNG/JPEG/WebP fino a 5 MB sono controllate sul server e caricate in `immagini_annunci` come `UUID-Admin/UUID-invio/SHA256.estensione`. Nessun nuovo accesso browser al bucket. L’upload precede la transazione: un oggetto senza riferimenti può restare per il retry dopo un errore. Le risposte incerte non attivano cancellazioni automatiche, evitando di rimuovere immagini usate da invii concorrenti. Una pulizia successiva deve verificare prima i riferimenti.

## SQL e distribuzione

1. Applicare le migrazioni precedenti del progetto, inclusa `20261106180007_admin_annunci_media_titles.sql` se manca.
2. Applicare **`supabase/migrations/20261107152140_admin_announcement_creation.sql`** prima del deploy Admin. Crea ricevute/provenienza private e RPC di ricerca, creazione e recupero; estende letture Annunci e audit.
3. Applicare **`supabase/migrations/20261111163837_admin_direct_approval_whatsapp_export.sql`** dopo la precedente e prima del deploy Admin. Aggiunge approvazione diretta, registro WhatsApp privato, RPC, classificazione e audit. Le nuove operazioni sono disabilitate o falliscono senza effettuare la creazione richiesta se il database non è aggiornato.
4. Verificare nel server Admin `NEXT_PUBLIC_SUPABASE_URL`, la chiave pubblica già prevista e **`SUPABASE_SECRET_KEY`**, già usata dall’audit. La chiave segreta non deve avere prefisso `NEXT_PUBLIC_`.
5. Installare le dipendenze dalla root e distribuire includendo il workspace `packages/announcements`. La Web conserva le API precedenti dei moduli condivisi.

L’agente non applica questa migrazione a progetti remoti. I test usano fixture locali, trasporti simulati e PostgreSQL PGlite in memoria, senza credenziali remote. Le conferme precedenti dell’utente sui controlli live restano distinte da queste verifiche. Cestino, retention/Cron e prova completa di ripristino rimangono operazioni manuali separate.
