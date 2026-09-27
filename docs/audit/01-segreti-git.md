# Punto 1 — Segreti, dati nei file e tracciamento Git

## 1. Obiettivo e ambito

Verificare credenziali hardcoded, variabili pubbliche, protezione dei file env e presenza di log/dump con dati sensibili. Analisi del **2026-09-25**, commit **`c2d2ab582ef2f2442871fbdab57fffecc8460236`**, usando la [mappa del Punto 0](00-mappa-codebase.md#38-variabili-dambiente-e-integrazioni).

All'avvio nessuna modifica ai file tracciati; master e mappa erano già presenti come file non tracciati. Valori sensibili elaborati soltanto in memoria, senza stamparli, salvarne copie o usarli per chiamate ai servizi.

## 2. File e aree analizzate

- `.gitignore`, `supabase/.gitignore`, `.env.local` (solo nomi, righe e classificazione dei valori nel risultato), `package.json`, `next.config.ts`, `.ai/mcp/mcp.json`.
- `src/lib/supabase/`, `src/lib/site-access.ts`, `src/features/pubblica-annuncio/server/stripe-checkout.ts`, `src/app/api/stripe/webhook/route.ts` e riferimenti alle variabili censite nel Punto 0.
- Ricerche per pattern di credenziali in sorgenti, configurazioni, SQL, test, documentazione e file testuali pubblici; lettura mirata delle corrispondenze.
- Artefatti browser esistenti in `.next/static/`, `.next/dev/static/` e log `.next/dev/logs/next-development.log`; nessuna nuova build.
- Indice Git, regole ignore, hook locali e nomi dei percorsi sensibili nelle revisioni raggiungibili dai riferimenti Git locali.

**Copertura:** 523 file tracciati; ricerca di pattern con `rg` su 487 file e confronto esatto delle cinque credenziali private locali su 488 file testuali tracciati e 1.415 artefatti browser. Ricerca email su 443 file testuali applicativi/configurazioni/documenti, con revisione delle corrispondenze. Repository non shallow, 47 commit raggiungibili localmente: controllati i nomi storici di file env, log, dump, CSV, chiavi e backup, non il contenuto completo di ogni commit. Scanner dedicati Gitleaks/TruffleHog non rilevati; nessuna installazione.

## 3. Findings per severità

**Esito:** un finding medio e un miglioramento facoltativo. Nessuna esposizione di credenziali confermata nel perimetro verificato; nessun finding critico o alto confermato.

### 🟡 01-F01 — Configurazione locale predisposta per Stripe live

**Confermato:** `.env.local:8` contiene una chiave server Stripe di tipo live, non una chiave sandbox. Snippet oscurato: `STRIPE_SECRET_KEY=<redatto: tipo live>`. Il client usa direttamente questa variabile in `src/features/pubblica-annuncio/server/stripe-checkout.ts:79`: `const secretKey = process.env.STRIPE_SECRET_KEY`.

**Impatto:** se valida, la chiave consente ai flussi Stripe avviati da questo ambiente di operare in modalità live. È un rischio di uso dell'ambiente durante sviluppo o verifiche; la validità della chiave e l'esecuzione di operazioni reali non sono state testate. Il file risulta ignorato e la chiave non è stata trovata nei file tracciati o nei bundle esaminati.

**Azione consigliata:** usare credenziali sandbox per lo sviluppo ordinario e rendere esplicito qualsiasi utilizzo locale del live. Nel punto 5 definire i permessi necessari per valutare una chiave con permessi limitati. La raccomandazione segue le [indicazioni Stripe sulla gestione delle chiavi](https://docs.stripe.com/keys-best-practices), consultate il 2026-09-25.

### 💡 01-F02 — Rendere ripetibile il controllo dei segreti prima del commit

**Confermato nel repository locale:** non risultano configurazioni versionate per Gitleaks/TruffleHog, pre-commit o workflow di scansione; nessun hook locale attivo rilevato e nessun `core.hooksPath` configurato. `package.json:5` elenca gli script applicativi, fra cui `"lint": "eslint"`, senza un controllo dedicato alle credenziali.

**Impatto:** il controllo svolto fotografa questo stato del workspace; il repository non documenta un controllo automatico riproducibile per i commit futuri. Eventuali protezioni del provider Git restano non verificate.

**Azione consigliata:** aggiungere in una fase successiva una scansione dei file in staging e in CI, con output oscurato e gestione esplicita delle fixture. Anche Stripe raccomanda un [controllo prima del commit](https://docs.stripe.com/keys-best-practices#protect-secret-api-keys). Miglioramento preventivo, non evidenza di una fuga di dati.

### Riscontri senza finding

| Controllo | Evidenza ed esito |
|---|---|
| File env e Git | `.gitignore:34`: `.env*`; `:35`: eccezione `!.env.example`. `git check-ignore -v` conferma l'esclusione di `.env.local`; nessun env tracciato e nessun file tracciato nonostante le regole ignore. La ricerca dei nomi storici sensibili non ha restituito percorsi. |
| Variabili pubbliche | In `.env.local:1`, `:2`, `:13`, `:14`: URL sito, flag manutenzione, URL Supabase e chiave publishable. Nessuna credenziale privata sotto `NEXT_PUBLIC_` individuata. `src/lib/supabase/client.ts:8` usa `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, coerente con l'uso browser delle [chiavi pubblicabili Supabase](https://supabase.com/docs/guides/getting-started/api-keys). |
| Chiavi server | `src/lib/supabase/admin.ts:1` e `src/features/pubblica-annuncio/server/stripe-checkout.ts:1`: `import "server-only"`. `SUPABASE_SECRET_KEY` è letta in `admin.ts:9`; il secret webhook in `src/app/api/stripe/webhook/route.ts:19`. Nessuna copia delle cinque credenziali private locali nei file tracciati o negli artefatti browser confrontati. |
| Credenziali hardcoded | Nessun valore confermato per i pattern di chiavi Stripe/Supabase, JWT, chiavi private, token comuni e URL di connessione con password. Le 24 corrispondenze generiche erano fixture, messaggi/UI o riferimenti `env(...)`, per esempio `supabase/config.toml:101` e `tests/auth-email-flow.test.mjs:79`. La configurazione MCP Stripe contiene solo un URL, senza userinfo, query, header o env di autenticazione. |
| SMTP | Nessuna credenziale SMTP Aruba individuata nelle fonti esaminate. `supabase/config.toml:254` contiene soltanto l'esempio commentato `# pass = "env(SENDGRID_API_KEY)"`; la configurazione SMTP hosted non è leggibile dal repository. |
| Dati nei file | Nessun log/dump/CSV/backup o file di chiave tracciato individuato dai filtri di percorso. Le email rilevate sono contatto pubblico, esempi, placeholder o fixture; nessun elenco di indirizzi utente individuato. Nel log locale controllato non sono emerse chiavi riconosciute o corrispondenze ai pattern dei token nelle URL. |

La verifica delle variabili pubbliche usa anche la guida della versione Next installata: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:154`. La distinzione tra credenziali server e publishable non certifica le autorizzazioni RLS, previste nel punto 3.

## 4. Checklist azioni

### Eseguibili da agente AI

- [ ] **01-F01:** nel punto 5 definire i permessi Stripe richiesti e proporre una configurazione che renda esplicito l'uso del live in locale.
- [ ] **01-F02:** nella futura fase di implementazione aggiungere un controllo dei segreti sui file in staging e in CI, con redazione dei valori e fixture identificate.

### Da fare manualmente dall'utente

- [ ] **01-F01:** confermare se l'uso locale del live è intenzionale; per lo sviluppo ordinario configurare chiavi sandbox e relativi prezzo/webhook.
- [ ] **01-F02:** verificare le protezioni di secret scanning/push protection del provider Git e attivarle se disponibili e appropriate.
- [ ] Per i punti 3 e 11 confermare quale progetto Supabase è usato in locale e il provider SMTP effettivo, senza condividere i valori delle credenziali nei report.

Non è richiesta una rotazione per un'esposizione accertata da questo audit: non ne è stata confermata alcuna.

## 5. Domande aperte e limiti

- L'uso della chiave live locale è intenzionale per attività controllate? Prefisso e configurazione sono verificati; validità, permessi effettivi e log dell'account Stripe no.
- L'URL Supabase locale indica un progetto hosted; la sua funzione di sviluppo/staging/produzione resta da confermare.
- La cronologia è stata controllata per i nomi di percorsi sensibili. Non è una scansione integrale dei blob storici, di commit irraggiungibili, reflog, copie esterne, log CI o deploy. Non sono emersi indizi che richiedessero di estendere questa sessione a quei contenuti.
- Gli artefatti locali non provano il contenuto del deploy attuale. La scansione testuale non certifica l'assenza di segreti offuscati o di dati incorporati nei metadati delle immagini; i pannelli hosted e le credenziali SMTP non sono stati consultati.

## 6. Stato finale e collegamento successivo

**Completato il 2026-09-25.** Report basato su controlli statici, indice/storico dei percorsi Git e artefatti già presenti. Nessun test applicativo, build o operazione sui servizi; nessuna correzione implementata.

Prossimo: **Punto 2 — Sicurezza server, autenticazione e rate limiting**, report previsto `02-sicurezza-server-auth.md`, ancora **Da fare**. Riprendere dal [master](AUDIT-MASTER.md#tabella-di-stato).

