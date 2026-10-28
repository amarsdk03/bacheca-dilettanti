# 01 — Workspace npm e trasferimento della webapp

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** Step 00 concluso.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Convertire la repository in workspace npm e trasferire la webapp in `apps/web`, preservandone il comportamento. Non introdurre ancora funzionalità Admin.

- Fotografare lo stato Git e preservare anche i file modificati/non tracciati dell'utente; non creare un commit che li includa indiscriminatamente.
- Leggere le guide Next.js installate su monorepo, configurazione e transpilation.
- Spostare sorgenti, asset e configurazioni dell'app; aggiornare manifest, alias, ESLint, Tailwind, PostCSS, script, documentazione di avvio e riferimenti dei test.
- Conservare un solo lockfile root, `supabase`, `docs` e test condivisi alla radice.
- Mantenere versioni delle dipendenze e comportamento esistenti, senza aggiornamenti opportunistici.
- Non copiare credenziali di produzione in locale/staging; documentare separatamente il posizionamento delle variabili.

## Interfacce e compatibilità

La root coordina i comandi della webapp tramite workspace. I percorsi dei sorgenti cambiano, non le route pubbliche o i contratti dei flussi esistenti. Aggiornare tutti i consumatori dei percorsi senza indebolire le asserzioni dei test.

## Criteri di completamento e verifiche

Installazione coerente con lockfile unico, typecheck/lint e test pertinenti della webapp. Verificare import, asset e percorsi di test/CI. Una build mirata è ammessa se necessaria a validare lo spostamento; non usare credenziali reali. Annotare i fallimenti preesistenti distintamente dalle regressioni.

## Migrazioni e operazioni manuali

**Nessuna migrazione o script database introdotto da questo step.** I file Supabase già presenti, inclusi quelli non tracciati all'avvio, sono rimasti alla radice senza modifiche.

Prima dell'avvio locale, predisporre `apps/web/.env.local` con credenziali locali/staging e dati sintetici. L'attuale `.env.local` root è rimasto nella sua posizione, senza lettura o copia dei valori; il workspace non lo carica automaticamente. Non è stato creato un file ambiente con credenziali reali.

Prima del prossimo deploy della webapp:

1. Nel progetto Vercel esistente impostare Root Directory a `apps/web` e mantenere il preset Next.js.
2. Mantenere un solo lockfile root e l'installazione npm per il workspace; il build command dell'app è `npm run build`. Se si personalizza l'installazione, eseguire `npm ci` dalla root del monorepo.
3. Abilitare l'inclusione dei sorgenti esterni alla Root Directory quando richiesta per dipendenze e workspace; non creare lockfile separati nell'app.
4. Verificare le variabili di Preview verso staging e di Produzione nel rispettivo ambiente. Non modificare implicitamente Site URL, redirect Auth o dominio pubblico.
5. Validare una preview esclusivamente su staging prima di promuovere un rilascio. Nessun deploy o cambiamento Vercel è stato eseguito in questo step.

Queste sono configurazioni successive di avvio/rilascio, non verifiche locali mancanti dell'implementazione. Riferimenti: [Vercel Monorepos](https://vercel.com/docs/monorepos), [Root Directory e build](https://vercel.com/docs/builds/configure-a-build#root-directory).

## Avanzamento

Concluso il 2026-10-23. Prima dello spostamento sono stati fotografati stato Git, hash dei 468 file da trasferire, test e lockfile in una directory temporanea locale, senza credenziali. Nessun commit automatico, reset o modifica ai contenuti applicativi preesistenti.

### Modifiche effettuate

- Trasferiti `src`, `public`, `next.config.ts`, `tsconfig.json`, `components.json` e `postcss.config.mjs` in `apps/web`; tutti i 468 file erano identici allo snapshot subito dopo lo spostamento. Tra questi, soltanto `next.config.ts` è poi cambiato per impostare tracing e root Turbopack al monorepo. Il limite Server Actions di 6 MB è rimasto invariato.
- Manifest root privato `bacheca-dilettanti`, workspace `apps/*` e `packages/*`; manifest webapp con nome originale `bacheca-dilettanti-webapp`, dipendenze e versioni conservate. Gli strumenti di sviluppo restano dichiarati anche alla radice per lint e test condivisi.
- Comandi root `dev`, `build`, `start` e `typecheck` delegati al workspace. Il typecheck dell'app esegue `next typegen` prima di TypeScript, generando i file Next ignorati senza avviare server o build.
- ESLint mantenuto alla radice con rootDir Next esplicita; ignore aggiornati per artefatti annidati. Configurazioni TypeScript, shadcn e PostCSS mantengono i percorsi relativi corretti nella directory dell'app.
- Aggiornati soltanto i percorsi dei sorgenti in 23 file di test. Confrontati tutti i 54 file test con lo snapshot: asserzioni e logica identiche, salvo i percorsi e la normalizzazione delle terminazioni di riga.
- Lockfile unico aggiornato offline: tutte le 803 voci dipendenza preesistenti conservano versione, integrità e resolved. Aggiunte soltanto la voce del workspace e il relativo link.
- README aggiornato per avvio, controlli, posizione ambiente, gestione shadcn e configurazioni di rilascio.

### Verifiche eseguite

| Verifica | Prima del trasferimento | Dopo il trasferimento |
| --- | --- | --- |
| TypeScript | Riuscito, nessun errore | `npm run typecheck` riuscito, inclusa generazione route Next |
| ESLint | 0 errori, 9 avvisi | 0 errori, gli stessi 9 avvisi, confrontati con il baseline |
| Test Node/database isolato | 342 superati, 0 falliti, 0 saltati | Esecuzione completa: 340 superati e 2 errori di percorso in un file; corretti i due template string, rieseguito quel file: 57/57 superati, 0 saltati. Tutti i 342 casi coperti da esiti positivi dopo le correzioni pertinenti. |
| Installazione pulita | Dipendenze esistenti conservate | `npm ci --ignore-scripts --no-audit --no-fund` riuscito in directory temporanea separata; risoluzione React, React DOM, TypeScript, ESLint, Next, Sharp e Supabase SSR verificata, link workspace corretto e Sharp caricabile |
| Sorgenti e asset | Snapshot hash | 464 file sorgente/asset invariati; configurazioni spostate, unica modifica contenutistica a Next config come sopra |
| Articoli | Lettura relativa alla directory Next | 12 articoli trovati da `apps/web`, slug e cover risolti |
| PostCSS/Tailwind | Configurazione originale | Compilazione dalla directory workspace riuscita, utility attese generate; percorsi shadcn validi |
| Ignore | Regole originarie root | `.env.local`, `.next`, `node_modules`, next-env e tsbuildinfo annidati correttamente ignorati |

L'installazione pulita offline non aveva tutti gli archivi in cache; il tentativo di rete nella sandbox ha incontrato un timeout. La verifica è stata completata con accesso di rete autorizzato nella sola directory temporanea, senza eseguire script dei pacchetti. Non è stato sostituito il `node_modules` di lavoro e il motore database isolato preesistente è rimasto disponibile.

Non sono stati eseguiti build di produzione, avvio dev server, connessioni a database reali, deploy o modifiche funzionali alla webapp. Gli avvisi lint preesistenti restano fuori dal perimetro del trasferimento. Cache e file Next generati dalla vecchia posizione possono restare ignorati alla radice; l'app usa quelli della nuova directory.

## Prossimo step

[02 — Scheletro Admin](02-scheletro-admin.md), **6.1 Sol, medium**.
