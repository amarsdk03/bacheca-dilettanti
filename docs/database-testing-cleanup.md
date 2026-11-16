# Reset dei contenuti del database reale — reset-all-content-v2

Questa versione sostituisce la precedente pulizia selettiva. **Vanno eliminati anche tutti gli annunci, tutti i profili e tutte le segnalazioni.** Il database locale di testing rimane popolato e non viene utilizzato come destinazione dell'operazione. Nessuna migrazione o modifica permanente alle API/schema.

Gli strumenti sono verificati su fixture locali. La generazione dei file non esegue la pulizia remota: finché l'intero `apply.sql` non termina con successo nel progetto reale, il database non è stato svuotato.

## Cosa rimane e cosa viene eliminato

Rimangono soltanto:

- L'account Auth e applicativo `bachecadilettanti@gmail.com`, UUID Auth `0b889a5b-a5a5-49ce-a8b7-c1c899f0e391`, con credenziali, ruolo e sessioni.
- I 18 canali regionali, con ID, nomi, link e stato invariati, senza pubblicazioni o annunci associati.
- Il logo condiviso `foto_profilo/bachecadilettanti.png`.
- Cataloghi, bucket, configurazioni Auth/Admin, funzioni, RLS, privilegi e struttura del database.

L'inventario attualmente disponibile prevede la cancellazione di **153 annunci, 10 profili, 4 segnalazioni e 6 altri account**. Sono inclusi annunci privati, nascosti, rifiutati o cestinati; tutti i dettagli, recapiti, località, link, sottoprofili, verifiche e restrizioni vengono eliminati. Non rimangono profili collegati all'admin.

Si azzerano anche Registro attività, notifiche, preferiti, follower, inviti, manifestazioni d'interesse, richieste OTP/registrazione, ricevute di invio e checkout, storico WhatsApp, revisioni e originali importati, gruppi regionali, snapshot, marcatori di notifica e hash di attività dei contenuti eliminati. Le transazioni sono state dichiarate di test: nessuna chiamata a Stripe, nessun rimborso e nessuna cancellazione dei dati sui servizi esterni. Log tecnici del provider, backup già esistenti e messaggi effettivamente presenti su WhatsApp restano fuori da questa operazione.

Si rimuovono inoltre **21 immagini** (15 nel bucket `immagini_annunci`, 6 in `immagini_profili`) in una fase API separata; i bucket e il logo rimangono. Gli upload server possono avere il proprietario vuoto. Le immagini referenziate dai contenuti da eliminare e gli upload nei formati gestiti sono classificati come eliminabili; file e bucket non riconosciuti bloccano la preparazione.

## 1. Inventario e generazione SQL

Sospendere pubblicazioni, modifiche e upload fino alla conclusione dell'operazione. Eseguire l'intero [testing_cleanup_inventory.sql](../supabase/scripts/testing_cleanup_inventory.sql) nel SQL Editor del **progetto reale**, come `postgres`, ed esportare la colonna `inventory` in `.local/database-cleanup/inventory.json`. È accettato anche l'export JSON a una riga `[{"inventory": {...}}]`. La query è di sola lettura; non esporta password o contenuti testuali privati.

Il backup database è stato **esplicitamente escluso dall'utente**. Generare il nuovo script dalla root:

```powershell
node scripts/database-cleanup/run.mjs prepare --manifest .local/database-cleanup/inventory.json --skip-database-backup
```

Il comando sostituisce `.local/database-cleanup/apply.sql`, `summary.md` e `storage-plan.json`. Leggere il riepilogo e verificare che nell'intestazione dello SQL compaia **reset-all-content-v2**. Non usare le vecchie copie che conservavano annunci e segnalazioni. I campi legacy `keepProfiles` e `references[].keep` nell'inventario descrivono le relazioni originali: non proteggono quei contenuti nella nuova politica.

La rinuncia al backup è registrata nei metadati e nel riepilogo. Il rollback protegge dagli errori durante la transazione; dopo il COMMIT non è disponibile un ripristino fornito da questa procedura. È ancora possibile fornire un backup esistente con `--database-backup PATH` al posto del flag di rinuncia. Inventari, copie e script generati sono in `.local/`, esclusa da Git.

## 2. Esecuzione SQL sul progetto reale

Aprire `.local/database-cleanup/apply.sql` ed eseguire **l'intero file** nel SQL Editor del progetto reale, senza JWT applicativo. Lo script blocca le tabelle, confronta nuovamente conteggi, identificativi e fingerprint con l'inventario ed elimina i contenuti nell'ordine imposto dalle dipendenze. Se il database è cambiato, interrompe l'operazione e richiede un nuovo inventario.

Gli annunci cestinati vengono sbloccati nei soli metadati del cestino all'interno della stessa transazione, quindi eliminati insieme ai dettagli. I trigger di sicurezza rimangono attivi. Lo script non usa `TRUNCATE CASCADE`, non elimina tabelle e non azzera sequenze. Trasferisce all'admin la proprietà dei file degli account rimossi, senza cancellarne i byte in questa fase; i file senza proprietario rimangono senza proprietario.

Prima del COMMIT verifica **zero annunci, zero profili, zero segnalazioni, un solo account e 18 canali intatti**, oltre all'assenza di righe nelle tabelle di dipendenza e alla conservazione di configurazioni, sessioni admin e schema. Qualsiasi errore annulla la transazione. Se il client mantiene la transazione aperta dopo un errore, eseguire `ROLLBACK;`. Il risultato `cleanup_result` emesso prima del COMMIT non è una conferma se il file termina con un errore.

Rieseguire l'inventario ed esportarlo in `.local/database-cleanup/after.json`. Questo confronto è una verifica operativa dei dati, non un test funzionale remoto delle applicazioni. La rimozione degli account revoca le sessioni e i refresh; i JWT già emessi possono restare validi fino alla loro scadenza. Non sono richiesti build, deploy o modifiche alla webapp.

## 3. Copia e rimozione delle immagini

Il backup dei **file Storage** rimane obbligatorio prima della rimozione API; si può fare prima o dopo la fase SQL, che conserva tutti i file fisici. Nel solo processo operativo impostare la service role in `BACHECA_CLEANUP_SERVICE_ROLE_KEY`. Non inserirla nei comandi o in chat: gli strumenti non leggono `.env`. Sostituire PROJECT con il project ref reale di 20 caratteri.

```powershell
node scripts/database-cleanup/run.mjs backup-storage --manifest .local/database-cleanup/inventory.json --origin https://PROJECT.supabase.co
node scripts/database-cleanup/run.mjs prune-storage --manifest .local/database-cleanup/inventory.json --after .local/database-cleanup/after.json --origin https://PROJECT.supabase.co
node scripts/database-cleanup/run.mjs prune-storage --manifest .local/database-cleanup/inventory.json --after .local/database-cleanup/after.json --origin https://PROJECT.supabase.co --apply
```

Il primo comando salva i byte con nomi SHA-256 e un indice in `.local/database-cleanup/storage-backup/`. Il secondo verifica senza cancellare; il terzo rimuove tramite Storage API soltanto i file approvati. Una directory diversa si indica con `--storage-backup DIR`. Copie vecchie che includono soltanto i precedenti 12 orfani non bastano: devono coprire tutte le 21 immagini.

Il campo API `lastModified` viene confrontato con entrambi i timestamp presenti nell'inventario (SQL e metadati Storage), senza introdurre tolleranze temporali. Se l'API omette l'ID, è necessario un ETag corrispondente. Per ETag single-part MD5 si confrontano anche i byte scaricati prima di salvare la copia; la successiva rimozione verifica il contenuto tramite SHA-256. Un errore interrompe il comando: non eseguire il comando successivo finché il backup non termina con successo.

Prima di ogni gruppo di cancellazioni si controllano la conclusione del reset SQL, le copie locali, gli ID, i timestamp S3 e il contenuto dei file, oltre ai riferimenti correnti nelle tabelle applicative, con paginazione. Nuovi riferimenti o contenuti cambiati bloccano la rimozione. Le chiamate Storage non sono una transazione unica: in caso di errore dopo rimozioni parziali, riconciliare i file con un nuovo inventario prima di continuare. Non cancellare metadati `storage.objects` via SQL.

Al termine salvare i resoconti, riprendere le normali scritture e rimuovere la service role dall'ambiente operativo. Eventuali bozze Zustand nel browser si azzerano separatamente: il reset del database non cancella il localStorage.

## Verifica degli strumenti

```powershell
node --test tests/database-cleanup.test.mjs
```

I test usano soltanto PGlite e client Storage simulati, senza credenziali o servizi remoti. Verificano cancellazione completa, cestino e dipendenze, preservazione dell'admin e dei canali, rollback dopo errori, inventari obsoleti, backup Storage e protezione del logo. Nessuna prova modifica lo stack locale popolato dell'utente.
