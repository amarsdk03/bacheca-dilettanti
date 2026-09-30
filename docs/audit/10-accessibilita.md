# Punto 10 — Accessibilità e animazioni

## 1. Obiettivo e ambito

Valutare navigazione da tastiera, focus, nomi e relazioni accessibili, dialog, form, contrasto e preferenza di movimento ridotto nelle aree principali. I riscontri sotto sono statici o calcolati dai colori sorgente: non costituiscono una certificazione WCAG né una prova con lettore di schermo.

## 2. File e aree analizzate

- **Versione osservata:** commit `5f76766d21ac7e4ea7e8f71ab39fbfbabb14901d`, Next installato 16.3.4. All'avvio il worktree era pulito; questo punto ha modificato solo master e report.
- **Navigazione e UI:** `src/app/layout.tsx`, `src/components/navigation/{Navbar,NavbarNavigation}.tsx`, primitive Base UI in `src/components/ui/{dialog,alert-dialog,sheet,field}.tsx`, support bubble, azioni dettagli e avviso homepage.
- **Form:** `src/features/registrati/Registrati.tsx`, `src/features/pubblica-annuncio/components/{ConfermaInvioAnnuncio,AnnouncementDetailsForm}.tsx`, `src/features/profilo/{ProfileEditorDialog,ProfileDetailsForm}.tsx` e campi condivisi.
- **Movimento e colori:** `src/components/{SplitText,TextType}.tsx`, `src/features/homepage/components/HomepageTitle.tsx`, `src/components/support/SupportBubble.tsx`, `src/app/globals.css`, link legali di registrazione e pubblicazione. `TextType` e la vecchia pagina `ComingSoon` non risultano montati da route/feature attuali e non sono classificati come difetti live.
- **Riferimenti:** guida accessibilità di Next 16.3.4 installata; [WCAG 2.2 contrasto minimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [bypass dei blocchi ripetuti](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html), [errori nei form](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html). Nessun browser controllabile o lettore di schermo è stato usato; focus reale, ordine di tabulazione, overlay CMP e colori computati del deploy restano da verificare.

## 3. Findings per severità

### 🟡 10-F01 — Testo viola dei link legali sotto il contrasto AA normale

**Confermato dai colori sorgente; da verificare sul CSS computato del deploy.**

- **Evidenza minima:** i link Termini e Privacy della registrazione usano `text-brand-indigo` (`src/features/registrati/Registrati.tsx:870`, `:878`, `:886`); anche i consensi di pubblicazione lo usano (`src/features/pubblica-annuncio/components/ConfermaInvioAnnuncio.tsx:470`, `:486`). `--brand-indigo` vale `#8e72ff` (`src/app/globals.css:68`): su bianco il rapporto calcolato è **3,50:1**, su `#fbfaff` **3,37:1**, sotto il minimo **4,5:1** per il testo ordinario. I link hanno sottolineatura, che aiuta a identificarli ma non aumenta il contrasto.
- **Impatto:** la lettura delle informative necessarie al consenso può risultare difficile per persone con bassa acuità visiva. La stessa tinta compare in altri testi piccoli, badge e istruzioni; la copertura completa delle combinazioni effettive richiede analisi del CSS renderizzato.
- **Azione consigliata:** usare un tono testo più scuro, verificato almeno a 4,5:1 sullo sfondo finale, conservando il viola chiaro per superfici/decorazioni; centralizzare un token per link testuali e misurare i casi nelle pagine di registrazione e pubblicazione.

### 🟡 10-F02 — Il titolo animato della home ignora il movimento ridotto

**Confermato nel codice; impatto percepito da verificare in browser.**

- **Evidenza minima:** `HomepageTitle` monta `SplitText` sul titolo `h1` con ingresso da `opacity: 0, y: 50` e durata 1,5 s per parola (`src/features/homepage/components/HomepageTitle.tsx:12`, `:17`, `:21`). `SplitText` crea un'animazione GSAP con `ScrollTrigger` (`src/components/SplitText.tsx:93`, `:103`) senza interrogare `prefers-reduced-motion` o `gsap.matchMedia`. Anche il punto decorativo della home usa `blink-anim` (`src/features/homepage/Homepage.tsx:293`), definita come animazione infinita (`src/app/globals.css:155`) senza override nella preferenza reduce.
- **Impatto:** chi richiede movimento ridotto riceve comunque ingresso traslato e lampeggio. Non si assume che ogni transizione CSS sia problematica: le strisce dell'avviso e gli effetti degli annunci prioritari hanno già override espliciti.
- **Azione consigliata:** rendere il titolo immediatamente visibile e statico con `reduce`; spegnere il lampeggio e includere gli effetti globali pertinenti nella media query. Verificare che la preferenza funzioni anche quando cambia durante la sessione. GSAP SplitText usa `aria: "auto"` come default nella versione installata, quindi il testo spezzato non è stato classificato come perdita del nome accessibile.

### 🟡 10-F03 — Errori dei form non collegati ai campi e focus non guidato dopo la validazione

**Confermato staticamente; annuncio effettivo degli errori da verificare con lettore di schermo.**

- **Evidenza minima:** `FieldError` crea un `div role="alert"`, ma non assegna un `id` o una relazione automatica al controllo (`src/components/ui/field.tsx:215`). L'email di registrazione ha `aria-invalid`, senza `aria-describedby`/`aria-errormessage` verso il messaggio (`src/features/registrati/Registrati.tsx:648`, `:654`); la password segue lo stesso schema (`:700`, `:717`). Il passo account esce su errori senza spostare il focus (`src/features/registrati/Registrati.tsx:361`); nel passo dettagli un errore provoca solo `scrollToHeader()` (`:501`), che chiama `scrollIntoView({behavior: "smooth"})` (`:251`) anche con movimento ridotto. Lo stesso pattern di errore separato ricorre nella pubblicazione (`src/features/pubblica-annuncio/components/AnnouncementDetailsForm.tsx:112`, `:115`).
- **Impatto:** gli alert dinamici possono essere annunciati all'apparizione, ma quando l'utente torna su un campo invalido il messaggio specifico non è associato programmaticamente; dopo “Continua” il focus resta sul pulsante e l'utente deve cercare il primo errore. Lo scorrimento forzato è un effetto di movimento non necessario per chi ha chiesto `reduce`.
- **Azione consigliata:** assegnare ID stabili agli errori, collegarli via `aria-describedby` o `aria-errormessage`, focalizzare il primo campo invalido o un riepilogo errori e condizionare lo scroll alla preferenza di movimento. Testare con tastiera e almeno un lettore di schermo.

### 🟢 10-F04 — Manca un collegamento rapido per saltare la navigazione ripetuta

**Confermato nel layout; conformità complessiva al criterio da verificare.**

- **Evidenza minima:** il layout monta `<main>{children}</main>` senza ID o link iniziale di salto (`src/app/layout.tsx:52`, `:54`). Le route includono la navbar dentro i `children` (`src/app/page.tsx:32`, `src/app/annunci/page.tsx:54`), e la navigazione contiene molti collegamenti (`src/components/navigation/NavbarNavigation.tsx:145`, `:299`). Il landmark `main` esiste, ma in queste route inizia prima della navigazione ripetuta; un salto al solo `main` non la bypasserebbe.
- **Impatto:** chi usa solo la tastiera deve attraversare la navigazione ripetuta su ogni pagina. Il rischio pratico dipende da ordine DOM, route e comportamento dei menu, non osservati in browser.
- **Azione consigliata:** definire un target dopo la navbar ripetuta e un link iniziale visibile al focus che lo raggiunga; verificare atterraggio del focus, contrasto e navigazione dopo il cambio route. Rivalutare la collocazione del landmark `main` per escludere la navigazione globale.

### Riscontri positivi

- Il documento dichiara `lang="it"` e un landmark `main` (`src/app/layout.tsx:45`, `:54`); Next annuncia le transizioni client tramite route announcer secondo la guida installata.
- Nav e menu mobile hanno nomi accessibili, `aria-current`, trigger con etichetta e focus visibile (`src/components/navigation/NavbarNavigation.tsx:145`, `:281`, `:299`). Dialog e sheet usano primitive Base UI; la finestra di modifica profilo fornisce titolo e descrizione (`src/features/profilo/ProfileEditorDialog.tsx:123`, `:138`). Focus trap e restituzione del focus richiedono verifica nel browser.
- Molti campi hanno label native, `aria-invalid` e messaggi con `role="alert"`; la bubble di supporto gestisce Escape e ripristina il focus (`src/components/support/SupportBubble.tsx:27`, `:44`). Le animazioni Motion della bubble leggono `useReducedMotion` (`:20`, `:77`), e le principali animazioni CSS di strisce e annunci prioritari hanno media query reduce (`src/app/globals.css:247`, `:703`).

Nessun finding critico o alto è stato accertato con la sola analisi statica.

## 4. Checklist azioni

### Eseguibili da agente AI — futura fase di implementazione

- [ ] **10-F01:** introdurre colore di testo/link con contrasto AA e verificare le combinazioni di sfondo dei form e delle pagine principali.
- [ ] **10-F02:** disattivare ingresso GSAP e lampeggio per `prefers-reduced-motion: reduce`; aggiungere una verifica mirata del comportamento.
- [ ] **10-F03:** collegare errori ai controlli, gestire focus/riepilogo dopo validazione e rispettare reduce nello scroll del wizard.
- [ ] **10-F04:** aggiungere skip link e target unico nel layout; verificarli dopo navigazione client.

### Da fare manualmente dall'utente

- [ ] Eseguire un percorso completo solo tastiera su home, directory, dettagli, registrazione, pubblicazione e area profilo: Tab/Shift+Tab, Enter/Space, Escape e ritorno del focus dai dialog.
- [ ] Provare registrazione e pubblicazione con errori usando NVDA/Firefox o VoiceOver/Safari, verificando nome, descrizione, errore associato e ordine degli annunci.
- [ ] Verificare zoom 200–400%, reflow mobile, focus non coperto da navbar/bubble/CMP e contrasto sul CSS computato in browser, inclusi stati hover/focus/disabilitato.
- [ ] Ripetere il percorso con movimento ridotto attivo a livello di sistema; esaminare anche il banner CMP LegalBlink, che è iniettato da terza parte e non è verificabile staticamente dal repository.

## 5. Domande aperte / decisioni da prendere

1. Quale livello di conformità e quali combinazioni browser/tecnologie assistive sono il riferimento di accettazione (per esempio WCAG 2.2 AA)?
2. È disponibile un browser di test con accesso alla versione deployata e un account di prova per i flussi protetti?
3. Quale revisione è oggi deployata? I finding statici su home e form vanno confermati sul CSS computato di quella revisione.
4. Il fornitore CMP offre documentazione o esito di test accessibilità per il banner inserito runtime?

## 6. Stato finale e punto successivo

**Completato il 2026-09-29** come audit statico mirato di layout, navigazione, primitive UI, form e animazioni. Contrasto calcolato dai token CSS; nessuna automazione browser, prova con lettore di schermo o certificazione dell'intero sito. Le verifiche dinamiche restano esplicite nella checklist.

Migrazioni create/applicate: **0**. Nessuna nuova migrazione da applicare manualmente; lo stato delle migrazioni preesistenti resta da verificare secondo i Punti 3–4.

Prossimo: **Punto 11 — Gap funzionali, integrazioni e roadmap**, profilo consigliato **GPT-6 Sol · medium · Default**. Ripartire dal [master](AUDIT-MASTER.md) e impostare prima il punto su **In corso**.
