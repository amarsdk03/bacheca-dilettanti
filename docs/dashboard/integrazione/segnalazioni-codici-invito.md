# Segnalazioni e codici invito nella Dashboard

## Attivazione

Applicare tutte le precedenti migrazioni del progetto, quindi queste due nell’ordine:

1. `20261114222716_admin_report_management.sql`
2. `20261114222731_admin_invitation_management.sql`

Distribuire poi `apps/admin`. Le migrazioni non sono applicate automaticamente dal codice o dai test. La seconda dipende dai helper e dall’estensione audit introdotti dalla prima. Sono richiesti il sistema Admin/audit esistente e le tabelle delle segnalazioni e degli inviti già utilizzate dalla piattaforma.

In assenza delle RPC richieste, la Dashboard mostra un errore con possibilità di ricaricamento: non presenta dati simulati né considera riuscita una scrittura non verificabile.

## Segnalazioni

`/segnalazioni` mostra per impostazione iniziale gli stati Aperta e In lavorazione. Filtri: stato, annuncio/profilo, email del segnalatore o UUID del contenuto/segnalazione e date inclusive in Europe/Rome. Le pagine contengono al massimo trenta righe, ordinate per data decrescente e UUID.

Ogni segnalazione conserva l’ID numerico storico e riceve un UUID amministrativo. Il dettaglio consente di salvare stato e nota interna (massimo mille caratteri), con controllo della versione. Una modifica concorrente o un esito incerto richiedono il ricaricamento prima di un altro tentativo.

Stati: Aperta, In lavorazione, Risolta, Archiviata. Tutti possono essere modificati, inclusa la riapertura. Le vecchie segnalazioni diventano Aperte. Nessuna chiusura modifica automaticamente il contenuto: per gli annunci si riutilizzano capacità, controlli e dialog della moderazione esistente. Per i profili si mostrano i collegamenti alle tipologie effettivamente associate all’UUID: il modello storico della segnalazione non identifica il singolo sottoprofilo.

Un segnalatore senza riferimento utente viene indicato come Non identificato: può essere anonimo oppure un account cancellato. Gli hash anonimi non vengono restituiti. La cancellazione del contenuto mantiene il precedente comportamento SQL di cancellazione a cascata delle sue segnalazioni; questo intervento non introduce una nuova conservazione.

## Codici invito

`/codici-invito` elenca i codici personali degli account registrati, anche senza invitati. I codici sono immutabili: non si creano, rigenerano o revocano da questa sezione. Ricerca per codice esatto, UUID dell’invitante o parte dell’email; filtro Con inviti da valutare.

Il dettaglio mostra esclusivamente invitati con email confermata, con registrazione, conferma e stato Da valutare/Considerato. Considera e Ripristina richiedono conferma. Le modifiche sono reversibili; ripetere lo stesso valore non produce eventi audit duplicati. I conteggi includono anche gli inviti già considerati. Considerato non assegna premi, crediti o pagamenti.

## Accessi e registro attività

Le letture e le mutazioni verificano la sessione umana Admin attraverso il controllo SQL esistente. Le tabelle non ricevono nuove concessioni dirette ai client; le funzioni pubbliche sono wrapper invoker, con bridge definer privati e autorizzazione esplicita. Le API di lettura sono private/no-store.

Ogni modifica effettiva registra `report.update` o `invitation.consider` nella stessa transazione. Un errore audit annulla la modifica. Il registro conserva le variazioni di stato/Considerato e un indicatore di modifica della nota, senza copiarne il testo. Gli errori successivi alla validazione sono registrati attraverso il trasporto audit server esistente, senza payload arbitrari.

## Verifiche locali

- `node --test tests/admin-community-database.test.mjs tests/admin-community-server.test.mjs`
- `node scripts/dashboard-browser/community-checks.mjs`
- `npm run typecheck:admin`

Il database dei test è PGlite con fixture sintetiche; il browser usa una copia isolata dell’Admin, credenziali sintetiche e un servizio HTTP su loopback. Nessuna credenziale o destinazione remota deve essere caricata nei processi di test.
