# 06 — Privacy tecnica e ciclo di vita dei dati

## 1. Obiettivo e ambito

Raccolta/esposizione dei dati, consensi, cookie, integrazioni, log, conservazione, cancellazione ed esportazione. Analisi del **2026-09-29**, commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`, includendo lo stato locale preesistente di `Registrati.tsx`. Sola analisi; nessuna modifica applicativa.

Riferimenti: [mappa](00-mappa-codebase.md), [autorizzazioni](03-autorizzazioni-supabase.md), [relazioni e cancellazioni](04-consistenza-database.md), [pagamenti](05-pagamenti-stripe.md). La verifica tecnica non attesta conformità normativa; finalità e tempi di conservazione restano decisioni del titolare.

## 2. File/aree analizzate

- `src/features/registrati/{Registrati.tsx,registration-payload.ts}`, `src/features/auth/server/actions.ts`, `src/features/legal/legal-versions.ts`.
- `src/features/profilo/{IlTuoProfilo.tsx,birth-date.ts,server/actions.ts,server/profile-image-processing.ts}`; query/proiezioni in `src/features/dettagli-profilo/server/` e `components/player/PlayerOverview.tsx`.
- `src/features/pubblica-annuncio/{server/actions.ts,components/ConfermaInvioAnnuncio.tsx}`, `src/app/api/metadata/annuncio-immagine/route.ts`, `src/features/segnalazioni/server/actions.ts`.
- `src/app/layout.tsx`, pagine privacy/cookie, `src/components/legal/EmbedLegalBlink.tsx`, `src/features/contatti/Contatti.tsx`, `src/lib/{supabase/,site-access.ts}`, `src/proxy.ts`.
- Migrazioni mirate: `20260823154343_registration_profile_provisioning.sql`, `20260824195350_publish_announcement_workflow.sql`, `20260824195359_reconcile_auth_identity_registration.sql`, `20260825204042_publish_email_otp_rate_limit.sql`, `20260917124241_segnalazioni.sql`, `20260923105600_registration_legal_and_newsletter_consents.sql`, wrapper inviti `20260924173632_invitation_codes.sql`; cron pagamenti già mappato nel Punto 5.
- `tests/registration-consents*.test.mjs`, librerie installate `@supabase/ssr`, `@vercel/analytics`, `@vercel/speed-insights`; confronto mirato con `docs/fotografia-tecnica-privacy-2026-09-23.md`.

### 2.1 Dati e destinazioni

| Flusso | Raccolta / esposizione verificabile |
|---|---|
| Registrazione | Email e password verso Supabase Auth; il payload applicativo contiene sottoprofili e consensi (`registration-payload.ts:76`; `auth/server/actions.ts:170`). Preferenza newsletter, timestamp e versioni informative in `utente`. Non è stata letta alcuna credenziale o anagrafica remota. |
| Profili pubblici | Nome, dati sportivi/professionali, località, social, foto e contenuti liberi. Query con filtro `nascosto=false` e proprietario non nullo (`profile-detail-query.ts:443`). Proiezione giocatore esplicita: età, genere, nazionalità, altezza/peso, carriera; giorno/mese/anno di nascita non restituiti (`player-profile-data.ts:98`). Età restituita solo con data completa valida; il flusso recente accetta anche il solo anno. |
| Annunci | Email/telefono di contatto destinati al pubblico, distinti dall'email di verifica: la UI lo spiega (`ConfermaInvioAnnuncio.tsx:331`). Pubblicazione senza profilo completo usa comunque Auth/OTP e ricevute. Accessibilità per link di annunci non elencati e immagini: decisione già aperta nel Punto 3, non nuova vulnerabilità qui. |
| Immagini | Foto profilo ricodificate; bucket pubblico. Annunci conservati come file originali nel bucket privato, poi restituiti dall'endpoint pubblico per UUID: vedere 06-F02. Nascondere un profilo non revoca automaticamente URL già noti delle foto; riutilizzare la matrice del Punto 3. |
| Relazioni e moderazione | Follow, salvati e inviti collegati agli identificativi; segnalazioni con motivo libero, bersaglio e utente oppure hash di identificatore casuale (`20260917124241_segnalazioni.sql:7`). Quest'ultimo è uno pseudonimo tecnico, non prova di anonimato assoluto; il codice della segnalazione non aggiunge l'IP al record. |
| Servizi esterni | Supabase Auth/DB/Storage; hosting e telemetria Vercel; LegalBlink CMP/informative; YouTube per highlights; Stripe nei flussi preesistenti (Punto 5). Contatti Instagram/WhatsApp/email sono link (`Contatti.tsx:27`, `:52`, `:64`). README `:30` cita Resend: provider SMTP effettivo, log e tracking email non verificati. |

I campi liberi e le immagini possono contenere dati ulteriori inseriti dagli utenti. La soglia tecnica del profilo è 14 anni (`src/features/profilo/birth-date.ts:1`), non una verifica dell'identità: gestione dei minori e pubblicazione dei recapiti richiedono una decisione esplicita.

### 2.2 Cookie, telemetria ed embed

| Elemento | Evidenza statica e limite |
|---|---|
| Sessione Supabase | Default SDK: `sameSite: "lax"`, `httpOnly: false`, `maxAge: 400 * 24 * 60 * 60` (`node_modules/@supabase/ssr/src/utils/constants.ts:5`). I wrapper usano le opzioni SDK. Non confondere la durata del cookie con durata JWT/sessione o retention server. Nomi/chunk effettivi non osservati nel browser. |
| `bd-report-visitor-v1` | Creato durante la segnalazione anonima, 24 ore, HttpOnly, SameSite=Lax, Secure in produzione; DB conserva SHA-256 del valore (`src/features/segnalazioni/server/actions.ts:50`). Scadenza cookie distinta dalla cancellazione delle righe. |
| `bd_site_access` | Nome e verifica HMAC in `src/lib/site-access.ts:1`, lettura nel proxy `:84`. Il vecchio documento descrive una route di emissione e 14 giorni: tale route non è presente oggi; durata/installazione attuale non confermate. |
| CMP LegalBlink | Loader globale `afterInteractive`, `data-blocking-mode="auto"`, consent mode e TCF abilitati (`src/app/layout.tsx:62`). Configurazione per categoria, cookie di preferenza, rinnovo/revoca ed effettivo blocco richiedono verifica runtime/pannello. |
| Analytics / Speed Insights | Montati globalmente senza guardia di consenso o `beforeSend` nel layout (`:60`). La documentazione Vercel descrive Web Analytics senza cookie terzi, con identificazione tramite hash e dati aggregati: non classificare automaticamente questi componenti come cookie pubblicitari. URL e parametri possono richiedere redazione personalizzata. [Fonte Vercel](https://vercel.com/docs/analytics/privacy-policy). |
| YouTube / informative | Iframe YouTube su `youtube-nocookie.com`, caricamento lazy (`src/features/dettagli-profilo/components/player/PlayerOverview.tsx:59`); iframe LegalBlink per le pagine legali (`src/components/legal/EmbedLegalBlink.tsx:20`). Il codice non ha una guardia locale di consenso; la CMP può intervenire. Non è dimostrato che richieste partano prima della scelta né che siano bloccate. |

La checkbox obbligatoria di registrazione comprende Termini, Privacy e Cookie policy; **non rappresenta da sola una preferenza per categorie CMP**. La pubblicazione ha accettazioni separate, inizialmente false (`ConfermaInvioAnnuncio.tsx:75`, `:479`). Verificare con il titolare anche la formulazione generale «acconsento al trattamento» (`:490`) rispetto alle finalità effettive, senza dedurne una base giuridica dal solo codice.

### 2.3 Conservazione, cancellazione ed export

| Dato | Ciclo ricostruibile / limite |
|---|---|
| Preparazione registrazione | Email e JSON profilo; validità 15 minuti, eliminazione degli scaduti alla successiva preparazione (`20260823154343_registration_profile_provisioning.sql:17`, `:131`). Wrapper inviti delega al core (`20260924173632_invitation_codes.sql:140`). Cancellazione/consumo del token presenti; nessuna garanzia locale di purge al minuto 15. |
| Quota OTP | Hash email e richieste; eliminazione oltre 24 ore dentro la RPC di consumo quota (`20260825204042_publish_email_otp_rate_limit.sql:50`). Nessun purge indipendente dal traffico individuato. |
| Segnalazioni | Nessuna TTL nella definizione disponibile; cancellazione del bersaglio CASCADE, del segnalatore SET NULL (Punto 4). Il limite di invio di 24 ore non è una retention. |
| Ricevute pubblicazione/pagamento | Email normalizzata, versioni/date consensi e riferimenti pagamento. Cancellazione annuncio conserva ricevuta; cancellazione utente la elimina tramite CASCADE: matrice Punto 4. Tempi di conservazione da decidere prima di modificare le FK. |
| Account, profili e media | Cancellazione completa demandata allo staff (`IlTuoProfilo.tsx:184`). Rimozione annunci/sottoprofili presente; pulizia Storage separata e soggetta agli errori già descritti in 04-F02. Profili temporanei e FK mancanti restano da verificare, senza presumere residui reali. |
| Cache, backup e fornitori | Endpoint immagine annuncio: cache browser 1 ora, CDN 1 giorno, stale-while-revalidate 7 giorni per contenuti elencati (`annuncio-immagine/route.ts:37`). Eliminazione origine non dimostra rimozione delle copie già distribuite. Retention backup, log, Stripe/SMTP e prassi di ripristino non accessibili. |
| Esportazione | Nessun flusso dedicato trovato nelle aree account/API esaminate o nella mappa. Una procedura manuale resta possibile ma non documentata/verificata; non occorre presumere obbligatoria una funzione self-service. |

### 2.4 Verifiche eseguite e copertura

- `node --test tests/registration-consents.test.mjs tests/registration-consents-database.test.mjs`: **8/8 pass**, compresa migrazione in PostgreSQL isolato PGlite. Provano validazione, persistenza, ownership e comportamento atteso della UI; un test afferma esplicitamente la newsletter attiva di default. Non attestano configurazione remota o correttezza della scelta di prodotto.
- Prova in memoria con JPEG sintetico dotato di EXIF, funzioni reali trascompilate e upload Storage simulato: byte annuncio **identici** all'input, EXIF presenti; output della funzione foto profilo senza EXIF. Nessuna immagine personale, scrittura Storage o richiesta di rete; per la foto profilo usata dimensione ridotta nella fixture.
- Connessioni DB disponibili: `[]`. `chrome-devtools list_pages`: comando non disponibile; nessuna installazione, build o avvio server effettuati.
- Tentata lettura di entrambe le informative agli URL di `EmbedLegalBlink.tsx`: web tool non accessibile e richiesta HTTP locale senza connessione. **Testo vigente non acquisito**, quindi confronto con informative, cookie reali e sequenza accetta/rifiuta/revoca restano non verificati. Il limite dello strumento non prova indisponibilità del sito per i visitatori.
- Nessuna registrazione, pagamento, segnalazione o accesso a record/log personali. Fonti Vercel consultate descrivono il prodotto, non lo stato del progetto. La fotografia del 23 settembre è solo un riferimento storico.

## 3. Findings per severità

Nessun nuovo finding critico confermato. **2 alti, 3 medi, 2 bassi**; configurazioni remote non verificate escluse dal conteggio.

### 🟠 06-F01 — Newsletter selezionata prima di una scelta dell'utente

- **Evidenza:** `src/features/registrati/Registrati.tsx:183`, `useState(true)`; checkbox controllata a `:896`. SQL registra il valore ricevuto (`supabase/migrations/20260923105600_registration_legal_and_newsletter_consents.sql:86`), anche senza interazione sulla checkbox.
- **Impatto:** un account può risultare iscritto senza un'azione distinta sulla newsletter. Il default SQL false tutela i vecchi account, non questo flusso UI. Nessun invio newsletter reale verificato.
- **Azione:** proporre default false e scelta esplicita; adeguare il test che oggi fissa il default true. Far validare testo/finalità al titolare prima di usare le preferenze per campagne. Revoca nelle impostazioni già presente e con ownership verificata.

### 🟠 06-F02 — Le immagini degli annunci conservano EXIF e altri metadati

- **Evidenza:** `src/features/pubblica-annuncio/server/actions.ts:74`, `file.arrayBuffer()` → `:87`, `bucket.upload(path, bytes, ...)`; `src/app/api/metadata/annuncio-immagine/route.ts:37`, risposta con gli stessi byte. Prova sintetica in §2.4.
- **Impatto:** se presenti nell'originale, GPS, autore e informazioni del dispositivo possono essere scaricati insieme alla foto. Conservazione EXIF confermata; non rilevata esposizione di coordinate reali. È distinta dalla vulnerabilità dei percorsi 03-F01.
- **Azione:** ricodificare e rimuovere i metadati prima dello Storage, con limiti di decodifica; pianificare trattamento delle immagini già caricate e delle copie cache. Non basta trasformare la sola anteprima.

### 🟡 06-F03 — Scadenze temporanee senza cancellazione garantita nel tempo

- **Evidenza:** `supabase/migrations/20260823154343_registration_profile_provisioning.sql:131`, `delete ... where expires_at <= now()` dentro la preparazione; `20260825204042_publish_email_otp_rate_limit.sql:50`, pulizia dentro la richiesta OTP. Il cron identificato in `20260911120000_priority_announcement_checkout.sql:635` gestisce priorità annunci, non questi dati.
- **Impatto:** in assenza di traffico le righe scadute possono restare oltre 15 minuti/24 ore. Anche per segnalazioni e ricevute non è definito un termine operativo nelle fonti esaminate. Job esterni potrebbero esistere: non verificabili.
- **Azione:** definire una matrice retention approvata per dataset; prevedere purge periodico osservabile, con eccezioni per ricevute e moderazione. Verificare prima i job remoti, evitando durate inventate o cancellazioni generalizzate.

### 🟡 06-F04 — Cancellazione completa ed export senza procedura verificabile

- **Evidenza:** `src/features/profilo/IlTuoProfilo.tsx:187`, «La cancellazione completa viene gestita dallo staff». Il codice di eliminazione annuncio (`src/features/profilo/server/actions.ts:552`, `:567`) copre annuncio/media, non l'intero account. Nessun runbook completo emerso dalle fonti esaminate.
- **Impatto:** dal repository non è verificabile che richieste manuali includano tutte le copie e i fornitori, né come sia controllata l'identità del richiedente. Non è prova che lo staff non le gestisca. FK e rischi Storage sono già nel Punto 4.
- **Azione:** documentare un flusso manuale eseguibile e verificabile: identificazione proporzionata, inventario/export, cancellazione o conservazione motivata, Storage/cache, fornitori, backup/ripristini, esito. Decidere successivamente se automatizzarlo.

### 🟡 06-F05 — Storico delle preferenze e legame con il testo accettato incompleti

- **Evidenza:** `src/features/profilo/server/actions.ts:504`, aggiornamento di booleano e ultimo timestamp; `supabase/migrations/20260923105600_registration_legal_and_newsletter_consents.sql:5` definisce solo lo stato corrente. `src/features/legal/legal-versions.ts:1` usa versioni data; `src/components/legal/EmbedLegalBlink.tsx:20` carica un URL esterno senza revisione nel percorso.
- **Impatto:** le modifiche newsletter sovrascrivono la scelta precedente; nelle fonti locali manca un collegamento verificabile tra versione registrata e copia immutabile del testo. Non si esclude uno storico presso LegalBlink o altrove.
- **Azione:** verificare gli archivi del fornitore; associare ogni versione a una copia/revisione recuperabile e progettare eventi minimi di concessione/revoca, con retention decisa. Nessuna necessità di aggiungere IP o altri dati personali senza motivazione.

### 🟢 06-F06 — Alcuni errori vengono registrati integralmente

- **Evidenza:** `src/features/auth/server/actions.ts:282`, `console.error("Errore: ", error)`; `src/features/profilo/server/actions.ts:358`, `console.log("Error: ", error)`; messaggio RPC non riconosciuto a `:128`.
- **Impatto:** redazione non uniforme rispetto ai log che limitano l'output a codice/nome; futuri errori di SDK/DB possono includere dettagli superflui. Nessun dato personale nei log remoti è stato osservato.
- **Azione:** consentire solo campi diagnostici definiti e redatti; verificare retention e accessi dei log sul fornitore. Pulizia generale delle console rimandata al Punto 12.

### 🟢 06-F07 — La fotografia privacy storica non descrive più il prodotto

- **Evidenza:** `docs/fotografia-tecnica-privacy-2026-09-23.md:82` dichiara assenza CMP/cookie policy; `:209` assenza checkbox registrazione; `:221` assenza opt-in/revoca newsletter. Oggi smentiti da `src/app/layout.tsx:62`, `src/features/registrati/Registrati.tsx:853` e `src/features/profilo/IlTuoProfilo.tsx:926`.
- **Impatto:** rischio di riutilizzare informazioni superate per informative o decisioni. Il documento conserva valore storico, non va trattato come fotografia vigente.
- **Azione:** contrassegnarlo come superato per tali sezioni e collegare questa analisi; aggiornare il dossier destinato al titolare solo dopo le verifiche remote.

## 4. Checklist azioni

### Eseguibili da agente AI — futura fase di implementazione

- [ ] 06-F01: proporre opt-in newsletter non preselezionato e aggiornare il test relativo.
- [ ] 06-F02: ricodifica immagini annunci; prova di rimozione EXIF e piano per oggetti preesistenti/cache.
- [ ] 06-F03: dopo decisione retention, progettare purge e verifica della sua esecuzione, senza duplicare job remoti.
- [ ] 06-F04: preparare runbook di export/cancellazione usando la matrice del Punto 4 e casi sintetici; separare dati da eliminare e da conservare.
- [ ] 06-F05: collegare versioni a documenti recuperabili e progettare lo storico minimo delle preferenze.
- [ ] 06-F06/07: uniformare redazione log e aggiornare i riferimenti del documento storico.

### Da fare manualmente dal titolare

- [ ] Confermare newsletter/finalità, informazione sul carattere pubblico dei contatti, gestione minori e contenuti di terzi. Valutare le formule obbligatorie dei moduli rispetto ai testi effettivi.
- [ ] Verificare CMP in sessione nuova: nessuna scelta → rifiuto → accettazione selettiva → revoca, includendo YouTube, analytics, navigazioni client e script falliti/lenti. Registrare solo nomi/durate cookie e destinazioni, senza token o dati personali.
- [ ] Recuperare informative vigenti e storico LegalBlink; confrontare categorie dati, destinatari, durata e canali per richieste. Verificare che la CMP possa essere riaperta.
- [ ] Verificare configurazioni di Vercel/Supabase/Stripe/SMTP: regioni, destinatari, conservazione log/backup, job di cleanup, gestione copie dopo ripristino, stato delle migrazioni. Le osservazioni storiche sugli header non certificano le regioni attuali.
- [ ] Approvare tempi e responsabilità per ogni dataset, gestione ricevute e profili temporanei; confermare eventuale procedura staff già esistente e canale email per richieste.
- [ ] Se esiste un sistema newsletter esterno, verificarne sincronizzazione della revoca e conservazione delle preferenze: non deducibili dal solo aggiornamento DB.

## 5. Domande aperte / decisioni

1. Quali informative e revisioni corrispondono alla versione `2026-09-23` registrata nel DB? Quali modifiche richiedono una nuova versione?
2. Quali dati devono sopravvivere alla cancellazione di account/annuncio e per quanto, inclusi pagamenti, segnalazioni e snapshot anonimi?
3. Chi esegue e verifica export/cancellazione su DB, Storage, fornitori e copie? Esiste un runbook esterno da integrare?
4. Qual è la classificazione approvata di analytics/embed nella CMP? Quale comportamento viene effettivamente osservato dopo il rifiuto?
5. Quali garanzie di visibilità vengono promesse per annunci non elencati, foto e profili di minori? Ricollegare la decisione al Punto 3.

## 6. Stato finale e prossimo punto

**Completato** il Punto 6 per le fonti accessibili; verifiche runtime, informative vigenti e configurazioni remote restano nella checklist manuale. Nessun finding è stato corretto. **Migrazioni create/applicate: 0**; nessuna nuova migrazione da applicare per questo punto. Allineamento delle migrazioni preesistenti non verificabile senza catalogo remoto.

Prossimo: **Punto 7 — Confini server/client, React e TypeScript**, profilo consigliato **GPT-6 Sol · high · Default**. Stato e continuità: [AUDIT-MASTER.md](AUDIT-MASTER.md). Fermarsi qui.
