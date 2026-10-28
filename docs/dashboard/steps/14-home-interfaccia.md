# 14 — Home, KPI e azioni rapide

**Stato:** Da terminare (sole verifiche integrate/browser; implementazione verificata)  
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze:** Implementazione dello step 13 verificata; aggregazioni e lista audit disponibili. Prove integrate rinviate al gate 16.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Comporre Home con titolo «Bentornato, admin!» senza icona, quattro card KPI, azioni rapide e tabella delle ultime 5 operazioni.

Card «Utenti totali», «Annunci totali», «Annunci da approvare», «Profitti totali». Quest'ultima mostra «Non disponibile»; errori delle altre metriche non diventano zero. Card selezionabili con stato accessibile, predefinita Utenti; il pannello grafici viene collegato allo step 15.

## Navigazione e caricamento

«Annunci da approvare» apre la tabella filtrata; «Segnalazioni aperte» apre la pagina futura senza numero di segnalazioni fittizio; «Crea profilo limitato» è disabilitato con indicazione «Presto». «Vedi registro completo» apre Registro attività.

Riutilizzare i componenti di presentazione audit senza duplicarne le query. Caricare KPI e ultime operazioni indipendentemente con skeleton adeguati. Un errore in un blocco non nasconde l'altro. Non implementare le sezioni future tramite queste azioni rapide.

## Criteri di completamento e verifiche

Valori confrontati con le fixture dello step 13, zero vs errore, profitti non disponibili, registro vuoto, link con filtri corretti, nessuna query per funzioni future. Verificare tastiera, stato selezionato delle card, griglia mobile e caricamenti indipendenti.

## Migrazioni e operazioni manuali

Nessuna nuova migrazione, script o configurazione. **Operazioni manuali ora:
nessuna. Non applicare SQL al progetto reale per proseguire lo sviluppo.**
Per il futuro ambiente isolato restano necessari i prerequisiti fino a 13,
secondo il [runbook dati Home](13-home-dati.md).

## Avanzamento

### Risultato implementato

Home protetta con un solo titolo senza icona, quattro KPI, azioni rapide,
ultime cinque operazioni e pannello «Grafici - [nome KPI]». Griglia di una/due/
quattro colonne e tabella con scroll contenuto; Light/Arial ereditati. Icone
nelle card e nelle azioni, senza modifiche alla UI pubblica o alle sezioni future.

Numeri dalle aggregazioni 13: Utente esatto con registrazione completata,
annunci escluso cestino e coda in revisione. Formattazione italiana con
separatore delle migliaia e zeri reali. Profitti sempre «Non disponibile».
Un errore non diventa zero: compare un messaggio con riprova e correlazione.

Card shadcn con ToggleGroup/Toggle della dipendenza Base UI già installata:
selezione singola non vuota, inizialmente Utenti, nome/descrizione/valore
accessibili, stato pressed, collegamento ARIA al pannello e focus visibile.
La selezione sopravvive agli aggiornamenti, ma non viene persistita in URL,
cookie o localStorage. Nessun nuovo wrapper UI o pacchetto.

Il pannello segue la metrica selezionata e mostra «I grafici saranno disponibili
a breve» oppure l’indisponibilità dei profitti. **Nessuna richiesta ai grafici
né codice Recharts**: collegamento nello step 15.

Azioni: `/annunci?status=in_revisione` con cestino escluso dal default esistente,
`/segnalazioni` senza conteggio presunto, «Crea profilo limitato» disabilitato
con badge «Presto». Link interni con prefetch false; nessun contenuto esterno
aperto e nessuna necessità di AlertDialog esterno.

### Attività e caricamento indipendente

Estratta `AuditSummaryTable` nella feature audit: presentazione senza query,
DTO e formattatori già esistenti, data Europe/Rome, operatore/email attuale,
fallback UUID, distinzione dell’identità solo Auth ed esito. Home: tre colonne
senza dettagli. Registro: quarta colonna invariata con callback ID/elemento
trigger, conservando Sheet e ritorno focus. Nessuna duplicazione delle query.

Cinque eventi al massimo dal servizio 13; stato vuoto con spiegazione dello
storico assente. «Vedi registro completo» rimane disponibile anche in errore.
Valori renderizzati come testo React, mai HTML o link automatici.

La pagina attende la guardia Admin, avvia riepilogo e attività in parallelo e
usa due wrapper RSC asincroni in Suspense separati. Ogni wrapper attende soltanto
il proprio risultato, reindirizza un diniego e passa il DTO iniziale al blocco
client. Nessun Promise.all bloccante o fetch duplicato all’idratazione.

Skeleton iniziali pertinenti: quattro card (profitti già non disponibili) e
tabella di cinque righe/tre colonne. Aggiornamento successivo sostituisce solo
i tre numeri oppure le righe del blocco interessato; l’altro blocco, le azioni
rapide e la selezione restano utilizzabili. Errori e riprove separati.

### Controller, sessione e richieste

Trasporto limitato ai GET esistenti `/api/home/summary` e `/api/home/activity`,
stessa origine/no-store, redirect error e AbortSignal. Controlla status HTTP/
JSON, forma minima del riepilogo e limite cinque eventi. HTML o risposte
incoerenti producono indisponibilità riprovabile; validazione e autorizzazione
restano nei servizi e nelle RPC dello step 13.

Controller indipendenti con abort e generazioni: successi, errori o dinieghi
superati non sostituiscono il risultato corrente. Smontaggio annulla la
richiesta; prima di avviare un trasporto programmato si ricontrolla il diniego.

Coordinatore locale della Home per selezione e diniego, senza cache del ruolo:
un diniego corrente blocca nuove richieste, svuota entrambi i risultati, annulla
i trasporti e nasconde l’intera Home prima di un solo redirect a `/accesso`.
Anche registrazioni tardive vengono svuotate senza nuove richieste.

Aggiornamento/riprova per singolo blocco, nessun polling. Su
`pageshow.persisted` rivalidano entrambi i blocchi montati; quelli ancora in
streaming rivalidano quando si registrano. Le registrazioni rimosse non
ricevono aggiornamenti; il provider non modifica sessione o cookie.

### Verifiche locali

**1.081 test riusciti, zero fallimenti/skip**, inclusi **33 nuovi**:
13 controller/trasporto e 20 interfaccia/composizione server. Comprese le
regressioni dati Home, audit/Registro/Auth, Annunci, moderazione/cestino/export
e consumatori Web. Aggiornati i test della Home provvisoria: l’assenza di icona
riguarda il titolo, non tutta la pagina.

Coperti guardia prima delle letture, partenza parallela/Suspense distinti,
diniego dei wrapper, quattro KPI/zero/formattazione, errori separati, cinque
eventi/vuoto/identità, HTML escapato, link/prefetch e azione disabilitata,
selezione non vuota e pannello per tutte le metriche, skeleton, callback e
trigger del Registro, assenza di fetch iniziali/grafici, risposte superate,
smontaggio/BFcache/blocchi tardivi, cancellazione globale e redirect unico,
risposte HTML/status incoerenti e attività oltre cinque eventi.

Typecheck Web/Admin e lint mirato riusciti; CSS Admin compilato in memoria.
Nessuna nuova migrazione/dipendenza, build, dev server, Docker, connessione
Supabase o lettura/modifica `.env.local`. Nessuna applicazione SQL o deploy.
I test risolvono esplicitamente i wrapper RSC prima del rendering React DOM:
non attestano streaming Next.js, idratazione o interazioni browser reali.

### Prove future, recupero e gate 16

Preparare l’ambiente **isolato con dati sintetici** secondo 03B e applicare/
verificare i prerequisiti fino a 13, poi distribuire l’Admin compatibile.
Nessuno script/configurazione aggiuntivo per 14. Recupero applicativo: tornare
alla versione Admin precedente conservando funzioni, tabelle, audit e protezioni.
Non rimuovere RPC o allentare autorizzazioni per ripristinare la UI precedente.

Al gate 16: streaming/idratazione con blocco lento o fallito e revoca durante
la lettura, rinnovo cookie e header effettivi; griglia/scroll desktop e mobile,
focus, Tab/frecce/Space/Enter Base UI e annunci accessibili; BFcache con richieste
in corso/blocchi tardivi, navigazione interrotta e ritorno focus nel Registro.
Misurare guardia SSR e due RPC funzionali costanti, senza duplicazioni iniziali,
N+1, polling o richieste grafici.

## Prossimo step

[15 — Grafici Home](15-home-grafici.md), **6.1 Sol, medium**.
