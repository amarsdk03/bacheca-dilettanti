# 15 — Grafici Home su richiesta

**Stato:** Da terminare  
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze:** Step 14 concluso; contratti grafici dello step 13 verificati.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Collegare la selezione delle card al pannello «Grafici - [nome KPI]». Caricare la sola metrica attiva, inizialmente Utenti. Riutilizzare chart shadcn Base UI con Recharts secondo le versioni correnti compatibili.

Usare area lineare per serie mensili e pie con legenda per distribuzioni; per l'anzianità della coda usare barre per le fasce dello step 13, più distribuzione per tipologia. Le definizioni e il periodo sono visibili. Profitti mostra soltanto non disponibile.

## Componenti e stato

Separare contenitori di recupero dati dai componenti grafici e formattatori per permettere riuso futuro in Statistiche. Statistiche resta comunque la pagina «Presto in arrivo…».

Skeleton per il pannello attivo, stato vuoto ed errore riprovabile. Gestire cambi rapidi di card e risposte fuori ordine; non mostrare una vecchia serie sotto il titolo della nuova card. Caricare codice grafici in modo differito quando utile, senza recuperare preventivamente dati delle metriche non selezionate.

Grafici responsive, tooltip e legenda leggibili, riepilogo accessibile dei dati. Distinguere i mesi vuoti da mancanza dei dati e chiarire che profili e utenti hanno denominatori diversi.

## Criteri di completamento e verifiche

Una sola metrica richiesta per selezione, nessuna query economica, cambi rapidi e sessione revocata. Verificare serie su 12 mesi, etichette, legenda, valori mancanti, dataset vuoti, mobile e accessibilità. Confermare che la coda attuale non è presentata come storico mensile.

## Migrazioni e operazioni manuali

Nessuna migrazione prevista. Eventuali dipendenze grafiche aggiunte con lockfile unico e senza cambiamenti alla UI pubblica.

## Avanzamento

Implementazione completata; restano le sole verifiche integrate e browser nel
[gate 16](16-verifica-rilascio/README.md). Statistiche conserva la pagina futura.

### Componenti e richieste

`HomeChartPanel` usa un controller indipendente per la metrica selezionata;
`HomeCharts`, `PrimaryChart`, `DistributionChart`, `ChartDataTable` e gli adapter
in `chart-presentation.ts` restano riutilizzabili. Chart shadcn aggiunto tramite
CLI soltanto nell’Admin, con utility `cn` locale. Recharts **3.10.1**, compatibile
con React 19, è fissato nel package Admin e nel lockfile unico; nessuna modifica
ai componenti o al tema Web.

Il parser puro dello step 13 è condiviso da server e browser senza cambiare DTO,
RPC o percorsi server. Il trasporto accetta solo risposte coerenti con la metrica
richiesta e usa cookie della stessa origine, `no-store` e abort. Nessun endpoint
aggiuntivo, client tecnico o controllo Admin duplicato nel frontend.

All’apertura: riepilogo e attività continuano a partire in parallelo sul server;
al montaggio client parte **una richiesta grafici Utenti**, senza prefetch delle
altre metriche. Ogni cambio effettivo richiede la nuova metrica; selezionare di
nuovo la stessa non richiama il backend. Cambi nello stesso turno possono
annullare una richiesta prima della sua partenza. Aggiorna/Riprova agiscono sul
solo pannello; nessun polling o cache dei risultati per metrica. BFcache rinnova
la selezione corrente insieme agli altri blocchi Home.

Generazioni e abort ignorano successi, errori e dinieghi superati. Il cambio
selezione rimuove il dataset precedente; un diniego corrente in uno qualsiasi
dei tre blocchi cancella tutti i dati Home e produce un solo redirect.
Montaggio/smontaggio e ripetizione degli effetti StrictMode sono coperti dai test
del controller; il comportamento completo di idratazione resta da provare.

### Rappresentazione e accessibilità

Utenti e Annunci: area lineare su dodici mesi e pie della distribuzione attuale.
Coda: barre per cinque fasce dalla creazione e pie per tipologia, senza storico
mensile inventato. Profitti esegue soltanto la richiesta autorizzata già prevista,
mostra non disponibile e non importa il renderer/Recharts. Il codice grafici
viene caricato con `React.lazy` solo quando un dataset utilizzabile è presente.
Suspense mostra lo skeleton; un confine errori limita errori di rendering o
caricamento al pannello, con Riprova e Ricarica pagina per chunk non recuperabili.

Conteggi interi in italiano, mesi con anno, tooltip, legenda con conteggi,
colori fissi per categoria, altezza esplicita e griglia a una/due colonne.
Animazioni disabilitate e `accessibilityLayer` attivo. Ogni grafico ha riepilogo
testuale e tabella semantica espandibile con «Mostra dati».

Sono visibili istante, fuso, periodo parziale, popolazione, denominatore della
distribuzione, date escluse e limiti del dataset. Profili e utenti hanno totali
distinti; card e grafici possono riferirsi a snapshot diversi. Una serie tutta
a zero conserva dodici mesi piatti; distribuzione vuota senza pie artificiale;
coda vuota con «Nessun annuncio da approvare».

### Verifiche e operazioni manuali

**1.102 test riusciti, zero fallimenti/skip**, inclusi **21 nuovi** per controller,
trasporto, parser condiviso, adapter e rendering, oltre alla regressione delle
feature precedenti. La suite completa usa anche le migrazioni esistenti soltanto
nelle fixture PGlite. Typecheck Web/Admin, lint mirato e CSS Admin in memoria
riusciti; nessuna build di produzione o dev server avviato.

**Operazioni manuali ora: nessuna. Nessuna nuova migrazione o script.** Non
applicare le migrazioni precedenti sul progetto reale per questo step. Per una
nuova installazione, `npm ci` dalla root include la dipendenza nel lockfile.

Prima del rilascio: browser desktop/mobile con resize e tooltip, Tab/frecce e
lettore schermo, focus visibile, idratazione/StrictMode/BFcache, rete lenta e
chunk fallito con recupero, revoca reale e header/cookie PostgREST. Misurare le
richieste effettive e il bundle: nessun renderer prima del dataset o per Profitti,
una sola metrica per selezione e nessuna rilettura automatica dei KPI. I test
React DOM e i trasporti sintetici non attestano questi controlli.

## Prossimo step

[16 — Verifica e rilascio](16-verifica-rilascio/README.md), **6.1 Sol, high**.
