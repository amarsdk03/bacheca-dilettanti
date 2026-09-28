# 03 — Autorizzazioni Supabase, RLS, RPC e Storage

## 1. Obiettivo e ambito

Ricostruire gli accessi diretti al database e quelli mediati dal backend, verificando ownership, grant, RLS, RPC privilegiate e immagini. Sola analisi sul commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`, **2026-09-28**; nessuna modifica applicativa o remota.

## 2. File/aree analizzate

- Base: [mappa del Punto 0](00-mappa-codebase.md), §3.5–3.9; [Punto 2](02-sicurezza-server-auth.md), confini server e decisione sulle preview.
- `supabase/migrations/`: dichiarazioni di sicurezza nelle **48 migrazioni**, incluse le 16 aggiunte dopo la mappa; lettura mirata dei corpi e della catena di sostituzioni/rename per registrazione, pubblicazione, profili, checkout e inviti. Le famiglie di tabelle della mappa restano 34 pubbliche e 4 private.
- `supabase/config.toml`, `src/lib/supabase/admin.ts`, `src/server/supabase.ts`.
- `src/features/{profilo,pubblica-annuncio}/server/actions.ts`, query pubbliche in `src/features/annunci/server/queries.ts` e `src/features/dettagli-profilo/server/profile-detail-query.ts`; `src/features/profilo/server/profile-images.ts`.
- `src/app/api/metadata/annuncio-immagine/route.ts`, SDK Storage installato, `tests/interaction-database.test.mjs`, `tests/invitation-codes-database.test.mjs`.
- Modifiche locali preesistenti: due documenti di refactoring eliminati e `src/features/registrati/Registrati.tsx` modificato; non alterati dall'audit.

**Limite remoto:** il 2026-09-28 `list_database_connections` dell'IDE restituisce `connections: []`; nessun collegamento Supabase utilizzabile per i cataloghi. Schema applicato, proprietari degli oggetti, ACL ereditate, policy aggiuntive, configurazione Data API e bucket remoti **non verificabili con gli accessi disponibili**. Nessun record personale o segreto letto.

Fonti tecniche: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [funzioni e privilegi EXECUTE](https://supabase.com/docs/guides/database/functions), [controllo accessi Storage](https://supabase.com/docs/guides/storage/security/access-control). Grant e RLS vanno verificati insieme; il client server privilegiato può superare le policy e richiede controlli applicativi.

### 2.1 Matrice tabelle: accesso diretto dichiarato localmente

`S/I/U/D` = SELECT/INSERT/UPDATE/DELETE. Le colonne client descrivono l'intenzione delle dichiarazioni locali **a condizione che RLS sia abilitata e non esistano altri grant/policy**. `—` = nessun accesso previsto dalle dichiarazioni esaminate; non è una prova sul DB remoto. Gli SQL citati nelle matrici sono relativi a `supabase/migrations/`.

| Risorsa | anon | authenticated | service_role / backend | Evidenza |
|---|---|---|---|---|
| `utente`, `profilo` | — | S propria identità/proprietà; I/U/D negati | ALL dichiarato | Grant `20260823154343_registration_profile_provisioning.sql:667`; policy `20260824195359_reconcile_auth_identity_registration.sql:583`, `:590` |
| 8 sottoprofili, `localita_profilo`, `link_social_profilo` | — | S tramite profilo proprio; I/U/D negati | ALL dichiarato | Grant stessa migrazione provisioning `:682`, `:695`; policy riconciliazione `:604`–`:749` |
| `media_profilo` | — | S tramite profilo proprio; I/U/D negati | ALL dichiarato | `20260923130000_restore_profile_highlights_helpers.sql:18`, `:20`, `:21`, `:37` |
| `annuncio` | — | S/D propri; U della sola colonna `nascosto`; I negato | Uso admin presente; ACL iniziale non ricostruita | `20260823162929_profile_dashboard_connection.sql:598`, `:614`, `:615`; policy riconciliazione `:765`, `:787`, `:825` |
| 12 dettagli annuncio, `localita_annuncio`, `link_social_annuncio`, `media_annuncio` | — | S se visibile l'annuncio padre; I/U/D negati | Uso admin/definer; ACL iniziale non ricostruita | `20260823162929_profile_dashboard_connection.sql:599`, `:680`–`:722` |
| `contatto_annuncio` | — | S del creatore dell'annuncio; I/U/D negati | S dichiarato; inserimento tramite RPC definer | `20260824195350_publish_announcement_workflow.sql:14`, `:16`, `:18` |
| `profilo_follow` | — | S se partecipante registrato; I/U/D negati | S/I/D; nessun U concesso | `20260919115906_profile_follows_and_saved_announcements.sql:36`, `:39`, `:41` |
| `annuncio_salvato` | — | S del proprietario registrato; I/U/D negati | S/I/D; nessun U concesso | Stessa migrazione `:36`, `:39`, `:56` |
| `invito` | — | — | S e U della sola colonna `considerato`; provisioning via definer | `20260924173632_invitation_codes.sql:52`, `:53`, `:55` |
| `sport` | ? | ? | ACL iniziale non ricostruita | Tabella nella mappa §3.5; nessuna definizione locale completa di grant/RLS |
| `private.registration_intent` | — | — | S/I/D | `20260823154343_registration_profile_provisioning.sql:21`, `:26`; policy restrittiva `20260823154731_registration_intent_deny_policy.sql:5` |
| `private.announcement_submission` | — | — | S dichiarato; mutazioni tramite definer | `20260824195350_publish_announcement_workflow.sql:66`, `:69`, `:70` |
| `private.publish_email_otp_request` | — | — | S/I/D dichiarati | `20260825204042_publish_email_otp_rate_limit.sql:19`, `:22`, `:24` |
| `private.segnalazioni` | — | — | S/I e RPC dedicata | `20260917124241_segnalazioni.sql:64`, `:67`, `:69`, `:215` |

Controlli significativi:

- La policy UPDATE di `annuncio` contiene sia `USING` sia `WITH CHECK`; la proprietà deriva da `creato_da` **oppure** dal proprietario di `autore_annuncio`. La sola colonna aggiornabile dichiarata è `nascosto`, non autore/stato/priorità.
- Le policy dei dettagli delegano al padre con `exists (... public.annuncio ...)`: la loro efficacia dipende anche dalla RLS del padre. I contatti usano il creatore, non l'alternativa autore del profilo.
- Nove tabelle hanno un'abilitazione RLS esplicita nelle migrazioni: le cinque pubbliche create localmente e le quattro private. Nessuna policy CRUD aggiuntiva è necessaria per tabelle volutamente riservate a funzioni/server: l'assenza da sola non costituisce una vulnerabilità.
- `private` revoca l'accesso a PUBLIC/anon/authenticated (`20260824195359_reconcile_auth_identity_registration.sql:7`); gli schemi Data API locali sono `public` e `graphql_public` (`supabase/config.toml:13`). Nessuna definizione di vista o `ALTER DEFAULT PRIVILEGES` trovata nelle migrazioni. Eventuali viste, policy e privilegi preesistenti richiedono i cataloghi remoti.

### 2.2 Matrice RPC e ownership

Accessi espliciti ricostruiti, inclusi nomi legacy: la presenza di una funzione nei tipi TypeScript non prova che sia esposta. Le funzioni privilegiate esaminate impostano `search_path = ''`; questo non sostituisce la verifica di EXECUTE e identità.

| RPC pubblica / gruppo | Chiamante autorizzato dalle dichiarazioni | Controllo o contratto di fiducia | Evidenza SQL |
|---|---|---|---|
| `complete_registration_v1` | authenticated | `auth.uid()`, utente Auth non anonimo, email confermata, intent non scaduto e stessa email | `20260824195359_reconcile_auth_identity_registration.sql:512`, `:534`, `:558`, `:575` |
| `publish_announcement_v1` | authenticated, ancora direttamente chiamabile | Identità/sessione e payload nella catena core; controllo immagine insufficiente: **03-F01** | `20260923222553_enforce_required_subprofile_fields.sql:180`; grant `20260924122000_reconcile_publish_dates_and_profile_snapshots.sql:242` |
| `publish_announcement_v2` | authenticated | `auth.uid()`, blocco nuove priorità, delega a core v2 → v1; profilo ricavato dalla submission | `20260928141148_refactor_profile_publication_fields.sql:276`, `:294`, `:305`, `:389`; `20260923212945_restore_publish_announcement_core_v2.sql:47` |
| `get_owned_priority_checkout_v1` | authenticated | Identità Auth e ricevuta del proprietario | `20260911120000_priority_announcement_checkout.sql:202`, `:228`, `:238` |
| `prepare_registration`, `cancel_registration`, `get_registration_email_identity_v1`, `consume_publish_email_otp_request_v1` | service_role | Backend fidato; ricerca identità e consumo OTP non concessi al client | `20260924173632_invitation_codes.sql:144`; `20260823154343_registration_profile_provisioning.sql:152`; `20260907154436_optimize_auth_email_identity_lookup.sql:127`; `20260825204042_publish_email_otp_rate_limit.sql:90` |
| `save_owned_subprofile`, `set_owned_primary_subprofile`, `delete_owned_subprofile`, `save_owned_profile_social_links_v1`, `save_owned_subprofile_with_social_links_v1` | service_role | `p_user_id` fornito dal server; conversione Auth UUID → utente registrato, quindi proprietà profilo | `20260824195359_reconcile_auth_identity_registration.sql:95`, `:199`; `20260910120000_publish_announcement_refactor.sql:101`; `20260918224544_profile_social_links_and_highlights_request.sql:305`; `20260923222553_enforce_required_subprofile_fields.sql:169` |
| `record_priority_checkout_session_v1`, `record_priority_checkout_event_v1`, `record_priority_refund_v1` | service_role | Scritture privilegiate solo backend; logica pagamenti demandata al Punto 5 | `20260914140000_fix_priority_checkout_greatest.sql:68`; `20260914130000_reconcile_priority_checkout_amount_rpc.sql:234`, `:314` |
| `submit_segnalazione_v1` | service_role | Il backend determina identità/hash del segnalatore | `20260917124241_segnalazioni.sql:213` |
| `prepare_registration_core_v1` | service_role ereditato dopo rename | Helper legacy nello schema pubblico, revocato ai client | `20260924173632_invitation_codes.sql:112`, `:114` |
| `publish_announcement_core_v1` | Revocato anche a service_role; uso interno tramite definer | Nome legacy pubblico, non RPC client autorizzata | `20260924122000_reconcile_publish_dates_and_profile_snapshots.sql:139` |

Helper e trigger in `private` operano dietro questi ingressi; le nuove funzioni di carriera/social revocano PUBLIC/anon/authenticated e concedono EXECUTE al servizio (`20260928141148_refactor_profile_publication_fields.sql:383`). Proprietari effettivi e overload remoti restano da confrontare. L'autorizzazione non deriva da ruoli dichiarati dal client in `user_metadata` nei percorsi esaminati; l'intent di registrazione viene risolto contro dati server.

Nel backend profilo, `p_user_id` proviene dal viewer autenticato (`src/features/profilo/server/actions.ts:305`, `:342`, `:383`, `:424`), mentre immagini e newsletter verificano gli identificativi proprietari (`:48`, `:63`, `:508`). Visibilità e cancellazione annunci usano il client di sessione (`:465`, `:543`), quindi richiedono RLS effettiva. Il servizio rimuove i media dopo la cancellazione riuscita (`:567`).

### 2.3 Storage e letture pubbliche mediate dal server

| Risorsa / operazione | anon e authenticated | Server | Evidenza |
|---|---|---|---|
| `immagini_annunci`: download | Nessuna policy diretta definita localmente; bucket privato. Endpoint applicativo disponibile tramite UUID | Download privilegiato del percorso salvato | `20260910120000_publish_announcement_refactor.sql:10`; `src/app/api/metadata/annuncio-immagine/route.ts:26` |
| `immagini_annunci`: I/U/D | Nessuna nuova policy client nel set SQL | Upload con percorso costruito dal backend, rimozione server | `src/features/pubblica-annuncio/server/actions.ts:64`, `:87`, `:100` |
| `immagini_profili`: download | Oggetti accessibili tramite URL pubblico, senza vincolo sul profilo nascosto | URL risolto dai media dei profili richiesti | `20260916160000_profile_images.sql:43`; `src/features/profilo/server/profile-images.ts:18` |
| `immagini_profili`: I/U/D | Tre policy di scrittura note rimosse; eventuali altre policy remote ignote | Ownership, conversione immagine, chiave generata dal server | `20260916160000_profile_images.sql:65`; `src/features/profilo/server/actions.ts:63`, `:169` |

I bucket dichiarano rispettivamente 5 MiB PNG/JPEG/WebP e 2 MiB WebP. Non risultano nuove `CREATE POLICY` su `storage.objects` nelle 48 migrazioni; ciò è compatibile con upload server e non certifica le policy remote.

Le liste pubbliche applicano filtri di pubblicazione (`src/features/annunci/server/queries.ts:122`); il dettaglio caricato con admin interroga il solo UUID e carica anche i contatti (`:816`, `:835`). Nell'endpoint immagine, `isAnnouncementListed` cambia la cache, non l'accesso (`src/app/api/metadata/annuncio-immagine/route.ts:31`). È la decisione preview già aperta nel **Punto 2 §5**: `privato`/nascosto non implicano qui riservatezza del link. I profili pubblici filtrano `nascosto = false` (`src/features/dettagli-profilo/server/profile-detail-query.ts:445`), ma questo non revoca URL Storage già conosciuti.

## 3. Findings per severità

### 🟠 03-F01 — Il percorso immagine accettato dalla RPC può uscire dal bucket previsto

**Confermato nel codice e in prova SDK isolata; sfruttabilità sul deployment non verificata.**

- **Evidenza:** `supabase/migrations/20260923222553_enforce_required_subprofile_fields.sql:260`: `v_image_path not like v_auth_user_id::text || '/' || p_submission_id::text || '/%'`. Il controllo richiede il prefisso e massimo 300 caratteri, ma ammette segmenti `..`; il valore viene salvato in `media_annuncio` a `:396`. La RPC v1 conserva EXECUTE per authenticated ed è richiamata anche dalla catena v2.
- **Destinazione privilegiata:** `src/app/api/metadata/annuncio-immagine/route.ts:28`: `.download(media.link_media, ...)`, con client admin creato a `:12`. L'SDK interpola bucket/percorso senza eliminare i segmenti pericolosi prima della costruzione URL (`node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts:909`, `:1495`). Il body è restituito con MIME preso dal DB a `route.ts:37`, senza decodifica immagine.
- **Prova senza rete:** con UUID sintetici, la chiave `<auth>/<submission>/../../../audit-other-bucket/known.webp` passa il controllo equivalente del prefisso/lunghezza. Il vero `StorageClient` installato, con fetch simulato e `Request`, produce `GET /storage/v1/object/audit-other-bucket/known.webp`. Risultati: guardia accettata, nessun errore SDK, 3 byte sintetici restituiti, **zero richieste di rete**. Non sono stati simulati l'intero schema SQL o il gateway Storage remoto.
- **Impatto:** un utente capace di completare una pubblicazione RPC valida può proporre una chiave che punta a un oggetto altrui o in un altro bucket. Con chiave bersaglio conosciuta e configurazione remota corrispondente, l'endpoint può restituire i byte usando privilegi server, anche senza annuncio elencato. Non è stata dimostrata enumerazione di oggetti né lettura di dati reali. Il percorso sicuro generato dalla Server Action non protegge la RPC chiamabile direttamente.
- **Azione consigliata:** validare nella catena RPC una chiave canonica con segmenti e formato strettamente ammessi, legata all'upload/bucket/proprietario effettivi; validare nuovamente prima del download admin. Coprire v1 e v2, traversal normale/codificato e riferimenti già persistiti. In una fase autorizzata verificare eventuali media preesistenti anomali senza scaricarne indiscriminatamente il contenuto.

### 🟡 03-F02 — Il baseline dei permessi non consente di attestare l'isolamento di 29 tabelle

**Confermata lacuna delle fonti; eventuale esposizione remota da verificare con priorità alta.**

- **Evidenza:** `supabase/migrations/20260823162929_profile_dashboard_connection.sql:598`, `:614`, `:615`: grant `select`, `update (nascosto)` e `delete` su `annuncio`; policy ownership successive a `supabase/migrations/20260824195359_reconcile_auth_identity_registration.sql:765`. Nelle 48 migrazioni non è definito il baseline di 29 tabelle pubbliche né il loro `ENABLE ROW LEVEL SECURITY`. Le nove abilitazioni presenti riguardano le tabelle create localmente. I revoke storici su profili/annunci nominano anon/authenticated, senza ricostruire ACL di colonna, PUBLIC o policy preesistenti.
- **Impatto:** non si può certificare l'accesso “solo proprio” dalla sola presenza delle policy. Se RLS fosse disabilitata su `annuncio`, quei grant consentirebbero operazioni su altre righe; policy permissive o grant ereditati potrebbero ampliare gli accessi anche con RLS attiva. **Non è stato accertato che queste condizioni esistano in produzione.** L'assenza del baseline limita anche la riproduzione completa dell'audit in locale.
- **Azione consigliata:** ottenere uno snapshot dei soli metadati applicati, confrontarlo con questa matrice e versionare il baseline verificato. Includere abilitazione/forzatura RLS, policy, grant di tabella/colonna/schema/funzione, ruoli/proprietari, viste e bucket. Preparare successivamente test negativi fra due utenti per tutte le famiglie, oltre ai test circoscritti già esistenti.

Nessun finding critico accertato. Le scelte di visibilità già documentate restano decisioni esplicite in §5, senza duplicare il Punto 2.

## 4. Checklist azioni

### Eseguibili da agente AI — fase futura

- [ ] **03-F01:** proporre e implementare validazione canonica/ownership degli oggetti in RPC e lettore admin, con test di regressione per accesso diretto v1/v2 e traversal.
- [ ] **03-F01:** verificare le sole chiavi dei media persistiti rispetto all'invariante concordata; definire riparazione/rimozione dei riferimenti non validi.
- [ ] **03-F02:** confrontare l'export autorizzato dei cataloghi con questa matrice e creare una baseline riproducibile, senza presumere i permessi del DB remoto.
- [ ] **03-F02:** estendere i test isolati a lettura/modifica/cancellazione tra due utenti, colonne sensibili, figli di annunci, RPC e media; includere ruoli anon, authenticated e servizio.
- [ ] Dopo la decisione sulle preview, allineare dettaglio, contatti, endpoint immagine e URL profilo alla medesima regola di accesso.

### Da fare manualmente dall'utente

- [ ] Rendere disponibili metadati in sola lettura: `pg_class` (RLS/owner/ACL), `pg_policies`, grant di colonne/schema, `pg_proc` (firma/owner/EXECUTE/definer/search_path), viste e default privilege; nessun record utente necessario.
- [ ] Verificare schemi esposti dalla Data API, flag e limiti dei due bucket, policy di `storage.objects`, privilegi del ruolo servizio e storico migrazioni applicate. Non applicare automaticamente le 48 migrazioni per colmare un dato mancante.
- [ ] Confermare la visibilità di contatti e immagini per annunci privati/nascosti/rifiutati e immagini di profili nascosti; vedere §5.

## 5. Domande aperte / decisioni da prendere

1. **Decisione di prodotto:** “disponibile solo tramite link” include contatti e media anche per `privato` e annunci rifiutati? Se occorre riservatezza, il solo UUID e `Cache-Control: private` non implementano un controllo proprietario. Rimando al Punto 2 §5 e al futuro Punto 6.
2. **Decisione di prodotto:** nascondere un profilo deve rendere inaccessibili le immagini già pubblicate? Il bucket pubblico mantiene la possibilità di scaricare un oggetto noto finché esiste.
3. **Verifica remota:** quali migrazioni sono applicate e quali policy, viste, overload o grant sono stati aggiunti fuori dal repository? La risposta serve anche al Punto 4.
4. **Compatibilità:** esistono chiamanti legittimi diretti della RPC legacy v1? La correzione di 03-F01 deve comunque coprirla finché il grant permane.

## 6. Stato finale e punto successivo

**Completato — analisi locale**, con limite remoto esplicito. Matrici ricostruite per tabelle, RPC e Storage; un finding alto confermato localmente e un finding medio sulle fonti, con verifica remota prioritaria.

Verifiche eseguite:

- `node --test tests/interaction-database.test.mjs tests/invitation-codes-database.test.mjs`: **8/8 pass, zero skip**, PGlite in memoria e dati sintetici. Copertura: RLS/grant interazioni, isolamento utenti, dinieghi scritture client e accesso inviti. Fixture e stub non rappresentano il DB completo né attestano le migrazioni applicate.
- Prova traversal con SDK installato e fetch simulato: riproduzione locale descritta in **03-F01**. Nessuna chiamata a Storage reale.
- Nessun server avviato, build, email, pubblicazione, pagamento o modifica DB.

**Migrazioni create: 0. Nessuna nuova migrazione da applicare manualmente per questo audit.** Lo stato di applicazione delle migrazioni preesistenti resta da verificare, non è un elenco di migrazioni da eseguire.

Prossimo: **Punto 4 — Consistenza DB e allineamento delle migrazioni**, profilo consigliato **GPT-6 Astra · high · Default**. Riprendere dal [master](AUDIT-MASTER.md); nessuna analisi del Punto 4 avviata.
