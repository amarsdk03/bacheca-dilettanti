# Bacheca Dilettanti — Design della Dashboard Admin

Specifica aggiornata il 14 novembre 2026 sullo stile realmente implementato. Sostituisce la precedente proposta Ember/NUMI e i suoi tre step di restyling.

## Perimetro e riferimento

La Home, Annunci e Registro attività definiscono il riferimento visivo. Applicarlo alle altre pagine operative, alla creazione annunci, ai riepiloghi e a tutti i portal. La piattaforma pubblica `apps/web` e `/accesso`, incluso GradientASCII, sono escluse.

Stack: Next.js App Router, React, Tailwind 4, shadcn con Base UI, Lucide, Recharts. Riutilizzare i componenti presenti; mantenere autorizzazioni, funzionalità, dati e validazioni durante gli interventi esclusivamente visivi. Le funzionalità di Segnalazioni e Codici invito sono descritte in `docs/dashboard/integrazione/segnalazioni-codici-invito.md`.

Utenti e Profili seguono le stesse tabelle, filtri URL e schede laterali. I dettagli degli utenti sono in sola consultazione; i profili hanno azioni confermate di verifica e oscuramento con registro attività. Il pulsante Crea profilo resta disabilitato. Regole e migrazioni in `docs/dashboard/integrazione/utenti-profili.md`.

## Font, gerarchia e densità

- Inter per l’intera Dashboard, inclusi i titoli e le superfici temporanee; Roboto Mono per UUID, codici e dati tecnici.
- Titoli pagina: 34 px desktop, 28 px mobile, peso 650; titoli delle card 17 px/24 px, peso 600. Titoli dei dialog/pannelli 20 px/28 px, peso 600.
- Testo operativo 14 px/20 px; label, intestazioni tabella e metadati 12 px. Non trasformare le label in maiuscolo o aggiungere tracking decorativo.
- Card distanziate 16–24 px, padding 20–24 px desktop e 18 px mobile. Contenuto della pagina con padding desktop 30/32 px, mobile 24/16 px.
- Bordi sottili, raggi 8–9 px sulle card e 12 px sui dialog. Evitare ombre sulle card, gradienti, glows e decorazioni aggiuntive.

## Palette e temi

Le variabili effettive si trovano in `src/app/globals.css`, con fondazioni in `dashboard.css` e regole operative in `operations.css`. Non creare un secondo tema o duplicare i token per ogni pagina.

| Ruolo | Light | Dark |
|---|---|---|
| Canvas | #f8fafc | #0f141d |
| Testo | #101828 | #edf2fa |
| Card | #ffffff | #171e29 |
| Portal | #ffffff | #1b2432 |
| Bordi | #e6eaf0 | #2a3442 |
| Testo secondario | #667085 | #a6b4c8 |
| Pulsante principale | #8e72ff, testo bianco | #ad99ff, testo #101827 |
| Sidebar | #f9fbfe | #111823 |

Token brand: `--brand-indigo: #8e72ff`, `--brand-indigo-200: #d9cfff`, `--brand-indigo-light: #ad99ff`. Usare `primary` per le azioni principali. Verde per approvazione/esito positivo, giallo per attenzione o oscuramento, rosso per errore/rifiuto; selezioni e collegamenti seguono i token esistenti. Colori vivaci dei grafici restano distinti dalle azioni.

Il tema persistente usa `bd-admin-theme`, con dark iniziale. Shell e `bd-admin-portal-root` ricevono gli stessi attributi `data-admin-scope`/`data-admin-theme`, le stesse variabili font e la classe dark contestuale. Non applicare il tema Admin a html/body o al login. Sheet, dialog, select, menu e tooltip usano il container del provider; mantenere focus trap, Escape e ritorno al controllo iniziale.

## Componenti e flussi

- Mantenere i contenuti attuali della sidebar. La riduzione/espansione usa l’implementazione efficiente esistente, senza transizioni globali di layout.
- Data e ora locale italiana al centro della navbar in ogni pagina; aggiornamento locale al secondo, senza API.
- Sotto i 1024 px, mostrare il dialog informativo che consiglia PC o laptop. La chiusura esplicita viene ricordata nel browser per 24 ore; alla scadenza ricompare al successivo accesso o cambio pagina mobile. Allargare la viewport lo chiude senza memorizzare una scelta.
- Tabelle dentro un contenitore con scorrimento orizzontale, mai con overflow dell’intera pagina. Intestazioni, colonne Totale e pulsanti di azione sono allineati a sinistra. Totale è sempre l’ultima colonna nei dati dei grafici.
- Filtri con etichette concise, invio esplicito e ripristino. Usare Field/FieldGroup, InputGroup e componenti semantici presenti. Campi obbligatori con asterisco rosso; validazione con aria-invalid e descrizione associata.
- Stato vuoto, caricamento, errore, disabilitato e conflitto devono risultare leggibili in entrambi i temi. Un pulsante disabilitato conserva sfondo e bordo riconoscibili.
- Menu Annunci: Dettagli, Moderazione e Distribuzione. Le tre azioni di moderazione sono icone affiancate con nome accessibile/tooltip, colore semantico e sfondo colorato soltanto in hover/focus.
- Oscurato prevale su Pubblico/Privato; Distribuzione usa Solo sito web, Da WhatsApp, Su WhatsApp e N/A. Le legende usano heading e descrizione, senza tabelle decorative.
- Dialog e pannelli mantengono lo stesso carattere delle card: bordi delicati, superfici uniformi, descrizioni brevi e azioni chiare. Conferme distruttive conservano le informazioni necessarie a decidere.
- Creazione annunci: tab sequenziali, autore/WhatsApp, campi di profilo e annuncio, contatti/media, riepilogo finale. I componenti condivisi con Web ricevono lo stile solo attraverso lo scope Admin.
- I link HTTPS sull’origine esatta www.bachecadilettanti.it si aprono direttamente con noopener/noreferrer; gli altri seguono la conferma di navigazione esistente.

## Verifica e manutenzione

Le modifiche visive non autorizzano nuove feature. Le pagine ancora segnaposto conservano il loro contenuto. Aggiornare i componenti comuni prima di aggiungere eccezioni locali.

Per modifiche funzionali: test mirati esclusivamente con fixture/servizi locali, typecheck e lint dei file interessati. Per la UI verificare temi, focus, tastiera e responsive. Non avviare build di produzione o un nuovo dev server a ogni piccola modifica; per verifiche browser usare il runner isolato esistente. Non usare URL pubblicati o credenziali remote nei test.

I controlli live finali del precedente rilascio restano confermati dall’utente il 28 ottobre 2026, distinti dalle verifiche locali dell’agente. Attivazione cestino, retention/Cron e prova completa di ripristino restano operazioni manuali separate.
