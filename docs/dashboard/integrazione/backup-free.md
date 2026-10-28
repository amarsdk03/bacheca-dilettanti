# Copia manuale del database — Supabase Free

**Stato:** Concluso per il checkpoint M02 — report utente positivo delle 18:20:16 UTC; archivio verificato, ripristino non provato.  
**Destinatario:** Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`.  
**Piano attuale:** Free, confermato dall'utente; non usare Database Backups automatici,
PITR o funzionalità Pro come prerequisiti di questo percorso.

[M02](02-audit.md) · [Master](../master_plan.md)
· [Runbook](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md)

## Esito acquisito e procedura di riferimento

**Copia manuale eseguita dall'utente il 25 ottobre 2026**, dalle
18:20:04.9797493 alle 18:20:16.8173260 UTC. Stato
`archive_verified_restore_untested`, tutti e sei i controlli veri, nessun errore.
Nessuna nuova esecuzione richiesta per M02.

| File | Dimensione in byte | SHA-256 riportato |
| --- | --- | --- |
| `database.dump` | 2.275.263 | `34e0e7b1a5dea17aa68b8302d5471b2d86674cdf5127a0225be5beed74576687` |
| `roles.sql` | 5.956 | `ae6f6c273f7436919fbe55cb5841e4240ac5f2fba3e9165f69df878c0dcf590e` |

Server PostgreSQL 17.6, client 17.11; checkpoint **dopo M02 e prima di M03**.
Il report è conservato in `.local/dashboard-integration/m02-backup-20261025T182016Z.json`
con provenienza dalla chat dell'utente. L'agente non ha eseguito nuovamente il dump
né verificato indipendentemente gli hash degli archivi: sono quelli del report.
Ripristino non provato, Storage binario/configurazioni esterne/password dei ruoli
esclusi; TLS require senza verifica dell'identità del peer. Il rilascio V20 resta aperto.

M02 è già applicata e verificata strutturalmente. **Non rieseguirla.**
La copia viene creata **dopo M02 e prima di M03**: non è un backup precedente
a M02. Durante l'esportazione non applicare altre migrazioni o cambiare lo schema.

**Aggiornamento dopo il primo tentativo:** il report utente delle
18:10:03 UTC del 25 ottobre conferma connessione, dump, ruoli, indice e lettura
completa riusciti. Il controllo errava richiedendo una voce di creazione per
`public`, che PostgreSQL può omettere quando lo schema ha owner predefinito
`pg_database_owner`. L'indice reale contiene ACL di public e tabelle/dati attesi.
Corretto il verificatore: restano obbligatori tutte le tabelle e i relativi dati
dell'inventario sorgente, oltre alle voci di creazione degli altri tre schemi.
Il comportamento è documentato nel
[sorgente PostgreSQL 17, selectDumpableNamespace](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/bin/pg_dump/pg_dump.c#L1714-L1727).

La nuova esecuzione richiesta dopo la correzione è stata completata con successo,
incluso il confronto all'inventario sorgente. Il precedente `status="incomplete"`
resta conservato senza modifiche. La procedura seguente è disponibile per future
copie, senza necessità di ripeterla adesso.

1. Aprire il progetto [nel pannello Supabase](https://supabase.com/dashboard/project/nsytraextbndfyprwzts).
   Premere **Connect**, scegliere **Session pooler** (porta **5432**).
   Tenere a disposizione i campi **Host** e **User**. Lo User deve essere
   `postgres.nsytraextbndfyprwzts`. Copiare l'host effettivo, senza inventare
   regione o indirizzo; non usare il Transaction pooler sulla porta 6543.
2. Aprire un **terminale Windows PowerShell** nella root del repository
   `C:\Users\AmarSDK\OneDrive\Documenti\Projects\Bacheca Dilettanti\bacheca-dilettanti-webapp`.
   Il comando seguente va nel terminale, **non nel SQL Editor**:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\dashboard-backup\run.ps1
   ```

3. Quando richiesto, incollare solo Host, poi User. Inserire la **password del
   database** al prompt nascosto: non è la password dell'account Supabase,
   né una API key. La password è già nota all'utente; non va inviata in chat,
   inserita nel comando o salvata nei file `.env`.
4. Attendere il messaggio **«Archivio leggibile verificato; ripristino NON
   provato»**. Aprire il percorso `summary.json` stampato dal comando e
   inviare in chat **solo il suo contenuto**. Non inviare `database.dump` o
   `roles.sql`: contengono informazioni riservate, inclusi dati Auth nel dump.

Lo script è [scripts/dashboard-backup/run.ps1](../../../scripts/dashboard-backup/run.ps1),
con funzioni in [backup-functions.ps1](../../../scripts/dashboard-backup/backup-functions.ps1).
È compatibile con Windows PowerShell 5.1 x64. Non richiede Docker, servizi
PostgreSQL locali, Supabase CLI o un upgrade del piano.

## Dove sono strumenti e copia

I client portabili **PostgreSQL 17.11 Windows x64** sono stati scaricati dal
collegamento EDB pubblicato dalla pagina ufficiale PostgreSQL ed estratti in:

```text
.local\dashboard-backup-tools\pgsql\bin
```

L'archivio degli strumenti è escluso da Git, non contiene dati del progetto.
SHA-256 dello ZIP scaricato:
`80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`.
È l'impronta calcolata localmente, non una firma del produttore.
Sono stati avviati e verificati tutti e quattro i client: `psql`, `pg_dump`,
`pg_dumpall`, `pg_restore`, versione 17.11. Nessun server installato o avviato.

Se gli strumenti mancano su un altro PC, aprire
[PostgreSQL per Windows](https://www.postgresql.org/download/windows/),
seguire **zip archive** verso [EDB Binaries](https://www.enterprisedb.com/download-postgresql-binaries),
scegliere **17.x / Windows x86-64** ed estrarre le cartelle `pgsql/bin`,
`pgsql/lib`, `pgsql/share` nella directory sopra. Non avviare installer,
`initdb`, server o servizi. Per una directory diversa usare il parametro
`-BinDirectory 'C:\percorso\pgsql\bin'` del comando.

La copia del database viene invece salvata **fuori da repository e OneDrive**:

```text
%LOCALAPPDATA%\BachecaDilettanti\backups\nsytraextbndfyprwzts\<data-UTC>-<suffisso>\
  database.dump
  roles.sql
  summary.json
```

Ogni esecuzione crea una cartella nuova, senza sovrascrivere le precedenti.
Per aprire la cartella base: `Win+R`, incollare il percorso fino al project ref.
Gli archivi non sono cifrati su disco: conservarli nel profilo locale riservato,
senza condividerli o copiarli nel repository.

## Cosa viene verificato

- Connessione al database `postgres`, operatore `postgres`, server PostgreSQL 17.
  Host fornito dal pannello e username con ref esatto; il nome nel riepilogo
  resta un'etichetta attesa, non una verifica del progetto tramite Management API.
- Connessione cifrata con `sslmode=require`. Questo richiede TLS ma non verifica
  l'identità del certificato del pooler. Se si dispone di una CA attendibile
  appropriata per quell'host, `-SslRootCert 'C:\percorso\ca.crt'` attiva
  `verify-full`; non disattivare TLS per risolvere errori.
- `pg_dump` custom dell'intero database, schema e dati, senza selezioni/esclusioni,
  preservando definizioni, owner e ACL. Non esegue funzioni applicative.
- `pg_dumpall --roles-only --no-role-passwords`: inventario separato dei ruoli,
  senza esportarne le password. Non equivale al recupero delle credenziali.
- Exit code zero e nessuna diagnostica inattesa per ogni comando, file non vuoti,
  `pg_restore --list` e lettura/conversione **dell'intero archivio verso `NUL`**,
  senza connessione a un database e senza eseguire il SQL generato.
- Copertura di `public`, `private`, `auth`, `storage`; confronto di definizioni e
  voci TABLE DATA con l'inventario delle tabelle ordinarie non appartenenti a
  estensioni in quei quattro schemi. Incluse verifiche esplicite di `utente`,
  audit M02, `auth.users`, `storage.buckets` e `storage.objects`.
  Per `public` non è richiesta una voce `SCHEMA - public`; il controllo delle sue
  tabelle e dei dati rimane obbligatorio, anche in presenza di sole ACL/commenti.
- Dimensioni, SHA-256 e data UTC nel riepilogo. Password solo nell'ambiente dei
  processi di connessione, mai nei loro argomenti, nei log o nel riepilogo.
  I processi locali `pg_restore` non ricevono l'ambiente di connessione.

Il solo successo ammesso è **`status="archive_verified_restore_untested"`**,
con tutti i campi `checks` veri. La verifica dell'archivio **non è una prova
di ripristino completo** e non chiude il requisito di recuperabilità V20.

## Errori e recupero

Un errore, permesso insufficiente, file vuoto, voce mancante o archivio corrotto
produce exit code 1 e, se la cartella era già stata creata, un riepilogo
**`status="incomplete"`**. Un'interruzione lascia il riepilogo iniziale incompleto.
Non usare quei file come copia valida e non passare a M03.
Se l'errore precede la creazione della cartella, non esiste un nuovo riepilogo.

Inviare soltanto il messaggio controllato del terminale e il riepilogo, se presente.
Lo script non stampa gli errori grezzi dei client: possono contenere dati sensibili.
Per autenticazione fallita ricontrollare la password database; per errori di rete
controllare Connect/Session pooler, host e porta. Se ci sono permessi insufficienti,
non aggiungere grant e non escludere tabelle: serve revisione del caso specifico.
In caso di variabili Windows duplicate `PATH/Path`, aprire un nuovo PowerShell
dal menu Start, fuori dall'IDE, e rieseguire dalla root del repository.
Una nuova esecuzione crea una nuova cartella; nessun file precedente viene eliminato.

Un eventuale recupero richiede una destinazione distinta, con versione compatibile,
revisione dei ruoli gestiti Supabase, estensioni, owner e ACL. **Non eseguire
`roles.sql`, `pg_restore` o restore sul progetto sorgente.** Il comando preparato
non contiene alcuna procedura di ripristino automatico.
Non è stato ancora effettuato un ripristino su una destinazione separata.

Non sono inclusi i file binari di Storage, impostazioni Auth/API esterne al DB,
segreti dei servizi o configurazioni Vercel. I metadati Storage sono nel database;
gli oggetti richiedono una copia separata prima di attestare il recupero completo.

## Evidenze locali

**Sedici test riusciti, zero fallimenti/skip; ESLint riuscito.**
Test automatici in [dashboard-backup.test.mjs](../../../tests/dashboard-backup.test.mjs),
con eseguibili sintetici e nessuna connessione remota: percorsi con spazi,
quoting, separazione della password, copertura, autenticazione fallita, dump
parziale, inventario ruoli fallito, archivio corrotto, dati mancanti, file vuoto
e diagnostica inattesa; copie ripetute senza sovrascrivere le precedenti.
Inclusi public senza voce CREATE con ACL/commenti o senza ACL, public con voce
CREATE, assenza di altri schemi e mancanza di tabella/dati public ancora rifiutata.
Controllo aggiuntivo con il vero `pg_restore` 17.11:
un file sintetico corrotto viene rifiutato. Non sono prove sul database dell'utente.
Sull'indice locale dell'archivio utente del primo tentativo: le cinque tabelle
obbligatorie passano il controllo corretto; rimuovere in memoria la voce dati
`public.utente` continua a causare rifiuto. Non sono stati letti dati applicativi,
modificati archivi o aperte connessioni remote dall'agente. È un riscontro mirato
sull'indice, non il confronto completo all'inventario sorgente da ripetere.

Fonti: [backup Supabase](https://supabase.com/docs/guides/platform/backups),
[connessioni](https://supabase.com/docs/guides/database/connecting-to-postgres),
[pg_dump 17](https://www.postgresql.org/docs/17/app-pgdump.html),
[pg_dumpall 17](https://www.postgresql.org/docs/17/app-pg-dumpall.html),
[pg_restore 17](https://www.postgresql.org/docs/17/app-pgrestore.html).
