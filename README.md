# Bacheca Dilettanti - Sito web ufficiale

#### La piattaforma italiana dedicata ad annunci, opportunità e visibilità nel calcio dilettantistico

Link sito web: https://www.bachecadilettanti.it/

Sviluppato da Amar Sidkir, per Gabriele Zaniboni, a partire dal 15 luglio 2026.

# 1. Architettura generale

### Framework

- React
- Next.js

### Database

- Supabase
- Resend (per SMTP)

### Styling

- Shadcn
- Tailwind CSS
- Lucide Icons
- React Bits

### Pagamenti

- Stripe API

# 2. Changelog

## Versione 2.0 - TBA

- Rilascio al pubblico dei profili 'Professionisti e studi' e 'Creators'
- Personalizzazione aumentata per i vari sottoprofili
- Aggiunta di analitiche visualizzazione per aggiornamenti, profili e annunci

---

## Versione 1.0 - ?? settembre 2026

### Feature rilasciate

#### Principali

- Homepage
- Pubblicazione articoli e aggiornamenti piattaforma
- Visualizzazione listino prezzi e pacchetti premium
- Sezione contatti (Instagram e Whatsapp) e partner/sponsor
- Compliance legale tramite LegalBlink (GDPR, privacy policy, cookies...)

#### Account personale

- Registrazione e accesso tramite indirizzo email verificato
- Personalizzazione dei sottoprofili
- Visualizzazione annunci personali
- Cambio password via link email

#### Profili

- Selezione e personalizzazione di 8 tipologie di sottoprofili:
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

#### Annunci

- Pubblicazione annuncii per utenti anonimi e registrati:
  - Selezione del sottoprofilo
  - Compilazione/aggiornamento dati del sottoprofilo
  - Compilazione dati dell'annuncio
  - Possibilità di pagamento per annuncio prioritario
  - Verifica tramite codice OTP per utenti anonimi (rate limiting)
- Possibilità di visualizzare, nascondere o eliminare annunci dal proprio profilo
- Possibilità di cercare e filtrare gli annunci pubblicati sulla piattaforma
- Possibilità di visualizzare maggiori info su un annuncio specifico

#### Admin

- Accesso per soli utenti admin
- Visualizzazione riepilogo e statistiche piattaforma
- Gestione profili e annunci
- Approvazione o rifiuto pubblicazione annunci