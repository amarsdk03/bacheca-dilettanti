# 02 — Scheletro Admin, pacchetti e ambienti

**Stato:** Concluso
**Modello consigliato:** 6.1 Sol, medium  
**Dipendenze:** Step 01 concluso; struttura workspace verificata.

[Master plan](../master_plan.md). Si applicano il protocollo di avanzamento, i vincoli comuni e il riepilogo obbligatorio del master.

## Obiettivo e attività

Creare `apps/admin` come app Next.js distinta, compatibile con le versioni e convenzioni della repository. Predisporre comandi separati, alias, configurazione shadcn Base UI, Tailwind, typecheck e lint.

Estrarre i tipi database in `packages/database` e solo le regole pure effettivamente richieste in `packages/domain`. Non creare import dal sorgente privato della webapp. Rimandare l'estrazione di UI condivisa finché vi sono due consumatori reali.

Predisporre configurazioni di esempio prive di segreti e controllo esplicito delle destinazioni locali/staging per test e seed. Mantenere client Supabase per richiesta e sessioni/cookie indipendenti anche quando entrambe le app girano su localhost. Nessun dato riservato deve essere esposto dallo scheletro.

Applicare non indicizzabilità alle risposte controllate dall'app, incluse pagine Auth e errori: header e metadati appropriati, nessuna sitemap Admin o link dalla webapp. Non bloccare in robots la lettura del noindex sulle pagine pubbliche di accesso.

## Interfacce e compatibilità

App e deploy indipendenti con lockfile comune. Nessun nuovo endpoint dati prima delle protezioni. Nessuna duplicazione di migrazioni.

## Criteri di completamento e verifiche

Le app risolvono i pacchetti comuni senza import reciproci; script e controlli statici funzionano. Configurazione test sconosciuta o mancante blocca le prove database. Verificare che esempi e bundle non contengano segreti. Conservare i flussi ordinari della webapp.

## Migrazioni e operazioni manuali

Nessuna migrazione prevista. Documentare come predisporre progetto Vercel Admin, host, staging e variabili distinte. Non presumere già esistenti né crearli implicitamente. Lo staging deve essere disponibile prima delle prove che lo richiedono; per lo sviluppo database può essere usata un'istanza locale autorizzata.

## Avanzamento

Completato il 24 ottobre 2026.

- Creata `apps/admin`, workspace `bacheca-dilettanti-admin`, Next.js 16.2.10,
  React 19.2.4, TypeScript e Tailwind 4. Configurazione shadcn `base-nova`,
  Base UI, Lucide, tema Light e Arial. Pagina statica con banner e pagina 404;
  nessuna lettura dati, login o pagina amministrativa operativa anticipata.
- Comandi root `dev:admin`, `build:admin`, `start:admin`, `typecheck:admin`.
  Sviluppo e start locale sulla porta 3001. I comandi Web esistenti conservano
  il proprio significato; ESLint comprende entrambe le app.
- Contratto Supabase trasferito in `packages/database/src/index.ts`, esposto
  da `@bacheca/database`; ingresso Web `@/server/supabase` mantenuto tramite
  riesportazioni. Tipi invariati rispetto a HEAD, normalizzati i soli fine riga
  nel confronto. Nessun pacchetto domain/UI ancora utile a due consumatori:
  estrazione rinviata deliberatamente, senza cartelle vuote.
- Client Admin browser e server predisposti con chiave publishable e cookie
  `bacheca-admin-auth-token`, host-only, SameSite Lax, Secure nelle build di
  produzione. Factory server per richiesta, attualmente destinata ad Actions
  e Route Handlers che possono scrivere cookie; non è usata dalla pagina.
  Letture Server Component, proxy di rinnovo, callback, logout e verifica reale
  dell'isolamento delle sessioni saranno integrati e verificati nello step 05.
  Nessuna di queste factory verifica da sola il ruolo Admin.
- Header globale `X-Robots-Tag: noindex, nofollow, noarchive`, metadati root
  coerenti, robots con scansione consentita per leggere noindex. Nessuna sitemap
  o modifica alla navigazione pubblica. Gli errori controllati dall'app sono
  coperti dal pattern globale degli header; risposte generate dall'hosting
  vanno verificate al rilascio.
- Esempio `apps/admin/.env.example` senza segreti. Nessun file `.env.local`
  letto, copiato o modificato durante lo step.
- Preflight `scripts/assert-test-target.mjs`, importabile dai futuri runner:
  richiede tipo local/staging e corrispondenza esatta dell'origine con la lista
  esplicita; locale limitato a loopback, staging a HTTPS remoto. Respinge URL
  con credenziali, percorso, query o frammento. Non certifica il contenuto di
  un progetto remoto: la lista deve contenere solo ambienti sintetici autorizzati.
  Nessun nuovo seed o runner database introdotto; quelli futuri devono importare
  il controllo nella stessa esecuzione dell'operazione.

### Verifiche eseguite

- Installazione workspace offline riuscita; aggiunti i collegamenti locali.
  Tutte le 803 dipendenze preesistenti conservano versione, origine e integrità.
- `npm run typecheck:admin` e `npm run typecheck`: riusciti.
- `npm run lint`: nessun errore, stessi 9 avvisi preesistenti nella Web e nei test.
- Compilazione PostCSS/Tailwind dalla directory Admin riuscita; Arial presente.
- `npx --no-install shadcn info --json` riconosce Next.js, Tailwind 4,
  stile base-nova/Base UI e alias corretti.
- Entrambe le app risolvono `@bacheca/database` allo stesso sorgente condiviso.
- Preflight verificato con valori sintetici: 2 configurazioni valide e 8
  configurazioni rifiutate, senza connessioni database.
- Configurazione header verificata staticamente su tutte le rotte; cookie
  distinto e Secure in produzione verificati con ambiente sintetico; errore
  esplicito quando manca la chiave. Nessuna prova HTTP o login reale eseguita.
- Nessun server di sviluppo, build di produzione, deploy o query database.

### Operazioni manuali, in ordine

**Nota successiva allo step 05:** le istruzioni sullo scheletro statico descrivono
lo stato dello step 02. Ora la root verifica l'accesso e richiede configurazione
Auth; per provare il login seguire [05](05-accesso-sessione.md), inclusa la chiave
tecnica server-only necessaria all'audit. Non copiarla nel client/browser.

1. Per vedere subito lo scheletro, dalla root eseguire `npm run dev:admin` e
   aprire `http://localhost:3001`. Nessun file d'ambiente serve alla pagina
   statica attuale. Dopo un checkout su un altro computer eseguire prima `npm ci`.
2. Prima di usare Auth nei prossimi step, creare `apps/admin/.env.local` a
   partire da `.env.example`, senza sovrascrivere un file già presente.
   Inserire URL e chiave publishable del medesimo progetto **locale/staging**
   usato da Web. Non copiare automaticamente l'ambiente Web né usare chiavi
   service role/secret. I valori dell'esempio non costituiscono un'istanza pronta.
3. Prima di test o seed database dichiarare `BACHECA_TEST_TARGET` e la lista
   `BACHECA_TEST_ALLOWED_SUPABASE_ORIGINS`, quindi eseguire
   `npm run check:test-target:admin`. Assenza del file/configurazione o
   destinazione sconosciuta deve bloccare le operazioni, senza ripiego su Web.
   Per staging usare un progetto separato con dati sintetici; nessun progetto
   remoto è stato creato o verificato in questo step.
4. Quando si prepara la preview, creare un progetto Vercel distinto con la
   stessa repository, Root Directory `apps/admin`, preset Next.js, build
   `npm run build`, lockfile root e inclusione dei sorgenti workspace esterni.
   Configurare nel progetto Admin le variabili per ciascun ambiente: Preview
   su staging, Production sul progetto previsto al rilascio. Verificare l'host
   desiderato prima di assegnarlo. Configurazione Auth/redirect nello step 05;
   verifica HTTP di header, errori e sessioni al relativo step/rilascio.

Queste configurazioni esterne non sono necessarie per concludere lo scheletro
statico; restano prerequisiti delle successive prove integrate. **Nessuna
migrazione o script da applicare al database.** Per rigenerare i tipi aggiornare
il sorgente nel pacchetto database, come spiegato nel suo README.

Riferimenti consultati: guide della versione Next.js installata (installazione,
variabili d'ambiente, header, robots, transpilePackages),
[changelog Supabase](https://supabase.com/changelog) e
[client SSR Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Prossimo step

[03 — Autorizzazione database](03-autorizzazione-database.md), **6.1 Sol, high**.

