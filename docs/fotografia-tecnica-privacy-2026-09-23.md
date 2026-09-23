# Fotografia tecnica per LegalBlink

Data: 23 settembre 2026. Codice esaminato: commit `9ed219d`.

Documento tecnico descrittivo: distingue implementazione nel repository, riscontri sul sito pubblico e informazioni da confermare nei pannelli dei fornitori. Non attesta la conformità legale della piattaforma.

## Perimetro e limiti della verifica

- Esaminati codice applicativo, dipendenze installate, migrazioni SQL, configurazione locale e documentazione del progetto.
- Eseguite richieste HTTPS di sola lettura alla homepage, alla Privacy policy, alla Cookie policy e ai JavaScript pubblici della homepage.
- Nessun accesso ai pannelli Vercel, Supabase, Stripe, Resend o LegalBlink; nessuna lettura di record personali dal database remoto.
- Non verificato che tutte le migrazioni locali siano applicate in produzione. Il repository non comprende una ricostruzione completa di tutti i vincoli dello schema iniziale.
- La scansione dinamica nel browser non è stata completata per problemi di avvio/connessione dello strumento. L'inventario cookie sotto è ricavato dal codice e dalle librerie installate, non da una scansione completa di tutte le sessioni, degli iframe e del checkout.
- Non effettuati registrazioni, pagamenti, invii di segnalazioni o modifiche al sito/database. Nessun build o server di sviluppo avviato.
- Alcuni punti del README e delle vecchie revisioni descrivono intenzioni o stati precedenti: non sono stati considerati prova di una funzione operativa.

## 1. Hosting, server e localizzazione

**Vercel** ospita l'applicazione Next.js, incluse pagine e funzioni backend. Il riscontro online è l'header `server: Vercel` sulle tre pagine esaminate, tutte con risposta HTTPS 200.

Gli header osservati contengono `x-vercel-id: fra1::iad1::…`. La documentazione Vercel specifica che questo header comprende le regioni attraversate dalla richiesta e la regione di esecuzione della funzione. `fra1` corrisponde a Francoforte, Germania; `iad1` a Washington D.C., Stati Uniti. Il percorso osservato coinvolge quindi gli Stati Uniti: **non è corretto descrivere l'hosting come esclusivamente UE**. L'esatta configurazione di tutte le funzioni, del CDN, delle copie e dei log va verificata nel pannello Vercel.

Fonti: [header Vercel](https://vercel.com/docs/headers/response-headers#x-vercel-id), [regioni Vercel](https://vercel.com/docs/regions). Questi riscontri non determinano la regione del database Supabase.

## 2. Database e servizi cloud

Sono utilizzati **Supabase PostgreSQL**, **Supabase Auth**, **Supabase Storage** e funzioni SQL/RPC.

- PostgreSQL conserva utenti applicativi, profili e sottoprofili, località, annunci, contatti pubblici degli annunci, riferimenti ai media/social, follow, annunci salvati, segnalazioni e ricevute di pubblicazione/pagamento.
- Auth gestisce credenziali, conferma email, sessioni, recupero password e accesso tramite codice email per pubblicare senza registrazione completa.
- Storage conserva immagini. Le migrazioni definiscono `immagini_profili` come bucket pubblico e `immagini_annunci` come bucket privato. Per l'anteprima privata degli annunci sono generati URL firmati temporanei.
- Non risultano integrazioni applicative operative con Supabase Realtime, Edge Functions, vector search o un secondo database. La loro presenza nel file di configurazione standard non ne prova l'utilizzo.

**Regione e piano Supabase non verificati.** `supabase/config.toml` descrive l'ambiente locale e non certifica le impostazioni cloud. La configurazione locale dell'applicazione punta a un progetto Supabase remoto.

Fonti nel progetto: `src/lib/supabase/*`, `src/server/supabase.ts`, `supabase/migrations/20260916160000_profile_images.sql`, `supabase/migrations/20260910120000_publish_announcement_refactor.sql`.

## 3. Servizi esterni integrati

| Servizio | Utilizzo riscontrato | Certezza / limite |
| --- | --- | --- |
| Vercel | Hosting, esecuzione backend, distribuzione risorse | Confermato anche online |
| Supabase | Database, autenticazione, immagini, RPC | Confermato nel codice; impostazioni cloud non consultate |
| Resend | Provider SMTP delle email transazionali | Indicato nel README; da confermare nelle impostazioni SMTP di Supabase |
| Stripe | Checkout ospitato per annunci prioritari e notifiche pagamento/rimborso | Implementato nel codice; nessuna transazione eseguita durante la verifica |
| Vercel Web Analytics | Statistiche di navigazione | Componente globale; SDK rilevato anche nei JavaScript distribuiti |
| Vercel Speed Insights | Prestazioni e Web Vitals | Componente globale; SDK rilevato anche nei JavaScript distribuiti |
| LegalBlink | Termini e Privacy policy caricati in iframe | Privacy iframe confermato anche online |
| YouTube / Google | Video highlights nei profili giocatore tramite iframe `youtube-nocookie.com` | Condizionato alla presenza di un link YouTube valido |
| Instagram e WhatsApp / Meta | Link di contatto e canale WhatsApp | Collegamenti esterni |
| Facebook, WhatsApp e X | Collegamenti per condividere gli articoli | Apertura del servizio al clic, senza SDK social individuato |
| Social e siti indicati dagli utenti | Link di profilo/annuncio, inclusi Instagram, Facebook, YouTube, LinkedIn e altri canali previsti dai modelli | Non equivalgono all'integrazione di un pixel |

Non sono stati trovati un servizio newsletter, un CRM, un captcha operativo, un servizio di chat incorporata, Google Maps, un provider SMS operativo o un servizio esterno dedicato di error tracking. Le email Auth sono inviate da Supabase tramite il mailer configurato, non attraverso un'integrazione Resend diretta nel frontend. Aperture e clic delle email eventualmente tracciati dal provider SMTP non sono verificabili dal repository.

Fonti: `README.md`, `src/app/layout.tsx`, `src/components/legal/EmbedLegalBlink.tsx`, `src/features/dettagli-profilo/components/player/PlayerOverview.tsx`, `src/features/aggiornamenti/ShareButtons.tsx`, `src/const/contactConstants.ts`.

## 4. Google, Meta, TikTok e altri tracker

- Non trovati Google Analytics/GA4, Google Tag Manager, Google Ads, Meta Pixel, TikTok Pixel, Hotjar o Microsoft Clarity nel codice esaminato. Nei bundle della homepage controllati non sono stati trovati i domini dei principali pixel Google/Meta/TikTok.
- È presente **YouTube**, anche se non è presente Google Analytics. L'iframe viene inserito con caricamento lazy e senza un controllo di consenso preventivo nell'applicazione. `youtube-nocookie.com` non consente di dichiarare assenza di richieste o trattamento da parte di Google.
- I font Inter, Lato e Oswald sono importati da `next/font/google`: Next.js li ospita con le risorse del sito. Questa importazione non comporta di per sé una richiesta del browser del visitatore a Google Fonts. Verificato anche sulla guida Next.js installata in `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`.
- Analytics e Speed Insights sono montati nel layout senza un controllo di consenso. Vercel descrive Web Analytics come privo di cookie; resta un servizio di raccolta statistiche. Speed Insights raccoglie misure di prestazione e informazioni tecniche quali URL, browser, dispositivo e paese. L'effettiva ricezione degli eventi nei pannelli non è stata verificata.

Fonti provider: [Web Analytics](https://vercel.com/docs/analytics), [privacy Speed Insights](https://vercel.com/docs/speed-insights/privacy-policy).

## 5. Cookie e memorizzazione nel browser

| Nome/famiglia | Funzione e momento di utilizzo | Durata nel codice |
| --- | --- | --- |
| `sb-<project-ref>-auth-token`, eventualmente suddiviso in `.0`, `.1`, ecc. | Sessione Supabase dopo autenticazione, anche tramite OTP | Default della versione installata di `@supabase/ssr`: 400 giorni di Max-Age; non coincide con la validità del singolo access token |
| `sb-<project-ref>-auth-token-code-verifier`, eventualmente suddiviso | Supporto tecnico PKCE nei flussi che lo richiedono, come il recupero password | Cookie transitorio, rimosso dal flusso; le opzioni di base della libreria prevedono lo stesso Max-Age |
| `bd-report-visitor-v1` | Identificatore casuale creato durante una richiesta di segnalazione anonima; nel database ne viene conservato l'hash SHA-256 | 24 ore, rinnovate dalla richiesta; HttpOnly, SameSite=Lax, Secure in produzione |
| `bd_site_access` | Accesso al sito protetto da password generale, se il gate viene utilizzato | 14 giorni; HttpOnly, SameSite=Lax, Secure in produzione |

Il gate è disabilitato nella configurazione locale esaminata e le pagine pubbliche controllate sono accessibili senza password. Il cookie del gate è quindi **condizionale**, non un cookie che si può dichiarare installato su ogni visita.

Per i cookie Auth, la libreria installata usa `SameSite=Lax`, percorso `/` e `httpOnly: false`: non sono tutti cookie HttpOnly. Non sono state rilevate persistenze applicative dedicate tramite localStorage/sessionStorage nel codice del sito.

Le risposte HTTP delle tre pagine visitate senza sessione non contenevano `Set-Cookie`. Questo **non prova assenza di cookie creati da JavaScript, da iframe o durante login, segnalazioni e pagamento**. I nomi e le durate effettive dei cookie di YouTube, LegalBlink e Stripe richiedono una scansione nel browser dei rispettivi flussi; non vengono inventariati qui come se fossero stati osservati.

Non è stato trovato un banner/CMP che memorizzi le preferenze e governi preventivamente i caricamenti. La route `/cookie-policy` mostra **“In arrivo…”**, confermato anche sul sito pubblico.

Fonti: `src/features/segnalazioni/server/actions.ts`, `src/app/accesso/actions.ts`, `src/lib/supabase/*`, `node_modules/@supabase/ssr/src/utils/constants.ts`, `src/components/legal/EmbedLegalBlink.tsx`.

## 6. Pagamenti e dati in transito

Il codice usa **Stripe Checkout ospitato**: il backend crea una sessione e reindirizza l'utente alla pagina Stripe. L'acquisto previsto è una tantum, per l'annuncio prioritario, con prezzo atteso di 7,99 EUR prima di eventuali promozioni.

Il sito invia a Stripe identificativi di annuncio e invio, identificativo prezzo, quantità, riferimenti della sessione e URL di ritorno. Non passa esplicitamente l'email dell'account come `customer_email` in questa chiamata.

Il checkout abilita la raccolta del **telefono** (`phone_number_collection.enabled = true`) e la raccolta automatica dell'indirizzo di fatturazione (`billing_address_collection = auto`). Stripe raccoglie i dati necessari al metodo di pagamento e al checkout, inclusa l'email prevista dal proprio flusso. I metodi di pagamento effettivamente offerti dipendono dalle impostazioni Stripe.

Numero completo della carta e CVC sono inseriti sulla pagina Stripe; non sono raccolti dai form del sito né risultano campi per conservarli nel database applicativo. Il backend riceve però oggetti Checkout tramite API e webhook: questi possono contenere email, telefono e dati di fatturazione del cliente. È quindi inesatto affermare che nessun dato personale del pagamento transiti sul backend.

La persistenza implementata riguarda ID sessione, PaymentIntent, prezzo, importi, valuta, stato pagamento/checkout, date e riferimenti/stati dei rimborsi, associati all'invio dell'annuncio. Il codice non salva l'intero payload Stripe. Il webhook verifica la firma prima dell'elaborazione.

Fonti: `src/app/api/create-checkout-session/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/features/pubblica-annuncio/server/stripe-checkout.ts`, migrazioni del checkout prioritario.

## 7. Trattamenti e trasferimenti fuori SEE/UE

Esiste un riscontro concreto di coinvolgimento degli **Stati Uniti nel percorso Vercel**, descritto al punto 1. Non è possibile dichiarare che tutti i dati restino nell'UE, anche se successivamente si confermasse una regione europea del database.

Stripe dichiara nel proprio DPA trasferimenti verso Stripe LLC negli Stati Uniti e trattamenti internazionali necessari ai servizi. Resend dichiara conservazione di dati negli Stati Uniti, inclusi contenuto dei messaggi e log: questo punto si applica alla piattaforma se Resend è effettivamente il mailer configurato. [Stripe DPA](https://stripe.com/legal/dpa), [Resend GDPR](https://resend.com/security/gdpr).

Anche le richieste a YouTube e agli iframe LegalBlink, le statistiche Vercel e l'uso dei collegamenti social vanno inclusi nella mappatura dei destinatari e dei trattamenti pertinenti. Le specifiche localizzazioni, i subfornitori, gli accessi di assistenza e le condizioni contrattuali di ciascun account richiedono i documenti e i pannelli dei provider. La sede della società non equivale alla regione di archiviazione.

## 8. Backup: frequenza, conservazione e ubicazione

**Non verificati per il progetto in uso.** Non sono stati trovati script/job di backup applicativi o un piano documentato di copie, retention, ubicazione e prove di ripristino.

Per Supabase occorre verificare piano, sezione Database → Backups, backup disponibili e eventuale PITR. Non si può attribuire al sito una frequenza o retention usando soltanto i valori standard di un piano non conosciuto.

La documentazione Supabase precisa che i backup del database non comprendono i file conservati tramite Storage, ma i relativi metadati: **foto profilo e immagini annuncio richiedono una verifica di backup distinta**. Anche deployment Vercel e repository Git non costituiscono un backup completo dei dati degli utenti. [Backup Supabase](https://supabase.com/docs/guides/platform/backups).

## 9. Misure di sicurezza presenti e non accertate

| Misura | Stato tecnico |
| --- | --- |
| HTTPS/TLS e HSTS | Confermati sulle pagine pubbliche esaminate; HSTS `max-age=63072000` |
| Password | Gestite da Supabase Auth; hashing bcrypt con salt secondo il provider. Il codice applicativo richiede almeno 8 caratteri in registrazione/reset |
| Autenticazione backend | Verifica di claims e utente tramite Supabase; controllo dell'email confermata; verifiche di proprietà prima delle operazioni personali |
| Database | Migrazioni con RLS, grant limitati, policy di proprietà e schema privato per ricevute/segnalazioni. Applicazione remota di tutte le migrazioni non certificata |
| Chiavi privilegiate | Client amministrativo marcato `server-only`, chiave letta da variabile server. Questo client ha privilegi estesi: per le pagine pubbliche il codice seleziona esplicitamente i campi pubblicabili |
| Validazione | Controlli server su campi, tipi, dimensioni, UUID, link e contenuti; RPC transazionali e invii idempotenti |
| Protezioni da abuso | OTP pubblicazione: 60 secondi fra richieste e 5 richieste/24h per hash email nelle migrazioni; un annuncio/24h per utente senza registrazione completa; segnalazioni limitate per identità/contenuto a 24h |
| Immagini | Limiti di formato/dimensione; ricodifica immagini profilo con Sharp; verifica della firma dei file annuncio. Non è una scansione antivirus |
| Pagamenti | Firma webhook Stripe e controlli su proprietà, prezzo e corrispondenza della sessione |
| DDoS | Vercel documenta mitigazione automatica di piattaforma su tutti i piani |
| 2FA utenti | Non trovata un'interfaccia o un flusso MFA operativo. Conferma email e OTP passwordless non dimostrano 2FA |
| 2FA amministratori | Impostazioni dei pannelli provider non verificate |
| WAF e firewall specifici | Regole personalizzate, restrizioni IP e relativi pannelli non verificati |
| Malware | Non trovato un servizio applicativo antivirus/antimalware |
| Logging | Presenti log server di errori/esiti tecnici con `console.error`; non trovato un audit log applicativo completo delle azioni amministrative. Retention, localizzazione e accessi ai log provider da verificare |
| CSP | Non configurata in `next.config.ts` e non osservata sulle tre risposte pubbliche controllate |

I limiti Auth di `supabase/config.toml` valgono come configurazione locale, non come prova della configurazione cloud. Non è stato svolto un penetration test.

Fonti: [password Supabase](https://supabase.com/docs/guides/auth/password-security), [DDoS Vercel](https://vercel.com/docs/vercel-firewall/ddos-mitigation), `src/features/auth/server/queries.ts`, `src/features/auth/validation.ts`, `src/features/profilo/server/profile-image-processing.ts`, `supabase/migrations`.

## 10. Chi accede a server, database e backend

Nel funzionamento applicativo, gli utenti autenticati accedono ai propri dati attraverso sessione e policy; i visitatori ricevono i dati selezionati per le pagine pubbliche. Il backend dispone anche di una credenziale Supabase privilegiata.

Può avere accesso amministrativo chi dispone di ruoli adeguati nei team Vercel/Supabase/Stripe/Resend/LegalBlink o delle rispettive credenziali privilegiate. Chi può distribuire codice o amministrare le variabili server può avere capacità operative rilevanti sui dati. **Nominativi, numero di persone, ruoli effettivi e MFA non sono ricavabili dal codice.** Non si può desumere dal nome dello sviluppatore nel README chi abbia accesso attuale.

Non è stata trovata una dashboard amministrativa completa nel codice applicativo esaminato, nonostante riferimenti nel README. I nomi `createAdminClient` o il ruolo tecnico `service_role` non sono una dashboard o un elenco di amministratori umani.

## 11. Dati reali in test/staging

**Non determinabile dalla verifica.** Il repository non dimostra una separazione effettiva di database, account e dati fra sviluppo, preview/staging e produzione, né una procedura di anonimizzazione delle copie.

La configurazione locale punta a un Supabase remoto e contiene una chiave Stripe di modalità **live**. Questo non prova che siano stati usati dati reali nei test, ma impedisce di descrivere l'ambiente locale come certamente isolato o soltanto di test. Non sono stati mostrati né copiati i valori delle credenziali.

Da confrontare: variabili Production/Preview/Development in Vercel, progetti Supabase effettivi e prassi di chi esegue i test. La tabella `private.registration_intent` è una preparazione temporanea della registrazione e non identifica un ambiente di staging separato.

## 12. Dati raccolti in registrazione e dati pubblici

La registrazione raccoglie email, password e conferma password, selezione di uno o più sottoprofili (massimo cinque) e dati dei sottoprofili. La conferma password è usata per validazione e non è un campo del profilo.

| Ambito | Dati raccolti e pubblicazione |
| --- | --- |
| Account | Email di accesso, identificativi interni, date di creazione/registrazione/conferma/accesso e dati di sessione: non sono pubblicati come recapiti del profilo |
| Giocatore | Nome, cognome se compilato, data di nascita se compilata, località, sport, ruoli, categorie cercate, disponibilità, piede, altezza/peso, presentazione, carriera, link highlights e richiesta di assistenza caricamento highlights |
| Squadra | Nome società, sport, sede, presentazione, località e link social |
| Staff / arbitro | Nome, cognome e nascita se compilati, disponibilità, presentazione, esperienze, località; figure professionali per staff |
| Tornei / impianti | Nome organizzazione, sede, sport, descrizione/località; per impianti anche servizi, orari e costo |
| Immagini / link | Foto dell'account o del sottoprofilo, link social e video aggiungibili nella gestione del profilo |

Professionisti/studi e creator hanno modelli nel codice ma risultano ancora contrassegnati come non registrabili nella configurazione esaminata.

Nelle directory e nei dettagli pubblici vengono esposti nome/denominazione, foto, località, informazioni sportive/professionali, presentazioni, esperienze, social e video quando presenti. Per il giocatore viene calcolata e mostrata **l'età**, senza inviare al componente pubblico giorno, mese e anno di nascita. Le query degli altri dettagli pubblici esaminati non selezionano le date di nascita. Email Auth, credenziali e note private non fanno parte della proiezione pubblica del profilo.

I recapiti email/telefono indicati **nell'annuncio** diventano invece pubblici sul dettaglio dell'annuncio pubblicato. Sono distinti dall'email privata usata per verificare l'identità. La pubblicazione senza profilo completo crea comunque un'identità Auth tramite OTP e record associati: “senza registrazione” non significa anonimato del trattamento.

Sono memorizzati anche follow e annunci salvati. Il numero dei follower è pubblico; le relazioni sono consultabili nelle sezioni personali pertinenti, quindi chi segue un profilo non va descritto come anonimo al titolare di quel profilo. I contenuti liberi possono contenere ulteriori dati inseriti dall'utente.

È presente una validazione di età minima di 14 anni quando viene compilata la nascita. La nascita può essere omessa: non è una verifica documentale dell'età né un controllo universale dell'accesso dei minori.

Le immagini profilo sono in un bucket pubblico: un URL noto può rimanere accessibile finché l'oggetto non è rimosso, anche se una pagina viene nascosta.

Fonti: `src/features/registrati/Registrati.tsx`, `src/features/registrati/server/registration.ts`, `src/features/profilo/profile-required-fields.ts`, `src/features/profili/server/queries.ts`, `src/features/dettagli-profilo/server/profile-detail-query.ts`, `src/features/dettagli-profilo/server/player-profile-data.ts`, `src/features/annunci/server/queries.ts`, `src/features/interazioni/server/queries.ts`.

## 13. Cancellazione account: comportamento attuale

**Non esiste un flusso applicativo completo di eliminazione dell'account individuato nel repository.** L'area personale invita a contattare lo staff per la cancellazione completa. Non è stata trovata una procedura che coordini automaticamente revoca sessioni, Auth, dati applicativi, file, Stripe e altre copie.

Sono implementate operazioni più circoscritte:

- modifica e rimozione di sottoprofili; la logica vieta di eliminare l'ultimo sottoprofilo;
- rimozione di immagini, con tentativo di pulizia dello Storage;
- nascondimento ed eliminazione dei propri annunci;
- rimozione di follow e annunci salvati.

La cancellazione di un annuncio lascia la ricevuta privata di pubblicazione: la FK verso l'annuncio usa `ON DELETE SET NULL`. La ricevuta conserva email, consensi e gli eventuali riferimenti del pagamento. Le operazioni Storage sono separate dalla cancellazione DB: se la pulizia fallisce, l'errore viene registrato e possono rimanere file.

La FK `utente.auth_user_uuid → auth.users.id` è definita `ON DELETE CASCADE`; anche le ricevute dipendono dall'utente con cascade. Altri collegamenti storici prevedono disassociazione tramite `SET NULL`. Questi vincoli **non costituiscono una garanzia di cancellazione completa**: lo schema remoto, i profili snapshot degli annunci senza registrazione, gli oggetti Storage e tutte le dipendenze vanno verificati prima di descrivere una cancellazione manuale come definitiva.

Le segnalazioni scollegano il segnalatore quando l'utente viene cancellato; quelle riferite a un contenuto cancellato hanno cascade sul contenuto. La cancellazione dell'account non ha un'integrazione automatica individuata per eliminare dati Stripe, email già inviate, log o copie di backup. Non risulta una retention generale automatizzata di tutti questi dati.

Fonti: `src/features/profilo/IlTuoProfilo.tsx`, `src/features/profilo/server/actions.ts`, `supabase/migrations/20260823154343_registration_profile_provisioning.sql`, `supabase/migrations/20260824195350_publish_announcement_workflow.sql`, `supabase/migrations/20260917124241_segnalazioni.sql`.

## 14. Data/ora e versione di Termini e Privacy

**Già implementate per la pubblicazione degli annunci** nella tabella `private.announcement_submission`: `terms_version`, `privacy_version`, `terms_accepted_at`, `privacy_accepted_at`, `data_confirmed_at`, con identificativo utente/invio ed email normalizzata. Il timestamp viene registrato dal database all'invio riuscito, non al semplice clic sulla checkbox.

Il server usa attualmente le versioni fisse **`2026-08-24` per entrambi i documenti**, e le migrazioni contengono la relativa validazione. Non risulta una sincronizzazione automatica con la versione dei documenti visualizzati negli iframe LegalBlink, né un'archiviazione del testo esatto accettato. Non si può quindi assumere che un documento aggiornato in LegalBlink aggiorni anche la ricevuta.

**Non implementate nella registrazione account**: non sono state trovate checkbox legali, parametri di accettazione o ricevute dedicate in quel flusso. La versione del payload JSON di registrazione è una versione tecnica del formato, non la versione della Privacy policy.

Il sistema può essere esteso per raccogliere questi eventi anche in registrazione e associarli a versioni documentali effettive.

## 15. Checkbox separate

**Già presenti nel riepilogo di pubblicazione**, prima dell'eventuale pagamento: correttezza dati, accettazione Termini e Privacy sono tre checkbox separate, inizialmente non selezionate, tutte richieste e validate anche sul server.

La checkbox privacy usa attualmente la formulazione “Ho letto l'informativa sulla Privacy e acconsento al trattamento dei miei dati”. Questa è la formulazione tecnica attuale da sottoporre a LegalBlink per distinguere presa visione, condizioni e consensi relativi alle singole finalità.

**Registrazione:** estendibile, ma le checkbox legali non sono presenti. **Pagina Stripe ospitata:** nella chiamata di creazione della sessione non sono configurati campi di consenso/accettazione specifici; le checkbox esistenti sono nel sito prima del redirect. Il flusso può essere esteso con scelte separate e relative ricevute; i controlli disponibili dentro Stripe dipendono dalle opzioni del checkout ospitato.

Non sono stati trovati opt-in newsletter/marketing o un sistema per gestirne revoca e storico.

Fonti punti 14–15: `src/features/pubblica-annuncio/components/ConfermaInvioAnnuncio.tsx`, `src/features/pubblica-annuncio/server/validation.ts`, `src/features/pubblica-annuncio/server/actions.ts`, migrazione `20260824195350_publish_announcement_workflow.sql`, `src/features/auth/server/actions.ts`, `src/app/api/create-checkout-session/route.ts`.

## 16. Segnala contenuto

**Già implementato nel codice per annunci e profili**, con pulsante/modal nei dettagli pubblici, azione server e tabella `private.segnalazioni`.

La segnalazione registra contenuto interessato, data/ora, motivazione facoltativa fino a 300 caratteri e identificativo del segnalatore autenticato oppure hash dell'identificatore anonimo. Il limite è una segnalazione per la stessa identità sullo stesso contenuto ogni 24 ore. L'azione applicativa non salva un IP dedicato nella segnalazione; ciò non esclude log infrastrutturali.

Non sono stati trovati una console completa di gestione delle segnalazioni o notifiche automatiche allo staff. La raccolta è implementata; il processo operativo di lettura e moderazione va confermato. Nessuna segnalazione di prova è stata inviata.

Fonti: `src/features/segnalazioni/*`, `src/features/interazioni/DetailActions.tsx`, `supabase/migrations/20260917124241_segnalazioni.sql`.

## 17. Esportazione, modifica e cancellazione per richiesta privacy

- **Modifica:** l'utente può già modificare molti dati dei sottoprofili e le immagini, oltre a reimpostare la password. Questo non equivale a un editor completo di tutti i dati trattati; per esempio i contenuti di un annuncio si gestiscono eliminandolo e ripubblicandolo.
- **Esportazione:** non è stato trovato un pulsante o endpoint che esporti in modo completo i dati di un singolo utente. L'estrazione è tecnicamente fattibile da parte di un operatore autorizzato, correlando identificativo Auth, utente applicativo, profili, annunci, ricevute, file e interazioni.
- **Cancellazione completa:** richiede oggi una procedura tecnica assistita; non è disponibile un'unica operazione applicativa verificata. Sono da includere anche dati dei provider esterni e le regole applicabili alle copie conservate.

La struttura a identificativi consente di realizzare un flusso dedicato di accesso/esportazione/rettifica/cancellazione. Allo stato attuale non lo descriverei come una funzione completa già disponibile “con un clic”.

## Informazioni da raccogliere dai pannelli per completare la scheda

1. Vercel: regioni configurate delle funzioni, team/ruoli/MFA, regole WAF, destinazione e retention dei log, impostazioni dei deployment preview.
2. Supabase: regione, piano, migrazioni effettive, backup/PITR e retention, copie Storage, membri/ruoli/MFA, restrizioni rete e impostazioni Auth/SMTP.
3. Resend/SMTP: conferma del provider, eventuale tracciamento aperture/clic, retention di messaggi e log, soggetti con accesso.
4. Stripe: modalità di produzione e ambienti di test, metodi di pagamento attivi, utenti/ruoli, impostazioni effettive del checkout.
5. Test/staging: progetti e credenziali realmente usati, eventuale copia o inserimento di dati reali.
6. Gestione dati: procedura effettiva dello staff per cancellazioni, esportazioni, segnalazioni e trattamento delle copie residue.
7. Browser: scansione completa di visita anonima, autenticazione, segnalazioni, pagine legali, video e checkout per finalizzare l'inventario cookie/tecnologie terze.
