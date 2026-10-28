# 16A — Verifiche riproducibili senza Docker

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** Implementazione verificata degli step 03A–15.

[Master](../../master_plan.md) · [Step 16](README.md)

## Obiettivo

Unificare i test Node/PGlite di Web e Admin, rendere il motore riproducibile con
il lockfile root ed eseguire tutte le verifiche locali. Docker è escluso dal
percorso scelto; nessuna connessione Supabase, importazione o applicazione SQL.

## Attività e accettazione

- PGlite 0.5.8 come dev dependency root; test indipendenti dalla cache temporanea.
- Fixture SQL e asserzioni conservate; motore mancante come errore, mai skip.
- `npm test` portabile: tutti i file test Node, ordine deterministico, massimo
  quattro file concorrenti, errore del processo figlio propagato.
- Suite completa, typecheck Web/Admin, lint pertinente, CSS e link documentali.
- [Matrice](matrice-verifiche.md) con evidenze locali e prove non eseguite.

## Risultati

Eseguito il **25 ottobre 2026**, Node **24.19.0**, su Windows:

| Controllo | Esito |
| --- | --- |
| `npm test` | **1.275 test riusciti, zero fallimenti/skip**, 86 file scoperti, circa 114 secondi |
| Nuova suite `test-runner.test.mjs` | **9 casi riusciti**, inclusi anche nella suite completa |
| `npm run typecheck` e `npm run typecheck:admin` | Entrambi riusciti; nessuna build o dev server |
| ESLint su `tests/` e `scripts/run-tests.mjs` | Zero errori; un avviso preesistente in `tests/notifiche.test.mjs:135` (`no-unused-expressions`), fuori dai file modificati da 16A |
| ESLint sui soli file JS interessati da 16A | Nessun errore o avviso |
| PostCSS/Tailwind delle due app | Compilazione in memoria riuscita, senza riscrivere asset |
| Lockfile, link Markdown, assenza di riferimenti cache nei test | Verificati |

### Implementazione verificata

PGlite **0.5.8** è una dev dependency root con versione esatta nel lockfile
unico. Il loader `tests/helpers/pglite.mjs` usa il pacchetto normale e segnala
come installarlo se manca; non legge `.env` o URL database. **35 file** test/
fixture Web e Admin migrati dal percorso temporaneo; rimosse **35 guardie skip**.
Fixture SQL, query e asserzioni restano invariate.

`scripts/run-tests.mjs` scopre soltanto file regolari `tests/*.test.mjs`, li
ordina, usa il binario Node corrente e `--test-concurrency=4`, senza shell o
glob dipendenti dal sistema. Directory di lavoro root e argomenti separati
preservano i percorsi con spazi. Nessun file trovato, processo non avviabile,
terminazione per segnale o test fallito non producono un esito positivo.
La CLI verifica la disponibilità di PGlite prima di avviare i test.

Le nove prove del runner includono discovery e nuovi file, directory con nomi
simili a test escluse, elenco vuoto, codici 0/7 e segnale, errori spawn sincroni/
asincroni, un processo reale con test deliberatamente fallito e percorso con
spazi, avvio senza dipendenza e risoluzione/versione del pacchetto root.
I sottoprocessi di verifica usano fixture temporanee, non le credenziali delle
app; il test del processo reale elimina il contesto worker interno di Node per
provare un avvio indipendente. Non è stato eseguito `npm ci` distruttivamente
nel workspace condiviso: installazione mirata e coerenza del lockfile verificate.

Log della suite in `node_modules/.cache/dashboard-step16a-tests.log`, ignorato
da Git; la cache serve solo al log, non alla risoluzione del motore SQL.
Documentazione step 16 convertita in cartella e link aggiornati. Master e
schede 03B distinguono il percorso scelto dall'alternativa storica Docker.

### Limiti e recupero

Nessuna connessione Supabase, lettura/modifica `.env.local`, applicazione SQL,
provisioning, attivazione gate/retention, deploy, Docker, build o dev server.
I limiti delle fixture e le verifiche integrate/browser mancanti sono nella
matrice. Il successo di 16A non conclude gli step 03–15 o lo step 16 complessivo.

Il consolidamento modifica soltanto tooling/dipendenze di sviluppo e documenti,
senza effetto sul database o sul comportamento delle due app. Per ripristinare
una precedente versione del tooling usare manifest/lockfile e relativi test
coerenti della stessa revisione; non cambiare schema, policy o gate per questo.

## Operazioni manuali e prossimo sottopasso

Nessuna migrazione o configurazione Supabase. Sulle altre installazioni eseguire
`npm ci` dalla root per allineare le dipendenze.

Passaggio successivo a 16A: [16B — Runbook di rilascio e recupero](16b-runbook.md),
**6.1 Sol, high**, ora consegnato come documento. Nessun deploy o applicazione
di migrazioni è incluso nelle due consegne; le verifiche residue restano aperte.
