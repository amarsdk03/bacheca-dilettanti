# Crea annuncio

La pagina `/annunci/crea-annuncio` usa la shell Admin e la breadcrumb **Annunci / Crea annuncio**. Il precedente percorso `/crea-annuncio` effettua un redirect permanente. Profilo e annuncio usano gli stessi componenti attivi del Web nel pacchetto condiviso; le nuove bozze inviano il contratto canonico v2.

## Compilazione

Cinque tab: **Autore → Profilo → Annuncio → Contatti e media → Riepilogo**. La navigazione è libera; l’invio controlla tutta la compilazione e porta al primo errore. Gli asterischi obbligatori sono rossi.

- **Utente registrato:** ricerca reale per email, nome o UUID. Il server rilegge l’autore all’invio. Il profilo resta in sola lettura; dati incompleti, profili nascosti e abilitazioni mancanti bloccano la creazione.
- **Senza account:** profilo anonimo gestito dall’Admin, senza utente Auth, OTP o verifica email. Email di riferimento facoltativa e privata. Se mancano entrambi i recapiti pubblici, il form usa email `info@bachecadilettanti.it` e telefono `3445325588`, indicati come contatti di Bacheca Dilettanti nel form e nel riepilogo. Aggiungere un recapito reale rimuove i default automatici; i valori inseriti manualmente restano invariati. Contatti invalidi o ambigui richiedono correzione e non vengono mascherati dai default. Servizi e Creators richiedono un profilo esistente abilitato.
- **Da WhatsApp:** regione del canale e contenuto obbligatori, link facoltativo e incolla dagli appunti accanto all’etichetta Contenuto. **Analizza messaggio** riconosce e precompila in un unico passaggio, restando nella prima tab. Qui si correggono Tipologia profilo e Tipologia annuncio (modificabile solo per Squadra), senza duplicati nella tab Annuncio. Il percorso senza account è iniziale; l’attribuzione a un profilo esistente conserva i suoi dati in sola lettura.

La regione del canale è un contesto per le zone di ricerca, mai una residenza o sede automatica. Una città esplicita viene separata dalle disponibilità narrative: “Palermo, cerco anche fuori regione” nel canale Sicilia propone Sicilia/Palermo per la ricerca e conserva la disponibilità nella descrizione, senza selezionare altre regioni. La località del profilo resta da compilare, anche tramite l’azione esplicita **Copia zona di ricerca nel profilo**. I nomi esatti di ruoli vengono riconosciuti anche nelle frasi; le categorie privilegiano corrispondenze esatte rispetto a quelle parziali e le proposte usano sport e genere compilati.

Gli avvisi narrativi sono gialli e non bloccano l’invio: esperienze non strutturabili, caratteristiche dei ruoli e altre informazioni pertinenti vengono conservate nella descrizione, senza riversare indiscriminatamente il testo originale pubblico. Campi obbligatori invalidi, fonte non aggiornata, duplicati discordanti, conflitti regionali, recapiti da selezionare/correggere e attribuzioni incompatibili restano bloccanti. Una correzione del campo collegato risolve automaticamente la segnalazione; modificare un dato diverso non la risolve. Per i conflitti di attribuzione a profili registrati rimane necessaria una decisione esplicita. Modificare fonte, attribuzione o valori pertinenti invalida le decisioni collegate. Client e server applicano la stessa distinzione fra errori e avvisi prima di upload e creazione. Il [report del campione regionale](./analisi-campione-whatsapp.md) documenta i 49 record storici; i test del flusso semplificato includono il caso Palermo.

Un’età come “21 anni” non viene convertita automaticamente in nascita: nella tab Profilo si propongono i due anni possibili rispetto alla data di pubblicazione oppure al giorno dell’analisi, conservato nella bozza. L’Admin deve scegliere o inserire la data corretta. Nome, genere, disponibilità e gli altri campi obbligatori non vengono inventati. Questi comportamenti sono limitati alla creazione amministrativa e non richiedono una nuova migrazione.

Rosso indica dati invalidi o obbligatori mancanti, giallo dati parziali o ambigui. Le segnalazioni si aggiornano modificando i valori. Cataloghi e normalizzazione sono condivisi con Web in `@bacheca/announcements`; i precedenti moduli Web rimangono come re-export compatibili. Il comando **Crea annuncio** attesta la responsabilità dell’Admin senza checkbox di autorizzazione aggiuntivi: autenticazione e audit restano obbligatori e non vengono simulati consensi dell’utente.

Il riepilogo usa lo stesso rendering e le stesse proiezioni pubbliche del Web, condivisi nel package con adattatori locali per UI e navigazione. Mostra dettagli, contatti, immagine e anteprime regionali separate. La fonte WhatsApp rimane fuori dalla scheda pubblica.

## Bozza e invio

Zustand conserva i campi in `sessionStorage`, con versione e chiave per UUID Auth dell’Admin verificato. Navigazione e ricarica nella stessa scheda ripristinano percorso, campi e tab. I file restano in memoria: dopo una ricarica occorre selezionarli nuovamente o rimuoverli. Se lo storage non è disponibile resta lo stato in memoria e appare un avviso.

I collegamenti della dashboard chiedono conferma prima di lasciare una compilazione modificata. Il logout elimina la bozza e le preferenze. **Svuota bozza / Nuovo annuncio** richiede conferma e conserva regione del canale e preferenza **Approva direttamente l’annuncio**, per gli inserimenti consecutivi nella stessa scheda. Le preferenze sono separate per Admin e non usano localStorage. Il form ignora il submit implicito: soltanto l’attivazione esplicita del pulsante finale avvia la creazione, con un blocco sincrono delle attivazioni ripetute. Il successo conserva campi e ricevuta e blocca un secondo invio della stessa compilazione. **Verifica invio** recupera la ricevuta dopo una risposta incerta. I retry identici restituiscono il risultato già salvato; cambiare payload o scelta di approvazione con lo stesso identificativo dà conflitto.

Ogni azione e RPC verifica l’Admin. La creazione SQL è transazionale: profilo anonimo, dettagli, località, contatti, riferimenti ai media, provenienza e audit vengono salvati insieme. Per più regioni viene creato un annuncio per regione, con gruppo comune. La ricerca sponsor non ha regioni. La checkbox **Approva direttamente l’annuncio** è inizialmente disattivata: normalmente gli annunci entrano in revisione. Se attiva, tutti i membri regionali vengono approvati nella stessa transazione tramite i controlli di moderazione esistenti; un errore annulla l’intera creazione nel database. Le notifiche seguono la normale approvazione. L’Admin non diventa proprietario: `creato_da` è l’autore effettivo oppure nullo; l’operatore è registrato nell’audit privato.

## Date nella creazione amministrativa

La tab **Annuncio** permette di scegliere una **Data di pubblicazione** dal 1900 al giorno corrente italiano (`Europe/Rome`). Il campo facoltativo è conservato nella bozza della singola creazione e mostrato nel riepilogo; lasciarlo vuoto mantiene data e ora effettive dell’inserimento. Una data esplicita indica l’inizio di quel giorno in Italia e viene salvata in `annuncio.creato_il` e `regional_publication.created_at`, anche per tutte le copie regionali. Il sito, l’ordinamento e l’anzianità utilizzano quindi la data scelta. Il registro attività e le ricevute mantengono i timestamp reali dell’operazione.

Applicare `20261116162039_admin_announcement_publication_date.sql` dopo le migrazioni precedenti, prima di utilizzare la retrodatazione. La nuova RPC `admin_create_announcement_v3` mantiene controlli amministrativi, approvazione diretta e idempotenza. Cambiare data con lo stesso identificativo di un invio già completato produce conflitto. Gli annunci esistenti non vengono aggiornati.

Solo nella dashboard, inserire un anno di nascita valido completa giorno e mese vuoti con **1 / Gennaio**, lasciando inalterati i valori già indicati. Lo stesso avviene importando un anno WhatsApp riconosciuto. È una convenzione temporanea modificabile, esplicitata nel form, non una data completa estratta dal messaggio. I profili registrati selezionati rimangono in sola lettura e il form della piattaforma principale non cambia comportamento.

## Esportazione WhatsApp

Quando la creazione **Da WhatsApp** non include il link originale, la RPC v4 registra automaticamente una conferma **Considera pubblicato senza link** sul canale attivo della regione d’origine. Se il canale non esiste, è archiviato o è ambiguo, l’invio si ferma nella tab Autore senza salvare un annuncio parziale. La conferma non cambia la moderazione né si estende alle altre destinazioni. È richiesta la migrazione `20261116172357_admin_whatsapp_import_confirmation.sql`, successiva a quella della data di pubblicazione; le creazioni precedenti non vengono aggiornate. Dettagli in [Distribuzione](distribuzione.md#conferma-degli-import-senza-link).

La colonna **Distribuzione**, presente anche nel CSV, mostra **Solo sito web**, **Da WhatsApp**, **Su WhatsApp** o **N/A**. L’origine importata prevale sulle successive esportazioni. Gli storici senza provenienza certa mostrano N/A; le nuove creazioni del sito vengono tracciate. Testo originale, link sorgente ed email di riferimento restano privati e separati dal messaggio esportato.

L’azione di riga **Esporta su WhatsApp** usa ora l’editor condiviso con la pagina
Distribuzione, per i soli annunci pubblici. Richiede un canale configurato; il
messaggio resta modificabile. Copiare non salva né invia nulla. Un link del
messaggio oppure **Considera pubblicato senza link**, seguito da salvataggio,
conferma la condivisione manuale. Senza entrambi si salva una bozza. Versioni,
ricondivisioni, assegnazione delle esportazioni precedenti e migrazione sono
descritte in [Distribuzione](distribuzione.md).

I template si aggiornano in `apps/admin/src/features/annunci/whatsapp/templates.ts`: ogni definizione contiene `heading`, righe con `emoji`, `label` e chiavi dei dati pubblici, e `tags`. Aumentare `WHATSAPP_TEMPLATE_VERSION` quando cambia la struttura. Arbitro, Servizi e Creators sono marcati `temporary`; esiste un fallback per le tipologie senza formato assegnato. I dati assenti vengono omessi, mai inventati. L’Admin può rigenerare un messaggio già preparato dal template corrente, confermando la sostituzione delle correzioni. Nessun accesso aggiuntivo al bucket immagini.

Le immagini PNG/JPEG/WebP fino a 5 MB sono controllate sul server e caricate in `immagini_annunci` come `UUID-Admin/UUID-invio/SHA256.estensione`. Nessun nuovo accesso browser al bucket. L’upload precede la transazione: un oggetto senza riferimenti può restare per il retry dopo un errore. Le risposte incerte non attivano cancellazioni automatiche, evitando di rimuovere immagini usate da invii concorrenti. Una pulizia successiva deve verificare prima i riferimenti.

## SQL e distribuzione

1. Applicare le migrazioni precedenti del progetto, inclusa `20261106180007_admin_annunci_media_titles.sql` se manca.
2. Applicare **`supabase/migrations/20261107152140_admin_announcement_creation.sql`** prima del deploy Admin. Crea ricevute/provenienza private e RPC di ricerca, creazione e recupero; estende letture Annunci e audit.
3. Applicare **`supabase/migrations/20261111163837_admin_direct_approval_whatsapp_export.sql`** dopo la precedente e prima del deploy Admin. Aggiunge approvazione diretta, registro WhatsApp privato, RPC, classificazione e audit. Le nuove operazioni sono disabilitate o falliscono senza effettuare la creazione richiesta se il database non è aggiornato.
4. Verificare nel server Admin `NEXT_PUBLIC_SUPABASE_URL`, la chiave pubblica già prevista e **`SUPABASE_SECRET_KEY`**, già usata dall’audit. La chiave segreta non deve avere prefisso `NEXT_PUBLIC_`.
5. Installare le dipendenze dalla root e distribuire includendo il workspace `packages/announcements`. La Web conserva le API precedenti dei moduli condivisi.

L’agente non applica questa migrazione a progetti remoti. I test usano fixture locali, trasporti simulati e PostgreSQL PGlite in memoria, senza credenziali remote. Le conferme precedenti dell’utente sui controlli live restano distinte da queste verifiche. Cestino, retention/Cron e prova completa di ripristino rimangono operazioni manuali separate.
