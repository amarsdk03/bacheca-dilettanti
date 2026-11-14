# Analisi del campione regionale WhatsApp e allineamento pubblicazione

Il file fornito contiene **49 record e 48 testi distinti**, non 50. Le righe 9 e 32 ripetono lo stesso testo su canali differenti. Le fixture hanno recapiti sintetici e conservano le varianti di formato; non contengono link ai messaggi originali.

## Riscontro prima dell’intervento

La verifica locale sul CSV originale ha rilevato 457 segnalazioni, 288 elementi non mappati e quattro analisi bloccate (9, 32, 33, 45). I nomi venivano estratti solo dalle etichette Società. Nei 15 annunci giocatore risultava una sola selezione generica Qualsiasi e nessuna categoria specifica. I 16 test esistenti passavano senza coprire queste varianti.

## Comportamento verificato sul corpus

Sono riconosciute tutte le **49 tipologie**, inclusi arbitro e portieri femminili. Vengono estratti 12 nominativi espliciti (persone o società), oltre al nome del torneo. 9 dei 15 annunci giocatore hanno almeno una categoria riconosciuta; i residui ambigui restano da revisionare. Questi numeri non misurano la pubblicabilità: tutti i profili richiedono una conferma separata della sede/residenza e restano applicate le regole ordinarie dei campi obbligatori.

La diminuzione delle segnalazioni non è una misura di accuratezza: i campi mancanti sono ora gestiti dalla validazione condivisa, mentre il parser segnala le eccezioni effettive. I test usano aspettative parziali scritte manualmente per ogni riga, non snapshot generati dall’implementazione.

## Esame riga per riga

| Riga CSV | Regione | Tipologia | Estrazione e revisione |
| --- | --- | --- | --- |
| 1 | Emilia-Romagna | Giocatore cerca squadra | Zona territoriale; anno incompleto. Altezza e piede espliciti estratti. |
| 2 | Emilia-Romagna | Giocatore cerca squadra | Bronze/Silver CSI non equivale a una categoria univoca del catalogo a 11. |
| 3 | Emilia-Romagna | Giocatore cerca squadra | Due aree di ricerca; altezza in metri normalizzata; U19 senza ente/livello. |
| 4 | Emilia-Romagna | Staff cerca opportunità | Qualifica ed esperienza narrative; categoria con vincoli e livelli multipli. |
| 5 | Emilia-Romagna | Squadra cerca giocatori | Provincia di Ferrara, riferimento hashtag Rovigo; Instagram non trasformato in email o autore. |
| 6 | Emilia-Romagna | Squadra / società cerca staff | Istruzioni di candidatura WhatsApp e categoria/gruppo distinti dalla Prima Squadra. |
| 7 | Emilia-Romagna | Squadra cerca giocatori | Annate qualsiasi; periodo Subito conservato come testo; categoria UISP da validare nel profilo. |
| 8 | Emilia-Romagna | Giocatore cerca squadra | Esterno senza lato o posizione; categoria CSI e abbreviazioni parziali. |
| 9 | Emilia-Romagna | Staff cerca opportunità | Quattro regioni esplicite conservate; selezione e sede profilo separate. |
| 10 | Emilia-Romagna | Giocatore cerca squadra | Mediano riconosciuto; categorie parziali e carriera estera da revisionare. |
| 11 | Emilia-Romagna | Giocatore cerca squadra | Nome sulla riga con maglietta; ruolo composto e categoria aperta verso l’alto. |
| 12 | Emilia-Romagna | Staff cerca opportunità | Allenatore riconosciuto nella figura descrittiva; qualifiche e categorie da completare. |
| 13 | Lombardia | Squadra / società cerca staff | Esordienti è il gruppo ricercato; assenza rimborso conservata nel testo. |
| 14 | Lombardia | Giocatore cerca squadra | Due sport e ruolo principale riconosciuti; clausola altri ruoli da revisionare. |
| 15 | Lombardia | Staff cerca opportunità | Seconda/Terza categoria staff riconosciute; zona provinciale da precisare. |
| 16 | Lombardia | Staff cerca opportunità | Preparatore atletico riconosciuto; massoterapista, studi e tirocini da validare. |
| 17 | Lombardia | Giocatore cerca squadra | Terzino senza lato resta ambiguo; esterno destro riconosciuto; contatto su due righe. |
| 18 | Lombardia | Squadra / società cerca staff | Primi calci e impegno settimanale conservati; requisito assente resta un errore ordinario se obbligatorio. |
| 19 | Lombardia | Staff cerca opportunità | Nome esplicito nella presentazione; disponibilità serale mantenuta nel testo. |
| 20 | Lombardia | Squadra cerca giocatori | Intervallo 2009–2010 riconosciuto; zona Nord-Ovest da revisionare. |
| 21 | Lombardia | Cercasi amichevole | Data 12/10 senza anno e trasferta descrittiva; nome del referente da validare. |
| 22 | Lombardia | Staff cerca opportunità | Allenatore riconosciuto; più qualifiche e categoria aperta richiedono revisione. |
| 23 | Lombardia | Società cerca sponsor | Link dell’intermediario conservato privatamente: nessun telefono o autore dedotto dal percorso wa.me. |
| 24 | Lombardia | Staff cerca opportunità | Under 17 e Prima squadra non specificano una singola voce del catalogo. |
| 25 | Lombardia | Giocatore cerca squadra | Recapito del padre riconosciuto; categoria attuale non confusa con le categorie ricercate. |
| 26 | Lombardia | Giocatore cerca squadra | Nome e bandiera IT riconosciuti; Dx/Sx richiede completamento della seconda indicazione. |
| 27 | Puglia | Torneo / evento calcistico | Nome torneo dalla riga libera; 300 euro per squadra riconosciuti; premi e iscrizione da completare. |
| 28 | Lombardia | Giocatore cerca squadra | Punta centrale riconosciuta; Juniores/U21/CSI restano scelte da precisare. |
| 29 | Lombardia | Giocatore cerca squadra | Nome etichettato; zone territoriali multiple e storia agonistica da revisionare. |
| 30 | Lombardia | Squadra cerca giocatori | Ruoli con congiunzione; elenco consecutivo 2006–2010 convertito senza ampliare le annate. |
| 31 | Lombardia | Squadra cerca giocatori | Portiere e difensore centrale riconosciuti; requisito di esperienza dell’attaccante da revisionare. |
| 32 | Lombardia | Staff cerca opportunità | Stesso testo della riga 9, pubblicato in un altro canale regionale: non cancellato dal corpus. |
| 33 | Toscana | Arbitro disponibile | Tipologia Arbitro riconosciuta; tre sport e spostamento espliciti; licenza da completare. |
| 34 | Lombardia | Squadra cerca giocatori | Località con sigla provinciale mantenuta per revisione; nessuna geocodifica remota. |
| 35 | Lombardia | Giocatore cerca squadra | Bandiera IT e altezza 174 cm; ruoli diversi per sport e carriera da validare. |
| 36 | Lombardia | Staff cerca opportunità | Ricerca regionale distinta dalla residenza; due qualifiche e carriera multilinea conservate. |
| 37 | Lombardia | Squadra cerca giocatori | Calcio a 8 e due ruoli; categoria del gruppo distinta dalla Prima Squadra. |
| 38 | Lombardia | Squadra cerca giocatori | Ruoli parziali; U21 non trasformato in anni di nascita sulla base della data corrente. |
| 39 | Lazio | Campo sportivo disponibile per affitto | Calcio 11 separato dalle caratteristiche del terreno; disponibilità libera conservata; costo non inventato. |
| 40 | Lombardia | Squadra cerca giocatori | Tutti i ruoli selezionati; condizioni in quota/fuori quota non ridotte a un intervallo generico. |
| 41 | Lombardia | Squadra / società cerca staff | Preparatore portieri riconosciuto; giorni e impegno conservati come testo. |
| 42 | Lazio | Giocatore cerca squadra | Nome e difensore centrale riconosciuti; terzino senza lato e carriera da completare. |
| 43 | Lazio | Squadra cerca giocatori | Tutti i ruoli; U15 non convertito automaticamente in annate. |
| 44 | Lazio | Staff cerca opportunità | Nome dalla presentazione, trasferta in auto e categoria estratti; esperienze narrative da completare. |
| 45 | Lazio | Squadra cerca giocatori | Intestazione portieri femminili riconosciuta; calcio femminile conservato nel testo; età 11–17 non convertita in annate. |
| 46 | Lazio | Squadra cerca giocatori | Nome società senza etichetta, plurali dei ruoli, annata singola e ruolo del referente. |
| 47 | Lazio | Squadra cerca giocatori | Nome ASD senza etichetta; 2007–2013; tre contatti conservati come candidati, nessun primo numero scelto. |
| 48 | Lazio | Giocatore cerca squadra | Classe 83 non trasformata in 1983; terzino senza lato richiede revisione. |
| 49 | Lazio | Squadra cerca giocatori | Calcio 8 e portiere; impegno fisso o saltuario conservato nel testo. |

## Form e riepilogo

I componenti attivi del Web erano AnnouncementDetailsForm e ProfileDetailsForm, diversi dai vecchi componenti AnnuncioGiocatore/AnnuncioStaff ancora presenti nel repository. Sono ora nel pacchetto @bacheca/announcements, con wrapper Web e utilizzo diretto Admin. I controlli condividono cataloghi, input, filtri dipendenti, obbligatorietà, limiti, importi, data di nascita, qualifiche, esperienze, sedi e orari. La preview usava già lo stesso motore: il nuovo stato canonico elimina le conversioni divergenti durante la compilazione. Le sole conversioni precedenti rimangono per importazione e compatibilità delle bozze/manuali v1.

## Contratto e sicurezza dell’invio

Le nuove compilazioni inviano CreationInput v2 con stato canonico e decisioni di revisione. Il server ricalcola estrazione e decisioni dopo l’autenticazione e prima di upload/creazione. Le decisioni sono legate a parser, fonte, attribuzione e valori pertinenti; una conferma non sostituisce la validazione. Il rilevatore di variazioni non è una firma né un meccanismo di autenticazione. Il testo sorgente resta nella provenienza privata esistente. Non sono previste migrazioni SQL.

Il vecchio percorso /crea-annuncio rimanda permanentemente a /annunci/crea-annuncio. La pubblicazione passa esclusivamente dal pulsante finale type=button con blocco sincrono; il submit implicito del form è inerte. Ricevute ed esiti incerti impediscono ulteriori scritture e restano recuperabili.

## Vincoli operativi

Verifiche esclusivamente su fixture, PostgreSQL sintetico e servizi/browser locali; nessun uso di credenziali remote, build di produzione o test sulle piattaforme distribuite. La conferma utente dei controlli live e del redeployment del 28 ottobre 2026 resta distinta dai test dell’agente. Trash, retention/Cron e prova completa di ripristino restano operazioni manuali separate.

## Ripetere le verifiche

- `node --test tests/admin-whatsapp-corpus.test.mjs tests/admin-whatsapp-workflow.test.mjs tests/admin-announcement-creation-server.test.mjs`
- `npm run test:browser:admin:creation` avvia una copia isolata dell’Admin, fixture HTTP su loopback e un profilo Chrome dedicato; non legge i file `.env` delle applicazioni. Gli esiti e gli screenshot vengono salvati sotto `.local/dashboard-browser/run-*/evidence`.

## Esiti delle verifiche eseguite

- 164 test mirati passati: corpus/importazione, creazione server, ripristino bozze, endpoint di ricerca autenticati, compatibilità dei form pubblici e preparazione del browser. Dopo l’ultimo affinamento dei conflitti di attribuzione, sono stati rieseguiti e superati i 74 test di importazione/creazione.
- 10 scenari browser locali passati, con una sola creazione effettiva sulla fixture: redirect; Invio nei campi; Continua verso il riepilogo; submit implicito; approvazione diretta; navigazione tab; doppio clic esplicito; recupero ricevuta; analisi WhatsApp; blocco importazione non revisionata. Evidenza: .local/dashboard-browser/run-rFm25S/evidence/results.json.
- Typecheck Web e Admin e lint dei moduli modificati superati. Nessuna build di produzione o verifica remota eseguita.
- Il passaggio della suite generale ha registrato 1555 test passati su 1579 e 24 fallimenti. Due fallimenti della fixture di copia browser sono stati corretti e verificati nel successivo passaggio mirato. Restano 22 fallimenti in audit UI, autenticazione/dashboard e relativi mock Motion/Zustand, icone Home, fixture di moderazione, link della conferma pubblicazione e mock della pulizia immagini nelle interazioni: la suite generale non è dichiarata verde. Il log del passaggio complessivo è .local/full-verification.log.

Le ricerche pubbliche di squadre e tornei riusano la proiezione del Web con un client server dedicato, creato soltanto dopo la verifica Admin. Questo rispetta le policy owner-only dei profili senza modificarle; la chiave server non passa ai controlli browser. I 10 test degli endpoint sono stati rieseguiti dopo questo adeguamento.
