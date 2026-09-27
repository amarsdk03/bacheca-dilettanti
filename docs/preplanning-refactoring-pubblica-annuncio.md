### Refactoring ruoli, categorie e figure professionali

```markdown
Effettua i seguenti refactoring:
- Nei ruoli, rinomina “Centrale” a “Centrocampista Centrale”
- Rinomina tutte le tipologie togliendo 'a ', ad esempio “Calcio a 11” diventa ora “Calcio 11”
- Le categorie del calcio ora cambiano nelle seguenti, impostate come macrocategoria e categoria specifica:
		- "Calcio 11 (Maschile)": Under 15 Nazionali, Under 15 Regionali, Under 15 Provinciali, Under 16 Nazionali, Under 16 Regionali, Under 16 Provinciali, Under 17 Nazionali, Under 17 Regionali, Under 17 Provinciali, Under 18 Nazionale, Juniores Nazionali, Juniores Regionali, Juniores Provinciali, Primavera 1, Primavera 2, Primavera 3, Primavera 4, Serie C, Serie D, Eccellenza, Promozione, Prima Categoria, Seconda Categoria, Terza Categoria
		- "Calcio 7 (Maschile)": Under 15, Allievi, Under 16, Under 17, Juniores, Under 19, Top Junior, Open Eccellenza, Open Serie A, Open Serie B, Open Serie C1, Open Serie C2, Open A, Open B, Open C, Open Divisione Unica
		- "Calcio 5 (Maschile)": Under 15, Under 17, Under 19 Regionali, Under 19 Nazionali, Under 21, Serie A, Serie A2 Élite, Serie A2, Serie B, Serie C1, Serie C2, Serie D
		- "Calcio 11 (Femminile)": Under 15 Femminile, Under 17 Femminile, Campionato Primavera 1, Campionato Primavera 2, Eccellenza Femminile, Serie C Femminile, Serie B Femminile, Serie A Femminile
		- "Calcio 7 (Femminile)": Under 15, Under 17, Under 19, Open Eccellenza, Open Serie A, Open Serie B
		- "Calcio 5 (Femminile)": Under 15, Under 17, Under 19, Serie D, Serie C, Serie B, Serie A.
		 Se lo ritieni utile, ordinali con un certo senso (es: prima le divisioni più elevate, per poi scendere...)
- Le figure professionali ora cambiano nelle seguenti: Allenatore; Allenatore in seconda; Preparatore atletico; Preparatore portieri; Collaboratore tecnico; Preparatore calci piazzati; Match Analyst; Direttore Sportivo; Osservatore; Capo-Osservatore; Segretario; Magazziniere; Autista; Tuttofare; Dirigente Accompagnatore; Fisioterapia / Medicina sportiva; Commerciale / Business; Psicologo; Social Media Manager; Addetto Stampa / Comunicazione; Grafico; Altro. Se lo ritieni utile ordinali con un certo senso (es: tuttofare alla fine, mettere ruoli dello stesso "settore" insieme, ecc...)

Queste modifiche dovranno essere applicate ovunque nella piattaforma (/pubblica-annuncio, pagine ricerca, dettagli, info/testi statici...) e con eventuale migration per il DB se necessario.
```

### Modifiche profilo e annunci generale

```markdown
Effettua le seguenti modifiche in /pubblica-annuncio per i vari sottoprofili:
- Sostituisci la sezione "Regioni di interesse" per i dati del profilo con un semplice FieldGroup chiamato "In che zona vivi?", composto da un dropdown obbligatorio contenente le regioni e un campo testuale facoltativo per l'eventuale città/comune di residenza
- Rinominare "Contatti pubblici" a "Contatti pubblici per questo annuncio", e rinomina l'OptionalLabel per il campo Email da "raccomandato" a "consigliato"
- Rinomina il label "Regioni di interesse" nei dati dell'annuncio in "Zone di ricerca"
- Il campo "Categorie ricercate" dovrebbe solamente comparire per i profili Giocatore e Staff sportivo, se compare da qualche altra parte fammelo notare.

Queste modifiche sono riflettute da /pubblica-annuncio, ma dovranno essere applicate ovunque nella piattaforma (pagine ricerca, dettagli, info/testi statici...) e con eventuale migration per il DB se necessario.
```

### Modifiche Giocatore

```markdown
Effettua le seguenti modifiche al profilo Giocatore.

Per i dati del profilo:
- Rimuovi il campo "Categorie cercate" da qui e sostituiscilo con un Dropdown singolo chiamato "Categoria attuale", con opzione iniziale "Non specificare"
- Aggiungi il campo "Genere", obbligatorio, con valori "Maschio" e "Femmina"
- Rendi il campo Anno della data di nascita obbligatorio, e inserisci nel OptionalLabel "(Anno obbligatorio)" con asterisco rosso solamente nel field dell'Anno
- Rendere il campo disponibilità obbligatorio, rimuovere il valore "Non specificare" e rinominare l'opzione "Disponibile Subito” a “Svincolato”. Se si seleziona Svincolato, il campo "Categoria attuale" viene impostato su "Non speecificare" e disabilitato
- Aggiungere campo "Nazionalità", ricercabile e con bandiera mostrata a destra
- Rinomina il valore "Ambipiede" a "Ambidestro" nel campo "Piede principale"

Per invece i dati dell'annuncio:
- Aggiungere una scritta vicino a "Categorie cercate", con una piccola scritta “Se non trovi la tua categoria specifica, scrivila nella descrizione dell’annuncio"

Queste modifiche sono riflettute da /pubblica-annuncio, ma dovranno essere applicate ovunque nella piattaforma (pagine ricerca, dettagli, info/testi statici...) e con eventuale migration per il DB se necessario.
```

### Modifiche Squadra

```markdown
Effettua le seguenti modifiche al profilo Squadra.

Per i dati del profilo:
- Sostituire l'input "Tipologia calcio" con un dropdown per scelta singola
- Aggiungere un Dropdown singolo chiamato "Categoria attuale", con opzione iniziale "Non specificare"
- Togliere campo "Sede principale"
- Rinomina il label "Regioni di interesse" nei dati dell'annuncio in "Zone di ricerca"

Per invece i dati dell'annuncio valuta le seguenti casistiche, inoltre rinomina tutto a "Ricerca" e con termine al plurale (es: "Cerca giocatore" diventa "Ricerca giocatori").

Per gli annunci "Ricerca giocatori":
- Rinominare il campo "Ruolo principale" a "Ruolo/i cercati"
- Rendere "Annate ricercate" un doppio campo dropdown "Dal"/"Al", e aggiungere un'opzione "Qualsiasi" nel primo campo "Dal" che resetta e disabilita il secondo campo "Al"
- Togliere il titolo "Località dell’annuncio" in questa sezione (lasciare solo "Regioni d'interesse")

Per gli annunci "Ricerca staff sportivi":
- Togliere i campi "Periodo dal/al" e sostituirlo con un campo testuale "Stagione"

Per gli annunci "Ricerca partite/amichevoli":
- Rinominare il campo "Categorie avversario con "Livello avversario cercato"

Per gli annunci "Ricerca sponsor":
- Rinominare il campo "Categoria / Settore" in "Settore" e impostare il placeholder in "es. Tutta la società, Prima squadra, Settore Giovanile..."
- Togliere il campo "Supporto cercato"
- Rinominare il campo "Cosa offre la società" a "Visibilità offerta"
- Togliere il campo "Regioni d'interesse" per questa sezione specifica

Queste modifiche sono riflettute da /pubblica-annuncio, ma dovranno essere applicate ovunque nella piattaforma (pagine ricerca, dettagli, info/testi statici...) e con eventuale migration per il DB se necessario.
```

### Modifiche Staff sportivo

```markdown
Effettua le seguenti modifiche al profilo Staff sportivo.

Per i dati del profilo:
- Nello storico esperienze, togliere "Non specificare" e rinominare lo stato "Conseguito" a "Esperienza conclusa"
- Aggiungere campo checkbox "Disponibile anche da remoto" (sopra campo "Presentazione")

Per invece i dati dell'annuncio:
- Solo per lo staff sportivo, cambiare "Categorie cercate" nelle seguenti:
		- Calcio 11 (Maschile): Settore Giovanile, Serie C, Serie D, Eccellenza, Promozione, Prima Categoria, Seconda Categoria, Terza Categoria
		- Calcio 7 (Maschile): Settore Giovanile C7, Open Eccellenza, Open Serie A, Open Serie B, Open Serie C1, Open Serie C2, Open A, Open B, Open C, Open Divisione Unica
		- Calcio 5 (Maschile): Settore Giovanile C5, Serie A, Serie A2 Élite, Serie A2, Serie B, Serie C1, Serie C2, Serie D
		- Calcio 11 (Femminile): Settore Giovanile C11 Femminile, Eccellenza Femminile, Serie C Femminile, Serie B Femminile, Serie A Femminile
		- Calcio 7 (Femminile): Settore Giovanile C7 Femminile, Open Eccellenza, Open Serie A, Open Serie B
		- Calcio 5 (Femminile): Settore Giovanile C5 Femminile, Serie D, Serie C, Serie B, Serie A
- Aggiungere il valore "Da valutare" al campo "Disponibilita agli spostamenti"
- Cambiare il campo "Storico esperienze" nei seguenti due campi separati:
		- "Lista esperienze": uguale allo "Storico carriera" nei dati profilo del Giocatore, con unica differenza che il campo "Squadra" si rinomina in "Società" (anche nel placeholder), mentre il campo "Categoria" si rinomina in "Ruolo/i svolti" (con placeholder "Dirigenza, medico sportivo, media manager...)
		- "Qualifiche / Licenze": simile al vecchio "Storico esperienze", con unica differenza che si toglie il valore "Non specificare" dal campo "Stato" e rendendo questo obbligatorio (e se possibile allineando i radio in orizzontale, sopra una viewport sm)

Queste modifiche sono riflettute da /pubblica-annuncio, ma dovranno essere applicate ovunque nella piattaforma (pagine ricerca, dettagli, info/testi statici...) e con eventuale migration per il DB se necessario.
```

### Modifiche tornei ed eventi

```markdown
Effettua le seguenti modifiche al profilo Torneo / Evento.

Per i dati del profilo:
- Rinominare il campo "Presentazione" in "Presentazione torneo"
- Rinominare il campo "Regioni interessate" in "Zona di svolgimento manifestazione". Per questo tipo di profilo specifico lasciare il solito tipo di input (selezione multipla regioni + eventuali città, con almeno una regione obbligatoria)

Per invece i dati dell'annuncio:
- Solo una selezione singola per "Tipologia calcio"
- Cambiare placeholder del campo "Posto" da "1° posto Amatoriali" in "Primo posto"
- Cambiare il nome del campo "Titolo premio" in "Premio"

Queste modifiche sono riflettute da /pubblica-annuncio, ma dovranno essere applicate ovunque nella piattaforma (pagine ricerca, dettagli, info/testi statici...) e con eventuale migration per il DB se necessario.
```

### Modifiche campi e impianti

```markdown
Effettua le seguenti modifiche al profilo Campi e impianti.

Per i dati del profilo:
- Rinominare il campo "Nome organizzazione" a "Nome campo/struttura"
- Rinominare il campo "Tipologia calcio" a "Tipologia campo"
- Cambiare il campo "Sede principale" in "Sede dell'impianto/struttura", composto da un FieldGroup di 3 campi: un dropdown per "Regione", un text input per la "Città/comune" e un text input per "Indirizzo". Regione e citta/comune sono obbligatori, mentre indirizzo no.
- Togliere il campo "Costo di partenza"
- Togliere il campo "Orari"
- Rinominare il placeholder del campo "Presentazione" in "Descrivi la tua organizzazione, gli obiettivi, le modalità operative..."
- Togliere il campo "Servizi inclusi"
- Rinominare il placeholder del campo "Informazioni aggiuntive" in "Modalità di prenotazione, regolamenti..."

Per invece i dati dell'annuncio:
- Rinominare il campo "Tipologia calcio" a "Tipologia campo"
- Sostituire il campo "Disponibilità / orari" da TextInput con quello precedentemente presente nei dati profilo (checkbox + time inputs). Fixare inoltre un input parziale dei time field (es: se inserisco 20:-- e poi procedo all'invio, sarà considerato come 20:00).
- Rinominare il campo "Costo di partenza" con "Prezzo orario" e aggiungere placeholder "A partire da..."
- Tolto il campo "Regioni interessate", sostituirlo con un campo "Indirizzo dell'impianto/struttura", composto da un FieldGroup di 3 campi: un dropdown per "Regione", un text input per la "Città/comune" e un text input per "Indirizzo". Qui tutto il FieldGroup è obbligatorio, inoltre posizionarlo per secondo (quindi subito dopo "Tipologia campo")
- Cambiare placeholder del campo "Descrizione" in "Descrivi tipologia del terreno, dimensioni, presenza porte/attrezzatura..."
- Rendere il campo "Descrizione" facoltativo

Queste modifiche sono riflettute da /pubblica-annuncio, ma dovranno essere applicate ovunque nella piattaforma (pagine ricerca, dettagli, info/testi statici...) e con eventuale migration per il DB se necessario.
```

### Altro
```markdown
- Nella pagina "/dettagli-profilo" per i sottoprofili "Campi e impianti", rinominare il nome della sezione Tab "Annunci" in "Campi disponibili". In generale se idoneo, fare questo cambiamento anche per altri sottoprofili, altrimenti lasciare "Annunci" generico.
- Le card dei risultati in "/annunci" mostrano un titolo:
  - In generale saranno sempre del formato "RICERCA (OGGETTO AL PLURALE)"
  - Per le squadre, questo dev'essere sempre "RICERCA GIOCATORI" oppure "RICERCA STAFF SPORTIVO" se sono stati messi 2+ ruoli/figure, altrimenti mostra ad es. "RICERCA PORTIERE" oppure "RICERCA ALLENATORE"
  - Anche per gli altri annunci mostrare sempre il campo principale (es: nominativo per gli annunci Giocatore, o nome evento per i Tornei), altrimenti se non esiste un campo particolare mostrare il generico "RICERCA OPPORTUNITA"
- In generale, fare sempre double-checking prima dei campi da tenere obbligatori per ogni form dei dati profili e annunci.
- Controllare tramite modalita plan che sia anche tutto consistente / sensato, dove possibile
```