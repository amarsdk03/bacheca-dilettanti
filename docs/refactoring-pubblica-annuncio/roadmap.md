# Refactoring graduale di `/pubblica-annuncio` e delle viste collegate

Fonte dei requisiti: [preplanning originale](../preplanning-refactoring-pubblica-annuncio.md). Questo documento incorpora i requisiti e le decisioni successive; è la guida operativa per gli interventi. Stato iniziale rilevato il 26 settembre 2026: esistono già modifiche non committate nel workspace, da rispettare.

## Come usare questa roadmap

Ogni «procedi» avvia il primo step non completato in ordine numerico. Se uno step risulta **In corso**, «procedi» riprende quello step dal suo ultimo checkpoint e lo porta a termine prima di passare oltre. Ogni prompt lavora su **un solo step**. Per lo Step 00 eseguire soltanto la ricognizione; per gli altri step implementare e verificare.

**Prima di qualsiasi altra attività dello step**, impostare la relativa riga della tabella su **In corso**. Durante il lavoro aggiornare la sezione dello step con un breve checkpoint dopo ogni fase significativa (ricognizione, implementazione, verifiche), indicando cosa è terminato e cosa resta. Se il lavoro viene interrotto, leggere stato e checkpoint, controllare anche le modifiche già presenti nel workspace e riprendere dal punto annotato; non ricominciare da zero e non segnare lo step completato finché i criteri di uscita non sono soddisfatti.

Prima di ogni step, rileggere `AGENTS.md` e le guide pertinenti della versione Next installata prima di scrivere codice. Se lo step tocca Supabase/Postgres, applicare le skill locali pertinenti e verificare le API correnti. Non avviare server o build di produzione a ogni modifica. Evitare refactor estranei allo step e non sovrascrivere le modifiche già presenti nel workspace.

Uno step è **completo** solo quando form di pubblicazione e modifica profilo, modelli, anteprima/riepilogo, validazioni client e server, persistenza, query, dettagli, ricerca/filtri, card e testi pertinenti raccontano lo stesso dato. Aggiornare [la matrice dei campi](../campi-pubblicazione-per-profilo.md) quando cambiano campi od obbligatorietà. Per modifiche DB, aggiungere una migrazione incrementale, aggiornare i tipi Supabase e verificare scrittura e rilettura; non modificare migrazioni già applicate.

Al completamento aggiornare il checkpoint e lo stato a **Completato**, quindi fermarsi. Nel resoconto indicare verifiche e limiti residui; ricordare soltanto la migrazione creata nello step corrente, se presente; indicare il nome e il modello consigliato per lo step successivo. Le migrazioni degli step completati si considerano applicate manualmente dall'utente. Non applicare migrazioni remote automaticamente.

### Modello consigliato per step

Usare il modello indicato con livello **Medium**.

| Modello consigliato | Step |
| --- | --- |
| **Luna · Medium** | 01, 05, 08, 09, 12, 15 |
| **Sol · Medium** | 00, 02, 03, 04, 06, 07, 10, 11, 13, 14, 16 |

| Step | Tema | Dipende da | Stato |
| --- | --- | --- | --- |
| 00 | Ricognizione e matrice dei dati | — | Completato (26/09/2026) |
| 01 | Tipologie di calcio e ruoli | 00 | Completato (26/09/2026; migrazione considerata applicata manualmente dall'utente) |
| 02 | Categorie generali e figure professionali | 01 | Completato (26/09/2026; migrazione considerata applicata manualmente dall'utente) |
| 03 | Località e testi comuni; Arbitro | 00, 02 | Completato (26/09/2026; nessuna migrazione) |
| 04 | Giocatore | 02, 03 | Completato (26/09/2026; migrazione locale da applicare manualmente) |
| 05 | Squadra: profilo | 02, 03 | Completato (26/09/2026; migrazione locale da applicare manualmente) |
| 06 | Squadra: ricerca giocatori | 05 | Completato (26/09/2026; migrazione locale da applicare manualmente) |
| 07 | Squadra: ricerca staff | 05 | Completato (26/09/2026; migrazione locale da applicare manualmente) |
| 08 | Squadra: ricerca partite | 05 | Completato (26/09/2026; nessuna migrazione) |
| 09 | Squadra: ricerca sponsor | 05 | Completato (26/09/2026; migrazione locale da applicare manualmente) |
| 10 | Staff sportivo: profilo | 02, 03 | Completato (26/09/2026; migrazione locale da applicare manualmente) |
| 11 | Staff sportivo: annuncio | 10 | Completato (27/09/2026; migrazione locale da applicare manualmente) |
| 12 | Torneo / Evento | 02, 03 | Completato (27/09/2026; migrazione locale da applicare manualmente) |
| 13 | Campi e impianti: profilo | 02, 03 | Completato (27/09/2026; migrazione locale da applicare manualmente) |
| 14 | Campi e impianti: annuncio | 13 | Completato (27/09/2026; migrazione locale da applicare manualmente) |
| 15 | Titoli card e tab dei dettagli | 04–14 | Completato (27/09/2026; nessuna migrazione) |
| 16 | Regressione e documentazione finale | 01–15 | Completato (27/09/2026; migrazione locale da applicare manualmente) |

Per ogni step non completato, mantenere nella relativa sezione un checkpoint aggiornato; il checkpoint deve permettere di riprendere il lavoro senza affidarsi alla memoria implicita della conversazione.

## Regole comuni sui dati

- Conservare i record esistenti. Convertire solo equivalenze certe, come `Calcio a 11` → `Calcio 11` e `Ambipiede` → `Ambidestro`; non indovinare genere, nazionalità, macrocategoria o indirizzo da testi ambigui. I valori storici non mappabili restano leggibili, senza entrare nelle nuove opzioni di scelta; annotare quantità e trattamento nel resoconto della migrazione.
- Le nuove obbligatorietà valgono per nuovi invii e per il successivo salvataggio esplicito di un record esistente. Non riempire automaticamente campi sconosciuti con valori inventati. Mantenere leggibili i record precedenti, anche se incompleti rispetto alle nuove regole.
- Le categorie dei cataloghi sono coppie **macrocategoria + categoria**. La sola categoria non è una chiave valida: per esempio `Serie A` compare in più gruppi. La persistenza, i filtri e le comparazioni devono distinguere la coppia; le etichette UI possono mostrare la categoria sotto il gruppo. Valori storici con gruppo incerto non vanno assegnati arbitrariamente.
- `Calcio 8` resta una tipologia, ma non ha un gruppo di categorie in questa versione. Dove tipologia e categorie coesistono, `Calcio 8` non deve produrre categorie inventate né bloccare un campo facoltativo.
- «Categorie ricercate» appartiene solo agli annunci Giocatore e Staff sportivo. L'Arbitro perde «Categorie di interesse»; «Livello avversario cercato» della Squadra è un campo diverso. I due cataloghi categorie, generale e Staff, sono distinti.
- I profili con più località storiche mostrano nel nuovo selettore singolo la prima per ordine stabile di salvataggio. Le altre restano storiche fino a una modifica e un salvataggio espliciti della località. Il Torneo mantiene più regioni; l'Impianto usa una sede unica.
- Quando uno step cambia la forma del payload di pubblicazione, aggiornare insieme `publish-model`, validazione server, azioni/RPC e lettori. Gestire la compatibilità dei record e delle bozze esistenti; non lasciare un form che invia dati che il server rifiuta.

## Step 00 — Ricognizione e matrice dei dati

**Solo analisi.** Rilevare per ciascun sottoprofilo e sottotipo di annuncio: campo visibile, obbligatorietà, modello e default, validazione client/server/SQL, colonna o JSON persistito, anteprima, editor, dettagli, ricerca e test esistenti. Distinguere i sei tipi pubblicabili dai profili `professionisti-studi` e `creators` attualmente *coming soon*. Verificare lo schema effettivo prima di progettare migrazioni: le migrazioni nel repository non ricostruiscono necessariamente tutto lo schema iniziale. Se il database effettivo non è accessibile, indicare la fonte locale e la verifica rimasta aperta.

**Uscita:** aggiungere qui sotto una breve mappa dei rischi e dei dati storici presenti, senza cambiare applicazione o DB. Segnare quali regole di obbligatorietà esistenti vanno conservate e quali cambiano nei passi successivi. Non presumere che ogni vecchio campo sia ancora usato: alcune componenti/stores hanno nomi legacy.

### Risultato Step 00 — 26 settembre 2026

**Perimetro e fonti.** Ricognizione statica del percorso attivo: [form profilo](../../src/features/profilo/ProfileDetailsForm.tsx), [default profilo](../../src/features/profilo/profile-model.ts), [form annuncio](../../src/features/pubblica-annuncio/components/AnnouncementDetailsForm.tsx), [default e validazione client](../../src/features/pubblica-annuncio/publish-model.ts), [normalizzazione server dell'annuncio](../../src/features/pubblica-annuncio/server/validation.ts), [normalizzazione server del profilo](../../src/features/registrati/server/registration.ts), [RPC e controlli SQL](../../supabase/migrations/20260923222553_enforce_required_subprofile_fields.sql), [tipi DB generati](../../src/server/supabase.ts), [anteprima](../../src/features/pubblica-annuncio/announcement-preview.ts) e [lettura pubblica](../../src/features/annunci/server/queries.ts). `docs/campi-pubblicazione-per-profilo.md` è stata usata come checklist, non come fonte di verità. Le tabelle seguenti descrivono i **nuovi invii nel codice attuale**; «facoltativo» significa che il campo può restare vuoto, pur potendo avere controlli di formato quando valorizzato.

La UI permette **sei** profili pubblicabili e **nove** tipi di annuncio: Giocatore, quattro ricerche Squadra, Staff sportivo, Arbitro, Torneo/Evento e Campo/Impianto. `professionisti-studi` e `creators` sono nel modello e nei tipi DB, ma sono *coming soon*: non hanno un percorso di nuova pubblicazione. Il loro eventuale salvataggio da editor è limitato ai sottoprofili già esistenti.

#### Campi comuni, default e percorso dei dati

| Ambito | Situazione attuale | Validazione e persistenza | Step |
| --- | --- | --- | --- |
| Profilo | `sport_principale = "Calcio"`; località iniziali `[]`; social vuoti. La UI seleziona più regioni e, facoltativamente, più città per regione. | Almeno **una regione** per ogni sottoprofilo: `getProfileRequiredFieldErrors`, `parseProfileEditorPayload` e `private.assert_required_subprofile_fields_v1`. `localita_profilo` conserva righe `{regione, citta}`, con città nullable; i social sono in `link_social_profilo`. L'editor e la pubblicazione passano rispettivamente dalle RPC `save_owned_subprofile_with_social_links_v1` e `publish_announcement_v2` → core/v1. | 03; Torneo 12; Impianto 13 |
| Annuncio | Dettagli iniziali a `""` o `[]`, salvo `tipo_partecipazione = "squadra"`. Le zone sono precompilate dalle località del profilo entrando nello step annuncio e poi modificabili separatamente. | Per **tutti e nove**, almeno una regione e almeno email **o** telefono; formato dei contatti e dei link validato su client, server e SQL. `localita_annuncio` e `contatto_annuncio` sono tabelle separate; `annuncio` contiene tipo/stato/autore, mentre ogni dettaglio va nella propria tabella `annuncio_*`. | 03; Sponsor 09; Impianto 14 |
| Contenuti aggiuntivi | Link annuncio e immagine facoltativi; video highlights solo Giocatore. | Link HTTP(S); immagine PNG/JPEG/WebP fino a 5 MB. Link in `link_social_annuncio`, immagine in `media_annuncio`/Storage. La nuova pubblicazione richiede anche consensi e versione payload `3`. | 03 e step del sottotipo |
| Lettura | Anteprima e conferma usano `buildPublishPreview` → `announcementContent`; le pagine `/annunci` usano `announcementContentQuery` → `announcementContent`. | Card, dettagli, ricerca e filtri sono derivati dalle colonne lette e da `localita_annuncio`; i dettagli profilo leggono le tabelle `profilo_*` e `localita_profilo`. Non esiste nel percorso attivo un editor di annunci già pubblicati. | 01–16 |

Per i profili personali, `disponibilita` parte da `non-specificare` e nascita/cognome sono facoltativi. Le date parziali e gli altri valori compilati vengono normalizzati dal server. Il costo facoltativo richiede un importo valido se presente. I campi obbligatori in tabella sono quelli verificati sul salvataggio, non soltanto quelli marcati con asterisco nel form.

#### Matrice dei sottoprofili

In tutte le righe è obbligatoria almeno una **regione** del profilo; la città è oggi facoltativa. I campi omessi dalla colonna «obbligatori» sono elencati come facoltativi o default. `P` indica `getProfileRequiredFieldErrors` sul client e dopo la normalizzazione server; `SQL` indica `private.assert_required_subprofile_fields_v1` dopo il salvataggio della riga.

| Sottoprofilo → tabella | Obbligatori attuali oltre alla regione | Altri campi visibili e default rilevanti | Validazione; prossimo step |
| --- | --- | --- | --- |
| Giocatore → `profilo_giocatore` | `nome`, ≥1 `tipologie_sport`, ≥1 ruolo principale in `ruoli_sport` | `cognome`, giorno/mese/anno nascita, `disponibilita = non-specificare`, ruoli specifici, `categorie_ricercate = []`, altezza, peso, piede, presentazione, video highlights/richiesta caricamento, `storico_carriera = []` | P + SQL; 01, 02, 03, **04** |
| Squadra → `profilo_squadra` | `nome_societa`, una `tipologie_sport` | Categoria attuale singola facoltativa; presentazione. La sede pubblica deriva da `localita_profilo`. | P + SQL; 01, 02, 03, **05** |
| Staff sportivo → `profilo_staff_sportivo` | `nome`, ≥1 `figure_professionali` | Cognome, nascita, `disponibilita = non-specificare`, presentazione, `storico_esperienze = []` | P + SQL; 02, 03, **10** |
| Arbitro → `profilo_arbitro` | `nome` | Cognome, nascita, `disponibilita = non-specificare`, presentazione, `storico_esperienze = []` | P + SQL; **03** |
| Torneo/Evento → `profilo_torneo_evento` | `nome_organizzazione`, ≥1 `tipologie_sport` | `sede_principale = ""`, presentazione; regioni multiple ammesse | P + SQL; **12** |
| Campo/Impianto → `profilo_campi_impianti` | `nome_organizzazione`, `sede_principale`, ≥1 `tipologie_sport` | `orari = []` strutturati, `costo_partenza = null`, presentazione, servizi inclusi, informazioni aggiuntive | P + SQL; **13** |
| Professionisti e studi → `profilo_professionista_studente` | Nuova attivazione indisponibile (*coming soon*) | Nome, cognome, nascita, figure, specializzazioni, disponibilità, automunito, tipologie, presentazione, servizi, storico; default disponibilità `non-specificare` | Editor degli esistenti: regione obbligatoria; il codice **non** impone nome/figure. Fuori dai 16 step |
| Creators → `profilo_creator` | Nuova attivazione indisponibile (*coming soon*) | Nome creator, tipologia contenuti, presentazione | Editor degli esistenti: regione obbligatoria; il codice **non** impone nome. Fuori dai 16 step |

#### Matrice degli annunci

Tutti hanno i campi comuni sopra. `A` indica `getAnnouncementValidationErrors` sul client, ripetuto dal server dopo `normalizeDetail`; la RPC SQL ha i propri controlli di tipo, formato e obbligatorietà nel core storico. Le colonne di snapshot del profilo sono evidenziate dove pertinenti. La descrizione è `descrizione_aggiuntiva`.

| Annuncio → tabella | Obbligatori attuali oltre a zona/contatto | Altri campi visibili e default; dati copiati | Validazione; prossimo step |
| --- | --- | --- | --- |
| Giocatore → `annuncio_giocatore` | Descrizione | `categorie_ricercate = []`; la RPC copia tipologie e ruoli dal profilo, e salva le categorie dell'annuncio nella colonna omonima | A + SQL; 01, 02, **04**, 15 |
| Squadra / ricerca giocatore → `annuncio_squadra_cerca_giocatore` | ≥1 `ruoli_principali`, descrizione | Ruoli specifici, `annate_ricercate = []`, stagione; tipologie copiate dal profilo Squadra | A + SQL; 01, **06**, 15 |
| Squadra / ricerca staff → `annuncio_squadra_cerca_staff` | ≥1 `figure_ricercate` dal Catalogo B, `requisiti` | Settore, compenso mensile, stagione facoltativa e informazioni aggiuntive; `figura_ricercata` e `periodo_dal`/`periodo_al` restano leggibili nello storico | A + SQL; 02, **07**, 15 |
| Squadra / ricerca partite/amichevoli → `annuncio_squadra_cerca_partita` | ≥1 livello `categorie_avversario` | Periodo dal/al, orario dalle/alle (in coppia), trasferta, informazioni aggiuntive | A + SQL; 02, **08**, 15 |
| Squadra / ricerca sponsor → `annuncio_squadra_cerca_sponsor` | `categoria_settore`, `supporto_cercato`, `offerta_fornita` | Informazioni aggiuntive; **zona attualmente obbligatoria** dal controllo comune e filtro regione attivo | A + SQL; **09**, 15 |
| Staff sportivo → `annuncio_staff_sportivo` | ≥1 `tipologie_sport`, descrizione | `categorie_ricercate = []`, spostamenti; figure, disponibilità lavorativa ed esperienze sono snapshot del profilo | A + SQL; 02, **11**, 15 |
| Arbitro → `annuncio_arbitro` | ≥1 `tipologie_sport`, descrizione | `categorie_ricercate = []` ancora mostrate come «Categorie di interesse», automunito, spostamenti; disponibilità ed esperienze sono snapshot del profilo | A + SQL; **03**, 15 |
| Torneo/Evento → `annuncio_torneo_evento` | `nome_evento`, ≥1 `tipologie_sport`, descrizione | Iscrizione, annate da/a, numero squadre, costo, premi `lista_premi_trofei = []`; partecipazione iniziale `squadra` | A + SQL; **12**, 15 |
| Campo/Impianto → `annuncio_campo_impianto` | ≥1 `tipologie_sport`, **descrizione** | Orari liberi `orari = ""` (persistiti come JSON con `descrizione`), costo, servizi inclusi; nessun indirizzo strutturato | A + SQL; **14**, 15 |

**Mappa delle letture e dei rischi.** I nove sottotipi passano dallo stesso [form](../../src/features/pubblica-annuncio/components/AnnouncementDetailsForm.tsx), dall'[anteprima](../../src/features/pubblica-annuncio/announcement-preview.ts), dalla [query pubblica](../../src/features/annunci/server/queries.ts) e da [`announcementContent`](../../src/features/annunci/announcement-content.ts), che genera titolo, fatti, campi, testo di ricerca e dati dei filtri. I dettagli specifici sono in `src/features/annunci/components/details/`, le card in `src/features/annunci/components/cards/`; la directory profili e i dettagli profilo hanno query/presentazioni proprie. I componenti `RecapAnnunci/*`, `components/Annuncio*` e `state/Annuncio*.store.ts` mantengono nomi e campi legacy: non risultano chiamati dal percorso `PubblicaAnnuncio` → `AnnouncementDetailsForm` → `buildPublishPreview`, quindi non vanno usati come prova dell'invio attuale.

- **Categorie e valori storici.** Categorie e figure sono oggi stringhe; le opzioni filtro categorie appiattiscono i gruppi per nome. Le categorie omonime possono collidere: lo Step 02 deve introdurre la coppia gruppo/categoria senza reinterpretare valori ambigui. Gli snapshot e i record pregressi possono conservare denominazioni vecchie; gli Step 01–02, 04, 07–08 e 11 devono verificare lettura e conversioni certe.
- **Località e sede.** La città è facoltativa anche dove la checklist dice «Regione e città». Il profilo può avere molte località; l'annuncio ne usa una copia iniziale indipendente. Rimozione della zona Sponsor (09) e nuova sede/indirizzo Impianto (13–14) richiedono di adeguare insieme server, SQL, letture e filtro regione; non basta nascondere il campo nel form.
- **Obbligatorietà da conservare/cambiare.** Restano nome e requisiti base dei sei profili, almeno un contatto per annuncio, ruoli Squadra/Giocatore e altri campi obbligatori della matrice. Cambiano negli step indicati: regione profilo singola (03, eccetto Torneo), nuovi obblighi Giocatore (04), rimozione categoria Arbitro (03), supporto e zona Sponsor (09), sede unica Impianto (13–14) e descrizione Impianto facoltativa (14). `professionisti-studi` e `creators` non vanno conteggiati come annunci pubblicabili.
- **Test disponibili.** [`publish-field-validation.test.mjs`](../../tests/publish-field-validation.test.mjs) copre i nove tipi e validazioni client; [`publish-announcement-types-database.test.mjs`](../../tests/publish-announcement-types-database.test.mjs) e [`publish-announcement-reconciliation.test.mjs`](../../tests/publish-announcement-reconciliation.test.mjs) coprono RPC/snapshot se il runner DB è disponibile; [`announcement-details.test.mjs`](../../tests/announcement-details.test.mjs), [`announcement-cards.test.mjs`](../../tests/announcement-cards.test.mjs) e [`profile-details.test.mjs`](../../tests/profile-details.test.mjs) coprono lettura/presentazione. Non sono stati eseguiti in questo step di sola analisi.

**Limite della verifica DB e dei dati storici.** I tipi in `src/server/supabase.ts` e le migrazioni descrivono lo schema **locale dedotto**, non certificano quello remoto: le migrazioni del repository partono da uno schema iniziale già esistente e le più recenti modificano anche il corpo delle RPC. WebStorm non ha connessioni database configurate (elenco vuoto al 26/09/2026). Prima di qualunque migrazione, verificare sul database effettivo colonne, tipi, vincoli, funzioni e indici; interrogare con sole letture il numero di record per tipo e la distribuzione dei valori legacy (categorie/figure, più località, tipologie multiple, sede, orari, date). **Quantità e valori dei record storici: non verificati.**

## Step 01 — Tipologie di calcio e ruoli

Rinominare ovunque `Calcio a 11/8/7/5` in `Calcio 11/8/7/5` e il ruolo specifico `Centrale` in `Centrocampista Centrale`. Aggiornare costanti, alias di lettura, form, filtri, query, card, dettagli, testi statici e dati persistiti; includere anche il ruolo nei JSON dello storico, nelle ricerche Squadra e negli snapshot degli annunci. Evitare che la rinomina separi valori uguali tra profilo e annuncio.

**Uscita:** vecchi record e filtri continuano a funzionare; nuove selezioni salvano solo i nomi nuovi. Verificare test dei ruoli e almeno un annuncio con ruolo specifico già salvato.

### Risultato Step 01 — 26/09/2026

- Le nuove selezioni e i salvataggi usano `Calcio 11/8/7/5` e `Centrocampista Centrale`; letture e filtri accettano gli alias legacy.
- La migrazione incrementale converte i valori strutturati nei profili, negli annunci e nelle ricerche Squadra, preservando ordine e valori non riconosciuti. I testi liberi dello storico carriera restano invariati perché non sono ruoli strutturati.
- Verificati i test di migrazione, lettura e validazione. La migrazione è presente nel repository ma non è stata applicata al database remoto: in questa sessione non è disponibile una connessione DB.

## Step 02 — Categorie generali e figure professionali

Sostituire i gruppi attuali con il [catalogo generale](#catalogo-a--categorie-generali) e le opzioni delle figure con il [catalogo delle figure](#catalogo-b--figure-professionali). Ordinare in UI le divisioni dall'alto verso il basso e raggruppare le figure per ambito. Introdurre una rappresentazione univoca della coppia macrocategoria/categoria nei multiselect, nella futura «Categoria attuale», nei filtri e nei dati pubblici; adeguare i valori salvati solo quando il gruppo è certo. Verificare la ricerca per categorie omonime in gruppi diversi. La ricerca staff della Squadra passa dal testo libero alla selezione multipla nello Step 07; il catalogo Staff delle categorie dello Step 11 resta separato.

**Uscita:** opzioni esatte e senza collisioni; filtri e dettagli mostrano il gruppo corretto; professioni nuove utilizzabili in Staff, Squadra e negli altri profili pertinenti. Registrare i valori legacy non riconciliabili.

### Risultato Step 02 — 26/09/2026

- Le categorie del catalogo generale sono identificate dalla coppia `macrocategoria::categoria` negli array testuali esistenti. Form, filtri, ricerca, card e dettagli mostrano anche il gruppo; le categorie omonime restano distinte. La futura «Categoria attuale» può usare la stessa chiave. Le figure nuove sono raggruppate per ambito nella selezione multipla e nel selettore Squadra già esistente; il campo libero della ricerca staff Squadra sarà sostituito nello Step 07.
- La migrazione incrementale converte soltanto le categorie attribuibili con certezza ai vecchi gruppi e le due rinomine esatte delle figure (`Fisioterapia/Medicina sportiva`, `Commerciale/Business`). Restano testuali e leggibili, senza attribuzione inventata: `Serie A`, `Serie B`, `Promozione Femminile`, `Serie A C5`, `Serie B C5`, `Serie C C5`, `Calcio amatoriale`, le vecchie figure generiche (`Analisi`, `Coaching/Preparatore`, `Osservatore/Scouting`, `Esecutivo/Amministrativo`, `Manutenzione/Infrastruttura`, `HR`, `Educativo/Sociale`, `Media/Design`) e altri valori non catalogati. I vecchi URL di filtro con categorie non riconciliabili continuano a cercare il valore storico; queste voci non compaiono fra le nuove scelte. Quantità effettive dei record storici non verificate, perché manca una connessione al database remoto.
- Verificati 67 test mirati, inclusi filtri con nomi omonimi e migrazione PGlite ripetuta; controllo TypeScript ed ESLint completati, con un avviso ESLint preesistente in `AnnuncioSquadra.tsx`. `git diff --check` non segnala errori. La migrazione è nel repository ma non è stata applicata al database remoto.

## Step 03 — Località e testi comuni; Arbitro

Nei profili personali sostituire «Regioni di interesse» con un `FieldGroup` «In che zona vivi?» composto da **Regione obbligatoria, scelta singola**, e **Città/comune facoltativa**. Per Squadra e altre organizzazioni usare un titolo contestuale alla sede/attività. Applicare qui il gruppo standard dove presente, inclusi gli editor del profilo; rimandare Torneo e Impianto agli Step 12–14, che hanno regole specifiche.

Negli annunci usare «Zone di ricerca» per la località di ricerca, salvo lo sponsor Squadra e l'indirizzo Impianto. Rinominare «Contatti pubblici» in «Contatti pubblici per questo annuncio» e l'indicatore dell'Email in «consigliato», mantenendo l'obbligo di almeno un contatto. Rimuovere «Categorie di interesse» dall'annuncio Arbitro in form, payload, validazione, viste e filtri pertinenti; conservare leggibile il dato storico senza offrirlo in nuovi invii.

**Uscita:** il profilo salva una sola località nuova, gli annunci mantengono le proprie zone indipendenti, e un Arbitro si pubblica senza categorie. Verificare anche un profilo con più regioni pregresse.

### Risultato Step 03 — 26/09/2026

- Nei profili personali la regione si sceglie singolarmente ed è obbligatoria; città/comune è facoltativa. Le organizzazioni Squadra hanno il titolo relativo alla sede. Torneo e Impianto mantengono il proprio selettore multiplo fino agli step dedicati. Le query ordinano `localita_profilo` per `id`: il form mostra la prima località storica e conserva le altre fino alla modifica esplicita della zona.
- Gli annunci mantengono zone indipendenti da quelle del profilo. I testi comuni sono aggiornati nel form e nella matrice dei campi. La categoria Arbitro è esclusa dai nuovi payload e dalla validazione; il dato storico resta leggibile. L'RPC esistente accetta il campo assente e salva `[]`, quindi non serve una migrazione in questo step.
- Verificati 57 test mirati, inclusi profilo storico con più località, dettaglio Arbitro storico e pubblicazione Arbitro su PGlite; TypeScript, ESLint mirato e `git diff --check` superati. Database remoto non interrogato in questo step.

## Step 04 — Giocatore

Nel profilo sostituire «Categorie ricercate» con un solo dropdown «Categoria attuale», inizialmente «Non specificare» (assenza di valore). Non dedurre questa categoria dalle vecchie preferenze multiple. Aggiungere «Genere» obbligatorio (`Maschio`, `Femmina`), rendere obbligatorio soltanto **l'anno** della data di nascita e mostrare «(Anno obbligatorio)» con asterisco rosso soltanto nel campo Anno. Giorno e mese restano facoltativi, con verifica della data quando compilati.

Rendere obbligatoria la disponibilità, eliminare «Non specificare» dalle nuove opzioni e sostituire «Disponibile subito» con «Svincolato» anche nel valore persistito. Quando si sceglie «Svincolato», azzerare e disabilitare «Categoria attuale»; ripristinarne l'uso scegliendo un'altra disponibilità. Aggiungere «Nazionalità» facoltativa, singola e ricercabile, con bandiera a destra della scelta. Rinominare «Ambipiede» in «Ambidestro» nel piede principale. Nell'annuncio aggiungere accanto a «Categorie ricercate»: «Se non trovi la tua categoria specifica, scrivila nella descrizione dell’annuncio».

**Uscita:** nuovo Giocatore e modifica di uno storico funzionano; salvataggi senza Genere, Anno o Disponibilità sono rifiutati coerentemente, senza rendere illeggibili i vecchi profili. Verificare reset/disabilitazione della categoria e rendering di nazionalità, genere e piede nelle pagine pubbliche.

### Risultato Step 04 — 26/09/2026

- Il form condiviso fra pubblicazione ed editor usa «Categoria attuale» singola, genere e anno obbligatori, disponibilità obbligatoria con «Svincolato», nazionalità ricercabile con bandiera e «Ambidestro». «Svincolato» azzera e disabilita la categoria. Giorno e mese restano facoltativi, con le precedenti verifiche sulla data e sull'età minima. L'annuncio Giocatore mostra il suggerimento accanto alle categorie ricercate.
- La migrazione [`20260926180000_player_profile_fields.sql`](../../supabase/migrations/20260926180000_player_profile_fields.sql) aggiunge colonne distinte per categoria attuale, genere e nazionalità e aggiorna i valori certi di disponibilità e piede. `categorie_ricercate` resta conservato come dato storico, senza deduzioni per la nuova categoria. I writer SQL del profilo registrato e della pubblicazione aggiornano i nuovi campi nella stessa transazione. I profili storici incompleti restano leggibili; un loro successivo salvataggio richiede i nuovi campi obbligatori.
- Dettaglio e directory pubblici leggono i nuovi campi; il filtro disponibilità Giocatore mostra «Svincolato» e accetta gli URL legacy. Verificati 48 test mirati e 52 test di regressione collegati, inclusa esecuzione completa della migrazione e dei due writer su PGlite; TypeScript, ESLint mirato e `git diff --check` superati. La migrazione non è stata applicata al database remoto.

## Step 05 — Squadra: dati profilo

**Checkpoint 26/09/2026 — ricognizione completata.** La form profilo usa ancora tipologie multiple e sede testuale; registrazione e modifica normalizzano payload distinti in `registration.ts`, mentre i writer SQL passano dalle RPC core. Il dettaglio pubblico/ricerca passa da `profili/server/queries.ts`; anche la query annunci include la sede per le snapshot. Le tipologie legacy sono `text[]` e non sono disponibili conteggi remoti. In implementazione: mantenere intatto il dato legacy finché l’utente non sceglie una tipologia singola, introdurre `categoria_attuale`, eliminare la sede dalle nuove form e dalle viste Squadra. Restano da verificare writer di registrazione e pubblicazione, query, test e tipi DB.

Sostituire la «Tipologia calcio» multipla con un dropdown singolo obbligatorio. Aggiungere «Categoria attuale» singola e facoltativa, con «Non specificare» iniziale. Togliere «Sede principale»: la località del profilo dello Step 03 è il riferimento pubblico. Conservare storicamente più tipologie già salvate senza scegliere a caso una «principale»; la successiva modifica esplicita ne seleziona una. Aggiornare editor, validazioni, DB, dettagli, ricerca e card.

**Uscita:** una nuova Squadra salva una sola tipologia; i dati legacy restano consultabili e il profilo non mostra più una sede testuale obsoleta.

### Risultato Step 05 — 26/09/2026

- Il form registrazione/modifica Squadra richiede una sola tipologia e offre la categoria attuale facoltativa. Una riga legacy con più tipologie resta invariata e il selettore resta senza preselezione; l'utente deve compiere una scelta esplicita prima di salvare. La sede testuale è stata rimossa dal form e dalle viste profilo; la directory continua a mostrare le località del profilo.
- La migrazione [`20260926190000_team_profile_fields.sql`](../../supabase/migrations/20260926190000_team_profile_fields.sql) aggiunge `categoria_attuale` senza riscrivere tipologie o sedi storiche e aggiorna i due writer transazionali. Dettaglio, directory e riepilogo dell'autore usano la categoria corrente e la tipologia singola per i nuovi dati; le righe storiche continuano a mostrare tutte le tipologie salvate. Non è stata verificata una connessione al database remoto.
- Verificati 41 test mirati, inclusa la migrazione su PGlite con record storico a tipologie multiple e rifiuto del salvataggio multi-valore; TypeScript, lint mirato e `git diff --check` superati. La migrazione non è stata applicata al database remoto.

## Step 06 — Squadra: ricerca giocatori

**Checkpoint 26/09/2026 — ricognizione completata.** Il form attivo, il modello e il parser server usano `annate_ricercate: string[]`; il core SQL limita gli array a 32 voci. Le query e `announcementContent` leggono l’array storico, mentre la directory non ha ancora un filtro annata. Per rappresentare ogni intervallo ammesso dai dropdown senza perderne gli estremi, aggiungere due colonne nullable, lasciare intatto l’array storico e aggiornare il wrapper transazionale della pubblicazione. Restano da implementare form, validazioni, persistenza, letture/filtri, test e matrice.

**Checkpoint 26/09/2026 — implementazione completata, verifiche in corso.** Form e validazioni client/server usano Dal e Al; il wrapper SQL salva i due estremi in colonne nuove e l’array storico resta leggibile. Query, card, dettaglio, ricerca e filtro annata distinguono gli intervalli nuovi dalle selezioni legacy esatte. Migrazione e test PGlite, test del parser server, test della directory e matrice aggiornati; restano regressioni mirate, lint, TypeScript e controllo diff.

Rinominare l'opzione del sottotipo in «Ricerca giocatori». Nel form usare «Ruolo/i cercati» e sostituire l'array «Annate ricercate» con due dropdown «Dal» e «Al». «Qualsiasi» è la scelta iniziale di «Dal»: azzera e disabilita «Al». Scegliendo un'annata in «Dal», richiedere anche «Al» e convalidare che non preceda «Dal». Non trasformare automaticamente annate storiche non contigue in un intervallo che allargherebbe la ricerca. Togliere il titolo ridondante «Località dell’annuncio» e lasciare soltanto il gruppo «Zone di ricerca», coerente con lo Step 03.

**Uscita:** selezione, reset e persistenza dell'intervallo funzionano; card, dettagli e filtri mostrano correttamente anche le annate dei vecchi annunci.

### Risultato Step 06 — 26/09/2026

- Il sottotipo attivo si chiama «Ricerca giocatori». Il form usa «Ruolo/i cercati» e due dropdown «Dal»/«Al»: «Qualsiasi» è iniziale, azzera e disabilita «Al»; con un anno iniziale l'anno finale è obbligatorio e non può essere precedente. Il gruppo già denominato «Zone di ricerca» resta l'unico titolo della località dell'annuncio.
- La migrazione [`20260926205141_team_player_year_range.sql`](../../supabase/migrations/20260926205141_team_player_year_range.sql) aggiunge `annata_da` e `annata_a` nullable e aggiorna il wrapper della pubblicazione. L'array `annate_ricercate` resta per gli annunci storici, senza convertire selezioni non contigue. Nuove pubblicazioni salvano i due estremi e un array vuoto. Anteprima, conferma, card, dettagli, ricerca testuale e filtro per annata leggono entrambi i formati.
- Verificati 43 test mirati, inclusi parser server, RPC e migrazione PGlite, annate legacy non contigue e filtro nel mezzo di un intervallo. TypeScript, ESLint mirato e `git diff --check` superati. Il database remoto non è stato interrogato e la migrazione resta da applicare manualmente.

## Step 07 — Squadra: ricerca staff sportivi

Rinominare l'opzione in «Ricerca staff sportivi». Trasformare l'attuale «Figura ricercata» a testo libero in «Figure ricercate», selezione multipla obbligatoria dal Catalogo B: serve anche a distinguere una figura da due o più nelle card. Sostituire «Periodo dal/al» con il testo facoltativo «Stagione», adeguando modello, validazioni, persistenza, query, riepilogo e dettagli. Conservare per la lettura i testi liberi e le date storiche senza assegnare loro automaticamente figure o una stagione non certe.

**Uscita:** una o più figure si selezionano e persistono; la nuova pubblicazione non chiede date; uno storico con testo libero e date rimane leggibile.

### Checkpoint Step 07 — ricognizione (26/09/2026)

- Individuati il form attivo, le validazioni client/server, la RPC di pubblicazione, le query pubbliche, i dettagli e i filtri. I dati storici usano `figura_ricercata` testuale e `periodo_dal`/`periodo_al` date: resteranno intatti; nuove colonne affiancheranno questi campi.
- Implementati catalogo multiplo obbligatorio, stagione facoltativa, validazioni, migrazione incrementale, letture pubbliche e aggiornamento della matrice dei campi. Nuove pubblicazioni usano l'array; lo storico continua a usare testo e date originali.
- Superati 43 test mirati inclusi RPC/migrazione PGlite, filtro per la seconda figura e lettura storica; superati anche 3 test di regressione sulle migrazioni e sulla RPC precedente. TypeScript, ESLint mirato e `git diff --check` superati. Il database remoto non è stato interrogato e la migrazione resta da applicare manualmente.

### Risultato Step 07 — 26/09/2026

- L'opzione si chiama «Ricerca staff sportivi». Il form attivo usa «Figure ricercate», selezione multipla obbligatoria dal Catalogo B, e «Stagione» facoltativa al posto delle date. Modelli e validazioni client/server respingono nuove ricerche senza figure o con valori fuori catalogo.
- La migrazione [`20260926210517_team_staff_search_fields.sql`](../../supabase/migrations/20260926210517_team_staff_search_fields.sql) aggiunge l'array delle figure e la stagione alla tabella esistente. La RPC mantiene la prima figura nella colonna testuale richiesta dal writer precedente e salva l'elenco completo nel nuovo array. Le date storiche e i testi liberi rimangono invariati.
- Anteprima, conferma, card, dettagli, ricerca e filtro per figura leggono le nuove selezioni e i valori legacy. La card distingue una figura da più figure; i vecchi annunci conservano le date, mentre ai nuovi annunci non viene mostrato un periodo fittizio. Aggiornata anche la matrice dei campi.

## Step 08 — Squadra: ricerca partite/amichevoli

Rinominare l'opzione in «Ricerca partite/amichevoli» e «Categorie avversario» in «Livello avversario cercato». Mantenere il significato di selezione del livello, distinto dalle «Categorie ricercate» dei profili personali; aggiornare form, riepilogo, dettagli e filtri.

**Uscita:** pubblicazione e ricerca non mostrano più la vecchia etichetta, senza perdere i livelli salvati.

### Risultato Step 08 — 26/09/2026

- L'opzione della Squadra usa «Ricerca partite/amichevoli». Il campo di pubblicazione e il riepilogo parlano di «Livello avversario cercato»; card e dettagli distinguono i «Livelli cercati» dalle categorie dei profili.
- Il filtro della directory usa «Livello avversario» e «Tutti i livelli» per il sottotipo partite. Sono rimasti invariati `categorie_avversario`, il catalogo e i valori degli annunci già pubblicati; nessuna migrazione necessaria.
- Verificati 43 test mirati, TypeScript, ESLint mirato e `git diff --check`.

## Step 09 — Squadra: ricerca sponsor

Usare «Ricerca sponsor». Rinominare «Categoria / Settore» in «Settore», con placeholder «es. Tutta la società, Prima squadra, Settore Giovanile...». Rimuovere «Supporto cercato» dal nuovo form e dalla relativa obbligatorietà; rinominare «Cosa offre la società» in «Visibilità offerta». Nascondere per questo sottotipo il gruppo delle zone di ricerca: non inviare località fittizie per aggirare validazioni condivise. Adeguare persistenza, lettura e presentazione dei vecchi annunci.

**Uscita:** uno sponsor si pubblica senza supporto e senza zona; i campi legacy rimangono leggibili nei vecchi annunci.

### Checkpoint Step 09 — implementazione (26/09/2026)

- Form, validazioni e riepilogo ora richiedono Settore e Visibilità offerta, omettono Supporto cercato e nascondono le località; il payload invia `locations: []` per gli sponsor.
- La presentazione pubblica continua a mostrare Supporto cercato e località soltanto quando presenti nello storico. La migrazione condiziona validazione e persistenza SQL per consentire nuovi sponsor senza supporto e località.
- Superati 45 test mirati, inclusi pubblicazione SQL senza supporto/località e verifica che le righe legacy restino intatte. TypeScript, ESLint mirato e `git diff --check` superati. Il database remoto non è stato interrogato e la migrazione resta da applicare manualmente.

### Risultato Step 09 — 26/09/2026

- L'opzione si chiama «Ricerca sponsor». Il form richiede «Settore» e «Visibilità offerta», rimuove «Supporto cercato» e nasconde il gruppo località. Validazioni client e server consentono il sottotipo senza località e inviano `locations: []`.
- La migrazione [`20260926212640_team_sponsor_optional_location_and_support.sql`](../../supabase/migrations/20260926212640_team_sponsor_optional_location_and_support.sql) modifica la RPC affinché solo gli annunci sponsor possano omettere supporto e località; questi ultimi non vengono salvati. Gli altri tipi continuano a richiedere località e i campi supporto/località già salvati restano leggibili.
- Card, dettagli, riepilogo e annunci recenti mostrano i nuovi nomi; i valori storici «Supporto cercato» e le località storiche restano visibili quando presenti. Aggiornata la matrice dei campi.

## Step 10 — Staff sportivo: dati profilo

Aggiungere la checkbox «Disponibile anche da remoto» sopra «Presentazione». Separare lo «Storico esperienze» in **«Lista esperienze»**, basata sullo storico carriera del Giocatore ma con «Società» e «Ruolo/i svolti» (placeholder «Dirigenza, medico sportivo, media manager...»), e **«Qualifiche / Licenze»**, basata sul vecchio editor. Per ogni qualifica, togliere «Non specificare» dallo Stato, rendere lo Stato obbligatorio e rinominare «Conseguito» in «Esperienza conclusa»; disporre i radio in orizzontale da `sm` quando possibile. I vecchi elementi non classificabili dello storico confluiscono inizialmente fra le qualifiche, senza perdita di testo e senza attribuire uno stato sconosciuto.

**Uscita:** i due elenchi e la checkbox si salvano e si rileggono nel profilo, compaiono correttamente nei dettagli e nello snapshot dei nuovi annunci; uno stato mancante in una qualifica nuova blocca il salvataggio.

**Checkpoint (26/09/2026):** completato. Il profilo salva «Disponibile anche da remoto», «Lista esperienze» e «Qualifiche / Licenze»; una nuova qualifica richiede lo Stato. Le voci storiche rimangono nel JSON originale, sono mostrate tra le qualifiche precedenti anche quando non hanno la forma attuale e non ricevono uno stato inventato. La migrazione [`20260926220000_staff_profile_experiences.sql`](../../supabase/migrations/20260926220000_staff_profile_experiences.sql) aggiunge i campi al profilo e allo snapshot dell'annuncio, mantenendo le funzioni di salvataggio esistenti. Verificati 68 test mirati, TypeScript e ESLint. Applicare manualmente questa migrazione prima di usare i nuovi campi; le precedenti sono considerate già applicate.

## Step 11 — Staff sportivo: annuncio

Usare esclusivamente il [catalogo Staff](#catalogo-c--categorie-ricercate-dallo-staff) per «Categorie ricercate»; non cambiare con questo catalogo le categorie del Giocatore. Aggiungere «Da valutare» a «Disponibilità agli spostamenti». Rileggere e pubblicare coerentemente la lista esperienze e le qualifiche derivate dal profilo dello Step 10, senza creare due editor indipendenti nell'annuncio. Adeguare filtri e dettagli.

**Uscita:** categorie con lo stesso nome in gruppi diversi rimangono distinguibili, lo spostamento nuovo persiste e lo snapshot pubblicato corrisponde al profilo al momento dell'invio.

**Checkpoint (27/09/2026):** completato. «Categorie ricercate» usa soltanto le 40 opzioni del Catalogo C, con chiavi distinte per macrocategoria; il catalogo Giocatore resta separato. «Disponibilità agli spostamenti» include «Da valutare». Validazioni client/server, filtri, anteprima, dettagli e annunci pubblicati leggono le nuove scelte; le categorie storiche restano leggibili e filtrabili tramite URL senza essere proposte nel nuovo form. Lista esperienze, qualifiche e disponibilità da remoto continuano a derivare dal profilo e sono copiate nello snapshot durante la pubblicazione, senza editor duplicati nell'annuncio. La migrazione [`20260927002300_staff_announcement_catalog.sql`](../../supabase/migrations/20260927002300_staff_announcement_catalog.sql) applica il controllo del Catalogo C e degli spostamenti anche alla RPC pubblica. Verificati 56 test mirati, TypeScript, ESLint e `git diff --check` sui file modificati. Applicare manualmente la migrazione dello Step 11; le precedenti sono considerate già applicate.

## Step 12 — Torneo / Evento

**Checkpoint (27/09/2026):** completato. Nel profilo, `presentazione` mantiene la colonna esistente con nuova etichetta «Presentazione torneo»; il selettore di località multiplo per regioni e città si chiama «Zona di svolgimento manifestazione» e richiede almeno una regione. Nell'annuncio, la tipologia usa una selezione singola e validazioni client, server e RPC accettano una tipologia esatta del catalogo. I lettori continuano a mostrare eventuali liste multiple già salvate negli annunci storici. Premi: etichetta «Premio» e placeholder «Primo posto». Aggiornate anteprima/dettagli, documentazione dei campi e test di validazione. Verificati 71 test mirati, TypeScript, ESLint e `git diff --check` sui file interessati. La migrazione [`20260927010000_tournament_single_announcement_type.sql`](../../supabase/migrations/20260927010000_tournament_single_announcement_type.sql) aggiunge il controllo RPC; applicarla manualmente. La Supabase CLI non è disponibile nell'ambiente per una verifica locale del database.

Nel profilo usare «Presentazione torneo». Rinominare la località in «Zona di svolgimento manifestazione» e mantenere il selettore multiplo di regioni e città, con almeno una regione obbligatoria. Nell'annuncio rendere singola la «Tipologia calcio»; nei premi usare placeholder «Primo posto» per «Posto» ed etichetta «Premio» al posto di «Titolo premio». Aggiornare letture pubbliche e validazioni, lasciando leggibili gli annunci con più tipologie storiche.

**Uscita:** profilo con più regioni e annuncio con una sola tipologia funzionano; premi e dettagli mostrano i nomi nuovi.

## Step 13 — Campi e impianti: dati profilo

**Checkpoint completato (27/09/2026):** editor con una sola sede (Regione, Città/comune, Indirizzo facoltativo), etichette e placeholder aggiornati; costo, orari e servizi storici restano nel database e leggibili nei dettagli, ma non sono più modificabili dal nuovo editor. La migrazione `20260927020000_facility_profile_single_site.sql` aggiunge `indirizzo`, richiede una località completa nei salvataggi e nella pubblicazione e conserva `sede_principale` come testo storico. Aggiornati tipi, normalizzazione, ricerca, dettagli e matrice dei campi. Verificati TypeScript, ESLint e 53 test mirati. Migrazione non eseguita localmente: database e CLI Supabase non disponibili; l'utente la applica manualmente.

Rinominare «Nome organizzazione» in «Nome campo/struttura» e «Tipologia calcio» in «Tipologia campo». Sostituire «Sede principale» **e** il gruppo generico della località con un unico `FieldGroup` «Sede dell’impianto/struttura»: Regione e Città/comune obbligatorie, Indirizzo facoltativo. Regione e città alimentano ricerca e dettagli. Rimuovere dal nuovo editor «Costo di partenza», «Orari» e «Servizi inclusi». Usare i placeholder «Descrivi la tua organizzazione, gli obiettivi, le modalità operative...» e «Modalità di prenotazione, regolamenti...» nei rispettivi campi.

**Uscita:** una sede sola, salvata e cercabile; il vecchio testo libero della sede e gli altri campi rimossi restano storici senza essere analizzati o cancellati automaticamente. Un profilo storico privo di città resta leggibile e richiede la città al prossimo salvataggio.

## Step 14 — Campi e impianti: annuncio

Usare «Tipologia campo». Subito dopo questo campo, inserire il `FieldGroup` «Indirizzo dell’impianto/struttura» con Regione, Città/comune e Indirizzo **tutti obbligatori**, sostituendo le regioni di interesse dell'annuncio. Sostituire il testo «Disponibilità / orari» con il controllo strutturato a checkbox e orari già presente nel vecchio profilo; normalizzare minuti mancanti di un'ora valida a `00` prima della validazione e dell'invio (`20:--` → `20:00`), rifiutando ore invalide. Rinominare «Costo di partenza» in «Prezzo orario» con placeholder «A partire da...». Rendere «Descrizione» facoltativa e usare «Descrivi tipologia del terreno, dimensioni, presenza porte/attrezzatura...».

**Uscita:** invio con indirizzo incompleto viene rifiutato; orari strutturati, prezzo e indirizzo si rileggono in anteprima, dettagli e ricerca. Gli orari liberi dei vecchi annunci rimangono leggibili senza conversione automatica incerta.

**Checkpoint completato (27/09/2026):** il form annuncio usa una tipologia singola, indirizzo strutturato con Regione/Città/Indirizzo obbligatori, orari settimanali e Prezzo orario facoltativo; la descrizione è facoltativa. Validazione client/server e SQL rifiutano sede incompleta e orari invalidi; i minuti mancanti vengono normalizzati a `00`. Indirizzo e orari vengono salvati, mostrati in anteprima/dettagli e inclusi nella ricerca; i vecchi orari testuali restano leggibili. Aggiornati tipi e matrice dei campi. La migrazione dello Step 13 è stata corretta dopo l’errore `Facility required-fields insertion point not found`; entrambe le migrazioni sono state verificate con PGlite. TypeScript, ESLint e 43 test mirati superati. Da applicare manualmente prima la versione corretta `20260927020000_facility_profile_single_site.sql`, poi `20260927030000_facility_announcement_site_and_hours.sql`.

## Step 15 — Titoli delle card e tab dei dettagli

**Checkpoint completato (27/09/2026):** i titoli principali e il tab «Campi disponibili» erano già nel codice; ora l'etichetta «Ricerca staff sportivo» è uniforme nelle card e nei selettori. Verificati i nomi pubblici di Staff, Arbitro e Impianto in card, dettagli e anteprime recenti, il fallback per profili nascosti o nome assente, titoli Squadra con zero, una e più scelte, settore Sponsor separato e tab «Annunci» negli altri profili. Superati 72 test mirati, TypeScript, ESLint e controllo whitespace. Nessuna migrazione nello step.

In `/annunci`, usare come titolo il nominativo per Giocatore, Staff e Arbitro, il nome evento per Torneo e il nome della struttura per Impianto, quando presenti; altrimenti usare «RICERCA OPPORTUNITÀ». **Eccezioni Squadra:** ricerca giocatori con un solo ruolo effettivamente cercato → «RICERCA PORTIERE», «RICERCA DIFENSORE CENTRALE» e analoghi; con due o più → «RICERCA GIOCATORI». Per un solo ruolo principale con un solo specifico, usare lo specifico; contare due specifici come due ruoli. Ricerca staff con una figura → «RICERCA ALLENATORE» e analoghi; con due o più → «RICERCA STAFF SPORTIVO». Senza ruoli o figure leggibili in un annuncio storico, usare il rispettivo titolo generico plurale. Per partite e sponsor usare rispettivamente «RICERCA PARTITE/AMICHEVOLI» e «RICERCA SPONSOR», mostrando il Settore separatamente. Usare le denominazioni nuove anche negli altri testi delle card. Nei dettagli profilo dell'Impianto rinominare il tab «Annunci» in «Campi disponibili»; mantenere «Annunci» per gli altri sottoprofili salvo un'etichetta specifica chiaramente adatta.

**Uscita:** verificare card con zero, una e più scelte, nome mancante e dati storici. Titolo della card, link e dettaglio rappresentano lo stesso annuncio.

## Step 16 — Regressione e documentazione finale

**Checkpoint completato (27/09/2026):** confrontati matrice, obbligatorietà client/server, editor e lettori per tutti i sottoprofili pubblicabili, comprese le eccezioni Torneo, Sponsor e Impianto; verificati anche anteprima, ricerca, filtri, card e dettagli con i test esistenti. Eliminata la riga duplicata della località Impianto che dichiarava erroneamente la città facoltativa; corretti i messaggi client «tipologia calcio»/«tipologia campo» di Torneo e Impianto. Un profilo registrato poteva pubblicare senza modifica aggirando in SQL i nuovi campi obbligatori Giocatore e la tipologia singola Squadra: la migrazione incrementale [`20260927040000_enforce_current_player_team_profile_fields.sql`](../../supabase/migrations/20260927040000_enforce_current_player_team_profile_fields.sql) completa il controllo sulla riga persistita, senza aggiornare i dati storici. Le etichette «Costo di partenza» nei dettagli del profilo Impianto descrivono dati storici; i componenti `RecapAnnuncio*` non sono collegati al flusso attuale. Superati 164 test, controllo TypeScript, ESLint mirato e `git diff --check`. Le verifiche SQL sono avvenute in PGlite, anche per record storici; non è stata verificata l'istanza Supabase remota perché non è configurata una connessione database. Applicare manualmente la nuova migrazione prima di pubblicare da profili Giocatore o Squadra già registrati.

**Riparazione successiva (27/09/2026):** il database usato dall'app restituisce `42703` su `annuncio_squadra_cerca_giocatore.annata_da`. La verifica remota ha confermato che mancano l'helper dello Step 06 e le sue colonne, mentre il wrapper della pubblicazione chiama già l'helper e le colonne degli Step 07 e 14 sono presenti. La migrazione incrementale [`20260927050000_repair_team_player_year_range.sql`](../../supabase/migrations/20260927050000_repair_team_player_year_range.sql) ripristina solo le colonne, il vincolo e l'helper; conserva il wrapper più recente e i valori storici. Superati 32 test pertinenti, inclusa l'applicazione ripetuta della riparazione su PGlite. **Applicare manualmente questa migrazione; non eseguire per intero la vecchia migrazione dello Step 06 su questo database.** Dopo l'applicazione verificare `/` e `/annunci`: non devono più comparire errori `42703`. L'istanza remota non è stata modificata da Codex.

Controllare tutti i sottoprofili pubblicabili e gli editor esistenti: nuovo profilo, modifica, annuncio, anteprima, invio, ricerca, filtri, card, dettaglio e testi statici. Ricontrollare ogni campo obbligatorio contro il requisito e contro la validazione effettiva, incluse le eccezioni Torneo, Sponsor e Impianto. Cercare vecchie etichette e valori residui, distinguendo alias intenzionali per dati storici da UI obsolete. Completare [la matrice dei campi](../campi-pubblicazione-per-profilo.md).

Eseguire i test pertinenti già presenti in `tests/` (in particolare pubblicazione, ruoli, annunci, card e dettagli), controllo TypeScript e lint mirato. Per ogni migrazione, verificare su database disponibile inserimento, rilettura e un record storico rappresentativo; annotare esplicitamente ciò che non è stato verificabile. **Uscita:** nessuna discrepanza nota fra form, server, DB e viste pubbliche; tabella di stato aggiornata.

## Catalogo A — Categorie generali

Questi sono i valori esatti; l'ordine visivo può privilegiare divisioni maggiori e poi categorie giovanili, senza cambiare nomi né eliminare opzioni.

| Macrocategoria | Categorie specifiche |
| --- | --- |
| Calcio 11 (Maschile) | Under 15 Nazionali; Under 15 Regionali; Under 15 Provinciali; Under 16 Nazionali; Under 16 Regionali; Under 16 Provinciali; Under 17 Nazionali; Under 17 Regionali; Under 17 Provinciali; Under 18 Nazionale; Juniores Nazionali; Juniores Regionali; Juniores Provinciali; Primavera 1; Primavera 2; Primavera 3; Primavera 4; Serie C; Serie D; Eccellenza; Promozione; Prima Categoria; Seconda Categoria; Terza Categoria |
| Calcio 7 (Maschile) | Under 15; Allievi; Under 16; Under 17; Juniores; Under 19; Top Junior; Open Eccellenza; Open Serie A; Open Serie B; Open Serie C1; Open Serie C2; Open A; Open B; Open C; Open Divisione Unica |
| Calcio 5 (Maschile) | Under 15; Under 17; Under 19 Regionali; Under 19 Nazionali; Under 21; Serie A; Serie A2 Élite; Serie A2; Serie B; Serie C1; Serie C2; Serie D |
| Calcio 11 (Femminile) | Under 15 Femminile; Under 17 Femminile; Campionato Primavera 1; Campionato Primavera 2; Eccellenza Femminile; Serie C Femminile; Serie B Femminile; Serie A Femminile |
| Calcio 7 (Femminile) | Under 15; Under 17; Under 19; Open Eccellenza; Open Serie A; Open Serie B |
| Calcio 5 (Femminile) | Under 15; Under 17; Under 19; Serie D; Serie C; Serie B; Serie A |

## Catalogo B — Figure professionali

Allenatore; Allenatore in seconda; Preparatore atletico; Preparatore portieri; Collaboratore tecnico; Preparatore calci piazzati; Match Analyst; Direttore Sportivo; Osservatore; Capo-Osservatore; Segretario; Magazziniere; Autista; Dirigente Accompagnatore; Fisioterapia / Medicina sportiva; Commerciale / Business; Psicologo; Social Media Manager; Addetto Stampa / Comunicazione; Grafico; Tuttofare; Altro.

## Catalogo C — Categorie ricercate dallo Staff

| Macrocategoria | Categorie specifiche |
| --- | --- |
| Calcio 11 (Maschile) | Settore Giovanile; Serie C; Serie D; Eccellenza; Promozione; Prima Categoria; Seconda Categoria; Terza Categoria |
| Calcio 7 (Maschile) | Settore Giovanile C7; Open Eccellenza; Open Serie A; Open Serie B; Open Serie C1; Open Serie C2; Open A; Open B; Open C; Open Divisione Unica |
| Calcio 5 (Maschile) | Settore Giovanile C5; Serie A; Serie A2 Élite; Serie A2; Serie B; Serie C1; Serie C2; Serie D |
| Calcio 11 (Femminile) | Settore Giovanile C11 Femminile; Eccellenza Femminile; Serie C Femminile; Serie B Femminile; Serie A Femminile |
| Calcio 7 (Femminile) | Settore Giovanile C7 Femminile; Open Eccellenza; Open Serie A; Open Serie B |
| Calcio 5 (Femminile) | Settore Giovanile C5 Femminile; Serie D; Serie C; Serie B; Serie A |



