# Bacheca Dilettanti - Sito web ufficiale

#### La piattaforma italiana dedicata ad annunci, opportunità e visibilità nel calcio dilettantistico

Link sito web: https://www.bachecadilettanti.it/

Sviluppato da Amar Sidkir, per Gabriele Zaniboni, a partire dal 15 luglio 2026.

# 1. Architettura generale

## Tecnologie utilizzate

### Framework

- Typescript
- React
- Next.js (App router)

### UI e stile

- Tailwind CSS
- shadcn/ui (con Base UI)
- Lucide Icons
- React Bits
- Motion / GSAP

### Database

- Supabase (Postgres, Auth, Storage e RPC)
- Resend (per SMTP)

### Deployment

- Vercel

### Pagamenti

- Stripe API

### Altro

- React Markdown (per /aggiornamenti)
- Next Image e Sharp (per foto profili)
- Analytics e Speed Insights (per Vercel)

## Route principali

| Route | Funzione |
| --- | --- |
| `/` | Homepage |
| `/aggiornamenti` | Elenco e dettaglio degli aggiornamenti |
| `/annunci` | Directory annunci con ricerca e filtri |
| `/dettagli-annuncio?id=…` | Dettaglio pubblico di un annuncio |
| `/profili` | Directory profili con ricerca e filtri |
| `/dettagli-profilo?id=…&type=…` | Dettaglio pubblico di un sottoprofilo |
| `/pubblica-annuncio` | Wizard di pubblicazione |
| `/il-tuo-profilo` | Area personale autenticata |
| `/accedi` | Accesso utente |
| `/registrati` | Registrazione account |
| `/password-dimenticata` | Richiesta di recupero password |
| `/reimposta-password` | Scelta della nuova password |
| `/visibilita` | Informazioni sui livelli di visibilità |
| `/contatti` | Contatti e assistenza |
| `/partner` | Sezione partner |

## Requisiti

- Node.js `>= 20.9.0`.
- npm e il lockfile del progetto.
- Un progetto Supabase compatibile con lo schema applicativo.
- Un account Stripe se si vuole abilitare l’annuncio prioritario.
- Un provider SMTP configurato in Supabase per gli ambienti pubblici.

## Avvio locale

Installa le dipendenze:

```bash
npm ci
```

Crea `.env.local` nella root del progetto. Il file è ignorato da Git e non deve contenere valori di produzione condivisi nel repository.

```dotenv
# Applicazione
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MAINTENANCE_MODE=false

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<server-secret-key>

# Gate opzionale di pre-accesso
SITE_ACCESS_ENABLED=false
SITE_ACCESS_PASSWORD=<password>
SITE_ACCESS_SECRET=<segreto-hmac-lungo-e-casuale>

# Stripe, necessario soltanto per gli annunci prioritari
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
STRIPE_ANNUNCIO_PRIORITARIO_PRICE_ID=<price-id>
```

Avvia quindi il server di sviluppo:

```bash
npm run dev
```

L’applicazione è disponibile su [http://localhost:3000](http://localhost:3000).

# 2. Changelog

## Versione 1.0 - Deploy prima versione

Push effettuato il: ??/??/2026

- Dashboard amministrativa di gestione utenti, profili, annunci e moderazione
- Aggiunta delle pagine legali (Termini e condizioni, privacy policy, cookies...)
- Aggiunta dei Follow e Salva per i profili e gli annunci
- Miglioramento UI per le card/pagine dei profili e annunci
- Rilascio al pubblico delle altre categorie di sottoprofili
- Personalizzazione aumentata per i vari sottoprofili
- Completamento del flusso operativo di approvazione e rimborso degli annunci prioritari.
- Analitiche visualizzazione per aggiornamenti, profili e annunci
- Aggiunta di sponsor/partner nelle varie sezioni dedicate

---

## Versione 0.8.0 - Pre-alpha per LegalBlink

Push effettuato il: 17/09/2026

### Feature principali

- Homepage
- Pubblicazione articoli e aggiornamenti piattaforma
- Visualizzazione aggiornamenti editoriali in Markdown
- Sezione contatti (Instagram e Whatsapp) e partner/sponsor
- Compliance legale tramite LegalBlink (GDPR, privacy policy, cookies...)

### Account personale

- Registrazione e accesso tramite indirizzo email verificato
- Personalizzazione dei sottoprofili
- Visualizzazione annunci personali
- Cambio password via link email

### Profili

- Registrazione e accesso tramite email verificata.
- Gestione di più sottoprofili per account, con un massimo di cinque tipologie abilitate.
- Otto modelli di profilo supportati:
    - Giocatore
    - Squadra
    - Staff sportivo
    - Arbitro
    - Torneo / evento
    - Campi e impianti
    - Professionisti e studi (al momento limitati)
    - Creators (al momento limitati)
- Possibilità di cercare e filtrare i profili creati sulla piattaforma
- Possibilità di visualizzare maggiori info su un profilo specifico
- Possibilità di segnalare un annuncio con eventuale messaggio di info aggiuntivo
- Disponibilità delle singole tipologie controllata dal feature flag `PROFILI_LIMITATI`.

### Annunci

- Pubblicazione annuncii per utenti anonimi e registrati:
    - Selezione del sottoprofilo
    - Compilazione/aggiornamento dati del sottoprofilo
    - Compilazione dati dell'annuncio
    - Possibilità di pagamento per annuncio prioritario tramite Stripe
    - Verifica tramite codice OTP per utenti anonimi (rate limiting)
    - Limite giornaliero e protezione dai retry duplicati per il flusso anonimo.
- Possibilità di visualizzare, nascondere o eliminare annunci dal proprio profilo
- Possibilità di cercare e filtrare gli annunci pubblicati sulla piattaforma
- Possibilità di visualizzare maggiori info su un annuncio specifico
- Possibilità di segnalare un annuncio con eventuale messaggio di info aggiuntivo

### Admin

- Accesso per soli utenti admin
- Visualizzazione riepilogo e statistiche piattaforma
- Gestione profili e annunci
- Approvazione o rifiuto pubblicazione annunci