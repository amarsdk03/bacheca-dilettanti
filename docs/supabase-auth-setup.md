# Configurazione Supabase Auth

L'applicazione usa email e password e richiede la verifica dell'indirizzo email prima di consentire l'accesso al profilo.

## Variabili d'ambiente

Configura in locale e sull'hosting:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<server-secret-key>
```

`NEXT_PUBLIC_SITE_URL` deve essere un'origine HTTPS valida e coincidere con l'origine pubblica dell'ambiente. In sviluppo sono ammessi `http://localhost` e `http://127.0.0.1`; l'app non genera link Auth se la variabile manca o non è valida. `SUPABASE_SECRET_KEY` deve contenere una chiave segreta `sb_secret_...` del progetto ed essere disponibile esclusivamente nel runtime server. Non inserire la chiave nel frontend, nel repository o in variabili `NEXT_PUBLIC_*`.

## Provisioning database durante la registrazione

La Server Action di `/registrati` valida l’intero wizard e prepara un intento monouso, valido 15 minuti. Il trigger su `auth.users` consuma quell’intento nella stessa transazione che crea l’utente e inserisce:

- la riga in `public.utente`;
- il profilo base in `public.profilo`;
- una riga nella tabella del sottoprofilo per ogni tipologia attivabile selezionata;
- le località corrispondenti in `public.localita_profilo`.

`Professionisti e studi` e `Creators` restano tipologie a disponibilità limitata: partecipano al limite di cinque scelte, ma non vengono attivate automaticamente. Deve essere selezionata almeno una delle altre sei tipologie.

Le migrazioni necessarie si trovano in `supabase/migrations`. La chiave segreta è usata soltanto dal runtime server per invocare le RPC di registrazione e gestione dei sottoprofili; password e credenziali Auth non vengono salvate nella tabella di staging.

## Gestione dell’area personale

`/il-tuo-profilo` legge profili, località e annunci con la sessione Supabase dell’utente e con RLS attiva. Il salvataggio, il cambio del sottoprofilo principale e la rimozione di un sottoprofilo passano invece da RPC accessibili esclusivamente al ruolo server.

Per gli annunci l’utente autenticato può leggere le proprie righe, cambiare soltanto il campo `nascosto` oppure eliminarle. Non esistono grant o policy di inserimento diretto per `authenticated`: `/pubblica-annuncio` usa una RPC transazionale dedicata che deriva `auth.uid()` e l’email confermata dalla sessione, applica il limite previsto e verifica nuovamente il sottoprofilo abilitato.

## Pubblicazione senza profilo e limite giornaliero

Prima di pubblicare, un visitatore senza sessione verifica un indirizzo email con il codice OTP di Supabase Auth. L'indirizzo è precompilato dal contatto pubblico dell'annuncio, ma resta un dato di verifica privato e può essere modificato senza cambiare i contatti mostrati nell'annuncio.

La richiesta imposta `user_metadata.email_flow = announcement_otp`. Per una email nuova o non ancora confermata Supabase Auth esegue internamente il percorso di signup e usa quindi il template **Confirm signup**; il metadato consente allo stesso template di mostrare il codice OTP anziché il link di registrazione. Per una identità già confermata viene usato il template **Magic Link**, configurato anch'esso come email OTP.

La verifica crea o apre una sessione Auth passwordless. La riga `public.utente` viene creata soltanto dal primo invio riuscito, rimane collegata tramite `auth_user_uuid` e mantiene `registrato_il = NULL` finché l'utente non completa la registrazione. Ogni annuncio senza profilo registrato riceve una nuova snapshot in `public.profilo` con `uuid_utente = NULL`; l'annuncio e la ricevuta di invio restano invece collegati all'`utente_uuid` interno.

Per un utente con `registrato_il IS NULL` il database applica atomicamente il limite di un annuncio ogni 24 ore sulla email Auth verificata e normalizzata. Il limite resta attivo anche se la sessione OTP è ancora presente; un account registrato salta sia OTP sia limite. Il `submissionId` rende idempotenti i retry. Non vengono letti o salvati indirizzi IP e non viene creato alcun cookie applicativo per riconoscere l'ospite.

Se l'email appartiene già a una riga `utente` registrata, il wizard non invia l'OTP e invita ad accedere. La tabella `public.codici_otp` non è usata da questo flusso: generazione, scadenza e tentativi sono gestiti da Supabase Auth.

La RPC server-only `get_registration_email_identity_v1` confronta `auth.users` e `public.utente` e restituisce uno dei quattro stati `new_email`, `recovery_required`, `signup_pending` o `registered`. Nessun client può invocarla direttamente. Questo evita di scambiare per nuova una identità presente soltanto in Supabase Auth.

Se l'utente torna in seguito su `/registrati` senza avere più la sessione OTP, il primo step riconosce anche una identità Auth senza riga pubblica e richiede un nuovo codice con `shouldCreateUser = false`. Prima dell'invio aggiorna il metadato `email_flow`, necessario perché un nuovo `signInWithOtp` non modifica i metadati di una identità non confermata già esistente. Dopo la verifica riapre la stessa identità Auth, imposta la password, valorizza `registrato_il` e crea il profilo ufficiale; gli annunci precedenti restano associati allo stesso `utente_uuid` interno.

## Conferma email obbligatoria

In **Authentication → Providers → Email**:

- abilita email e password;
- abilita **Confirm email**.

Questa impostazione è indispensabile. Se viene disabilitata, Supabase considera verificati immediatamente i nuovi account e l'applicazione non può distinguere una conferma reale da quella automatica.

In **Authentication → Providers** disabilita gli eventuali provider social che non devono essere utilizzati.

## URL autorizzati

In **Authentication → URL Configuration**:

- imposta **Site URL** a `https://www.bachecadilettanti.it`, senza un percorso finale;
- aggiungi `http://localhost:3000/auth/confirm` per la conferma email in sviluppo;
- aggiungi `http://localhost:3000/auth/callback` per il recupero password in sviluppo;
- aggiungi `https://www.bachecadilettanti.it/auth/confirm` e `https://www.bachecadilettanti.it/auth/callback` per la produzione;
- autorizza eventuali URL preview soltanto per gli ambienti che vuoi supportare.

La registrazione passa a Supabase l'URL `/auth/confirm`; il recupero password usa invece `/auth/callback`.

Il Dashboard del progetto hosted non legge `supabase/config.toml`: configura anche lì questi valori. Se l'app locale usa il progetto Supabase hosted, imposta `NEXT_PUBLIC_SITE_URL` sull'origine locale e autorizza il relativo callback nel Dashboard; un valore di produzione in `.env.local` genera invece link verso la produzione. Per Supabase locale, `supabase/config.toml` autorizza `http://127.0.0.1:3000/**` e `http://localhost:3000/**`.

## Template “Confirm signup”

Il template **Confirm signup** deve gestire entrambi i percorsi, perché Supabase lo usa anche per `signInWithOtp` quando l'indirizzo è nuovo o non confermato. La scelta è soltanto di presentazione: autorizzazione, proprietà degli annunci e stato dell'account continuano a essere verificati sul server e nel database.

La configurazione completa è in `supabase/templates/confirmation.html`. La struttura della condizione è:

```html
{{ if eq .Data.email_flow "announcement_otp" }}
  <p>{{ .Token }}</p>
{{ else if eq .Data.email_flow "account_signup" }}
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">
    Verifica il tuo indirizzo email
  </a>
{{ else }}
  <!-- Compatibilità per identità create prima del metadato: mostra codice e link. -->
{{ end }}
```

La registrazione con password imposta `user_metadata.email_flow = account_signup`. `/auth/confirm` mostra prima una pagina di conferma; il clic sul pulsante verifica il token sul server, crea la sessione e reindirizza a `/il-tuo-profilo`. Il GET non consuma il token, così un'anteprima automatica del link non lo esaurisce. La schermata finale di registrazione e l'errore `email_not_confirmed` del login permettono di richiedere un nuovo link tramite `auth.resend({type: "signup"})`.

I vecchi link che arrivano direttamente a `/auth/confirm?code=...` restano compatibili. Un `?code=...` o `?token_hash=...` arrivato alla homepage è ambiguo e mostra la pagina per richiedere un nuovo messaggio, senza essere trattato come conferma di registrazione.

> Nei progetti Free creati dal 3 giugno 2026, Supabase non consente di modificare i template usando il provider email predefinito. Se l'editor non è disponibile, configura un provider in **Authentication → Emails → SMTP Settings**.

## Template OTP “Magic Link”

Per una identità già confermata, `signInWithOtp` usa il template **Magic Link**. Per ricevere il codice a sei cifre, il template deve contenere `{{ .Token }}` e non soltanto `{{ .ConfirmationURL }}`. La configurazione locale è in `supabase/config.toml` e il markup in `supabase/templates/magic_link.html`.

Replica lo stesso template nel Dashboard del progetto hosted. Per i nuovi progetti Free che non consentono la personalizzazione con il mailer predefinito è necessario configurare prima un SMTP personalizzato. Mantieni `otp_length = 6` e scegli scadenza e rate limit coerenti con l'esperienza del wizard.

## Recupero password

Nel template **Reset password** del Dashboard hosted e in `supabase/templates/recovery.html`, il pulsante deve usare esattamente:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Scegli una nuova password</a>
```

Il recupero passa a Supabase l'URL `/auth/callback` senza query string. Questa pagina mostra un pulsante di continuazione; il suo invio verifica `token_hash` come `recovery` sul server, crea la sessione e apre `/reimposta-password`. Il link funziona anche se l'email viene aperta in un altro browser. Un link scaduto o già usato mostra un errore e permette di richiederne uno nuovo. L'URL `{{ .ConfirmationURL }}` del vecchio template e i link già spediti possono continuare a dipendere dal cookie PKCE del browser originale: richiedere una nuova email dopo l'aggiornamento.

Ordine di rilascio: distribuisci il codice, verifica Site URL e Redirect URLs nel Dashboard, poi aggiorna il template hosted. Il solo file nel repository modifica le email di Supabase locale, non quelle del progetto hosted.

Per registrazioni pubbliche configura un provider SMTP dedicato: il servizio predefinito è destinato ai test, applica limiti restrittivi e invia soltanto agli indirizzi autorizzati del team del progetto.

## Verifica finale

Prova il flusso in un ambiente configurato:

- la registrazione termina con la schermata “Controlla la tua email” e non effettua l'accesso automatico;
- l'email di una nuova registrazione mostra il link di conferma e non il testo per la pubblicazione anonima;
- il reinvio dalla schermata finale o dal login genera nuovamente il link di conferma;
- prima dell’invio dell’email esistono già `utente`, `profilo`, i sottoprofili selezionati e le relative località;
- prima della conferma, il login mostra il messaggio che richiede la verifica e `/il-tuo-profilo` non è accessibile;
- il link ricevuto via email mostra la conferma e, dopo un clic, apre `/il-tuo-profilo`;
- un link non valido o scaduto mostra un avviso e permette di richiederne uno nuovo;
- l'accesso con email e password funziona dopo la conferma;
- richiesta e completamento del recupero password funzionano anche aprendo l'email in un altro browser;
- per una nuova email il solo invio OTP crea l'utente Auth ma non una riga `public.utente`;
- l'email del primo OTP anonimo mostra il codice a sei cifre anche se Supabase usa internamente il template **Confirm signup**;
- un OTP valido crea la sessione e il primo annuncio crea `utente`, snapshot profilo, annuncio e ricevuta nella stessa transazione;
- un secondo annuncio entro 24 ore con la stessa identità non registrata viene rifiutato, mentre un account registrato non ha questo limite;
- un'email già registrata mostra l'invito ad accedere senza inviare il codice;
- dopo il logout, `/registrati` riconosce un'email publishing-only, verifica nuovamente la stessa identità via OTP e rende disponibili nel profilo gli annunci già legati allo stesso utente interno;
- `/registrati` riconosce anche una identità Auth rimasta senza `public.utente` dopo un flusso interrotto;
- una registrazione già predisposta ma non confermata reinvia il link di signup invece di aprire il recupero OTP;
- il logout rimuove la sessione del dispositivo corrente.
