# Appunti sulle sezioni future della dashboard

Discussione del 16 novembre 2026. Questo documento conserva intenzioni e proposte:
non è un piano di implementazione approvato e non riapre la precedente roadmap.
Distribuzione è ora implementata; le altre cinque pagine rimangono segnaposto.

## Integrazioni: direzione confermata

L'utente vuole un punto di osservabilità/telemetria dell'intera piattaforma
Bacheca Dilettanti, comprendente Web, Admin e servizi da cui dipendono.
Il punto di partenza è visualizzare lo stato dei servizi utilizzati, per esempio
Vercel, Supabase e, se incluso, Stripe, tramite fonti ufficiali leggibili dal codice.

Tre ambiti distinti:

- Integrazioni: disponibilità, salute ed eventuali errori dei servizi/applicazioni.
- Registro attività: operazioni effettuate dagli amministratori.
- Versioni sito web: cambiamenti del prodotto e storico dei rilasci.

### Proposta iniziale discussa

- Una card per servizio con stato, componenti interessati, incidente/manutenzione,
  ultimo controllo e collegamento alla fonte ufficiale.
- Stati leggibili: Operativo, Degradato, Interruzione, Manutenzione e Non verificabile.
- Pulsante Aggiorna, aggiornamento automatico proposto ogni cinque minuti solo
  mentre la pagina è aperta e cache condivisa sul server per contenere le richieste.
- Mostrare separatamente il momento dell'ultima lettura e quello dell'aggiornamento
  del fornitore, quando disponibile. Un errore di lettura o un feed senza incidenti
  non dimostrano che il servizio sia operativo.
- Prima versione proposta basata su fonti pubbliche, senza nuove credenziali o
  persistenza database. La disponibilità dei feed non equivale alla verifica
  del funzionamento della specifica installazione Bacheca Dilettanti.

Fonti consultate durante la discussione, da riconfermare prima dell'implementazione:

| Servizio | Fonte ufficiale |
| --- | --- |
| Supabase | [Riepilogo JSON](https://status.supabase.com/api/v2/summary.json), [feed RSS](https://status.supabase.com/feed.rss), [pagina di stato](https://status.supabase.com/) |
| Vercel | [Riepilogo JSON](https://www.vercel-status.com/api/v2/summary.json), [pagina di stato](https://www.vercel-status.com/) |
| Stripe | [Feed Atom degli incidenti](https://status.stripe.com/current/atom.xml), [pagina di stato](https://status.stripe.com/) |

Supabase espone anche [Get services health](https://supabase.com/docs/reference/api/v1-get-services-health),
`GET /v1/projects/{ref}/health`, con parametro `services`: riguarda i servizi
di uno specifico progetto, incluso il database. Richiede autorizzazione Management
API con permessi adeguati; eventuali token restano esclusivamente sul server.
Questo controllo è stato proposto come aggiunta separata, non già configurata.

L'estensione futura alla telemetria di Web/Admin potrebbe includere errori,
tempi di risposta e anomalie dei flussi. Raccolta degli eventi, strumenti,
conservazione, notifiche e metriche restano da definire. Non risultano autorizzate
nuove sonde remote, installazioni o modifiche alla raccolta dei dati da questa chat.

## Distribuzione: implementazione approvata

La proposta è stata approvata e implementata il 16 novembre 2026: coda regionale,
canali, editor condiviso con Annunci, pubblicazioni manuali e storico.
Regole, migrazione e verifiche locali in [Distribuzione](integrazione/distribuzione.md).

Invio automatico, pianificazione automatica, altri social e misurazione di
visualizzazioni/clic restano estensioni da discutere.

## Altre sezioni: idee non ancora approvate

- Pagamenti: consultazione dei pagamenti degli annunci prioritari, collegamenti
  ad annuncio/utente, stato, importo e incassi. I profitti richiedono anche costi,
  commissioni e rimborsi, quindi non coincidono con gli incassi.
- Promo e crediti: codici promozionali, limiti/scadenze, utilizzi ed eventuali
  movimenti di credito. Prima va definito il valore del credito e l'eventuale
  rapporto con gli inviti; oggi Considerato non attribuisce premi o denaro.
- Statistiche: approfondimento dei grafici Home con periodi, confronti,
  suddivisioni territoriali/per tipologia e indicatori operativi. Clic e
  conversioni richiedono prima una raccolta specifica degli eventi.
- Versioni sito web: data/versione del rilascio, cambiamenti, correzioni e
  riferimenti a commit/deployment; eventuali note pubbliche come sviluppo futuro.

Per Pagamenti e Statistiche non è stato concordato un ordine vincolante.
