# 12 — Pulizia, dipendenze e strumenti di verifica

## 1. Obiettivo e ambito

Individuare entry point legacy senza riferimenti, TODO visibili, file temporanei, problemi di allineamento dipendenze e limiti degli strumenti locali. Audit statico del commit `5f76766d21ac7e4ea7e8f71ab39fbfbabb14901d`; nessun file applicativo modificato.

## 2. File/aree analizzate

- Radici di progetto e documentazione: `package.json`, `package-lock.json`, `.gitignore`, `README.md`, `docs/`.
- Componenti legacy e TODO: `src/components/redirects/ComingSoon.tsx`, `src/features/pubblica-annuncio/components/{DettagliAnnuncio.tsx,RecapAnnunci/RecapAnnuncio.tsx,PriorityCheckoutRedirect.tsx}`, `src/lib/articles.ts`, `src/app/aggiornamenti/[slug]/page.tsx`, `src/app/api/complete-checkout-session/route.ts`.
- Ricerca mirata di `TODO`, `FIXME`, `console.log`, file backup/log/dump, configurazioni CI, riferimenti di import e artefatti di test. Test esistenti: **38 file `.test.mjs`**; non eseguiti in questo punto. `npm ls --depth=0`: dipendenze installate senza errori o pacchetti mancanti; versioni risolte nel range dichiarato. Nessun controllo online di aggiornamenti o advisories.
- Preesistenti all'inizio: `docs/audit/AUDIT-MASTER.md` modificato e `docs/audit/10-accessibilita.md`, `docs/audit/11-gap-roadmap.md` non tracciati; preservati.

## 3. Findings per severità

### 🟡 Medio

**12-F01 — Le visualizzazioni degli articoli sono numeri fittizi mostrati come metriche reali.** `src/lib/articles.ts:73` definisce la funzione come placeholder; `:74-76` genera un numero deterministico dall'hash dello slug (`180 + hash % 1800`). `src/app/aggiornamenti/[slug]/page.tsx:69`, `:114-116` lo mostra con l'etichetta “visualizzazioni”; il changelog `README.md:161` dichiara analitiche di visualizzazione per gli articoli. **Impatto:** il conteggio non cambia con le visite e può essere interpretato da lettori e autori come dato analitico autentico. **Azione:** collegare un contatore reale con regole di deduplicazione e privacy definite oppure rimuovere/etichettare il numero finché non esiste una misurazione.

### 🟢 Basso

**12-F02 — Entry point legacy senza riferimenti trovati nel codice applicativo.** `src/components/redirects/ComingSoon.tsx:188` esporta una pagina non importata da route o componenti. `src/features/pubblica-annuncio/components/DettagliAnnuncio.tsx:10` e `src/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncio.tsx:22` hanno solo riferimenti interni alle proprie famiglie; la ricerca non trova import dal wizard corrente. Le ricerche di import/static JSX nei file `src/**/*.{ts,tsx}` non hanno trovato consumatori. **Impatto:** superficie di manutenzione e codice storico possono confondere la manutenzione; un riferimento dinamico non rilevato resta possibile. **Azione:** verificare gli import dinamici o usi esterni, quindi rimuovere i componenti e i relativi figli/store solo in una fase di pulizia autorizzata. La famiglia Professionisti/Enti era già segnalata come legacy nel [Punto 11](11-gap-roadmap.md#matrice-categorie); questo finding riguarda la verifica di utilizzo.

**12-F03 — L'errore di configurazione Stripe indirizza a un file che non esiste.** `src/features/pubblica-annuncio/components/PriorityCheckoutRedirect.tsx:16` e `src/app/api/complete-checkout-session/route.ts:61` chiedono di consultare `STRIPE_INTEGRATION_TODO.md`; la ricerca dei file non trova quel documento. **Impatto:** se il ramo di configurazione incompleta si attiva, l'indicazione di supporto non è seguibile. La priorità Stripe sospesa è già descritta nel [Punto 5](05-pagamenti-stripe.md). **Azione:** sostituire il riferimento con documentazione presente e adatta al destinatario oppure rimuovere l'indicazione non valida.

**12-F04 — Il changelog README contiene placeholder e una dichiarazione di prodotto da riconciliare.** `README.md:156` riporta `??/??/2026`; `:158` attribuisce alla versione 1.0 una “Dashboard amministrativa” e la moderazione, ma nel repository non ci sono route admin. La presenza o assenza di un sistema esterno o di un deploy non è verificabile dal solo repo. **Impatto:** il changelog non è una fonte affidabile per data di rilascio e funzioni effettivamente disponibili. **Azione:** chiedere conferma della versione pubblicata e del sistema amministrativo; correggere data e note dopo averli verificati, mantenendo esplicita la distinzione tra codice e servizi esterni.

### 💡 Nice-to-have

- **Test e CI:** `package.json:5-8` espone `dev`, `build`, `start` e `lint`, ma non `test` o `typecheck`. La [guida README](../../README.md#verifica) spiega comunque il comando TypeScript, lint e `node --test` in PowerShell. Non sono presenti workflow CI o configurazioni equivalenti nel repo. **Azione consigliata:** aggiungere script npm e un controllo CI se il progetto vuole rendere ripetibili i gate prima del deploy; l'assenza non rende inutilizzabili i test documentati.
- **Console residue:** i log integrali degli errori già rilevati nel [report del Punto 6](06-privacy-dati.md) non sono duplicati qui. Restano due `console.log` per messaggi di fallback in `src/features/profilo/server/actions.ts:128` e `src/features/pubblica-annuncio/server/actions.ts:362`; possono essere eliminati o resi strutturati nell'intervento già tracciato al Punto 6.
- **Backup/TODO:** le ricerche di nomi `.bak`, `.old`, `.orig`, backup, file `.log` e dump non hanno restituito file nel workspace. Non è stato trovato un nuovo FIXME/XXX/HACK; i TODO applicativi rimasti sono il contatore sopra, un copyright subordinato alla conferma del marchio (`src/components/navigation/Footer.tsx:117`) e il copy professionale inattivo già collegato al Punto 11. Le migrazioni storiche non sono state classificate come dead code.
- **Dipendenze:** lockfile v3 presente, `npm ls --depth=0` pulito, nessuna dipendenza diretta mancante. Il controllo locale non stabilisce se esistano release più recenti o vulnerabilità pubblicate dopo la versione risolta.

## 4. Checklist azioni

### Eseguibili da agente AI — fase successiva

- [ ] **12-F01:** rimuovere il conteggio fittizio oppure integrare una misura reale, dopo le decisioni su definizione della visita e trattamento dei dati.
- [ ] **12-F02:** verificare eventuali entry dinamici e rimuovere i componenti legacy e i relativi moduli non più referenziati.
- [ ] **12-F03:** sostituire il riferimento al documento Stripe assente con istruzioni effettivamente disponibili.
- [ ] **12-F04:** aggiornare changelog e data solo dopo conferma della release e della dashboard.
- [ ] Valutare `test`/`typecheck` in `package.json` e un job CI; aggiornare l'istruzione PowerShell solo se il workflow cambia.
- [ ] Ricontrollare i log per il finding 06-F06 e rimuovere i due log di fallback non strutturati.

### Da fare manualmente dall'utente

- [ ] Confermare se e dove sia stata pubblicata la versione 1.0, quale data indicare e se la dashboard/moderazione siano ospitate fuori da questo repository.
- [ ] Decidere se le visualizzazioni articolo devono essere misurate e con quali regole; il dato corrente è generato localmente e non conta richieste.
- [ ] Se richiesto, eseguire l'intera suite documentata nel README e configurare i controlli nel sistema CI/deploy effettivo, non visibile nel repo.
- [ ] Se il progetto deve mantenere un inventario di sicurezza aggiornato, eseguire in una sessione separata controlli online di aggiornamento e advisories dipendenze: questo audit ha controllato coerenza/installazione locale, non la situazione remota corrente.

## 5. Domande aperte / decisioni da prendere

1. La versione 1.0 è stata distribuita? La dashboard admin e il flusso di moderazione sono in un altro repo o servizio?
2. Il contatore fittizio era un placeholder temporaneo o una scelta di prodotto? Qual è la metrica desiderata?
3. Le famiglie di componenti legacy sono mantenute per una futura riattivazione o possono essere rimosse dopo la ricerca di usi runtime?
4. Dove vengono eseguiti oggi lint, typecheck e test prima del deploy?
5. È ancora necessario documentare localmente il ramo Stripe non configurato? Il file citato non è presente.

## 6. Stato finale e punto successivo

**Completato il 2026-09-29** con verifiche statiche mirate su documentazione, dipendenze installate, script e riferimenti. Non è stata eseguita la suite di test né verificato CI, deploy, versioni online o advisories; tali limiti sono espliciti sopra.

Migrazioni create/applicate: **0**. Nessuna nuova migrazione da applicare manualmente; non è stato effettuato un controllo remoto delle migrazioni preesistenti.

Con il Punto 12 si conclude il piano di audit. Il prossimo passo è decidere quali findings dei report completati includere in una fase separata di implementazione; non c'è un ulteriore punto numerato da avviare.
