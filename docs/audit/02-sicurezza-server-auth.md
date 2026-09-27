# Punto 2 — Sicurezza server, autenticazione e rate limiting

## 1. Obiettivo e ambito

Verificare gli ingressi server, l’identificazione dell’utente, i flussi email/password, i redirect e le protezioni antiabuso. Analisi del **2026-09-25**, basata sulla [mappa del Punto 0](00-mappa-codebase.md); nessuna correzione applicata.

**Esito:** 4 findings medi, 1 basso condizionale e 1 miglioramento facoltativo. Nessun finding critico/alto confermato nell’ambito verificato. RLS, grant e Storage saranno approfonditi nel Punto 3; questo esito non certifica le autorizzazioni del database remoto.

## 2. File e aree analizzate

- **Versione:** commit `c2d2ab582ef2f2442871fbdab57fffecc8460236`. Nessuna modifica applicativa è stata apportata dall’audit; `docs/audit/` era già non tracciata all’avvio. Al controllo finale sono state rilevate modifiche locali a `src/features/annunci/Annunci.tsx` e `src/features/profili/Profili.tsx`; non sono state esaminate perché esterne all’ambito del Punto 2.
- **Auth:** `src/features/auth/server/{actions,queries,email-link-actions,signup-confirmation}.ts`, `auth/{email-link,email-flow,utils,validation,errors}.ts`; `src/features/registrati/server/{actions,email-identity,registration}.ts`; pagine callback, conferma e recupero password.
- **Azioni:** `src/features/{pubblica-annuncio,profilo,interazioni,segnalazioni}/server/actions.ts`, relativi validatori, helper immagini e ownership; componenti inviti, contatti e coming-soon.
- **Endpoint e confini:** i cinque `src/app/api/**/route.ts` della mappa; `src/proxy.ts`, `src/lib/{site-access,supabase/server,supabase/proxy,supabase/admin}.ts`, `next.config.ts`; helper ricerca squadre, visibilità/dettaglio annunci e contesto checkout.
- **SQL mirato:** funzioni quota OTP, pubblicazione, segnalazioni e ownership checkout nelle migrazioni citate sotto; `supabase/config.toml`. Ricostruite le rinomine/wrapper necessari, senza ripetere l’inventario RLS.
- **Riferimenti:** guida installata Next **16.3.4**, `node_modules/next/dist/docs/01-app/02-guides/data-security.md:279`; skill Supabase e Supabase Postgres Best Practices. Consultate le documentazioni ufficiali [Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits), [SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide) e [Next data security](https://nextjs.org/docs/app/guides/data-security). Nessun accesso alle configurazioni cloud o a record personali.

### Copertura e controlli presenti

| Area | Evidenza / esito locale |
|---|---|
| Sessione | `src/features/auth/server/queries.ts:68`: `getClaims()`, poi `getUser()`, confronto subject/utente ed email confermata. ID applicativo ricavato dalla sessione, non da input del visitatore. |
| Callback e reset | `/auth/callback` e `/auth/confirm` esistono come pagine. `src/features/auth/server/email-link-actions.ts:13` respinge credenziali ambigue; verifica con POST, controlla utente e redirige a destinazioni fisse. `src/features/auth/server/actions.ts:420` ripete i controlli prima del cambio password. |
| Redirect auth | `src/features/auth/utils.ts:7` normalizza `next` verificando l’origine. Il difetto del proxy è distinto: `02-F05`. |
| Registrazione e inviti | `src/features/registrati/server/registration.ts:525`: payload/versione/chiavi/campi/consensi/invito validati. Nessun endpoint autonomo di invio inviti: `src/features/inviti/InviteFriendDialog.tsx:25` copia il codice; attribuzione tramite registrazione. |
| OTP pubblicazione | `src/features/pubblica-annuncio/server/actions.ts:210`: quota persistente per email, 5 richieste/24h e intervallo 60s, serializzata da lock SQL (`20260825204042_publish_email_otp_rate_limit.sql:44`, `:64`, `:72`, sotto `supabase/migrations/`). Verifica codice a sei cifre, sessione ed email corrispondente a `actions.ts:271`, `:290`, `:301`. |
| Pubblicazione e immagini | Sessione e payload verificati a `src/features/pubblica-annuncio/server/actions.ts:369`, `:385`; immagine max 5 MB, MIME e firma iniziale del file a `:57`, `:70`, `:75`; percorso costruito server. `next.config.ts:6` limita il body delle Server Actions a 6 MB. |
| Profili | `src/features/profilo/server/actions.ts:48` ricava il profilo dal viewer; a `:63` controlla il sottoprofilo. Foto decodificata/convertita con limiti in `src/features/profilo/server/profile-image-processing.ts:11`. Editor e ID utente verificati prima delle RPC. |
| Annunci dashboard | Visibilità e cancellazione usano il client di sessione (`src/features/profilo/server/actions.ts:465`, `:543`). L’ownership dipende dalle RLS: verifica obbligatoria nel Punto 3. |
| Follow e salvati | `src/features/interazioni/server/actions.ts:14`, `:49`: UUID/boolean validati, registrazione richiesta, proprietario ricavato dal viewer, target pubblico verificato prima della creazione. |
| GET squadre | `src/app/api/profili/squadre/route.ts:15`: UUID e massimo 20 ID; query normalizzata/max 100 caratteri e massimo 10 risultati (`src/features/profilo/team-profile.ts:1`, `:21`). Filtri di visibilità in `src/features/profilo/server/public-team-profiles.ts:53`, `:59`. Nessun limite di frequenza applicativo nell’endpoint. |
| GET immagine annuncio | `src/app/api/metadata/annuncio-immagine/route.ts:10`: UUID; a `:23` tipi immagine ammessi, a `:43` `nosniff`. Stato/nascosto/privato cambiano la cache, senza imporre autenticazione: vedere decisione sulle preview in §5. |
| POST checkout | Input validati prima dell’uso. `src/features/pubblica-annuncio/server/stripe-checkout.ts:124` chiama la RPC con client di sessione; `supabase/migrations/20260911120000_priority_announcement_checkout.sql:202`, `:228` richiede `auth.uid()` e proprietario corrispondente. Complete controlla anche la corrispondenza sessione/annuncio (`src/app/api/complete-checkout-session/route.ts:38`). |
| Webhook | `src/app/api/stripe/webhook/route.ts:26`: firma verificata sul body originale prima di elaborare l’evento. Ordine eventi/idempotenza/rimborsi restano nel Punto 5. |
| Form pubblici | Coming-soon rimanda a Instagram (`src/components/redirects/ComingSoon.tsx:446`); contatti usa `mailto:` (`src/features/contatti/Contatti.tsx:64`). Nessun form email coming-soon da sottoporre a rate limiting nella versione osservata. |

Le Server Actions hanno la protezione Next che confronta `Origin` e `Host`; non sostituisce autorizzazione e limiti antiabuso. Non è una garanzia automaticamente estesa ai Route Handlers. [Fonte Next](https://nextjs.org/docs/app/guides/data-security).

### Verifiche eseguite

- `node --test tests/auth-email-flow.test.mjs`: **9/9 pass** con mock.
- `node --test tests/segnalazioni.test.mjs tests/publish-field-validation.test.mjs`: **11/11 pass**; validatori e asserzioni statiche su SQL/markup.
- Prova isolata sul validatore estratto da `src/proxy.ts`: confermato il caso di redirect di `02-F05`, senza richieste HTTP.
- I **20 test superati** non provano quote/ownership nel DB applicato, SMTP o resistenza all’abuso. Nessuna build, dev server, email, pubblicazione o operazione Stripe eseguita.

## 3. Findings per severità

### 🟡 Medio — 02-F01: stato delle email esposto prima della verifica

- **Confermato nel codice.** `src/features/registrati/server/actions.ts:51` consulta l’identità e restituisce `new_email`, `already_registered` o `signup_pending`. Anche `src/features/auth/server/actions.ts:106` e `src/features/pubblica-annuncio/server/actions.ts:190` distinguono lo stato; nel secondo percorso la quota OTP arriva soltanto a `:210`.
- **Impatto:** un visitatore può verificare appartenenza e stato di registrazione di email candidate. Le risposte che terminano prima di chiamare Auth non beneficiano dei suoi limiti; eventuali protezioni edge sono ignote. Nessun account takeover dimostrato.
- **Azione:** risposte pubbliche uniformi, dettagli disponibili dopo prova del possesso email e limite prima dei lookup privilegiati. La risposta generica per `email_exists`/`user_already_exists` a `src/features/auth/server/actions.ts:273` copre soltanto una parte del flusso. Il controllo `identities?.length === 0` non è presente; aggiungerlo da solo non risolve questi percorsi precedenti.

### 🟡 Medio — 02-F02: quota OTP non condivisa fra i flussi

- **Confermato nel codice; invio effettivo non provato.** Pubblicazione consuma la quota a `src/features/pubblica-annuncio/server/actions.ts:210`. Recupero registrazione per un account guest esistente invia invece `signInWithOtp({…, options: {shouldCreateUser: false}})` a `src/features/registrati/server/actions.ts:70`, senza chiamare lo stesso contatore.
- **Impatto:** raggiungere 5 richieste/24h nel primo flusso non blocca il secondo. Restano i limiti del provider: non è un invio illimitato dimostrato. Lookup e aggiornamento metadata avvengono comunque prima della chiamata Auth.
- **Azione:** condividere la quota fra gli ingressi equivalenti e aggiungere un limite per chiamante prima dei lookup. Verificare separatamente quote per login, signup, reset, reinvio e tentativi OTP; queste azioni si affidano ai limiti Auth senza un contatore applicativo comune.

### 🟡 Medio — 02-F03: cooldown delle segnalazioni anonime aggirabile

- **Confermato nella catena locale.** `src/features/segnalazioni/server/actions.ts:55` accetta un cookie conforme alla regex oppure ne genera uno nuovo; a `:67` ne calcola l’hash. `supabase/migrations/20260917124241_segnalazioni.sql:139`, `:163`, `:183` lega il limite di 24h alla coppia identità–bersaglio.
- **Impatto:** cancellare/sostituire il cookie crea un’identità diversa, consentendo nuove segnalazioni dello stesso contenuto. Manca anche una quota complessiva su bersagli diversi nel percorso analizzato: possibile sovraccarico della moderazione. Protezioni esterne non verificate.
- **Azione:** conservare la deduplicazione e aggiungere limiti server indipendenti dal cookie, una quota complessiva e challenge progressivi. Firmare il cookie da solo non impedisce di richiederne uno nuovo.

### 🟡 Medio — 02-F04: pubblicazione senza limite preventivo sul lavoro costoso

- **Confermato nel codice.** `src/features/pubblica-annuncio/server/actions.ts:404` esegue l’upload prima della RPC a `:430`; soltanto dopo un risultato `rate_limited` rimuove il file (`:445`). `supabase/migrations/20260824195350_publish_announcement_workflow.sql:839` applica la quota 1/24h ai soli account non registrati: `if v_is_anonymous then` a `:841`.
- **Catena verificata:** core rinominato in `supabase/migrations/20260910120000_publish_announcement_refactor.sql:107`, richiamato dal core v2 restaurato (`20260923212945_restore_publish_announcement_core_v2.sql:50`) e dal wrapper corrente (`20260924120000_pause_priority_announcements.sql:45`). Le successive modifiche a campi/date non introducono una quota per registrati.
- **Impatto:** un account con email verificata può ripetere trasferimenti fino a 5 MB anche se la pubblicazione sarà rifiutata. Gli account registrati non hanno una quota applicativa di pubblicazione nel percorso osservato: possibile consumo di risorse e spam della moderazione. I limiti per singolo file restano presenti.
- **Azione:** limite breve per account/origine prima di upload e altre operazioni costose; concordare una quota sostenibile per registrati. Mantenere il controllo atomico nel DB e l’idempotenza: una semplice verifica preliminare non li sostituisce.

### 🟢 Basso — 02-F05: redirect esterno nel gate opzionale

- **Confermato con prova isolata; sfruttabilità condizionata.** `src/proxy.ts:44` verifica soltanto `startsWith('/') && !startsWith('//')`; a `:112` risolve il valore con `new URL(destination, request.url)`.
- **Evidenza minima:** il valore composto da slash, backslash e `example.invalid` passa il controllo e viene risolto come origine `https://example.invalid`.
- **Impatto:** redirect a un sito esterno se `SITE_ACCESS_ENABLED` è attivo, la richiesta è a `/accesso` e il visitatore possiede un cookie di accesso valido. Non dimostrato sul deployment; non riguarda il validatore dei redirect auth.
- **Azione:** normalizzare l’URL e confrontarne l’origine con quella prevista, riutilizzando un validatore comune; coprire backslash e caratteri di controllo.

### 💡 Nice-to-have — 02-F06: difesa CSRF esplicita per i POST checkout

- **Assenza del controllo confermata; vulnerabilità sfruttabile non dimostrata.** `src/app/api/create-checkout-session/route.ts:51` accetta form e `src/app/api/complete-checkout-session/route.ts:23` accetta JSON senza verificare `Origin`/token CSRF. Entrambi verificano l’ownership tramite sessione/RPC.
- **Impatto/limiti:** i cookie SSR installati hanno `sameSite: "lax"` (`node_modules/@supabase/ssr/src/utils/constants.ts:5`), che limita i POST da siti esterni. L’assenza di un controllo dell’origine resta rilevante, per esempio, in presenza di origini non fidate sullo stesso sito. Nessun addebito forzato dimostrato.
- **Azione:** valutare controllo dell’origine attendibile o token CSRF sui due POST browser, coerente con il proxy di deployment. Il webhook conserva la verifica della firma Stripe. Approfondimento pagamenti nel Punto 5.

## 4. Checklist azioni proposte

### Eseguibili da agente AI, nella futura fase di implementazione

- [ ] **02-F01:** uniformare le risposte prima della verifica email e coprire i diversi stati con test che controllino l’indistinguibilità delle risposte.
- [ ] **02-F02:** centralizzare le quote OTP fra pubblicazione e recupero registrazione; limitare i lookup preliminari e verificare percorsi alternativi/concorrenti.
- [ ] **02-F03:** aggiungere protezioni indipendenti dal cookie e testare reset identità e bersagli multipli.
- [ ] **02-F04:** limitare il lavoro prima dell’upload, preservando il controllo atomico DB e i retry legittimi; applicare le quote concordate per registrati.
- [ ] **02-F05:** correggere il validatore del gate e verificare origine finale/normalizzazione.
- [ ] **02-F06, facoltativo:** aggiungere una protezione CSRF esplicita ai POST checkout dopo aver definito le origini attendibili.

### Da fare manualmente dall’utente

- [ ] Verificare in Supabase le quote Auth effettive, CAPTCHA, conferma email, scadenza OTP, sessioni e requisito di autenticazione recente per cambiare password; confrontare con la configurazione locale.
- [ ] Confermare come hosting/proxy identificano il chiamante e quali protezioni antiabuso sono già attive; scegliere soglie, challenge e quote per registrati/segnalazioni.
- [ ] Decidere se mantenere il gate opzionale e la semantica pubblica delle preview (§5).
- [ ] Pianificare verifiche controllate in ambiente di test per consegna email, limiti e sessioni; nessun test con effetti sul servizio di produzione è stato eseguito qui.

## 5. Domande aperte e limiti

- **Configurazione remota non verificabile con gli accessi disponibili:** nessuna connessione DB nell’IDE rilevata dal Punto 0; configurazione Auth/edge non letta. `supabase/config.toml:197` definisce limiti locali e `:228` disabilita localmente `secure_password_change`: non prova le impostazioni hosted.
- **IP e limiti Auth:** `src/lib/supabase/server.ts:15` usa una publishable key e cookie, senza inoltro dell’IP del visitatore. Le chiamate SSR possono condividere la quota dell’IP server. Verificare il deployment e il meccanismo supportato prima di modificare gli header; non fidarsi di header arbitrari forniti dal client. [Fonte Supabase](https://supabase.com/docs/guides/auth/rate-limits).
- **Preview:** dettaglio e immagine sono accessibili tramite UUID anche quando l’annuncio non è elencato (`src/features/annunci/server/queries.ts:943`, `src/app/api/metadata/annuncio-immagine/route.ts:31`). È coerente con le preview documentate in `README.md:123`, `:129` e con “disponibile solo tramite link” in `src/features/annunci/announcement-visibility.ts:19`. Confermare se ciò debba valere anche per `privato`, rifiutati e contatti. Non classificato qui come bypass certo; verifica autorizzazioni nel Punto 3 e informazione agli utenti nel Punto 6.
- **Gate/manutenzione:** il proxy intercetta anche API e callback; l’unica eccezione pubblica del gate è `/auth/confirm` (`src/proxy.ts:126`). `/accesso` non ha una pagina nella mappa. Se si mantiene il gate, verificare recupero password e webhook; completamento funzionale nel Punto 11 e consegna webhook nel Punto 5.
- **Confini residui:** le mutazioni che delegano l’ownership a RLS/RPC richiedono il Punto 3. Nessun confronto con schema applicato, prova di brute force, sessione revocata o moderazione reale. Protezione della chiave server già trattata nel [Punto 1](01-segreti-git.md); non sono emerse nuove evidenze di esposizione.

## 6. Stato finale e punto successivo

**Completato — 2026-09-25**, per la copertura locale degli otto moduli Server Actions e dei cinque Route Handlers mappati, con verifiche isolate e limiti remoti dichiarati. I findings sono proposte da implementare in una fase separata.

Aggiornato [AUDIT-MASTER.md](AUDIT-MASTER.md). Prossimo punto consigliato: **3 — Autorizzazioni Supabase, RLS, RPC e Storage**. Nessuna analisi del punto successivo avviata.
