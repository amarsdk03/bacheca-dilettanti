# Utenti e profili

## Attivazione

Applicare le migrazioni precedenti (incluse gestione segnalazioni/inviti e correzione dell’attore di modifica annunci), quindi nell’ordine:

1. `20261115112211_profile_type_verification_and_holds.sql`
2. `20261115112325_admin_users_and_profiles.sql`
3. `20261116120439_admin_directory_sort_and_filter_defaults.sql`

Se le prime due sono già applicate, eseguire **solo la terza**, prima di distribuire questo aggiornamento Admin. La terza aggiunge ordinamento e metriche dei profili e imposta Tutte come stato iniziale delle segnalazioni, senza ripetere il reset delle verifiche.

Distribuire **prima Web, poi Admin**. Le azioni di oscuramento vanno utilizzate solo dopo aver distribuito Web: anche le letture server con chiave tecnica devono applicare il nuovo vincolo. Le migrazioni sono preparate e verificate localmente, non applicate automaticamente a progetti remoti.

Se la prima migrazione è fallita con `55006` (eventi trigger pendenti su `profilo`), rieseguire il file corretto integralmente, poi la seconda migrazione. Il reset ora esegue i constraint trigger pendenti prima dell’ALTER, senza disabilitarli o spezzare la transazione. Se il client mantiene la transazione fallita aperta, eseguire prima `ROLLBACK;`.

Se la seconda è fallita con `ANNOUNCEMENT_LIST_REVIEW_REQUIRED`, rieseguire integralmente solo la seconda nel file corretto: ora segue i wrapper introdotti da creazione annunci e distribuzione WhatsApp e aggiorna la query sottostante preservandone gli arricchimenti. Non rieseguire la prima se già conclusa con successo.

La prima migrazione azzera intenzionalmente tutte le verifiche esistenti, incluse quelle dei profili speciali precedenti. Non trasferisce il badge condiviso alle singole tipologie. La conferma email non cambia. `profilo.verificato_il` rimane deprecato e vincolato a NULL: nessuna lettura runtime deve usarlo. Un eventuale ritorno al codice precedente richiede di disabilitare le nuove azioni Admin; non eliminare lo stato per tipologia o i blocchi già assegnati.

## Pagine

`/utenti` elenca gli account `Utente` di `public.utente`, anche senza registrazione completa o senza profili. Non include record Auth privi del corrispondente account applicativo. Filtri: registrazione (`registrato_il`), conferma email (Auth), email corrente/telefono/UUID e date di creazione inclusive in Europe/Rome. Il dettaglio è in sola consultazione: contatti, consensi, date e profili associati. Nessuna modifica a identità, consensi, ruoli o credenziali.

`/profili` identifica ogni profilo con UUID del contenitore e tipologia. Include le otto tipologie reali degli utenti ordinari e quelle senza account, come gli autori di annunci importati. Non crea righe per contenitori senza sottoprofili. Ricerca per nome/email/UUID; filtri per tipologia, regione (anche Estero), verifica, visibilità e presenza di account. “Apri profili” usa `search=UUID_utente`: il vincolo compare nel campo di ricerca. I vecchi link con `user` popolano lo stesso campo; combinazioni contraddittorie con una ricerca diversa vengono rifiutate. I dati specifici sono consultabili nel pannello laterale. “Crea profilo” è disabilitato; la pagina di creazione è fuori perimetro.

Ordinamento `sort`: `newest` (predefinito), `oldest`, `announcements`, `followers`. Data usa `profilo.creato_il`, come prima. Ordinamento e paginazione avvengono nel database con spareggio stabile per data, UUID e tipologia. `publicAnnouncementCount` conta le pubblicazioni della specifica tipologia attualmente pubbliche secondo i vincoli del sito, deduplicando `gruppo_pubblicazione`; `followerCount` conta le relazioni indirizzate a quel sottoprofilo. Entrambi appaiono all’inizio del dettaglio. `announcementCount` conserva il significato precedente di annunci collegati non cestinati.

Tutte le directory applicano subito select/date e sincronizzano l’URL. Il testo di ricerca si applica soltanto con Filtra/Invio: cambiare un select conserva il testo in bozza ma usa la ricerca già confermata. Azzera ripristina tutti i filtri e la prima pagina. Codici invito espone `search`, `pending=true` e `offset` nell’URL; Segnalazioni senza stato esplicito mostra Tutte, mentre il collegamento dalla home mantiene `status=active`.

Entrambe usano filtri/paginazione nell’URL, trenta righe per pagina e richieste private/no-store. API: `/api/utenti`, `/api/utenti/[id]`, `/api/profili`, `/api/profili/[id]?type=...`. Le proiezioni non restituiscono token, password o metadata Auth arbitrari.

## Verifica e oscuramento

`profile_type_state` è la fonte unica per verifica, oscuramento e versione del singolo profilo. Le mutazioni richiedono una sessione umana Admin verificata e passano da wrapper RPC invoker con bridge privati. Client e writer tecnico non possono aggiornare direttamente la tabella. Il registro conserva tipo profilo, operazione, stato precedente/successivo e motivazione; modifica e audit sono atomici. Versioni obsolete o esiti incerti impongono il ricaricamento prima di riprovare.

Nuovi profili Servizi e professionisti e Creator ricevono automaticamente il badge alla creazione, attraverso i consueti controlli di abilitazione. Le altre tipologie richiedono verifica manuale. Eliminare e ricreare una tipologia speciale conserva l’automatismo solo se non c’è stata una revoca amministrativa; non ripristina un badge revocato e non annulla un oscuramento. Il reset iniziale delle verifiche precedenti vale come revoca. La cancellazione rimuove la verifica di quel profilo; lo stato di moderazione persiste finché esiste il contenitore.

L’oscuramento interessa il profilo selezionato e gli annunci della sua tipologia, incluse copie regionali e annunci futuri. `annuncio.profile_admin_hidden` è derivato e protetto dai trigger: non sostituisce privacy, revisione, pagamenti o oscuramento individuale. Rimuovere il blocco riabilita solo contenuti ancora idonei, senza rimborsi né variazioni alle scadenze di priorità.

Web applica il vincolo a directory, dettagli, homepage, correlati, riferimenti a squadre/tornei, sitemap, contatti, immagini annunci e interazioni. Il proprietario può consultare/modificare i propri profili vedendo lo stato Oscurato, senza poterlo rimuovere. La sospensione impedisce l’apertura pubblica diretta degli annunci coinvolti. Non revoca file già scaricati o URL di immagini di profilo in bucket pubblici.

Visibilità Profili: Oscurato ha precedenza; Privato comprende profili nascosti e senza account, privi di pagina pubblica autonoma. Pubblico richiede account e profilo non nascosto; restano applicabili gli altri requisiti esistenti. In Annunci il blocco ereditato compare come Oscurato, con spiegazione nel dettaglio; approvazione e ripristino individuale non possono aggirarlo.

## Verifiche locali

- `node --test tests/admin-people-database.test.mjs tests/admin-people-server.test.mjs`
- `node scripts/dashboard-browser/people-checks.mjs`
- `npm run typecheck:admin` e `npm run typecheck`

Fixture SQL PGlite, credenziali sintetiche e browser su loopback. Nessuna credenziale remota, test live o build di produzione. Output browser sotto `.local/dashboard-browser/`.
