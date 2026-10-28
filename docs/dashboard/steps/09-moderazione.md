# 09 — Moderazione e visibilità

**Stato:** Da terminare — implementazione verificata; prove integrate/browser e concorrenza reale rinviate al gate 16  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** Parte implementativa 08 verificata; audit atomico e contratti di lettura disponibili. Prove integrate rinviate nel gate 16 secondo il master.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

**Integrazione M06 — Conclusa nel registro operativo:** [guida operativa](../integrazione/06-moderazione-annunci.md)
e [verificatore prima/dopo](../../../supabase/scripts/dashboard_admin_check_m06.sql)
preparati sul progetto `nsytraextbndfyprwzts`, Free, dopo M05 Concluso.
Otto nuovi test del verificatore inclusi nei **458 test mirati riusciti**, zero
fallimenti/skip; lint riuscito. Migrazione esistente invariata. Report iniziale
completo del 26 ottobre, 09:45:00 UTC, positivo: prerequisiti coerenti, 185 colonne
corrispondenti e zero oggetti M06. Report successivo delle 09:49:06 UTC con tutti
i 26 oggetti attesi corrispondenti; confronto 27/27 protezioni, 27/27 metadati e
protezione pagamento invariati. Report delle 09:57:05 UTC: dodicesima routine
identificata nella firma legacy pagamento a otto argomenti, preesistente nel backup
M02 con identici hash corpo/ACL. Riprodotto il rollback sotto hold, preparata M06A
integrativa che conserva oscuramento e motivo senza cambiare grant. Verificatore
versione 3 esige il corpo corretto e rifiuta ogni altra firma inattesa.
**464 test mirati e lint riusciti**, quattro nuovi casi legacy inclusi.
Report finale versione 3 delle **10:27:00.881719 UTC**:
`m06_structurally_verified`, 26 oggetti e dodici routine coerenti, nessuna firma
inattesa, correzione legacy M06A riscontrata. Confronto finale 27/27 protezioni
e 27/27 metadati identici, privilegi pagamento/ACL legacy invariati. Evidenze
conservate separatamente; nessuna operazione manuale residua M06. Non ripetere
M06, M06A o M05. Lo step 09 complessivo resta Da terminare per i gate integrati.
SQL remoto non eseguito dall'agente; prove gateway e
concorrenza reale restano distinte. M07 non avviato.

## Obiettivo e attività

Attivare approvazione/rifiuto degli annunci in revisione, oscuramento e ripristino della visibilità. Stato di moderazione, visibilità, privacy e pagamento sono dimensioni distinte: non approvare annunci in attesa di pagamento né trasformare un ripristino visibilità in approvazione.

Motivazione obbligatoria per rifiuto e oscuramento, conferma esplicita prima della mutazione. Derivare operatore e timestamp dal server. Riutilizzare `info_stato_annuncio` soltanto per informazioni compatibili con la sua visibilità pubblica; note interne sensibili rimangono nell'audit, non nei DTO pubblici.

## Contratto e transazioni

Le azioni accettano risorsa, operazione, motivazione pertinente e precondizione di versione/stato. Il database verifica ruolo/sessione, precondizione e transizione consentita; modifica e audit di successo sono nella stessa transazione. Una precondizione non più valida restituisce conflitto e invita a ricaricare.

Usare il `contentFingerprint` di 07B per il confronto del contenuto completo,
ricalcolando lo snapshot privato nella transazione dopo l'autorizzazione. Il solo
`rowFingerprint` di 07A non copre i figli. Verificare e serializzare anche i
percorsi di scrittura delle relazioni; il lock del parent da solo non basta.
Flag `complete` e condizioni di approvabilità vanno rivalutati sul server, senza
fidarsi del DTO o di una lettura precedente. Definire le transizioni ammesse per
contenuti incompleti o tipi non supportati prima di abilitare i pulsanti.

Bloccare doppio invio nell'interfaccia e gestire retry senza duplicare transizioni o successi audit. Non aggiornare la UI come riuscita prima della conferma server. Dopo il successo aggiornare lista e dettaglio interessati.

Analizzare i trigger esistenti per feed/notifiche: preservarne il comportamento legittimo senza introdurre messaggi automatici aggiuntivi. Le funzioni esposte non devono permettere mutazioni arbitrarie.

## Criteri di completamento e verifiche

Provare transizioni consentite/vietate, pagamento pendente, motivazione assente, concorrenza tra due Admin, revoca tra lettura e azione, retry e guasto audit. Confermare che oscuramento non altera privacy o stato di approvazione.

## Migrazioni e operazioni manuali

Procedure di moderazione e, se necessario, supporto alla concorrenza con migrazioni compatibili con la webapp esistente. Documentare effetti dei trigger, ordine di applicazione e recupero; prove soltanto su dati sintetici.

## Avanzamento

Implementato l'intero step in un solo intervento, come richiesto. Motivazioni
visibili anche all'autore; dettaglio incompleto/legacy consente soltanto le
operazioni che riducono l'esposizione. Parte implementativa disponibile per 10.

### Transizioni effettive

| Operazione | Condizioni rivalutate nel DB | Effetto |
| --- | --- | --- |
| Approva | `in_revisione`, dettaglio completo/supportato, titolo presente, regioni per servizi professionali, ricevuta valida se prioritario | `pubblicato`; oscuramento/privacy invariati |
| Rifiuta | `in_revisione`, anche se incompleto/non supportato; motivo obbligatorio | `rifiutato`; motivo autore e audit |
| Nascondi | `nascosto` diverso da true, anche stato/dettaglio legacy; motivo obbligatorio | `nascosto=true`, `oscurato_da_admin=true`; stato/privacy invariati |
| Ripristina visibilità | `nascosto=true`, completo/supportato, titolo/regioni validi, stato `in_revisione`, `pubblicato` o `rifiutato` | Entrambi i flag false; stato/privacy invariati, nessuna approvazione implicita |

Il ripristino è negato durante il pagamento e per stati non riconosciuti.
Approvare un annuncio già oscurato non ne rimuove l'oscuramento. Il DB continua
ad applicare il ciclo di vita prioritario: pagamento registrato, nessun rimborso
richiesto/completato, inizio dei sette giorni alla pubblicazione. Il rifiuto
segnala il rimborso alle procedure esistenti nei soli casi già previsti.
Non vengono introdotte chiamate Stripe, email o rimborsi aggiuntivi.

Motivi: trim, da 1 a 1.000 code point per rifiuto/oscuramento; non ammessi per
approvazione/ripristino. Testo semplice in `info_stato_annuncio` e audit,
con etichetta «Motivazione visibile all’autore» e avviso sui dati riservati.
Il profilo dell'autore mostra già quel testo. Il rifiuto produce la notifica di
stato esistente con il motivo; il solo oscuramento non aggiunge notifiche.
I successivi messaggi dei flussi di stato/rimborso possono sostituire il testo
corrente; il motivo originale resta nell'audit e nella notifica di rifiuto.

### Migrazione e concorrenza

Generata con CLI 2.122.0:
[20261024155838_admin_announcement_moderation.sql](../../../supabase/migrations/20261024155838_admin_announcement_moderation.sql).
**Preparata, applicata e verificata soltanto in PGlite. Non applicata a Supabase.**

- Nuovo flag `public.annuncio.oscurato_da_admin`, default false; non classifica
  retroattivamente gli oscuramenti preesistenti. Nessun nuovo grant di modifica
  tabelle. Un trigger invoker impedisce ai writer ordinari/tecnici di rimuovere
  il flag e impedisce `nascosto=false` mentre è attivo. Il flag è modificato dal
  percorso DB privato elevato; le operazioni SQL dell'operatore postgres restano
  riservate all'amministrazione infrastrutturale.
- RPC pubblica invoker `admin_moderate_announcement_v1`, ponte privato definer
  con `search_path` vuoto: ruolo SQL authenticated, sessione umana e ruolo
  esattamente `Admin` verificati una volta. Operatore, data e correlazione sono
  derivati nel DB. Helper grezzi/proiettori non eseguibili dai ruoli API.
- Lock delle ricevute esistenti ordinati per submission, poi parent con
  `FOR UPDATE NOWAIT`. Lo snapshot completo viene riletto dopo i lock, in una
  nuova istruzione del percorso volatile, e confrontato con `contentFingerprint`.
  Lock non disponibile, deadlock o errore di serializzazione danno conflitto.
- Trigger su undici dettagli e quattro raccolte: ogni INSERT/UPDATE/DELETE,
  anche privilegiato, acquisisce il lock parent NOWAIT. Per spostamenti vengono
  considerati vecchio e nuovo parent in ordine UUID; la cancellazione a cascata
  rimane consentita. Il lettore di moderazione non prende lock sulle righe figlie.
  Le prove con connessioni realmente concorrenti rimangono da eseguire.
- Modifica, timestamp/operatore, trigger di priorità/notifiche e successo audit
  sono atomici. Il blocco transazionale interno viene annullato anche quando
  la RPC restituisce un esito controllato dopo un errore. Nessun successo
  parziale o messaggio SQL grezzo restituito al browser.
- Il completamento del pagamento preserva un eventuale flag amministrativo,
  `nascosto=true` e la motivazione di oscuramento. Rimangono le altre condizioni
  della funzione di pagamento. La migrazione controlla la forma del corpo
  esistente e fallisce se non corrisponde alla versione analizzata.

Il proiettore 07B è riutilizzato come helper interno senza duplicare il controllo
Auth. Restano fingerprint della fonte completa, anonimato e limiti delle raccolte.
Controlli semantici di recapiti, periodi, orari e URL sono anche SQL. Il controllo
URL di approvabilità è deliberatamente conservativo: host ASCII/DNS, IPv4
canonico o IPv6, porte valide, niente credenziali, controlli o backslash.
Host Unicode/encoded devono essere normalizzati prima di approvare/ripristinare;
il renderer mantiene la sua validazione URL indipendente e non fa fetch remoti.
Limiti testuali allineati a UTF-16 del parser JS; valori eccessivi o numeri non
rappresentabili diventano incompleti, senza rendere inaccessibili rifiuto/nascondi.

### Contratti e server

`features/annunci/moderation.ts` contiene input chiuso, esiti e capacità.
Il DTO dettaglio aggiunge `moderation: { adminHidden, capabilities }` con
`allowed/reason` per le quattro operazioni. La presenza è opzionale solo per
letture durante il passaggio da 07B: se manca, i comandi falliscono chiusi.
Un dettaglio incompleto non può abilitare approva/ripristina neanche nella UI.
Aggiornati i tipi condivisi per colonna e RPC, senza rigenerazione remota.

La Server Action `moderateAnnouncementAction(input)` usa il client SSR
scrivibile della sessione e `getClaims`, poi **una RPC mutativa**. Input:
`id`, `operation`, `fingerprint`, `reason`; nessuna identità/ruolo dal client.
Esiti: `ok` con ID risorsa/evento/correlazione, oppure `invalid`, `denied`,
`not_found`, `conflict`, `not_allowed` con motivo, `unavailable`.
Il servizio proietta la risposta e non conserva cache o retry.

Un fallimento significativo, dopo il termine/rollback della richiesta DB, passa
al servizio audit 04B in una richiesta separata. Questo rilegge il contesto e usa
il client tecnico soltanto per l'attestazione del fallimento, mai per moderare.
Non registra payload o motivo pubblico nel log tecnico. Un errore dell'audit di
fallimento non può trasformare l'esito della moderazione in successo.
La singola RPC riguarda il percorso funzionale di successo, non il traffico
Auth/JWKS/proxy né l'audit separato dei fallimenti.

### Interfaccia e compatibilità Web

Menu della tabella e pannello dettaglio espongono le operazioni, con condizioni
e motivi di blocco. La conferma rilegge sempre il dettaglio prima di usare la sua
versione completa; durante il caricamento non è possibile inviare. AlertDialog
con effetto esplicito, textarea per il motivo, focus iniziale su Annulla e
ritorno al controllo, al titolo del pannello o dell'elenco se non più montato.
Contenuto scorrevole su viewport stretti.

Il controller ha una richiesta di verifica dedicata, annullamento/generazione
e stato di mutazione. Blocca doppio invio e chiusura della conferma durante il
salvataggio. Nessun risultato ottimistico. Un successo ricarica lista corrente
e dettaglio aperto mantenendo URL/cursore; eventuali errori di lettura rimangono
distinti dal salvataggio riuscito. Conflitto/esito incerto richiedono rilettura e
nuova conferma: la vecchia versione non può duplicare transizione/successo audit.
Una mutazione inviata non può essere annullata dal browser; smontare la pagina
ignora la risposta tardiva, e il successivo ingresso rilegge i dati.

La webapp pubblica seleziona il flag nel profilo, mostra «Oscurato
dall’amministrazione» e disabilita Mostra. L'azione server verifica il flag prima
di scrivere e gestisce il diniego del trigger se l'oscuramento arriva dopo la
lettura di proprietà. Non basta il controllo UI. I normali oscuramenti autonomi
dell'autore continuano a funzionare.

Creazione, export e cestino restano disabilitati; nessuna parte dello step 10
anticipata. Nessuna nuova dipendenza npm o modifica dello schema colori/font.

### Verifiche eseguite

**532 test riusciti, zero fallimenti/skip**, inclusi **69 nuovi casi** tra DB,
servizio/controller/conferma e protezione dell'azione Web. Copertura: transizioni,
capacità su undici tipologie, ruolo/sessione/ACL, input/versione figli, motivi,
doppio invio, risposte superate, rete con esito incerto, audit atomico,
priorità/rimborso, notifiche e preservazione del flag al pagamento.
Nuove fixture importano corpi reali dei trigger di pagamento, stamp e notifica;
i riferimenti presentazionali delle notifiche sono sintetici, non l'intero schema.

```powershell
node --test tests/admin-moderation-database.test.mjs tests/admin-moderation-server.test.mjs tests/admin-moderation-interface.test.mjs tests/admin-annunci-interface.test.mjs tests/admin-announcement-detail-database.test.mjs tests/admin-announcement-detail-server.test.mjs tests/admin-announcements-database.test.mjs tests/admin-announcements-server.test.mjs tests/admin-auth-server.test.mjs tests/admin-auth-interface.test.mjs tests/admin-audit-server.test.mjs tests/admin-authorization-database.test.mjs tests/admin-web-boundary.test.mjs tests/admin-dashboard.test.mjs tests/admin-external-navigation.test.mjs tests/interactions.test.mjs tests/profile-details.test.mjs tests/publish-announcement-reconciliation.test.mjs tests/priority-announcements-paused.test.mjs tests/temporary-auto-approval-database.test.mjs
npm run typecheck
npm run typecheck:admin
```

Typecheck delle due app, lint mirato su sorgenti/test modificati e compilazione
PostCSS/Tailwind in memoria delle due app riusciti. Dopo le ultime correzioni
su focus/overflow e preservazione del motivo al pagamento, ripetuti i 47 casi
DB/interfaccia moderazione, tutti riusciti. Nessun dev server o build di produzione.

### Procedura storica per le prove integrate e recupero

La procedura seguente documenta il gate integrato previsto durante lo sviluppo.
Il percorso corrente è la [guida M06](../integrazione/06-moderazione-annunci.md):
controllo iniziale READ ONLY positivo acquisito sul progetto già identificato;
applicazione riscontrata dai 26 oggetti coerenti e protezioni/metadati invariati.
Correzione M06A e verifica finale versione 3 concluse nel registro operativo;
non riapplicare M06, M06A o M05.
Il vecchio percorso 03B con Docker resta alternativo, fuori dal percorso scelto.
Per le prove funzionali integrate successive:

1. Verificare destinazione sintetica e policy Auth secondo i runbook esistenti;
   nessun ripiego sulla produzione. L'ambiente attuale è quello confermato in M06.
2. Applicare/verificare nell'ordine la baseline Web e i prerequisiti 03, 04A,
   04B, 07A e 07B. Controllare le quindici tabelle, ricevute e la funzione
   `record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean)`.
3. Nel SQL Editor **del progetto isolato**, con ruolo postgres, eseguire l'intero
   file di migrazione 09 sopra collegato una sola volta. È transazionale; un
   prerequisito o una definizione inattesa impedisce l'applicazione. Non rimuovere
   i controlli per forzarla. In caso di errore chiudere la transazione con rollback,
   verificare lo schema e correggere la causa prima di riprovare.
4. Verificare colonna/default, quindici trigger dei figli, guardia visibilità,
   ACL invoker/definer, capacità DTO, errore su autore/tecnico e una moderazione
   con un solo successo audit. Eseguire le prove concorrenti e browser del gate 16.
5. Distribuire le due app compatibili **dopo** la migrazione: il nuovo profilo Web
   legge la colonna. Prima dell'eventuale rilascio reale preparare backup e runbook
   consolidato; nessuna attestazione di applicazione remota è stata effettuata.

Se serve recuperare, disabilitare i nuovi comandi o tornare all'app precedente
mantenendo flag/guardia nel DB. Non cancellare la colonna o aggirare il trigger:
si perderebbe la protezione degli annunci oscurati. Un ritorno applicativo non
annulla moderazioni/audit né effetti finanziari già registrati; eventuali
correzioni dati richiedono operazioni esplicite, tracciate e valutate separatamente.

### Residui del gate 16

Schema completo e advisor/ACL effettivi; due connessioni SQL/Admin concorrenti,
writer figli e parent vecchio/nuovo, ricevute/webhook, snapshot dopo attesa/lock,
rollback e assenza di stalli; costi dei trigger su pubblicazione/import e dettaglio.
Verificare RPC/Server Action reale, cookie e rendering Next dopo rinnovo sessione,
revoca tra conferma/invio, esiti incerti dopo commit, audit fallimenti separato.
Browser: focus, Escape/Annulla, menu e AlertDialog sopra Sheet, cambio URL durante
l'invio, mobile, motivazione autore e profilo Web con flag. PGlite serializza le
chiamate e non dimostra concorrenza reale; rendering statico non dimostra DOM/focus.

## Prossimo step

[10 — Cestino](10-cestino.md), **6.1 Sol, high**.
