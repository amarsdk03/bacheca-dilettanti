# Campi del flusso di pubblicazione per profilo

Nel profilo Squadra la tipologia di calcio è singola e obbligatoria; la Categoria attuale Prima Squadra è singola e obbligatoria, con un catalogo dedicato di 68 opzioni. La località del profilo è il riferimento pubblico e non viene duplicata in un campo sede testuale.

Gli importi dell’annuncio mostrano il simbolo € e hanno incrementi di 5 €, mantenendo l’inserimento manuale dei centesimi. Il cambio di profilo o sottotipo Squadra e il rientro nella pagina scartano tutti i dati non salvati; il passaggio tra gli step della stessa compilazione li conserva.

Le tabelle descrivono i dati raccolti in `/pubblica-annuncio`. I campi Premium sono salvati subito, ma diventano pubblici soltanto con un piano a pagamento. I contatti del singolo annuncio sono obbligatori per gli utenti non registrati e facoltativi per quelli registrati; per questi ultimi, l’email dell’account viene proposta come valore iniziale. I recapiti dei profili Servizi e consulenze e Creators sono separati da quelli dell’annuncio. Le località dell'annuncio sono indipendenti da quelle del profilo. Nei profili personali, la prima località storica appare nel selettore singolo; le altre restano salvate fino a una modifica esplicita della località. Tutti i profili possono inoltre indicare un sito web, mostrato per primo e a larghezza intera nell’editor dei collegamenti social.

## Giocatore

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome | Testo | Sì |
| Profilo | Cognome | Testo | No |
| Profilo | Data di nascita | Anno obbligatorio; giorno e mese facoltativi | Sì, anno |
| Profilo | Genere | Uomo o Donna | Sì |
| Profilo | Nazionalità | Paese singolo ricercabile con bandiera SVG, se disponibile | No |
| Profilo | Tipologie di calcio | Selezione multipla | Sì |
| Profilo | Disponibilità | Svincolato o sotto contratto | Sì |
| Profilo | Ruoli principali | Selezione multipla | Sì |
| Profilo | Ruoli specifici | Selezione multipla raggruppata per ruolo principale | No |
| Profilo | Categoria attuale | Selezione singola raggruppata per macrocategoria, disabilitata se Svincolato | No |
| Profilo | Altezza, peso, piede | Testi e selezione | No |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | Storico carriera | Elenco di esperienze | No |
| Profilo | Video highlights | URL del profilo Giocatore | No |
| Profilo | In che zona vivi? | Regione singola obbligatoria; città/comune facoltativa | Sì, regione |
| Annuncio | Categorie ricercate | Selezione multipla, incluso “Qualsiasi” come scelta esclusiva | No |
| Annuncio | Informazioni aggiuntive | Testo lungo | Sì |
| Annuncio | Link annuncio | URL HTTP/HTTPS Premium | No |
| Annuncio | Immagine | PNG, JPEG o WebP, massimo 5 MB, Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Squadra

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome società | Testo | Sì |
| Profilo | Tipologia di calcio | Dropdown singolo | Sì |
| Profilo | Categoria attuale Prima Squadra | Selezione singola raggruppata, catalogo Prima Squadra | Sì |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | Dove ha sede la società? | Regione singola obbligatoria; città/comune facoltativa, riferimento pubblico della località | Sì, regione |
| Tipo annuncio | Ricerca | Ricerca giocatori, staff, partita amichevole o sponsor | Sì |
| Ricerca giocatori | Gruppo squadra | Testo libero, massimo 160 caratteri | No |
| Ricerca giocatori | Ruolo/i cercati | Selezione multipla | Sì |
| Ricerca giocatori | Ruoli specifici | Selezione multipla raggruppata per ruolo principale | No |
| Ricerca giocatori | Annate Dal / Al | Due dropdown: Dal parte da Qualsiasi; Al è obbligatorio se Dal è valorizzato e non può precederlo | No, se Dal è Qualsiasi |
| Ricerca giocatori | Stagione | Testo | No |
| Ricerca giocatori | Informazioni aggiuntive | Testo lungo | Sì |
| Ricerca staff sportivo | Figure ricercate | Selezione multipla dal catalogo professionale | Sì, almeno una |
| Ricerca staff sportivo | Gruppo squadra e compenso mensile | Testo e importo in €, incrementi di 5; centesimi ammessi | No |
| Ricerca staff sportivo | Stagione | Testo | No |
| Ricerca staff sportivo | Requisiti | Testo lungo | Sì |
| Ricerca staff sportivo | Informazioni aggiuntive | Testo lungo | No |
| Ricerca partite/amichevoli | Gruppo squadra | Testo libero, massimo 160 caratteri | No |
| Ricerca partite/amichevoli | Categoria avversario cercata | Testo libero, massimo 160 caratteri | Sì |
| Ricerca partite/amichevoli | Periodo, orario e trasferta | Date, ore e selezione | No |
| Ricerca partite/amichevoli | Informazioni aggiuntive | Testo lungo | No |
| Ricerca sponsor | Settore | Testo (es. tutta la società, prima squadra, settore giovanile) | Sì |
| Ricerca sponsor | Visibilità offerta | Testo lungo | Sì |
| Ricerca sponsor | Informazioni aggiuntive | Testo lungo | No |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca / Zona dello sponsor | Regione obbligatoria; città/comune facoltativa; non previste per Ricerca sponsor | Sì, regione, salvo Ricerca sponsor |

## Staff sportivo

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome | Testo | Sì |
| Profilo | Cognome e data di nascita | Testo e data (1900–anno corrente) | No |
| Profilo | Figura professionale | Selezione multipla | Sì |
| Profilo | Disponibilità, da remoto e presentazione | Selezione, checkbox e testo lungo | No |
| Profilo | Lista esperienze | Società, ruolo/i svolti e stagioni | No |
| Profilo | Qualifica / patentino / licenza | Elenco; ente / società / organizzazione e Stato, con valore “Conseguito” | No, ma Stato sì se aggiunta una voce |
| Profilo | Qualifiche / Licenze precedenti | Voci storiche leggibili, senza stato attribuito automaticamente | No |
| Profilo | In che zona vivi? | Regione singola obbligatoria; città/comune facoltativa | Sì, regione |
| Annuncio | Tipologie di calcio | Selezione multipla | Sì |
| Annuncio | Categoria/Settore cercato | Selezione multipla dal Catalogo Staff: selezione generale e calcio a 11, 8, 7, 5 maschile/femminile; “Qualsiasi” generale esclusiva | No |
| Annuncio | Disponibilità agli spostamenti | Sì, No o Da valutare | No |
| Annuncio | Lista esperienze e Qualifiche / Licenze | Snapshot dei dati del profilo al momento della pubblicazione, senza editor separati | No |
| Annuncio | Informazioni aggiuntive | Testo lungo | Sì |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Servizi e consulenze

Questa tipologia richiede un account registrato e l’abilitazione dell’admin.

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nominativo / Ragione sociale | Testo unico obbligatorio | Sì |
| Profilo | Tipo di azienda / professione | Testo libero | No |
| Profilo | Sede Azienda / Professionista | Testo libero | No |
| Profilo | Contatto email e contatto telefonico | Recapiti dedicati al profilo, visibili agli utenti autenticati | Sì, almeno uno |
| Profilo | Presentazione e servizi | Testi lunghi | No |
| Profilo | Tipologie di calcio | Selezione multipla | No |
| Profilo | Disponibilità | Selezione | No |
| Profilo | Aree di interesse per la tua attività | Regioni multiple modificabili; città/comuni facoltativi | Sì, almeno una regione |
| Annuncio | Contenuto | Testo libero lungo, senza placeholder; campo tecnico `presentazione_servizi` | Sì |
| Annuncio | Promozione/offerta per la Community | Testo libero lungo, senza placeholder; campo tecnico `descrizione_aggiuntiva` | No |
| Annuncio | Zone di ricerca | Solo un sottoinsieme delle regioni del profilo; eventuali modifiche profilo vengono salvate insieme all’annuncio | Sì, almeno una regione |

La scheda pubblica mostra la sezione «Contenuti / promozioni». I vecchi campi personali non sono più raccolti o visualizzati.

## Arbitro

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome | Testo | Sì |
| Profilo | Cognome e data di nascita | Testo e data (1900–anno corrente) | No |
| Profilo | Disponibilità e presentazione | Disponibile subito o non specificata; testo lungo | No |
| Profilo | Lista esperienze | Elenco di esperienze | No |
| Profilo | Qualifiche / licenze | Elenco con ente / società / organizzazione testuale e stato | No, ma Stato sì se aggiunta una voce |
| Profilo | In che zona vivi? | Regione singola obbligatoria; città/comune facoltativa | Sì, regione |
| Annuncio | Tipologie di calcio | Selezione multipla | Sì |
| Annuncio | Automobile e spostamenti | Selezioni | No |
| Annuncio | Informazioni aggiuntive | Testo lungo | Sì |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Creators

Questa tipologia può essere compilata e inviata da `/pubblica-annuncio`; al momento il nuovo annuncio è disponibile nella conferma e nella dashboard, ma non è incluso nei risultati e nei dettagli pubblici.

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome creator | Testo | Sì nel form profilo |
| Profilo | Contatto email | Email facoltativa, visibile agli utenti autenticati | No |
| Profilo | Tipologia di contenuti | Testo | No |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | Di che zona/e ti occupi | Regioni e città multiple | Sì nel form profilo, almeno una regione |
| Annuncio | Titolo dell’annuncio | Testo | Sì |
| Annuncio | Contenuto dell’annuncio | Testo lungo raccomandato, senza placeholder | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regioni e città multiple | Sì, almeno una regione |

## Torneo / Evento

La sede principale storica resta nel database, ma non viene più richiesta o mostrata nell'applicazione.

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome organizzazione | Testo | Sì |
| Profilo | Tipologie di calcio | Selezione multipla | Sì |
| Profilo | Presentazione torneo | Testo lungo | No |
| Profilo | Zona di svolgimento manifestazione | Regioni e città multiple | Sì, almeno una regione |
| Annuncio | Nome torneo / evento | Testo | Sì |
| Annuncio | Tipologia calcio | Selezione singola | Sì |
| Annuncio | Modalità di iscrizione | Selezione | No |
| Annuncio | Annate ammesse | Intervallo 1900–anno corrente | No |
| Annuncio | Numero squadre e costo | Numero e importo | No |
| Annuncio | Modalità di partecipazione | Giocatore o squadra | No |
| Annuncio | Premi e trofei | Elenco | No |
| Annuncio | Informazioni aggiuntive | Testo lungo | Sì |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zona/e di svolgimento per questo torneo | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Campi / Impianti sportivi

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome campo/struttura | Testo | Sì |
| Profilo | Tipologia campi disponibili | Selezione multipla | Sì |
| Profilo | Sede dell’impianto/struttura | Una Regione e una Città/comune | Sì, entrambe |
| Profilo | Indirizzo | Testo | No |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | Informazioni aggiuntive | Testo lungo | No |
| Profilo storico | Sede principale, Orari, Servizi inclusi | Conservati; assenti dal nuovo editor | No |
| Profilo storico | Costo di partenza | Conservato nel database, escluso dalla visualizzazione pubblica e dai filtri | No |
| Annuncio | Tipologia campo da pubblicizzare | Selezione singola | Sì |
| Annuncio | Indirizzo del campo | Regione, Città/comune e indirizzo | Sì, tutti |
| Annuncio | Orari | Giorni e orari strutturati | No |
| Annuncio | Prezzo orario | Importo | No |
| Annuncio | Servizi inclusi | Testo lungo | No |
| Annuncio | Informazioni aggiuntive | Testo lungo | No |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |

Le schede pubbliche Staff sportivo e Tornei / eventi usano la sezione «Presentazione»; lo Staff mostra «Esperienze e qualifiche». Il costo di partenza dei Campi e impianti non è mostrato né utilizzato nei filtri profilo.


## Nominativo anonimo e campi obsoleti

Nei profili Squadra, Giocatore, Arbitro e Staff sportivo la checkbox "Mantieni anonimo il mio nominativo" è facoltativa e inizialmente disattivata. Si salva per sottoprofilo. Se attiva, le schede pubbliche, gli autori degli annunci, i riferimenti alle squadre e le notifiche mostrano rispettivamente "Squadra anonima", "Giocatore anonimo", "Arbitro anonimo" o "Staff sportivo anonimo", anche agli utenti autenticati. Il proprietario continua a compilare il nominativo reale nei form privati. La preferenza riguarda il nominativo strutturato, mentre immagini, social, recapiti e testi liberi seguono le regole esistenti.

Le viste pubbliche e la ricerca utilizzano i campi dei form attuali: nessuna categoria storica del profilo Giocatore o degli annunci Arbitro, sede storica degli impianti, vecchio periodo della ricerca Staff, fallback sulle vecchie annate/figure, né qualifiche recuperate da `storico_esperienze`. Carriera, esperienze e qualifiche attualmente compilabili restano visibili. Gli snapshot degli annunci Staff usano soltanto `lista_esperienze` e `qualifiche_licenze` attuali.
