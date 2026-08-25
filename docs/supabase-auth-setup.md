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

`NEXT_PUBLIC_SITE_URL` deve coincidere con l'origine pubblica dell'ambiente. `SUPABASE_SECRET_KEY` deve contenere una chiave segreta `sb_secret_...` del progetto ed essere disponibile esclusivamente nel runtime server. Non inserire la chiave nel frontend, nel repository o in variabili `NEXT_PUBLIC_*`.

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

La verifica crea o apre una sessione Auth passwordless. La riga `public.utente` viene creata soltanto dal primo invio riuscito, rimane collegata tramite `auth_user_uuid` e mantiene `registrato_il = NULL` finché l'utente non completa la registrazione. Ogni annuncio senza profilo registrato riceve una nuova snapshot in `public.profilo` con `uuid_utente = NULL`; l'annuncio e la ricevuta di invio restano invece collegati all'`utente_uuid` interno.

Per un utente con `registrato_il IS NULL` il database applica atomicamente il limite di un annuncio ogni 24 ore sulla email Auth verificata e normalizzata. Il limite resta attivo anche se la sessione OTP è ancora presente; un account registrato salta sia OTP sia limite. Il `submissionId` rende idempotenti i retry. Non vengono letti o salvati indirizzi IP e non viene creato alcun cookie applicativo per riconoscere l'ospite.

Se l'email appartiene già a una riga `utente` registrata, il wizard non invia l'OTP e invita ad accedere. La tabella `public.codici_otp` non è usata da questo flusso: generazione, scadenza e tentativi sono gestiti da Supabase Auth.

Se l'utente torna in seguito su `/registrati` senza avere più la sessione OTP, il primo step riconosce la riga publishing-only e richiede un nuovo codice con `shouldCreateUser = false`. Dopo la verifica riapre la stessa identità Auth, imposta la password, valorizza `registrato_il` e crea il profilo ufficiale; gli annunci precedenti restano associati allo stesso `utente_uuid` interno.

## Conferma email obbligatoria

In **Authentication → Providers → Email**:

- abilita email e password;
- abilita **Confirm email**.

Questa impostazione è indispensabile. Se viene disabilitata, Supabase considera verificati immediatamente i nuovi account e l'applicazione non può distinguere una conferma reale da quella automatica.

In **Authentication → Providers** disabilita gli eventuali provider social che non devono essere utilizzati.

## URL autorizzati

In **Authentication → URL Configuration**:

- imposta **Site URL** all'origine pubblica dell'applicazione, senza un percorso finale;
- aggiungi `http://localhost:3000/auth/confirm` per la conferma email in sviluppo;
- aggiungi `http://localhost:3000/auth/callback` per il recupero password in sviluppo;
- aggiungi gli equivalenti `https://<dominio>/auth/confirm` e `https://<dominio>/auth/callback` per la produzione;
- autorizza eventuali URL preview soltanto per gli ambienti che vuoi supportare.

La registrazione passa a Supabase l'URL `/auth/confirm`; il recupero password usa invece `/auth/callback`.

## Template “Confirm signup”

In **Authentication → Email Templates → Confirm signup**, usa un link basato sul token hash:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
  Verifica il tuo indirizzo email
</a>
```

Il route handler `/auth/confirm` valida il token sul server, crea la sessione e reindirizza a `/il-tuo-profilo`. Un link non valido, scaduto o già utilizzato riporta a `/accedi` con un messaggio dedicato.

I link precedenti che reindirizzano alla homepage con `?code=...` restano compatibili: la homepage inoltra il codice allo stesso route handler.

> Nei progetti Free creati dal 3 giugno 2026, Supabase non consente di modificare i template usando il provider email predefinito. Se l'editor non è disponibile, configura un provider in **Authentication → Emails → SMTP Settings**.

## Template OTP “Magic Link”

`signInWithOtp` usa il template **Magic Link** anche quando l'interfaccia richiede un codice. Per ricevere il codice a sei cifre, il template deve contenere `{{ .Token }}` e non soltanto `{{ .ConfirmationURL }}`. La configurazione locale è in `supabase/config.toml` e il markup in `supabase/templates/magic_link.html`.

Replica lo stesso template nel Dashboard del progetto hosted. Per i nuovi progetti Free che non consentono la personalizzazione con il mailer predefinito è necessario configurare prima un SMTP personalizzato. Mantieni `otp_length = 6` e scegli scadenza e rate limit coerenti con l'esperienza del wizard.

## Recupero password

Nel template **Reset password** mantieni un link basato su `{{ .ConfirmationURL }}`. Dopo la verifica, Supabase torna a `/auth/callback` e l'applicazione apre la pagina per scegliere la nuova password.

Per registrazioni pubbliche configura un provider SMTP dedicato: il servizio predefinito è destinato ai test, applica limiti restrittivi e invia soltanto agli indirizzi autorizzati del team del progetto.

## Verifica finale

Prova il flusso in un ambiente configurato:

- la registrazione termina con la schermata “Controlla la tua email” e non effettua l'accesso automatico;
- prima dell’invio dell’email esistono già `utente`, `profilo`, i sottoprofili selezionati e le relative località;
- prima della conferma, il login mostra il messaggio che richiede la verifica e `/il-tuo-profilo` non è accessibile;
- il link ricevuto via email conferma l'account e apre `/il-tuo-profilo`;
- un link non valido o scaduto torna a `/accedi` con un avviso;
- l'accesso con email e password funziona dopo la conferma;
- richiesta e completamento del recupero password continuano a funzionare;
- per una nuova email il solo invio OTP crea l'utente Auth ma non una riga `public.utente`;
- un OTP valido crea la sessione e il primo annuncio crea `utente`, snapshot profilo, annuncio e ricevuta nella stessa transazione;
- un secondo annuncio entro 24 ore con la stessa identità non registrata viene rifiutato, mentre un account registrato non ha questo limite;
- un'email già registrata mostra l'invito ad accedere senza inviare il codice;
- dopo il logout, `/registrati` riconosce un'email publishing-only, verifica nuovamente la stessa identità via OTP e rende disponibili nel profilo gli annunci già legati allo stesso utente interno;
- il logout rimuove la sessione del dispositivo corrente.
