# Bacheca Dilettanti — Specifica visiva della dashboard Admin

**Destinazione:** `apps/admin/DESIGN.md`  
**Stato:** decisioni definitive per il refactoring visivo.  
**Consegna:** un documento; nessun codice applicativo implementato.

## 1. Mandato, fonti e confini

Questa specifica usa l’inventario fornito dal committente e i tre riferimenti allegati. Il repository applicativo non è disponibile nell’ambiente di redazione: non sono stati letti componenti, controller o stili reali, né osservate schermate dell’applicazione. I nomi riportati identificano i componenti dell’inventario; non ne presumono percorsi o API interne. Codex deve individuare le relative implementazioni nel repository durante lo step pertinente, mantenendo le decisioni qui definite.

**Contesto tecnico vincolante:** monorepo con Web e Admin separate; Admin con Next.js 16 App Router, React 19 e TypeScript, Tailwind CSS 4 con variabili semantiche, shadcn/ui preset base-nova basato su Base UI, icone Lucide e grafici Recharts. Conservare questo stack e riutilizzare i componenti elencati nella sezione 9. Non migrare primitive o librerie.

L’obiettivo è rendere l’Admin compatta, leggibile e coerente, conservando integralmente funzionalità, informazioni e comportamenti. Sono autorizzati stile, composizione, gerarchia, adattamento agli schermi, temi e movimento descritti in questo documento.

Sono esclusi la pagina di accesso e i suoi componenti, inclusi `LoginForm`, `GradientASCII` e `TechText`; logiche applicative, autorizzazioni, autenticazione, richieste, controller, validazioni, URL, dati, database e API. Non si riapre la precedente roadmap. Non si creano sezioni operative, metriche o azioni amministrative.

I controlli ammessi sono quelli dell’inventario, oltre al selettore dark/light esplicitamente richiesto. Le immagini non autorizzano ricerca globale, notifiche, filtri temporali aggiuntivi, confronti percentuali, ordinamento, azioni massive, selezioni multiple o nuovi menu account.

**Modalità di lavoro di tutti e tre gli step:** modifiche presentazionali e revisione del codice. Non avviare test, lint, typecheck, browser, browser automation, servizi, build o deploy; non eseguire verifiche su servizi remoti. I criteri di completamento sono condizioni dell’implementazione e del diff, non comandi da eseguire.

### 1.1 Direzione visiva definitiva

La precedenza è **Ember → NUMI → Revenue Analytics**, riconoscendo le immagini per contenuto. Nei file ricevuti, `inspo2.webp` contiene Ember, `inspo3.webp` contiene NUMI e `inspo1.jpg` contiene Revenue Analytics.

| Riferimento | Elementi adottati | Applicazione a Bacheca Dilettanti |
|---|---|---|
| Ember, riferimento principale | Superfici carbone stratificate, sidebar più scura, bordi sottili, selezione neutra leggermente sollevata, profondità discreta | Struttura e tema dark; navigazione attiva, KPI selezionato, card e superfici temporanee |
| NUMI, riferimento secondario | Compattezza operativa, allineamenti, griglie ordinate, vicinanza tra dati e relativo contesto | Densità di filtri, grafici, azioni rapide e tabelle; mantenere testi leggibili, senza riprendere le dimensioni minute del riferimento |
| Revenue Analytics, riferimento light | Canvas chiaro, card bianche, distinzione tra titoli, numeri e metadati | Adattamento completo al tema light, con identica struttura, spaziatura e semantica del dark |

Il risultato usa superfici uniformi, tipografia di sistema e una selezione prevalentemente neutra. Blu per focus e collegamenti; colori semantici per gli stati; tredici colori dedicati ai grafici. I pulsanti primari sono neutri ad alto contrasto.

Conservare nome, logo, banner e asset originali di **Bacheca Dilettanti**, con proporzioni e colori originali. Non ricreare il marchio, applicare filtri di inversione o sostituirlo con un marchio ispirato ai riferimenti. Non importare illustrazioni, valori finanziari, glow, sfondi animati o grandi numeri ornamentali. Le misure seguenti sostituiscono le proporzioni ingrandite dei mockup.

## 2. Temi e isolamento dell’Admin

### 2.1 Un solo gestore presentazionale persistente

Introdurre `DashboardThemeProvider` nel layout persistente della sola dashboard, associato a `DashboardShell`. Il provider gestisce esclusivamente tema locale e contenitore dei portal. I provider applicativi, i controller e i form esistenti mantengono identità e posizione funzionale.

Il contratto DOM comprende due radici:

| Radice | Attributi e responsabilità |
|---|---|
| Radice di `DashboardShell` | `data-admin-scope="dashboard"` e `data-admin-theme="dark"` oppure `"light"`; contiene sidebar, header e contenuto |
| Host `bd-admin-portal-root` | Figlio diretto di `body`, posseduto dal provider; `data-admin-scope="portal"` e lo stesso `data-admin-theme`; contiene esclusivamente portal Admin |

Le due radici ricevono lo stesso set di variabili, font e `color-scheme` coerente con il tema. La classe `dark`, necessaria agli eventuali stili esistenti del preset, è presente **soltanto su queste due radici quando il tema è dark**. Nel light viene rimossa da entrambe. Non ridefinire globalmente la variante Tailwind `dark`.

Non applicare attributi tema, classi `dark`, token, font o `color-scheme` a `html` o `body`. Il nuovo host è un contenitore, non una modifica dello stile globale. L’host non deve avere trasformazioni, filtri, clipping o un proprio sfondo a tutta pagina.

Le regole Admin sono limitate alle due radici e ai loro discendenti. Le utility e gli SVG devono leggere i valori semantici del relativo scope; correggere nello scope Admin gli eventuali colori fissi del preset. Non cambiare i default globali dei componenti, i token globali o i mapping globali Tailwind per ottenere questo risultato. Le varianti visive Admin sono esplicite e non diventano il default del login.

### 2.2 Preferenza, primo caricamento e controllo tema

La chiave locale è **`bd-admin-theme`**; i soli valori ammessi sono `dark` e `light`.

- Server rendering e primo render dell’idratazione: dark, con markup deterministico e contenuto visibile.
- Nel primo layout effect del provider: leggere la chiave, accettare soltanto i due valori validi e applicare immediatamente il risultato a shell e host. Valore assente, invalido o lettura fallita significano dark.
- Il primo paint server rimane dark; una preferenza light salvata viene ripristinata alla prima idratazione. Non introdurre script globali, contenuto nascosto o `suppressHydrationWarning` per mascherare questo comportamento.
- Il cambio manuale aggiorna nello stesso passaggio entrambe le radici e salva la preferenza. Se lo storage non è scrivibile, il tema scelto resta attivo in memoria per la permanenza nella dashboard.
- Nessun uso di preferenze cromatiche del sistema operativo, cookie, account, database o API. Non aggiungere modalità “Sistema” o sincronizzazione tra schede.

Usare un solo `Button` ghost nell’header, all’estremità destra, sempre disponibile anche su mobile: icona Lucide `Sun` nel dark, `Moon` nel light. Il nome accessibile e il tooltip descrivono l’azione: “Passa al tema chiaro” oppure “Passa al tema scuro”. Dimensione 36 × 36 px desktop/tablet e 44 × 44 px mobile. Nessun nuovo menu di impostazioni e nessuna duplicazione nella sidebar.

Il cambio tema è immediato: non animare tutte le superfici, non riavviare il fade della pagina e non chiudere pannelli o perdere focus.

Durante il bootstrap e il cambio tema, applicare durata zero alle sole microtransizioni cromatiche in entrambe le radici, inclusi i portal; ripristinare i 120 ms per hover e selezione dopo l’applicazione dei nuovi colori. Questa soppressione non introduce attese nella navigazione, rimontaggi o modifiche al focus e non sostituisce il ciclo delle superfici Base UI.

### 2.3 Portal e uscita dalla dashboard

Il provider espone l’host ai wrapper Admin di `DropdownMenu`, `Tooltip`, `Select`, `Sheet` e `AlertDialog`. Questi inoltrano il riferimento al `container` del rispettivo portal Base UI. Anche la sidebar mobile e le superfici annidate devono seguire questo contratto.

L’host viene predisposto nel montaggio iniziale del provider, prima di rendere i contenuti portaled. Non montare prima nel contenitore predefinito per spostare poi la superficie. Non spostare manualmente nodi gestiti da Base UI. Il normale contenuto della dashboard rimane visibile anche durante questa predisposizione.

Il passaggio del container è contestuale: fuori dal contesto Admin, wrapper e componenti mantengono destinazione e default attuali. Conservare le relazioni React tra Sheet, menu e conferme annidate; focus iniziale, focus trap, ritorno al trigger, Escape, dismiss e condizioni di apertura restano governati dal comportamento esistente Base UI.

All’uscita dalla dashboard, anche tramite logout, rimuovere soltanto l’host posseduto dal provider. La preferenza rimane salvata; l’accesso non la legge e non riceve gli scope Admin. Nessuna modifica al flusso di logout.

Riferimento tecnico per il container esplicito: [Base UI — Dialog, Portal](https://base-ui.com/react/components/dialog#portal). Utilizzare le primitive Base UI già presenti; non introdurre API o dipendenze Radix.

## 3. Token definitivi

I valori seguenti sono prescrittivi per entrambi i temi. I nomi standard corrispondono alla convenzione semantica shadcn/Tailwind già indicata nell’inventario. I nomi `--admin-*` sono estensioni locali, non token globali. Nessun colore dei componenti operativi deve dipendere direttamente dai colori delle immagini di riferimento.

### 3.1 Superfici, testi, azioni e sidebar

| Variabile | Dark | Light | Uso |
|---|---|---|---|
| `--background` | `#111214` | `#F4F5F7` | Canvas della dashboard |
| `--foreground` | `#F4F4F5` | `#18181B` | Testo principale |
| `--card` | `#191B1F` | `#FFFFFF` | Card e contenitori delle tabelle |
| `--card-foreground` | `#F4F4F5` | `#18181B` | Testo sulle card |
| `--popover` | `#22252A` | `#FFFFFF` | Menu, tooltip, Sheet e dialog |
| `--popover-foreground` | `#F4F4F5` | `#18181B` | Testo sulle superfici temporanee |
| `--primary` | `#F4F4F5` | `#18181B` | Azione primaria |
| `--primary-foreground` | `#18181B` | `#FFFFFF` | Testo e icone dell’azione primaria |
| `--secondary` | `#25282E` | `#EEF0F3` | Azioni secondarie e superfici neutre |
| `--secondary-foreground` | `#E4E7EC` | `#303642` | Testo su secondary |
| `--muted` | `#22252A` | `#EEF0F3` | Testate tabella e sezioni secondarie |
| `--muted-foreground` | `#B3B8C2` | `#525866` | Descrizioni, label secondarie, assi |
| `--accent` | `#2C3037` | `#E8EBF0` | Hover di controlli neutri |
| `--accent-foreground` | `#F4F4F5` | `#18181B` | Testo sullo stato hover |
| `--border` | `#34383F` | `#DDE1E7` | Bordi strutturali e separatori |
| `--input` | `#6B7280` | `#87909F` | Bordo di input, select e pulsanti outline |
| `--ring` | `#93C5FD` | `#2563EB` | Focus visibile |
| `--destructive` | `#F87171` | `#B91C1C` | Azione distruttiva piena |
| `--destructive-foreground` | `#2B0B0B` | `#FFFFFF` | Testo sull’azione distruttiva piena |
| `--sidebar` | `#0D0E10` | `#FFFFFF` | Sidebar, inclusa quella mobile |
| `--sidebar-foreground` | `#B3B8C2` | `#525866` | Navigazione non selezionata |
| `--sidebar-primary` | `#F4F4F5` | `#18181B` | Elementi di massimo rilievo nella sidebar |
| `--sidebar-primary-foreground` | `#18181B` | `#FFFFFF` | Testo su sidebar-primary |
| `--sidebar-accent` | `#2B2F35` | `#E8EBF0` | Voce di navigazione attiva |
| `--sidebar-accent-foreground` | `#F4F4F5` | `#18181B` | Testo e icona attivi |
| `--sidebar-border` | `#2A2E35` | `#DDE1E7` | Separazioni nella sidebar |
| `--sidebar-ring` | `#93C5FD` | `#2563EB` | Focus nella sidebar |

### 3.2 Selezione, interazione e dettagli

| Variabile | Dark | Light |
|---|---|---|
| `--admin-field` | `#15171A` | `#FFFFFF` |
| `--admin-primary-hover` | `#DFE2E7` | `#2D333D` |
| `--admin-primary-pressed` | `#CAD0D9` | `#404854` |
| `--admin-destructive-hover` | `#FCA5A5` | `#991B1B` |
| `--admin-destructive-pressed` | `#FECACA` | `#7F1D1D` |
| `--admin-selected` | `#2B2F35` | `#E8EBF0` |
| `--admin-selected-foreground` | `#F4F4F5` | `#18181B` |
| `--admin-selected-border` | `#949CAA` | `#64748B` |
| `--admin-text-tertiary` | `#A3ABB8` | `#626B79` |
| `--admin-disabled-background` | `#22252A` | `#EEF0F3` |
| `--admin-disabled-foreground` | `#9CA4B1` | `#687180` |
| `--admin-disabled-border` | `#4A515D` | `#A0A8B5` |
| `--admin-link` | `#93C5FD` | `#1D4ED8` |
| `--admin-row-hover` | `#22252A` | `#F3F5F8` |
| `--admin-skeleton` | `#2B2F35` | `#E2E6ED` |
| `--admin-chart-grid` | `#34383F` | `#E2E6ED` |
| `--admin-overlay` | `rgba(0, 0, 0, 0.56)` | `rgba(17, 24, 39, 0.36)` |

`--admin-field` è anche lo sfondo dei blocchi di metadati e del testo tecnico nei dettagli. Il bordo strutturale `--border` separa superfici; il più evidente `--input` identifica i controlli. Non sostituire tutti i bordi con quello più tenue.

Per hover di azioni secondary, outline e ghost usare `--accent`; per pressione usare `--admin-selected`. Focus: anello continuo da 2 px in `--ring`, separato dal controllo da 2 px del colore della superficie sottostante. Nessuna modifica di dimensione al focus.

### 3.3 Stati semantici

Ogni riga definisce tre token esatti: superficie, testo/icona e bordo. Il colore è sempre accompagnato dall’etichetta esistente e, quando prevista sotto, da un’icona.

| Stato e token | Dark: superficie / testo / bordo | Light: superficie / testo / bordo |
|---|---|---|
| `--admin-success`, `--admin-success-foreground`, `--admin-success-border` | `#102C23` / `#6EE7B7` / `#2D6A52` | `#E9F7EF` / `#166534` / `#86B99A` |
| `--admin-warning`, `--admin-warning-foreground`, `--admin-warning-border` | `#33270F` / `#FCD34D` / `#80651B` | `#FFF7DF` / `#854D0E` / `#C9A34D` |
| `--admin-danger`, `--admin-danger-foreground`, `--admin-danger-border` | `#351B20` / `#FDA4AF` / `#87505B` | `#FFF0F1` / `#9F1239` / `#D58C9C` |
| `--admin-info`, `--admin-info-foreground`, `--admin-info-border` | `#172A43` / `#93C5FD` / `#456B9B` | `#EDF4FF` / `#1E40AF` / `#90AADE` |
| `--admin-neutral`, `--admin-neutral-foreground`, `--admin-neutral-border` | `#25282E` / `#B3B8C2` / `#596170` | `#EEF0F3` / `#525866` / `#A0A8B5` |

Usare danger per messaggi di errore e rifiuto; destructive per il pulsante di conferma distruttiva. I due ruoli non sono intercambiabili.

### 3.4 Palette completa dei grafici

La corrispondenza **categoria/serie → indice del token** rimane quella esistente. Il cambio tema sostituisce soltanto il valore del token, senza riordinare categorie o riassegnare i colori in base ai risultati.

| Token | Dark | Light |
|---|---|---|
| `--chart-1` | `#60A5FA` | `#2563EB` |
| `--chart-2` | `#34D399` | `#047857` |
| `--chart-3` | `#FBBF24` | `#A16207` |
| `--chart-4` | `#F472B6` | `#BE185D` |
| `--chart-5` | `#A78BFA` | `#7C3AED` |
| `--chart-6` | `#22D3EE` | `#0E7490` |
| `--chart-7` | `#FB923C` | `#C2410C` |
| `--chart-8` | `#A3E635` | `#4D7C0F` |
| `--chart-9` | `#FB7185` | `#BE123C` |
| `--chart-10` | `#2DD4BF` | `#0F766E` |
| `--chart-11` | `#818CF8` | `#4338CA` |
| `--chart-12` | `#E879F9` | `#A21CAF` |
| `--chart-13` | `#CBD5E1` | `#475569` |

### 3.5 Tipografia, numeri e icone

`--font-sans` locale: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.  
`--font-mono` locale: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`.

Non caricare font esterni. Applicare i font anche ai contenuti portaled. Usare `font-variant-numeric: tabular-nums` per KPI, quantità, importi già disponibili, date, ore, paginazione e celle numeriche. Mantenere formattazione e localizzazione attuali dei valori; non aggiungere unità o precisione.

| Ruolo | Dimensione / interlinea | Peso | Regola |
|---|---|---|---|
| Titolo pagina, `SectionHeading` | 28 / 36 px; mobile 24 / 32 px | 600 | Tracking −0.02 em |
| Titolo Sheet/dialog | 20 / 28 px | 600 | Va a capo, mai troncato |
| Titolo card o blocco | 16 / 24 px | 600 | Tracking −0.01 em |
| Numero KPI | 32 / 40 px; mobile 28 / 36 px | 600 | Tabulare, nessun contatore animato |
| “Non disponibile” nel KPI | 20 / 28 px | 600 | Testo, non segnaposto numerico |
| Corpo e dati tabella | 14 / 20 px | 400 | Colore foreground |
| Pulsanti e navigazione | 14 / 20 px | 500; attivo 600 | Etichetta leggibile |
| Input digitabili mobile | 16 / 24 px | 400 | Non ridurre per far entrare più campi |
| Label, header tabella, gruppi sidebar | 12 / 18 px | 600 | Nessun maiuscolo forzato |
| Metadati, note, legenda | 12 / 18 px | 400 | text-tertiary per metadati; muted-foreground per note e legenda |
| UUID e valori tecnici | 12 / 18 px | 400 | Font mono, spezzatura nei dettagli |

Icone Lucide: 16 px nei controlli e nei dati, 18 px nella sidebar, 20 px nei trigger principali; stroke 1.75. Mantenere le icone già associate alla navigazione. Le icone decorative hanno `aria-hidden`; i pulsanti con sola icona hanno un nome accessibile. Nessuna icona sostituisce un testo necessario.

### 3.6 Spaziature, dimensioni, raggi e ombre

Scala `--admin-space-1`…`--admin-space-8`, rispettivamente: **4, 8, 12, 16, 20, 24, 32, 40 px**. Usare 24 px tra sezioni desktop/tablet e 16 px mobile; 16 px tra card; 12 px tra campi; 8 px tra azioni; 4 px tra etichetta e metadato.

| Token o elemento | Valore deciso |
|---|---|
| `--radius` | 8 px |
| `--radius-sm` / `--radius-md` / `--radius-lg` | 4 / 6 / 8 px |
| `--radius-xl` / `--radius-2xl` | 12 / 16 px |
| Card e gruppi filtri | Raggio 12 px, bordo 1 px; padding 20 px, mobile 16 px |
| Input, select, button, navigazione attiva | Raggio 8 px |
| Badge | Raggio 6 px, padding 2 px 8 px, altezza minima 24 px |
| Tooltip e menu | Raggio 8 px, bordo 1 px |
| AlertDialog | Raggio 16 px; padding 24 px, mobile 16 px |
| Sheet | Bordo sul lato interno; nessun raggio sul bordo del viewport |
| Controlli con testo | Altezza minima 40 px, mobile 44 px; padding orizzontale 12 px |
| Controlli con sola icona | 36 × 36 px, mobile 44 × 44 px |
| Tabella | Header minimo 40 px, righe minime 56 px, celle padding 12 px 16 px |
| `--admin-shadow-card` dark / light | `0 1px 2px rgba(0,0,0,0.18)` / `0 1px 2px rgba(17,24,39,0.04)` |
| `--admin-shadow-floating` dark / light | `0 12px 32px rgba(0,0,0,0.32)` / `0 12px 32px rgba(17,24,39,0.14)` |
| `--admin-shadow-selected` dark / light | `inset 0 1px 0 rgba(255,255,255,0.04)` / `inset 0 1px 0 rgba(255,255,255,0.80)` |

Le altezze dei controlli e delle righe sono minime: contenuti lunghi possono aumentare l’altezza. Non fissare altezze che tagliano etichette, messaggi o valori. Card ordinarie senza effetti al passaggio del mouse; ombra floating riservata alle superfici temporanee.

## 4. Motion e transizioni

Dichiarare `motion` **12.42.2** nelle dipendenze dell’Admin e mantenere coerente il relativo riferimento nel lockfile con la risoluzione già presente nel monorepo. Non aggiornare altre librerie né introdurre un secondo sistema di animazione. Importare da `motion/react`.

| Token | Valore | Responsabile ed effetto |
|---|---|---|
| `--admin-duration-fast` | 120 ms | CSS: background, colore e bordo durante hover/selezione |
| `--admin-duration-page` | 160 ms | Motion: fade del contenuto sul cambio effettivo di pathname |
| `--admin-duration-popover` | 180 ms | Transizioni Base UI già presenti per menu, tooltip e select |
| `--admin-duration-surface` | 200 ms | Transizioni Base UI già presenti per Sheet e AlertDialog |
| `--admin-ease` | `cubic-bezier(0.2, 0, 0, 1)` | Curva unica, senza spring o rimbalzo |
| Durata con reduced motion | 0 ms | Ogni transizione decorativa viene eliminata |

### 4.1 Fade senza alterare il ciclo di vita

Usare un wrapper DOM presentazionale stabile intorno al contenuto, dentro `DashboardShell`. Sidebar, header, provider e host dei portal restano esterni a questo wrapper.

Animare il wrapper con `useAnimate` al cambio di `usePathname`: il router aggiorna subito il contenuto; il nuovo contenuto passa da opacità 0 a 1 in 160 ms. Non eseguire un fade-out della pagina precedente e non attendere un’animazione prima della navigazione. Al primo caricamento il wrapper è già visibile e non viene animato.

Non introdurre `key` basate su pathname, tema, dati o query; non aggiungere `AnimatePresence` attorno alle pagine, un nuovo `template.tsx` o strutture sostitutive per forzare rimontaggi. Conservare il normale ciclo di vita del router, senza rimontaggi aggiuntivi a fini decorativi. Un nuovo cambio percorso interrompe l’animazione precedente, senza accumulare attese.

Non avviare il fade per cambiamenti di query string, filtri, pagina della tabella, selezione KPI, tema, caricamento o aggiornamento dei dati. Non modificare focus, scroll o disponibilità dei controlli per eseguire il fade.

Riferimento tecnico per l’animazione di un elemento stabile: [Motion — useAnimate](https://motion.dev/docs/react-use-animate).

### 4.2 Un solo responsabile per ogni proprietà animata

Motion gestisce il fade del contenuto. Le microtransizioni dei controlli rimangono CSS, limitate a colore, background e bordo: 120 ms, senza `transition-all`, scale, spostamenti o animazioni della griglia. La navigazione tra modalità sidebar normale/compatta cambia geometria immediatamente.

Per menu, tooltip e select usare soltanto opacità, entro 180 ms. Per AlertDialog usare soltanto opacità, entro 200 ms. Per Sheet, inclusa la sidebar mobile, mantenere lo scorrimento dal lato già previsto, entro 200 ms, con backdrop in fade della stessa durata. Adattare le transizioni esistenti nello scope Admin; non sovrapporre wrapper Motion alle superfici Base UI e non cambiare `keepMounted` per motivi decorativi.

Nessuna animazione per riga, entrata a cascata, conteggio progressivo dei KPI, loop, shimmer, pulsazione o animazione dei dati dei grafici. I grafici Recharts devono rendere i valori immediatamente, con animazione delle serie disattivata.

### 4.3 Movimento ridotto

Usare `MotionConfig reducedMotion="user"` nel solo perimetro Admin e `useReducedMotion` per saltare esplicitamente il fade: opacità immediatamente 1, nessuna animazione residua. La sola configurazione di Motion non elimina tutte le animazioni di opacità e colore.

Una regola `prefers-reduced-motion: reduce` limitata alle due radici elimina anche le transizioni CSS e Base UI. Se la preferenza cambia durante il fade, interromperlo e rendere subito il contenuto pienamente visibile. Non rimuovere la gestione di focus o il ciclo di apertura/chiusura della primitiva.

Riferimenti: [Motion — MotionConfig](https://motion.dev/docs/react-motion-config#reducedmotion) e [Motion — useReducedMotion](https://motion.dev/docs/react-use-reduced-motion).

## 5. Struttura comune e adattamento agli schermi

### 5.1 Griglia della dashboard

`DashboardShell` ha altezza minima 100dvh e un’unica area di scorrimento verticale della pagina. La sidebar desktop mantiene scorrimento proprio per la navigazione lunga. I pannelli temporanei hanno il proprio corpo scorrevole. Le tabelle aggiungono soltanto lo scorrimento orizzontale interno necessario.

| Larghezza viewport | Sidebar | Header | Padding contenuto | Composizione |
|---|---|---|---|---|
| Meno di 768 px: mobile | Sheet dal lato sinistro, larghezza minore tra 288 px e viewport − 32 px | 56 px | 16 px | Blocchi impilati, controlli minimi 44 px |
| 768–1023 px: tablet | Stesso Sheet mobile, senza rail permanente | 64 px | 24 px | Griglie da due colonne dove specificato |
| 1024–1279 px: desktop compatto | 248 px; modalità compatta esistente 72 px | 64 px | 24 px | KPI su due colonne, grafici impilati |
| Da 1280 px: desktop ampio | 248 px; modalità compatta esistente 72 px | 64 px | 32 px | KPI su quattro colonne, grafici in rapporto 2:1 |

Il contenuto ha larghezza massima 1600 px, centrata nello spazio residuo a destra della sidebar. Il limite riguarda il contenuto, non l’intera shell. Sidebar e header sono persistenti; l’header rimane in alto durante lo scorrimento.

Ogni colonna della shell, griglia e card contiene i propri figli con `min-width: 0`. La pagina non deve acquisire uno scorrimento orizzontale per effetto di tabelle, UUID o grafici. A 320 px di viewport il contenuto rimane leggibile: si impilano strumenti e label, mentre soltanto la tabella scorre lateralmente.

Gerarchia degli strati nello scope Admin: contenuto 0, header 20, sidebar desktop 30, backdrop Sheet 80, Sheet 90, backdrop AlertDialog 100, AlertDialog 110, menu/select 120, tooltip 130. Conservare la modalità e le relazioni di focus Base UI; gli z-index non autorizzano interazione con superfici sottostanti a una modale.

### 5.2 DashboardSidebar e header

Nella sidebar: marchio originale in alto, navigazione al centro, logout in basso. Area marchio alta almeno 72 px; asset con `object-fit: contain`, altezza massima 40 px e larghezza massima 192 px. Conservare il supporto cromatico attualmente associato all’asset all’interno del suo contenitore locale, così da mantenerne la leggibilità senza alterarlo.

Navigazione con padding 12 px, righe alte almeno 40 px, gap 4 px. Gruppi separati da 16 px; etichette di gruppo 12/18 px, senza maiuscolo forzato. Icone 18 px, distanza dal testo 12 px. Non trasformare i raggruppamenti in nuovi accordion.

| Gruppo | Voci, nell’ordine esistente | Schermate |
|---|---|---|
| Principale | Home | Operativa |
| Contenuti | Annunci; Segnalazioni | Annunci operativa; Segnalazioni “Presto in arrivo” |
| Community | Utenti; Profili; Codici invito | “Presto in arrivo” |
| Gestione | Pagamenti; Promo e crediti; Distribuzione | “Presto in arrivo” |
| Analitiche | Statistiche; Registro attività; Integrazioni; Versioni sito web | Registro attività operativa; le altre “Presto in arrivo” |

Conservare tutti i tredici collegamenti e i relativi URL. Le dieci pagine future restano raggiungibili; non disabilitare le voci di navigazione.

Voce attiva: sfondo `--sidebar-accent`, testo e icona `--sidebar-accent-foreground`, peso 600, bordo 1 px `--admin-selected-border` e ombra selected. Le altre voci hanno un bordo trasparente dello stesso spessore per evitare spostamenti. Il focus ha il proprio anello; non sostituisce la selezione. Conservare `aria-current` e la logica attuale di individuazione della voce attiva.

In modalità compatta nascondere visivamente testi e titoli dei gruppi, mantenendo nomi accessibili e separazioni. Centrare le icone e usare Tooltip con il nome completo anche al focus. Conservare il controllo esistente per tornare alla modalità estesa. Nel Sheet mobile mostrare sempre la navigazione estesa, con logout e chiusura raggiungibili; le aree sicure del dispositivo si aggiungono ai padding.

Header opaco, sfondo `--background` e bordo inferiore `--border`. A sinistra: trigger Sidebar e nome della sezione corrente in 14/20 px. A destra: controlli già esistenti e selettore tema. Nessuna barra di ricerca globale, campanella, breadcrumb interattivo o menu utente aggiuntivo.

### 5.3 SectionHeading

Titolo H1 a sinistra e descrizione esistente sotto, distanti 4 px; azioni di sezione a destra con gap 8 px. Allineamento superiore, senza una card attorno al titolo. Su mobile le azioni passano sotto il testo, a tutta larghezza disponibile e con wrapping. Nessun titolo o controllo viene eliminato per far entrare la riga.

## 6. Home

Componenti: `HomeKpis`, `HomeQuickActions`, `HomeChartPanel`, `HomeCharts`, `HomeActivity`; `AuditSummaryTable` mantiene lo stesso stile usato nel Registro.

### 6.1 Schema testuale e ordine dei blocchi

| Ordine dall’alto | Desktop da 1280 px | Tablet, desktop compatto e mobile |
|---|---|---|
| 1 | SectionHeading: Home e descrizione esistente | Stesso contenuto, azioni a capo |
| 2 | HomeKpis: informazioni/aggiornamento indicatori, poi quattro card | Due card per riga da 480 a 1279 px; una sotto 480 px |
| 3 | HomeQuickActions: azioni esistenti in una fascia compatta | Pulsanti a capo; una colonna sotto 480 px |
| 4 | HomeChartPanel: contesto e aggiornamento grafici; HomeCharts con grafico principale 2/3 e distribuzione 1/3 | Grafico principale, poi distribuzione, impilati |
| 5 | HomeActivity: ultime operazioni, aggiornamento attività e collegamento al registro; tabella a tutta larghezza | Stesso ordine; tabella con scorrimento interno |

Gap fra blocchi 24 px desktop/tablet, 16 px mobile. `HomeChartPanel` organizza la sezione senza aggiungere un guscio Card attorno a due altre Card: un solo livello di superficie per ciascun grafico.

### 6.2 Indicatori e azioni rapide

Conservare i quattro indicatori, nell’ordine: **Utenti totali, Annunci totali, Annunci da approvare, Profitti totali**. Card con padding 20 px, mobile 16 px, altezza minima 128 px. Etichetta sopra, valore sotto con distanza 12 px; eventuali note già presenti restano leggibili sotto il valore.

La selezione rimane un controllo e continua a cambiare i grafici. Conservare l’elemento interattivo e la semantica esistenti; non trasformare le card in semplici contenitori cliccabili. Stato selezionato: `--admin-selected`, bordo `--admin-selected-border` e ombra selected, senza glow; aggiungere un indicatore decorativo Check da 16 px nell’angolo superiore destro, con spazio riservato anche nelle card non selezionate. Usare bordo dello stesso spessore anche nelle altre card. Hover neutro e focus visibile separato.

**Profitti totali mostra esattamente “Non disponibile”**, con dimensione 20/28 px. Non sostituirlo con zero, trattini, importi, skeleton permanente o uno stato disabled introdotto dal design. La selezionabilità e il risultato della selezione restano quelli del controller attuale.

`HomeQuickActions` usa una Card compatta: titolo 16/24 px, poi pulsanti esistenti con gap 8 px. Mantenere testo, destinazione, ordine, disponibilità e badge “Presto”. Le azioni future restano visibili e disabilitate. Non derivare nuove scorciatoie dalle voci di navigazione.

### 6.3 Grafici, contesto e aggiornamenti

Il pannello principale rende il grafico temporale ad area oppure il grafico a barre per anzianità degli annunci da approvare secondo la selezione esistente. Il pannello di distribuzione rimane un grafico a torta: non trasformarlo in donut o in un altro tipo.

Area di disegno cartesiana alta 280 px desktop/tablet e 240 px mobile, senza contare titolo, note e tabelle. Torta di diametro massimo 200 px desktop/tablet e 176 px mobile, riducibile per rispettare il contenitore. La card cresce in altezza per legenda, spiegazioni e dati; non tagliare le ultime categorie.

| Elemento grafico | Specifica |
|---|---|
| Linea dell’area | Spessore 2 px; colore della serie attuale; nessuna ombra o glow |
| Riempimento area | Stesso colore della linea, opacità 0.14, uniforme |
| Barre | Colore del token assegnato, opacità 0.85; nessun effetto tridimensionale |
| Torta | Colori assegnati, separazione 1 px del colore card; nessuna espansione animata |
| Assi | Testo 12/18 px muted-foreground; formattazione attuale |
| Griglia | 1 px admin-chart-grid; mantenere griglia e assi già previsti |
| Legenda | Sotto il grafico, campione 10 × 10 px, etichetta e valori già presenti; wrapping completo |
| Tooltip dei dati | Token popover, bordo 1 px, raggio 8 px, padding 12 px, ombra floating |
| Tabelle accessibili | Dati e meccanismo di accesso attuali; token Table sulle parti visibili |

Conservare aggregazioni, categorie, serie, ordinamento dei dati, unità, scale, intervalli, interpolazione e contenuti dei tooltip. Non adattare i valori per assomigliare alle curve dei riferimenti. Non introdurre confronti, nuove percentuali, nuove serie o controlli per nasconderle. Le categorie restano identificabili tramite testo e tabelle; il colore non è l’unico riferimento.

Le informazioni su aggiornamento, periodi, popolazioni e limiti restano accanto al blocco pertinente, in 12/18 px e con wrapping. Non spostarle esclusivamente nei tooltip. Non aggiungere selettori di periodo.

Indicatori, grafici e attività conservano **aggiornamenti, loading ed errori separati**. I pulsanti di aggiornamento restano nel rispettivo blocco; non introdurre un aggiornamento globale. Il cambio KPI non deve far svanire l’intera pagina.

### 6.4 Attività recente

`HomeActivity` occupa tutta la larghezza. Header con titolo, aggiornamento dell’attività e collegamento esistente al registro completo. Mostrare le **ultime cinque operazioni**, con i dati attuali e senza nuova paginazione.

`AuditSummaryTable` conserva la configurazione già usata in Home e condivide tipografia, spaziatura, badge, hover e apertura dettagli con il Registro. Le informazioni sulla provenienza e le date restano presenti dove oggi previste.

## 7. Annunci

Componenti: `AnnunciWorkspace`, `AnnouncementDetailContent`, `ModerateActions` e `ModerationDialog`.

### 7.1 Schema testuale e composizione

| Ordine dall’alto | Desktop | Mobile/tablet |
|---|---|---|
| 1 | SectionHeading e creazione annuncio disabilitata, con indicazione futura | Azione sotto il titolo, ancora disabilitata |
| 2 | Card filtri: ricerca per titolo/UUID con invio; sotto Stato, Tipologia, Oscuramento, Cestino | Ricerca e invio a capo quando necessario; filtri impilati o su due colonne |
| 3 | Card risultati: informazioni già disponibili a sinistra, aggiornamento ed esportazione a destra | Toolbar su più righe, etichette integre |
| 4 | Table con tutte e sette le colonne | Stessa Table, scorrimento orizzontale interno |
| 5 | Footer risultati: informazioni di pagina e paginazione esistenti | Testo sopra e controlli sotto, senza cambiare paginazione |
| Superficie temporanea | Sheet destro con dettaglio; conferma tramite ModerationDialog quando già prevista | Sheet a tutta larghezza su mobile; stessi dati e flussi |

Il blocco di ricerca precede i quattro filtri. Usare `Field` per le label e `InputGroup` per il campo di ricerca con icona `Search`. Il pulsante di invio esistente resta esplicito e visibile; Invio mantiene il submit del form attuale. Non avviare richieste durante la digitazione e non aggiungere debounce funzionale.

I filtri sono in quattro colonne da 1024 px, due tra 768 e 1023 px, una sotto 768 px. Conservare il loro comportamento di applicazione attuale: non introdurre un nuovo “Applica filtri”, non modificarne la sincronizzazione e non unificarli al submit della ricerca. I valori selezionati non devono essere nascosti da una larghezza insufficiente.

### 7.2 Toolbar, tabella e paginazione

L’aggiornamento e l’esportazione sono pulsanti outline, con etichetta visibile. La creazione rimane disabilitata e marcata come futura. Nella nota della toolbar, immediatamente sotto gli strumenti, mantenere esplicito: **sola pagina corrente, fino a 30 risultati**. Non introdurre un’esportazione completa o una nuova dimensione di pagina.

La Table ha larghezza minima 1080 px; il contenitore, non la pagina, gestisce l’overflow. Le larghezze seguenti sono minimi: Titolo assorbe lo spazio aggiuntivo.

| Colonna, nell’ordine | Larghezza minima | Presentazione |
|---|---|---|
| Titolo | 264 px | Testo principale, peso 500; va a capo integralmente |
| Autore/Profilo | 192 px | Informazioni esistenti su righe distinte, senza fusione di identità |
| Tipologia | 120 px | Etichetta completa, trattamento neutro |
| Stato | 120 px | Badge di moderazione con etichetta |
| Visibilità | 168 px | Mantiene le informazioni attuali, distinguendo oscuramento e privacy dove presenti |
| Creazione | 144 px | Numeri tabulari, data e ora leggibili |
| Azioni | 72 px | Controlli attuali, allineati a destra e con nome accessibile |

Non eliminare colonne su mobile, trasformare le righe in card, troncare titoli con line-clamp o usare tooltip come unica sede di un valore completo. Header 40 px minimo, righe 56 px minimo; l’altezza aumenta per contenuti su più righe. Nessun nuovo ordinamento, checkbox di selezione, azione massiva o click sull’intera riga.

La paginazione rimane sotto la tabella, nella stessa Card, separata da un bordo. Conservare quantità, conteggi, pulsanti, condizioni disabled e limite attuali. Non introdurre altri controlli di pagina.

### 7.3 Quattro dimensioni indipendenti

Le associazioni seguenti sono visive, non nuovi enum o nuove regole di dominio. Conservare le etichette e i valori reali.

| Dimensione | Trattamento | Vincolo |
|---|---|---|
| Stato di moderazione | In attesa: warning e `Clock3`; approvato: success e `Check`; rifiutato: danger e `X`; altri stati esistenti: neutral | Non dedurre lo stato da visibilità o cestino |
| Oscuramento | Oscurato: warning e `EyeOff`; condizione non oscurato: neutral e `Eye`, con etichetta attuale | Etichetta distinta dallo stato di moderazione |
| Privacy | Neutral e `LockKeyhole` per la condizione riservata già indicata; etichetta originale sempre presente | Non rappresentarla come errore, rifiuto o oscuramento |
| Cestino | Neutral e `Trash2`, con indicazione testuale già prevista | Distinto da rifiuto e oscuramento; disponibilità del recupero invariata |

Applicare questi trattamenti nei punti in cui ciascuna informazione è già esposta. Non aggiungere colonne, ricavare valori o spostare dati tra sorgenti per completare la rappresentazione. Nel dettaglio conservare tutti i campi e le spiegazioni delle quattro dimensioni; non sintetizzarli in un unico badge “Stato”.

### 7.4 AnnouncementDetailContent e ModerateActions

Sheet destro: 640 px da 1024 px; 560 px tra 768 e 1023 px; 100% della larghezza sotto 768 px. Altezza 100dvh. Header fermo con titolo, identificazione già presente e chiusura; corpo verticale scorrevole con padding 24 px, mobile 16 px.

Ordine dei gruppi nel corpo:

1. Stato di moderazione e informazioni distinte su oscuramento, privacy e cestino.
2. Contenuto completo dell’annuncio.
3. Autore e profilo.
4. Località.
5. Contatti e collegamenti.
6. Metadati e identificativi rimanenti.
7. `ModerateActions`, con tutte le spiegazioni e i blocchi esistenti.

Questa riorganizzazione conserva ogni campo e la relativa provenienza. Gruppi separati da 24 px e da titoli 16/24 px; nessuna Card annidata per ogni singolo dato. Coppie label/valore su due colonne nel pannello da 640 px, su una nelle altre misure. Descrizioni e contenuti lunghi rimangono a tutta larghezza.

UUID, URL, contatti lunghi e metadati usano spezzatura delle parole quando necessaria; nessuna ellissi permanente. I link mantengono destinazione e comportamento attuali, con colore link e sottolineatura al focus/hover. Non introdurre nuovi pulsanti per chiamare, copiare o aprire dati.

`ModerateActions` è l’ultimo blocco nel corpo scorrevole, separato da un bordo; non usare un footer fisso che copra contenuti o motivazioni. Pulsanti a capo, con le spiegazioni immediatamente adiacenti.

| Azione esistente | Trattamento nel dettaglio |
|---|---|
| Approvazione | Primary, icona Check |
| Rifiuto | Outline danger, icona X |
| Oscuramento | Secondary, icona EyeOff; spiegazione warning quando già presente |
| Ripristino della visibilità | Secondary, icona Eye |
| Cestino | Outline danger, icona Trash2 |
| Recupero | Secondary, icona Undo2 |

Questo elenco non rende disponibili azioni nascoste o bloccate dalle regole attuali. Conservare condizioni, motivazioni richieste, feedback, conferme e messaggi. Nessuna spiegazione di blocco deve essere disponibile soltanto tramite tooltip di un pulsante disabled.

### 7.5 ModerationDialog e conferme

Riutilizzare `AlertDialog` attraverso `ModerationDialog`. Larghezza massima 480 px, margine esterno minimo 16 px su mobile, altezza massima viewport − 32 px e corpo scorrevole per i contenuti lunghi.

Ordine: titolo dell’azione, spiegazione esistente e identificazione dell’oggetto, eventuale motivazione con `Field`, errori/blocchi, pulsanti di annullamento e conferma. Il bottone di conferma distruttiva usa destructive pieno; le altre conferme usano primary. Annullamento outline.

Non aggiungere né togliere conferme ai flussi. Mantenere obbligatorietà, validazione, contenuti, gestione pending, possibilità di dismiss e destinazione del focus attuali. Non effettuare chiusure anticipate, submit automatici o modifiche del risultato dell’azione.

## 8. Registro attività

Componenti: `AuditWorkspace`, `AuditSummaryTable` e `AuditDetailContent`.

### 8.1 Schema testuale e filtri

| Ordine dall’alto | Desktop da 1280 px | Viewport inferiori |
|---|---|---|
| 1 | SectionHeading, provenienza dei dati e indicazione Europe/Rome | Stesse informazioni, con wrapping |
| 2 | Card filtri: Dal, Al, Operatore, Operazione, Esito | Disposizione descritta sotto, senza campi nascosti |
| 3 | Azioni esplicite di applicazione e ripristino | A capo, senza submit automatico |
| 4 | Card risultati con AuditSummaryTable | Stessa tabella con scorrimento orizzontale interno |
| 5 | Informazioni di pagina e paginazione, massimo 30 eventi | Testi e controlli su righe distinte |
| Superficie temporanea | Sheet destro con AuditDetailContent in sola lettura | Stesso Sheet e stesso contenuto, intera larghezza mobile |

Da 1280 px usare una griglia di dodici colonne: Dal 2, Al 2, Operatore 4, Operazione 2, Esito 2. Tra 768 e 1279 px: prima riga Dal/Al, seconda riga Operatore a tutta larghezza, terza riga Operazione/Esito. Sotto 768 px: un campo per riga nello stesso ordine.

I controlli di applicazione e ripristino restano nella fascia sotto i campi, con gap 8 px. Conservare etichette, valori iniziali, sincronizzazione, submit esplicito, reset e parametri attuali. La ricerca dell’operatore rimane per **email/UUID**, con opzione **“Non identificato”**. Non convertirla in una ricerca globale né applicare automaticamente i filtri alla selezione.

Le note sulla provenienza dei dati e sulle date in **Europe/Rome** sono testo visibile, non contenuto esclusivo di un tooltip. Non modificare parsing, conversioni, formattazione o significato degli estremi Dal/Al.

### 8.2 AuditSummaryTable condivisa

Stesso trattamento visivo nella Home e nel Registro, tramite un’unica definizione degli stili. Mantenere le configurazioni attuali di ciascun utilizzo: cinque operazioni nella Home; fino a trenta eventi per pagina nel Registro. Non trasferire filtri o paginazione nella Home.

| Colonna del Registro | Larghezza minima | Gerarchia |
|---|---|---|
| Data/ora | 176 px | Numeri tabulari e formato attuale |
| Amministratore | 248 px | Identità disponibile, email/UUID o etichetta prevista; nessuna identità inventata |
| Operazione/esito | 328 px | Operazione come testo principale, esito come badge distinto |
| Apertura dettagli | 88 px | Controllo esistente, allineato a destra |

Larghezza minima complessiva 840 px. Le regole di header, celle, righe, overflow e focus sono le stesse della tabella Annunci. Il contenuto della colonna Operazione/esito può andare a capo. Non aggiungere ordinamento, esportazione, selezione multipla o nuove operazioni.

Esiti già riconosciuti come successo usano success, quelli di errore danger, gli altri il trattamento semantico già pertinente o neutral se privi di severità. Conservare sempre l’etichetta effettiva; non classificare nuovi codici o valori nei controller.

### 8.3 AuditDetailContent

Stesse dimensioni, header e corpo scorrevole del dettaglio Annunci. Il pannello è **in sola lettura**: non introdurre modifica, ripetizione, annullamento di eventi o altre azioni.

Ordine visivo: operazione ed esito; data/ora e amministratore; identificativi; variazioni; motivazione; correlazione; eventuali informazioni di esportazione; note di provenienza già presenti. Ogni sezione compare secondo le condizioni attuali, senza eliminare le informazioni facoltative disponibili.

Usare coppie label/valore e separatori sottili. I blocchi tecnici hanno sfondo admin-field, bordo border, raggio 8 px e padding 12 px. Conservare il renderer dei valori e delle variazioni; non riscrivere né normalizzare i dati. Blocchi di testo/JSON: font mono, `white-space: pre-wrap` e `overflow-wrap: anywhere`; nessun taglio del contenuto. Le coppie precedente/successivo già presenti si impilano su mobile conservando le rispettive etichette.

Motivazione, correlazione e informazioni di esportazione rimangono interamente leggibili. Mantenere Europe/Rome e la provenienza senza aggiungere conversioni locali o nuove interpretazioni dell’evento.

## 9. Regole condivise dei componenti e degli stati

### 9.1 Componenti da riutilizzare

| Componente esistente | Decisione |
|---|---|
| Sidebar | Struttura e comportamenti esistenti; token e misure della sezione 5 |
| Card | Superficie card, bordo 1 px, raggio 12 px; non aggiungere contenitori decorativi annidati |
| Button | Primary per invio/conferma principale; outline per aggiornamento, CSV, annullamento e ripristino filtri; secondary per azioni rapide e azioni contestuali neutre; ghost per struttura; destructive per conferme distruttive |
| Badge | Etichetta completa, eventuale icona, token semantici; non interattivo se oggi non lo è |
| Input / InputGroup / Field | Label visibili, helper ed errori associati, sfondo field, bordo input; focus comune |
| Select | Stessa ricerca/selezione e stessi valori; popup themed, opzione attiva riconoscibile anche mediante indicatore |
| Table | Stesse colonne e dati; header muted, righe card, separatori border, hover row-hover |
| Sheet | Header fermo e corpo scorrevole, dimensioni definite, tema tramite host Admin |
| AlertDialog | Conferme esistenti, max 480 px, nessuna semplificazione dei contenuti |
| DropdownMenu | Padding 4 px, voci alte almeno 36 px, mobile 44 px, gap icona/testo 8 px; nessuna nuova voce |
| Tooltip | Max-width 280 px, padding 8 px 12 px; aiuto supplementare, disponibile anche al focus |
| Alert | Icona, titolo/messaggio e testo esistente; token semantici e wrapping completo |
| Empty | Trattamenti distinti per assenza dati e pagine future, senza nuove CTA |
| Skeleton | Blocchi statici che riprendono gli ingombri reali; token skeleton, senza shimmer/pulse |

I pulsanti mantengono tipo, handler, semantica link/button, stato disabled e attributi accessibili. Non creare controlli interattivi annidati. Gli stati di hover dei controlli disabled non devono simulare disponibilità.

Variante outline neutra: fondo trasparente, testo foreground e bordo 1 px input; hover accent e pressed selected. Variante outline danger, riservata alle azioni indicate nella sezione 7: fondo trasparente, testo e icona admin-danger-foreground, bordo 1 px admin-danger-border, hover e pressed con fondo admin-danger. Entrambe usano il focus comune e non modificano i default del Button fuori dall’Admin.

DropdownMenu: larghezza 240 px, limitata al viewport meno 32 px; etichette a capo. Select: larghezza pari al trigger, limitata al viewport meno 32 px; etichette complete a capo. Per entrambi, altezza massima 320 px, ulteriormente limitata allo spazio disponibile, e scorrimento verticale interno. Conservare posizionamento, collision handling e comportamento della primitiva Base UI.

Le tabelle conservano semantica HTML, intestazioni associate, caption e nomi accessibili attuali. Il contenitore con overflow è identificabile e utilizzabile da tastiera con focus visibile; non trasformare ogni cella in un tab stop. Lo scroll orizzontale non deve trascinare header o sidebar.

Il cursore pointer identifica i controlli realmente azionabili. L’hover di una riga aiuta la lettura e non la rende cliccabile. Non aggiungere nuove azioni per rendere coerente un effetto visivo.

### 9.2 Matrice degli stati

| Stato | Presentazione conclusiva | Informazioni e comportamento da conservare |
|---|---|---|
| Focus | Anello 2 px con offset 2 px, senza spostamenti; visibile anche in menu, filtri e aree scrollabili | Ordine di tabulazione, nomi, associazioni label, focus iniziale e ritorno al trigger |
| Hover | Background/bordo in 120 ms, senza scale o movimento; nessun effetto sulle card statiche | Interattività e handler attuali |
| Selezione | Fondo neutro, bordo selected, peso 600 e indicatore semantico esistente | Selezione KPI, navigazione e opzioni correnti; nessuna selezione righe nuova |
| Disabled | Colori disabled dedicati, senza abbassare l’opacità dell’intero contenitore | Motivazioni, badge “Presto”, blocchi e attributi di disabilitazione |
| Primo caricamento | Skeleton statico negli ingombri del blocco interessato; messaggio accessibile attuale | Non mascherare come zero o assenza di dati; nessuna durata minima artificiale |
| Aggiornamento in corso | Stato del solo blocco in aggiornamento; controllo e messaggio pending già previsti | Se il controller mantiene i dati precedenti, mantenerli visibili; non cambiare caching o comportamento di caricamento |
| Nessun risultato | Empty entro la superficie pertinente, con titolo/messaggio già previsti | Distinguere assenza di dati e ricerca senza risultati; mantenere solo le azioni già esistenti |
| Errore | Alert danger nello stesso blocco, con messaggio e recupero già disponibili | Nessun reset globale o pulsante di retry inventato; nessuna soppressione delle cause mostrate |
| Dati incompleti | Nota/Alert info vicino ai dati validi, con testo completo e icona Info | Popolazioni, periodi, limiti, provenienza e avvertenze attuali; severità warning già prevista resta warning |
| “Non disponibile” | Testo stabile e leggibile; 20/28 px nella card Profitti, 14/20 px nelle altre sedi già previste | Non confondere con loading, zero, errore o funzionalità futura |
| “Presto” su azione | Badge neutral visibile accanto all’azione disabilitata | Stato futuro e spiegazione attuale; nessuna attivazione |
| “Presto in arrivo” su pagina | Trattamento unico descritto sotto | Tutte e dieci le pagine mantengono la propria rotta e i propri testi |

Mantenere messaggi `aria-live`, `role` e `aria-busy` già presenti, senza duplicare annunci per la stessa operazione. Non spostare un messaggio significativo soltanto in un’icona, colore, tooltip o elemento nascosto. Il linguaggio dei messaggi esistenti rimane invariato, salvo le due etichette del nuovo selettore tema e le esplicitazioni informative richieste qui.

Il passaggio tra stati riguarda la presentazione dei risultati che i controller già espongono. Non aggiungere fallback di dati, nuove richieste, nuovi enum o regole per determinare se un risultato è completo.

### 9.3 Un solo trattamento per le dieci pagine future

Sotto `SectionHeading` della sezione corrente, mostrare una sola Card: riutilizzare il componente condiviso “Presto in arrivo”, componendone la presentazione con `Empty`. Larghezza massima 640 px, allineata a sinistra, padding 24 px, mobile 16 px.

Icona Lucide `Clock3` da 32 px in colore muted-foreground; sotto, titolo esistente “Presto in arrivo” in 20/28 px e testo esistente in 14/20 px. Distanze 16 px fra icona e titolo, 8 px fra titolo e descrizione. Nessuna grande illustrazione, KPI fittizio, calendario di rilascio, percentuale di avanzamento o CTA aggiuntiva.

Il trattamento vale per Segnalazioni, Utenti, Profili, Codici invito, Pagamenti, Promo e crediti, Distribuzione, Statistiche, Integrazioni e Versioni sito web. La navigazione e il titolo della singola sezione mantengono il contesto; il contenuto operativo non viene implementato.

## 10. Tre piani operativi Codex

Gli step applicano questa specifica in sequenza. Le decisioni visive sono già definite; non generare nuove proposte, alternative, backlog o richieste di approvazione. Individuare i file reali per nome e responsabilità senza presumere percorsi non documentati. Tutte le condizioni di completamento si valutano mediante implementazione e revisione del codice.

### STEP 1 — Fondamenta visive, temi, struttura comune e Motion

**Obiettivo e componenti:** realizzare il sistema comune dark/light e la struttura persistente. Coinvolge `DashboardShell`, `DashboardSidebar`, `SectionHeading`, wrapper dei componenti condivisi, pagine “Presto in arrivo” e il nuovo provider esclusivamente presentazionale.

**Cinque interventi concreti:**

1. Definire nello scope Admin tutti i token delle sezioni 3–4: due palette complete, tredici colori grafico, font di sistema, spaziature, raggi, ombre e durate.
2. Introdurre il provider persistente, preferenza `bd-admin-theme` e selettore nell’header; collegare shell e host dedicato dei portal, inclusi sidebar mobile e contenuti annidati.
3. Applicare misure responsive, gerarchia e selezione a shell, sidebar e SectionHeading; conservare tredici voci e applicare il trattamento unico alle dieci pagine future.
4. Dare ai componenti base le varianti Admin definite: Card, Button, Badge, Field/Input/InputGroup, Select, Table, menu, tooltip, Sheet e AlertDialog. Preservare i default fuori dal contesto Admin.
5. Dichiarare Motion 12.42.2 nell’Admin e predisporre fade su wrapper stabile, microtransizioni e coordinamento Base UI, con eliminazione completa del movimento decorativo quando richiesto.

**Vincoli da preservare:** accesso e relativi componenti invariati; nessuna modifica a html/body per il tema; identità dei provider applicativi; focus Base UI; URL, auth, logout e disponibilità delle sezioni; nessuna composizione operativa nuova nelle pagine future.

**Risultato conclusivo e criteri di completamento:**

- Dark di default e light completo, ripristino locale definito e controllo disponibile su mobile.
- Shell e portal condividono token e font; il diff non introduce default Admin nel login.
- Sidebar estesa/compatta e mobile, header e dieci pagine future hanno il trattamento definitivo.
- Ogni proprietà animata ha un solo responsabile; pathname è l’unico trigger del fade; query, tema e dati non provocano fade o rimontaggi.
- Manifest e lockfile mantengono la versione Motion esistente senza aggiornamenti generali.

**Prompt breve per Codex:**

> Applica esclusivamente STEP 1 di apps/admin/DESIGN.md: token dark/light circoscritti, provider e portal Admin, selettore tema, shell/sidebar/heading, pagine “Presto in arrivo”, componenti base e Motion. Mantieni login, logica e URL invariati. Non anticipare le composizioni operative degli step successivi. Concludi con revisione del diff rispetto ai criteri dello step; non eseguire test, lint, typecheck, browser, servizi, build o deploy.

### STEP 2 — Home: indicatori, grafici, azioni rapide e attività

**Obiettivo e componenti:** completare visivamente la Home con la composizione della sezione 6. Coinvolge `HomeKpis`, `HomeQuickActions`, `HomeChartPanel`, `HomeCharts`, `HomeActivity` e gli stili condivisi di `AuditSummaryTable` utilizzati dalla Home.

**Quattro interventi concreti:**

1. Comporre i quattro KPI nelle griglie previste, applicare stato selezionato/focus e mantenere “Profitti totali: Non disponibile” con la gerarchia tipografica stabilita.
2. Disporre le azioni rapide nella fascia compatta sotto i KPI, mantenendo ordine, destinazioni, disabilitazioni e badge “Presto”.
3. Completare i due pannelli grafici con rapporto 2:1 desktop e impilamento responsive: palette, assi, legenda, tooltip, tabelle accessibili e note sui dati, senza modificare serie o calcoli.
4. Disporre l’attività a tutta larghezza, usare lo stile condiviso della tabella e conservare le ultime cinque operazioni; completare gli stati e gli aggiornamenti separati di indicatori, grafici e attività.

**Vincoli da preservare:** selezione KPI e risultati attuali; disponibilità dei profitti; tre ambiti di aggiornamento; aggregazioni, categorie, interpolazione, periodi, popolazioni e limiti; azioni rapide future; collegamento al registro e configurazione Home della tabella.

**Risultato conclusivo e criteri di completamento:**

- Ordine e proporzioni della Home corrispondono alla sezione 6 in entrambi i temi.
- Tutti e tredici i token grafico sono utilizzabili; l’associazione delle serie rimane invariata.
- Legende, tabelle accessibili, note e messaggi non vengono tagliati o sostituiti con tooltip esclusivi.
- Nessun nuovo trend, confronto, importo, filtro, refresh globale o animazione dei dati; i controller restano invariati.
- Gli stili condivisi della tabella sono riutilizzabili dal Registro, senza alterarne il comportamento.

**Prompt breve per Codex:**

> Applica esclusivamente STEP 2 di apps/admin/DESIGN.md ai componenti Home. Completa KPI, azioni rapide, grafici e attività con i token e i layout già definiti. Preserva controller, dati, selezioni, aggiornamenti separati, “Non disponibile” e azioni “Presto”. Non implementare Annunci o Registro. Concludi con revisione del diff; non eseguire test, lint, typecheck, browser, servizi, build o deploy.

### STEP 3 — Annunci, Registro attività, dettagli, conferme e completamento degli stati condivisi

**Obiettivo e componenti:** completare tutte le superfici operative rimanenti e chiudere il refactoring visivo. Coinvolge `AnnunciWorkspace`, `AnnouncementDetailContent`, `ModerateActions`, `ModerationDialog`, `AuditWorkspace`, `AuditSummaryTable`, `AuditDetailContent` e i componenti condivisi degli stati.

**Cinque interventi concreti:**

1. Completare ricerca, quattro filtri, toolbar, tabella e paginazione di Annunci con tutti i campi, overflow interno, esportazione della sola pagina corrente e creazione ancora disabilitata.
2. Applicare composizione e stili definitivi al dettaglio Annunci, alle dimensioni separate di stato/oscuramento/privacy/cestino, alle azioni di moderazione e alle conferme, mantenendo motivazioni, blocchi e messaggi.
3. Completare filtri espliciti, ricerca operatore, tabella e paginazione del Registro; utilizzare lo stile condiviso con la Home e conservare provenienza ed Europe/Rome.
4. Completare il dettaglio Audit in sola lettura e la presentazione di identificativi, variazioni, motivazione, correlazione ed esportazione; applicare le regole comuni di Sheet, focus e contenuti lunghi.
5. Completare in tutte le schermate i trattamenti condivisi di focus, hover, disabled, loading, empty, error, dati incompleti, “Non disponibile” e “Presto”, risolvendo nello stesso intervento le incoerenze residue di tema, densità e responsive.

**Vincoli da preservare:** ricerca Annunci con invio esplicito e filtri con comportamento attuale; filtri Audit con applicazione e ripristino espliciti; trenta risultati/eventi massimi secondo i comportamenti attuali; CSV limitato alla pagina; azioni, autorizzazioni, conferme e validazioni attuali; sola lettura dell’Audit; tutte le informazioni e la semantica accessibile.

**Risultato conclusivo e criteri di completamento:**

- Annunci e Registro mantengono campi, colonne, azioni e comportamenti dell’inventario; la revisione del diff non mostra modifiche di dominio o richieste.
- Tabelle e dettagli conservano tutti i contenuti su mobile; lo scorrimento orizzontale rimane interno alle tabelle.
- Sheet, menu, tooltip, selettori e conferme condividono il tema attivo; l’accesso resta fuori dal sistema Admin.
- `AuditSummaryTable` ha un solo stile coerente tra Home e Registro; aggiornamenti e configurazioni restano separati.
- Tutti gli stati della sezione 9 sono conclusi in dark e light; le dieci sezioni future mantengono il trattamento unico e nessuna nuova funzione.
- Il refactoring visivo è completo. Questo step include il completamento finale e non lascia una fase successiva di polish, audit, testing, ottimizzazione o backlog.

**Prompt breve per Codex:**

> Applica esclusivamente STEP 3 di apps/admin/DESIGN.md: completa Annunci, Registro, dettagli, moderazione, conferme e tutti gli stati condivisi. Mantieni ogni campo, colonna, messaggio, autorizzazione e comportamento, inclusi CSV della pagina, invii espliciti, Europe/Rome e sola lettura Audit. Risolvi qui le incoerenze visive residue e chiudi il lavoro, senza una quarta fase. Concludi con revisione del diff; non eseguire test, lint, typecheck, browser, servizi, build o deploy.



