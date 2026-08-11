# Revisione di `/pubblica-annuncio`

## Situazione attuale

Il form raccoglie dati in store Zustand separati per tipologia, esegue la validazione nel client e mostra un riepilogo. L'invio finale, però, è ancora simulato con un timeout: non esiste un DTO di submit, una validazione server, una scrittura nel database o un ordine di pagamento. La logica OTP è volutamente esclusa da questa revisione.

Il catalogo commerciale è inoltre duplicato tra `/pubblica-annuncio` e `/visibilita`. Nel database tipizzato in `src/server/supabase.ts` convivono `Annuncio_generico.contenuto` in JSON e tabelle specifiche per i tipi storici (`Giocatore`, `Squadra`, `Staff`, `Arbitro`), mentre le nuove tipologie del form non hanno un modello diretto equivalente.

## Interventi prioritari

### 1. Definire un contratto di invio unico e validarlo sul server (P0)

Creare un DTO come un'unione discriminata per `tipologia` e `sottotipologia`, con uno schema di validazione condiviso tra client e server. Il submit dovrebbe passare a una Server Action o a un endpoint server che:

1. autentica l'utente;
2. valida nuovamente tutti i dati e il codice piano;
3. carica eventuali file in Storage;
4. crea annuncio e ordine in una transazione;
5. restituisce un ID stabile da usare nella pagina di conferma.

Gli store devono restare uno stato temporaneo dell'interfaccia, non il contratto persistito. Non fidarsi di prezzo, stato pagamento, autore o privilegi ricevuti dal browser.

### 2. Usare un solo catalogo per piani e prezzi (P0)

`/pubblica-annuncio` e `/visibilita` devono leggere la stessa sorgente tipizzata. Ogni prodotto dovrebbe avere almeno `code`, categoria (`gratis`, `plus`, `pro`, `prioritario`), prezzo in centesimi, valuta, durata e tipologie compatibili. Il testo formattato, per esempio `4,90 EUR / mese`, va derivato per la UI.

Salvare nell'ordine anche uno snapshot immutabile di nome, importo, valuta e condizioni del piano: modificare il catalogo in futuro non deve cambiare lo storico degli acquisti.

### 3. Adottare un modello dati ibrido, semplice da evolvere (P0/P1)

Una base pragmatica:

- `announcements`: `id uuid`, `author_id uuid`, `type`, `subtype`, `status`, `visibility_plan_code`, `payload jsonb`, `payload_version`, `created_at`, `updated_at`, `published_at`;
- `announcement_orders`: annuncio, codice prodotto, importo in centesimi, valuta, stato, provider e riferimento esterno, snapshot del prodotto;
- tabelle relazionali solo per dati realmente usati in filtri e ricerca, come regioni/località, ruoli, categorie e intervalli di disponibilità;
- file e immagini in Storage, conservando nel payload soltanto bucket/path e metadati.

Questo evita una tabella nuova per ogni variante del form senza trasformare ogni ricerca in interrogazioni su JSON. `payload_version` consente di migrare gradualmente gli annunci quando cambia il form.

### 4. Collegare l'autore tramite UUID, non tramite email (P1)

Le tabelle attuali fanno spesso riferimento a `Utente.indirizzo_email`. L'email è modificabile e contiene un dato personale; usare invece un `author_id uuid` collegato all'identità Auth, mantenendo email e contatti come attributi separati. Uniformare inoltre i nomi SQL in `snake_case` minuscolo ed evitare nomi accentati o con maiuscole per ridurre quoting e mapping speciali.

### 5. Rendere schema e sicurezza riproducibili (P0/P1)

Nel repository manca una cronologia di migrazioni Supabase: `src/server/supabase.ts` è uno snapshot di tipi, non la sorgente dello schema. Versionare schema/migrazioni, seed minimi, indici, vincoli e policy insieme al codice.

Abilitare RLS su ogni tabella esposta e definire policy esplicite per bozza, lettura pubblica, modifica dell'autore e moderazione. Verificare anche i grant del Data API, tenendo conto della modifica annunciata da Supabase per il **30 ottobre 2026**, quando le nuove tabelle non saranno più automaticamente accessibili al Data API. La service role deve restare esclusivamente sul server. Aggiungere limiti per frequenza di pubblicazione e upload.

Riferimenti ufficiali:

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Declarative database schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
- [Modifica ai grant predefiniti del Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

## Organizzazione del codice consigliata

- Spostare tipi di dominio, schema di validazione, normalizzazione e catalogo piani in un modulo indipendente da React; oggi alcuni store importano tipi/default direttamente dai componenti UI.
- Lasciare ai componenti soltanto rendering e interazioni, e agli store soltanto lo stato della bozza.
- Costruire il riepilogo e il payload di submit dallo stesso DTO normalizzato, così label e dati inviati non possono divergere.
- Aggiungere test mirati per ogni discriminante del DTO, compatibilità piano/tipologia, campi obbligatori, upload e policy RLS. Evitare snapshot UI estesi: qui sono più utili test delle regole di dominio.

## Ordine di esecuzione suggerito

1. DTO discriminato e validazione server.
2. Catalogo commerciale unico e tabella ordini.
3. Migrazioni versionate con `announcements`, RLS e grant.
4. Submit reale con Storage e gestione degli stati bozza/in revisione/pubblicato.
5. Normalizzazione progressiva dei soli campi necessari alla ricerca.
