# Step 16 — Chiusura finale e decisione di rilascio

**Stato:** Da iniziare.  
**Decisione di perimetro:** richiesta dell'utente del 28 ottobre 2026: una sola
task conclusiva, senza una nuova sequenza di «procedi».  
**Modello consigliato:** 6.1 Sol, high.

[Master](../../master_plan.md) · [Step 16](README.md) ·
[Matrice V01–V20](matrice-verifiche.md) · [Runbook](runbook-rilascio-recupero.md).

## Traguardo e modalità di esecuzione

Il prossimo «procedi» avvia questa intera task. Comprende ricognizione dei
residui, verifiche necessarie, correzioni dei difetti che impediscono il
rilascio, verifica delle correzioni, aggiornamento degli stati e consegna
della decisione finale. Non fermarsi dopo ciascun controllo per richiedere
un altro «procedi». Non introdurre IN04/IN05 o altri sottopassi di sviluppo.

Il traguardo è **«Pronto per il rilascio»**, con candidato identificato,
evidenze sufficienti e istruzioni operative eseguibili. Non significa aver
già pubblicato o completato controlli possibili solo dopo la pubblicazione.
La pubblicazione e le attivazioni sono operazioni della procedura di rilascio;
non diventano ulteriori task preparatorie da scoprire alla fine.

Questa scelta modifica l'organizzazione del lavoro, non elimina requisiti
obbligatori. Un controllo esplicitamente richiesto sul servizio reale non
può essere dichiarato superato soltanto perché passa nella fixture locale.

## Baseline già acquisita

- Implementazione Web/Admin disponibile; percorso locale 16A–16H concluso.
- M02–M10 installate/verificate nei rispettivi perimetri; M07 attende la sola
  attivazione separata e le verifiche dipendenti dal rilascio. Nessun replay.
- IN02 e [IN03](../../integrazione/03-accettazione-auth.md) conclusi:
  trenta controlli reali Auth/PostgREST e isolamento bidirezionale Web/Admin.
  Unica identità temporanea revocata/cancellata, cleanup verificato.
- Backup M02 leggibile e con hash verificato; ripristino non provato.
- Gli step 03–15 sono implementati e condividono residui di accettazione:
  le loro righe aperte non sono quattordici nuove lavorazioni da avviare.

Riutilizzare queste evidenze se pertinenti al candidato corrente. Ripetere
solo una prova invalidata da modifiche, errori o una condizione non verificata.

## Prerequisiti da risolvere all'inizio

| Risorsa | Stato osservato il 28 ottobre | Azione richiesta prima della prova dipendente |
| --- | --- | --- |
| Progetto Supabase | `nsytraextbndfyprwzts`, destinatario già autorizzato | Non scegliere un altro progetto e non modificare l'allowlist dei runner |
| Auth/Data API | Connessioni effettive provate in IN03 | Riutilizzare configurazione locale senza esportare segreti |
| SQL privilegiato e connessioni concorrenti | Nessun tool Supabase MCP esposto nella sessione; elenco connessioni SQL IDE vuoto | Ripristinare un connettore funzionante o una connessione SQL sicura per le sole prove necessarie; una chiave API non sostituisce SQL |
| Destinazioni Web/Admin | Progetti Vercel, team e host ancora «Da confermare» nel runbook; nessun collegamento Vercel trovato nella ricognizione | Acquisire nomi/URL e accesso operativo, oppure registrare subito la destinazione ancora da predisporre |
| Recupero isolato | Client di backup presenti; nessuna destinazione di restore già verificata | Preparare una destinazione separata e compatibile senza sovrascrivere il progetto condiviso; utilizzare credenziali attraverso canali sicuri |
| Operazioni sensibili ulteriori | Il consenso alla singola identità di IN03 è già consumato e la fixture rimossa | Se servono nuove identità, scritture remote o una preview da pubblicare, descrivere all'inizio numero, bersaglio, pulizia e autorizzazione necessaria; non inferire un consenso illimitato dal precedente |

L'agente deve prima cercare gli accessi già disponibili e completare il lavoro
indipendente. Se manca davvero un accesso, chiedere insieme le informazioni
mancanti; non chiedere password/token in chat. Non iniziare operazioni che
dipendono da un'autorizzazione ancora assente. Il 28 ottobre è stata posta
all'utente una domanda unica su destinazioni Vercel e connessione SQL.

## Lista chiusa di accettazione prima del rilascio

Questi sono criteri interni della stessa task, non nuovi step da avviare con
prompt distinti. Il perimetro è quello esistente V01–V20; non aggiungere nuove
funzionalità, rifacimenti o prove senza rapporto con un requisito o un difetto.

| Criterio | Evidenza necessaria per chiuderlo | Riferimenti |
| --- | --- | --- |
| Candidato e regressione | Identificare i sorgenti e lockfile del candidato; riusare o eseguire i controlli pertinenti delle due app. Una sola validazione finale di build/typecheck/test necessaria; correggere i fallimenti e riprovare le parti invalidate | V01, V06–V09, V12–V16, V19 |
| Autorizzazione, sessioni e audit | Riconciliare copertura IN02/IN03 e residui di ruolo/email, writer e accessi diretti. Verificare i confini tecnici/umani e l'audit richiesto senza modificare account esistenti per simulare errori | V02–V05 |
| Funzioni integrate e concorrenza | Completare i casi ancora obbligatori di lista/dettaglio, moderazione, export/Registro/Home, conflitti e audit/notifiche con dati sintetici. Rilevare piani/tempi/chiamate richiesti; nessun benchmark indefinito o nuovo budget inventato | V08–V10, V12–V15, V17 |
| Compatibilità Web, Storage e cache | Verificare reader/writer e media, policy/bucket, URL e cache pregresse; dimostrare le protezioni richieste prima di abilitare il cestino. Per pagamenti/webhook applicare il perimetro effettivamente attivo e documentare l'eventuale non applicabilità, senza riattivare funzionalità sospese | V11, V18 |
| Recuperabilità | Backup adeguato al candidato e prova di ripristino in destinazione separata, con limiti espliciti su Auth/Storage/configurazioni. Punto di ritorno applicativo compatibile; nessun restore sul progetto condiviso | V20 |
| Consegna di rilascio | Destinazioni, Root Directory, nomi delle variabili e provenienza sicura dei valori, host/redirect e revisioni compatibili. Verifiche HTTPS/preview già richieste dove disponibili; criteri e comandi di rollout/rollback concreti, con responsabilità delle operazioni manuali | V01, V05, V20; runbook §6–9 |

Per ciascun requisito V01–V20 registrare una sola disposizione finale:
**verificato** con evidenza; **non applicabile** con motivazione dimostrata;
**operazione di rilascio** con procedura e prerequisito temporale reali;
oppure **bloccante** con errore o prova mancante identificati.
Non convertire un test mancante in «operazione di rilascio» per chiudere una riga.
Eventuali rinvii di requisiti obbligatori richiedono una scelta esplicita
dell'utente; la richiesta di una task unica non li autorizza implicitamente.

## Operazioni durante e dopo il rilascio

Sono già parte della consegna operativa, non nuovi cicli preparatori:

- Distribuire le revisioni compatibili Web/Admin sulle destinazioni confermate.
- Verificare host reali, cookie/HTTPS e cache del deployment effettivo; eseguire
  il controllo rapido delle funzioni essenziali e del ritorno alla revisione
  compatibile, secondo il runbook.
- Attivare il cestino solo dopo tutti i prerequisiti di
  [§8.1](runbook-rilascio-recupero.md#81-abilitare-il-cestino-soltanto-dopo-app-storage-e-cache),
  quindi verificarne l'operazione sintetica e il ripristino sotto hold.
- Attivare la retention solo con backup e prerequisiti verificati; registrare
  la prima esecuzione pianificata effettiva del job, nel fuso confermato.
- Eseguire i controlli successivi e conservare le evidenze di rilascio.

Prima del rilascio queste operazioni devono essere preparate e revisionabili;
non dichiararle già eseguite. La creazione del job non prova la sua prima
esecuzione. Il gate del cestino resta disabilitato finché mancano i prerequisiti.
Un deploy o un'attivazione non autorizzati non sono inclusi nel semplice via
libera tecnico richiesto dall'utente.

## Esito finale obbligatorio

La task termina con uno di questi due esiti:

- **PRONTO PER IL RILASCIO:** tutti i criteri prima del rilascio soddisfatti,
  zero bloccanti, candidato identificato e procedura operativa pronta.
  Chiudere coerentemente le parti degli step 03–15 effettivamente soddisfatte;
  distinguere gli eventuali stati che attendono un'attivazione operativa.
  Il messaggio finale dice chiaramente «Pronto per il rilascio» e indica
  soltanto le operazioni di rilascio ancora da eseguire.
- **NON ANCORA PRONTO — BLOCCHI CONCRETI:** elencare soltanto problemi o
  prerequisiti realmente riscontrati. Per ciascuno indicare evidenza, impatto,
  soluzione concreta, chi deve intervenire e singolo comando/valore/permesso
  necessario. Conservare il lavoro riuscito e proseguire nella stessa task
  quando arriva l'informazione; nessun nuovo giro generico di verifiche.

Non garantire preventivamente l'esito positivo: la fine del piano è fissata,
il successo dipende dai risultati. Non presentare un accesso mancante come
un difetto del codice e non dichiarare «tutto pronto» con bloccanti aperti.
