# Configurazione Supabase Auth

L'applicazione usa esclusivamente email e password. In questa fase la registrazione crea subito una sessione, senza conferma email né codice OTP.

## Variabili d'ambiente

Configura in locale e sull'hosting:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

`NEXT_PUBLIC_SITE_URL` deve coincidere con l'origine pubblica dell'ambiente. Non usare mai la `service_role` nel frontend o in variabili `NEXT_PUBLIC_*`.

## URL di Supabase

In **Authentication → URL Configuration**:

- imposta **Site URL** all'URL pubblico dell'applicazione;
- aggiungi `http://localhost:3000/auth/callback` per lo sviluppo;
- aggiungi `https://<dominio>/auth/callback` per produzione e gli eventuali ambienti preview autorizzati.

## Registrazione immediata con email e password

In **Authentication → Providers → Email**:

- abilita email/password;
- disabilita **Confirm email**.

La seconda impostazione è indispensabile: con la conferma email attiva, Supabase crea l'utente ma non restituisce una sessione e l'app non può completare il redirect autenticato a `/profilo`.

In **Authentication → Providers** disabilita Google, Apple e ogni altro provider social. Rimuovere i pulsanti dall'interfaccia non è sufficiente a impedire chiamate OAuth dirette se un provider rimane abilitato nel progetto.

Questa configurazione non verifica che l'indirizzo appartenga davvero all'utente. È una scelta temporanea: quando verrà ripristinato il flusso OTP, riabilita **Confirm email** insieme alla relativa interfaccia di verifica.

## Recupero password

Per un ambiente reale configura anche un provider SMTP dedicato: il servizio email predefinito di Supabase è pensato principalmente per test e applica limiti restrittivi.

Nel template **Reset password** mantieni un link basato su `{{ .ConfirmationURL }}`: dopo la verifica Supabase tornerà alla callback dell'app e aprirà la pagina per scegliere la nuova password.

## Verifica finale

Prova in un ambiente configurato:

- registrazione email/password senza messaggi di conferma e redirect immediato a `/profilo`;
- selezione e compilazione di ogni tipologia di profilo, verificando che i dati simulati non vengano salvati;
- accesso email/password e messaggio per credenziali errate;
- richiesta e completamento del recupero password;
- gestione italiana di un link di recupero non valido o scaduto;
- logout dal solo dispositivo corrente;
- apertura diretta di `/profilo` da anonimo, con redirect ad `/accedi`.
