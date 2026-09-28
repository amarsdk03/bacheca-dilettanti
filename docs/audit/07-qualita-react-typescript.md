# 07 — Confini server/client, React e TypeScript

## 1. Obiettivo e ambito

Verificare confini React Server/Client Components, serializzazione, Server Action, rischi di hydration, gestione degli errori e qualità TypeScript/React. Analisi del **2026-09-29**, commit `9fc87c7ddc41bb77bb8620bcef70bc87a245b58b`, sulla working tree corrente; nessuna modifica applicativa o build di produzione.

## 2. File/aree analizzate

- Guide della versione installata **Next 16.3.4**: `node_modules/next/dist/docs/01-app/01-getting-started/{05-server-and-client-components.md,10-error-handling.md}`, `02-guides/{server-and-client-boundary.md,server-actions.md}`, direttive `use-client.md`/`use-server.md` e guida TypeScript.
- Direttive e import in `src/app/`, `src/features/`, `src/components/`, `src/lib/` e `src/server/`, con attraversamento statico dei moduli raggiungibili dalle entry `use client`.
- Confini principali: autenticazione/registrazione, pubblicazione, dashboard profilo, interazioni, segnalazioni, directory e dettagli pubblici.
- Sorgenti di variabilità cercate in modo mirato: `Math.random`, `Date.now`, `new Date`, `Intl`, `window`, `document`, Web Storage e `crypto.randomUUID`.
- Gestione errori: file speciali App Router, query dashboard/pubbliche, Server Action e componenti che usano `useActionState`/`useTransition`.
- Configurazione e controlli: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`; regola installata `node_modules/next/dist/server/typescript/rules/client-boundary.js`.

Modifiche locali preesistenti preservate: `Homepage.tsx`, `homepage-notices.ts`, `Registrati.tsx`, master/report precedenti e due documenti eliminati. Questa analisi usa quindi il contenuto corrente di tali file, senza attribuirne le modifiche all'audit.

### 2.1 Verifiche eseguite

| Verifica | Esito |
|---|---|
| `npx tsc --noEmit --incremental false --pretty false` | **0 errori** con `strict: true` (`tsconfig.json:7`). `ignoreBuildErrors` non è configurato. |
| `npx eslint .` | **0 errori, 8 warning**; dettagli in 07-F03. Il comando termina con codice 0. |
| Grafo delle entry client | **80** file con direttiva `use client`; attraversamento degli import locali fermato correttamente sulle entry `use server`: **0** percorsi verso `server-only`, `next/headers` o moduli `node:`. |
| Server Action importate dai client | I moduli coinvolti iniziano con `use server` e `server-only`, per esempio `src/features/auth/server/actions.ts:1` e `src/features/pubblica-annuncio/server/actions.ts:1`. L'implementazione resta oltre il confine; autorizzazione e input sono già nel Punto 2. |
| Dati server → client | Props osservate costituite da booleani, stringhe e oggetti/array normalizzati. Le directory mantengono la Promise nel grafo server (`src/features/annunci/Annunci.tsx:41`, `src/features/profili/Profili.tsx:40`) e la attendono in componenti server async. Nessun oggetto Supabase, client DB o funzione ordinaria attraversa un confine server/client confermato. |
| Hydration | Casualità di `FrasiErrori` e `TextType` eseguita negli effect (`FrasiErrori.tsx:37`; `TextType.tsx:68`). `SupportBubble` usa uno snapshot server stabile (`support-bubble-store.ts:68`). Nessun mismatch iniziale confermato staticamente; vedere il miglioramento 07-F04. |
| Redirect/errori attesi | I redirect controllati sono fuori dai `catch` nelle azioni esaminate, per esempio `src/features/auth/server/email-link-actions.ts:55`; gli errori attesi dei form sono restituiti come stati. Nessun `redirect()` inghiottito da un `catch` individuato. |

Non sono stati avviati server di sviluppo o build. Senza rendering browser non sono osservabili warning di hydration prodotti soltanto a runtime; l'assenza di un riscontro statico non certifica ogni combinazione di locale, fuso orario ed estensione browser.

## 3. Findings per severità

Nessun finding critico o alto. **2 medi, 1 basso, 1 miglioramento**.

### 🟡 07-F01 — Nessun error boundary applicativo per gli errori inattesi

- **Evidenza:** sotto `src/app/` esistono `not-found.tsx` e file `loading.tsx`, ma nessun `error.tsx` o `global-error.tsx`. La dashboard propaga errori intenzionali da `src/features/profilo/server/queries.ts:280`, `:322` e `:336`; `src/app/il-tuo-profilo/page.tsx:38` attende la query senza fallback di segmento.
- **Impatto:** un errore inatteso di query/rendering lascia il fallback generico del framework e non offre un recupero locale tramite retry. Le directory e i dettagli pubblici trasformano invece molti errori previsti in stati UI, quindi il problema non coinvolge ogni route.
- **Azione:** introdurre almeno un `error.tsx` nel segmento della dashboard, ed eventualmente un confine superiore, con messaggio neutro, `retry()` e logging redatto. Verificare con un errore sintetico che autenticazione e navigazione restino recuperabili. La guida installata descrive il pattern in `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md:203`.

### 🟡 07-F02 — Cinque entry client espongono callback ordinarie come props di confine

- **Evidenza:** l'analisi dei default export ha trovato **13** callback senza suffisso `Action`: `src/features/profilo/TeamProfileComboboxField.tsx:21`; `src/features/profilo/ProfileEditorDialog.tsx:37`; `src/features/pubblica-annuncio/components/AnnouncementDetailsForm.tsx:63`; `src/features/pubblica-annuncio/components/ConfermaInvioAnnuncio.tsx:45`; `src/features/pubblica-annuncio/components/PublishProfileStep.tsx:22`. Tutti i file dichiarano `use client` a riga 1.
- **Contesto verificato:** oggi queste entry sono importate da componenti già client, per esempio `PubblicaAnnuncio.tsx:359`, `:385`, `:412` e `IlTuoProfilo.tsx:1038`; non è stato confermato un passaggio reale di funzione da Server Component. È quindi un confine ridondante/fragile, non un errore runtime attuale.
- **Perché i controlli restano verdi:** la regola Next esamina un `TypeLiteralNode` (`node_modules/next/dist/server/typescript/rules/client-boundary.js:41`) e accetta solo `action`/`*Action` (`:60`); queste props sono dichiarate tramite `interface`. Inoltre `tsc` non equivale al plugin del language service. Non usare lo zero errori di `tsc` come prova di conformità TS71007.
- **Impatto:** un futuro import diretto da un Server Component renderebbe il contratto non serializzabile; il significato di una direttiva `use client` come vero confine è meno leggibile. Rinominare indiscriminatamente callback locali con `Action` maschererebbe il problema, perché il plugin usa una convenzione nominale e non distingue strutturalmente una Server Action.
- **Azione:** rimuovere le direttive ridondanti dai componenti utilizzati solo sotto un parent client. Per le entry che devono restare importabili dal server, mantenere props serializzabili e collocare gli handler ordinari in un wrapper client; usare `*Action` per una vera action/riferimento server secondo la convenzione concordata. Aggiungere una verifica mirata che analizzi anche props dichiarate con `interface`.

### 🟢 07-F03 — ESLint passa con otto warning

- **Evidenza:** `src/components/TextType.tsx:163` omette `getRandomSpeed` dalle dipendenze dell'effect (`react-hooks/exhaustive-deps`). Gli altri sette warning sono simboli inutilizzati in `SplitText.tsx:70`, `:135`, `AnnouncementCardShell.tsx:83`, `:108`, `:110`, `AnnuncioSquadra.tsx:90` e `LinkAnnuncioField.tsx:30`.
- **Impatto:** non è stato riprodotto un errore funzionale. Nel caso hook, `variableSpeed` e `typingSpeed`, da cui dipende il callback, sono già elencati: il rischio attuale è soprattutto manutentivo. Il codice inutilizzato verrà ricontrollato nel Punto 12.
- **Azione:** rendere esplicita la dipendenza o incorporare la funzione nell'effect; eliminare o usare i simboli dopo la verifica dead-code. Se la policy richiede lint pulito, eseguire ESLint in CI con soglia warning zero.

### 💡 07-F04 — Rendere esplicita l'origine di clock e identificativi client

- **Evidenza:** `src/features/pubblica-annuncio/PubblicaAnnuncio.tsx:97` genera `submissionId` in un lazy initializer con `crypto.randomUUID()`; `ConfermaInvioAnnuncio.tsx:87` inizializza un clock con `Date.now()`. Il primo valore entra nel payload soltanto quando esiste una tipologia (`PubblicaAnnuncio.tsx:139`), il secondo non mostra un countdown finché non esiste un retry.
- **Impatto:** nessun mismatch DOM è stato confermato perché i valori non determinano il markup iniziale corrente. Restano inizializzatori non deterministici eseguiti nel ciclo di rendering e quindi più difficili da provare sotto prerender/Strict Mode.
- **Azione:** nella futura fase di implementazione, creare l'ID quando inizia realmente il flusso che lo usa e passare al countdown un istante di riferimento esplicito. Aggiungere un test di prerender + hydration prima di classificare il comportamento come bug.

## 4. Checklist azioni

### Eseguibili da agente AI — futura fase di implementazione

- [ ] 07-F01: aggiungere un error boundary della dashboard con retry e test sintetico di rendering fallito.
- [ ] 07-F02: classificare le cinque entry come veri confini o moduli figli; rimuovere le direttive ridondanti e applicare `*Action` soltanto alle action reali.
- [ ] Integrare un controllo dei contratti client che non dipenda dal limite attuale del plugin sulle `interface`.
- [ ] 07-F03: risolvere il warning hook e, dopo verifica nel Punto 12, i sette warning di simboli inutilizzati.
- [ ] 07-F04: aggiungere una prova di hydration mirata a clock, locale, cambio anno e UUID del flusso pubblicazione.

### Da fare manualmente dall'utente

- [ ] Decidere il livello del fallback: solo `/il-tuo-profilo`, interi gruppi di route o anche `global-error.tsx`.
- [ ] Confermare se la pipeline CI deve fallire in presenza di warning ESLint (`--max-warnings 0`).
- [ ] Verificare nell'IDE che sia selezionata la versione TypeScript del workspace e che il plugin Next sia attivo; `tsc` da CLI non sostituisce i suoi diagnostici.
- [ ] Eseguire in un browser una sessione pulita sui flussi registrazione, pubblicazione e dashboard, controllando console e recupero dopo errore; nessun invio reale è necessario.

## 5. Domande aperte / decisioni

1. Quale esperienza deve essere mostrata quando il dashboard non riesce a caricare dati: retry nella stessa pagina, ritorno al profilo pubblico o contatto assistenza?
2. I componenti del form pubblicazione devono restare entry riutilizzabili direttamente da Server Components, oppure sono intenzionalmente dettagli interni di `PubblicaAnnuncio`?
3. La soglia di qualità CI desiderata è “zero errori” o “zero errori e zero warning”?
4. È disponibile un ambiente browser/staging dove provocare errori e controllare hydration senza operare su dati reali?

## 6. Stato finale e prossimo punto

**Completato** il Punto 7 per analisi statica, TypeScript strict, ESLint e guide Next installate. Nessun problema è stato corretto e nessuna build/server è stata avviata. Il limite principale è l'assenza di una prova browser di hydration e fallback runtime.

**Migrazioni create/applicate: 0**; nessuna migrazione nuova da applicare per questo punto. Lo stato delle migrazioni preesistenti resta quello già indicato nei Punti 3–6.

Prossimo: **Punto 8 — Performance applicativa e accesso ai dati**, profilo consigliato **GPT-6 Sol · medium · Default**. Stato e continuità: [AUDIT-MASTER.md](AUDIT-MASTER.md). Fermarsi qui.
