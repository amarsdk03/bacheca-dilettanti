# Campi del flusso di pubblicazione per profilo

Nel profilo Squadra la tipologia di calcio è singola e obbligatoria; la categoria attuale è singola e facoltativa. La località del profilo è il riferimento pubblico e non viene duplicata in un campo sede testuale.

Le tabelle descrivono i dati raccolti in `/pubblica-annuncio`. I campi Premium sono salvati subito, ma diventano pubblici soltanto con un piano a pagamento. Per i contatti è obbligatorio compilare almeno uno tra email e telefono. Le località dell'annuncio sono indipendenti da quelle del profilo. Nei profili personali, la prima località storica appare nel selettore singolo; le altre restano salvate fino a una modifica esplicita della località.

## Giocatore

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome | Testo | Sì |
| Profilo | Cognome | Testo | No |
| Profilo | Data di nascita | Anno obbligatorio; giorno e mese facoltativi | Sì, anno |
| Profilo | Genere | Maschio o Femmina | Sì |
| Profilo | Nazionalità | Paese singolo ricercabile con bandiera SVG, se disponibile | No |
| Profilo | Tipologie di calcio | Selezione multipla | Sì |
| Profilo | Disponibilità | Svincolato o sotto contratto | Sì |
| Profilo | Ruolo principale | Selezione multipla | Sì |
| Profilo | Ruolo specifico | Selezione multipla raggruppata per ruolo principale | No |
| Profilo | Categoria attuale | Selezione singola raggruppata per macrocategoria, disabilitata se Svincolato | No |
| Profilo | Altezza, peso, piede | Testi e selezione | No |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | Storico carriera | Elenco di esperienze | No |
| Profilo | Video highlights | URL del profilo Giocatore | No |
| Profilo | In che zona vivi? | Regione singola obbligatoria; città/comune facoltativa | Sì, regione |
| Annuncio | Categorie ricercate | Selezione multipla | No |
| Annuncio | Descrizione | Testo lungo | Sì |
| Annuncio | Link annuncio | URL HTTP/HTTPS Premium | No |
| Annuncio | Immagine | PNG, JPEG o WebP, massimo 5 MB, Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Squadra

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome società | Testo | Sì |
| Profilo | Tipologia di calcio | Dropdown singolo | Sì |
| Profilo | Categoria attuale | Dropdown singolo raggruppato per macrocategoria | No |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | Dove ha sede la società? | Regione singola obbligatoria; città/comune facoltativa, riferimento pubblico della località | Sì, regione |
| Tipo annuncio | Ricerca | Ricerca giocatori, staff, partita amichevole o sponsor | Sì |
| Ricerca giocatori | Ruolo/i cercati | Selezione multipla | Sì |
| Ricerca giocatori | Ruoli specifici | Selezione multipla raggruppata per ruolo principale | No |
| Ricerca giocatori | Annate Dal / Al | Due dropdown: Dal parte da Qualsiasi; Al è obbligatorio se Dal è valorizzato e non può precederlo | No, se Dal è Qualsiasi |
| Ricerca giocatori | Stagione | Testo | No |
| Ricerca giocatori | Descrizione della ricerca | Testo lungo | Sì |
| Ricerca staff sportivo | Figure ricercate | Selezione multipla dal catalogo professionale | Sì, almeno una |
| Ricerca staff sportivo | Settore e compenso mensile | Testo e importo | No |
| Ricerca staff sportivo | Stagione | Testo | No |
| Ricerca staff sportivo | Requisiti | Testo lungo | Sì |
| Ricerca staff sportivo | Informazioni aggiuntive | Testo lungo | No |
| Ricerca partite/amichevoli | Livello avversario cercato | Selezione multipla dal catalogo generale | Sì |
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
| Annuncio | Categorie ricercate | Selezione multipla dal Catalogo Staff, con macrocategoria distinta | No |
| Annuncio | Disponibilità agli spostamenti | Sì, No o Da valutare | No |
| Annuncio | Lista esperienze e Qualifiche / Licenze | Snapshot dei dati del profilo al momento della pubblicazione, senza editor separati | No |
| Annuncio | Descrizione | Testo lungo | Sì |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Professionisti e studi

Questa tipologia è attualmente **Coming soon** e non può ancora inviare annunci.

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome | Testo | Sì nel form profilo |
| Profilo | Cognome e data di nascita | Testo e data (1900–anno corrente) | No |
| Profilo | Figure professionali | Selezione multipla | Sì nel form profilo |
| Profilo | Specializzazioni | Testo | No |
| Profilo | Presentazione e servizi | Testi lunghi | No |
| Profilo | Tipologie di calcio | Selezione multipla | No |
| Profilo | Disponibilità, spostamenti e automobile | Selezioni | No |
| Profilo | Storico esperienze | Elenco di esperienze | No |
| Profilo | In che zona vivi? | Regione singola obbligatoria; città/comune facoltativa | Sì nel form profilo, regione |

## Arbitro

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome | Testo | Sì |
| Profilo | Cognome e data di nascita | Testo e data (1900–anno corrente) | No |
| Profilo | Disponibilità e presentazione | Selezione e testo lungo | No |
| Profilo | Storico esperienze | Elenco di esperienze | No |
| Profilo | In che zona vivi? | Regione singola obbligatoria; città/comune facoltativa | Sì, regione |
| Annuncio | Tipologie di calcio | Selezione multipla | Sì |
| Annuncio | Automobile e spostamenti | Selezioni | No |
| Annuncio | Descrizione | Testo lungo | Sì |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Creators

Questa tipologia è attualmente **Coming soon** e non può ancora inviare annunci.

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome creator | Testo | Sì nel form profilo |
| Profilo | Tipologia di contenuti | Testo | No |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | In che zona vivi? | Regione singola obbligatoria; città/comune facoltativa | Sì nel form profilo, regione |

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
| Annuncio | Descrizione | Testo lungo | Sì |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
| Annuncio | Zone di ricerca | Regione obbligatoria; città/comune facoltativa | Sì, regione |

## Campi / Impianti sportivi

| Sezione | Campo | Tipo / dato | Obbligatorio |
| --- | --- | --- | --- |
| Profilo | Nome campo/struttura | Testo | Sì |
| Profilo | Tipologia campi disponibili | Selezione multipla | Sì |
| Profilo | Sede dell’impianto/struttura | Una Regione e una Città/comune | Sì, entrambe |
| Profilo | Indirizzo | Testo | No |
| Profilo | Presentazione | Testo lungo | No |
| Profilo | Informazioni aggiuntive | Testo lungo | No |
| Profilo storico | Sede principale, Orari, Costo di partenza, Servizi inclusi | Conservati e leggibili; assenti dal nuovo editor | No |
| Annuncio | Tipologia campo da pubblicizzare | Selezione singola | Sì |
| Annuncio | Indirizzo del campo | Regione, Città/comune e indirizzo | Sì, tutti |
| Annuncio | Orari | Giorni e orari strutturati | No |
| Annuncio | Prezzo orario | Importo | No |
| Annuncio | Servizi inclusi | Testo lungo | No |
| Annuncio | Descrizione | Testo lungo | No |
| Annuncio | Link annuncio e immagine | URL e file Premium | No |
| Annuncio | Contatti pubblici per questo annuncio | Email e/o telefono | Sì, almeno uno |
