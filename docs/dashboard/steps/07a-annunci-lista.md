# 07A — Contratti e lista Annunci

**Stato:** Concluso — milestone implementativa verificata con PGlite e trasporti sintetici  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 06 implementato e verificato; foundation autorizzazione 03A.

[Master](../master_plan.md) · [Step 07](07-annunci-dati.md)

**Integrazione M04 Conclusa il 25 ottobre 2026:**
[guida operativa](../integrazione/04-elenco-annunci.md) e
[controllo prima/dopo](../../../supabase/scripts/dashboard_admin_check_m04.sql)
pronti per Webapp Bacheca Dilettanti, `nsytraextbndfyprwzts`, Supabase Free.
M03 e copia manuale Free già acquisiti; migrazione 07A invariata.
**297 test mirati riusciti**, zero fallimenti/skip, inclusi sette nuovi test del
verificatore; lint riuscito. Report iniziale utente delle 18:52:10 UTC e finale
delle 18:55:18 UTC acquisiti: M01–M03 coerenti, 52 colonne corrispondenti,
tre oggetti M04 strutturalmente verificati contro zero iniziali. Confronto di
owner, grant, colonne, RLS, policy e privilegi effettivi: **10/10 tabelle identiche,
zero differenze**. Registro M04 Concluso, nessuna operazione manuale residua.
Nessuna esecuzione remota dell'agente; gateway e prove integrate restano distinti.

## Obiettivo

Lista server autorizzata, filtri e cursore con massimo 30 risultati. Rispettare
nome pubblico/anonimo e UUID applicativi; nessun dettaglio, contatto, media o
dato Auth. Permessi e paginazione verificati con PGlite; nessuna connessione reale.

## Implementazione

Migrazione generata con Supabase CLI 2.122.0:
[20261024120724_admin_announcement_list.sql](../../../supabase/migrations/20261024120724_admin_announcement_list.sql).
Inizialmente applicata e verificata in PGlite; installazione su Supabase
strutturalmente verificata dal report finale utente M04 del 25 ottobre 2026,
18:55:18 UTC, con protezioni delle dieci tabelle invariate rispetto al report iniziale.

La RPC pubblica `admin_list_announcements_v1(p_query jsonb default '{}')`
è `SECURITY INVOKER`. Il ponte privato `list_admin_announcements_v1` è
`SECURITY DEFINER`, owner `postgres`, `search_path` vuoto e fuso UTC fisso.
Prima della lettura richiede ruolo SQL originale `authenticated` e chiama una
volta `private.require_admin_context_v1()`: sessione attuale, email confermata,
mapping applicativo e `tipologia_utente` **esattamente `Admin`**, inclusi i
controlli temporali della foundation. Anche la chiamata diretta al ponte è
protetta. Esecuzione revocata a PUBLIC, `anon` e `service_role`; nessuna modifica
ai grant sulle tabelle, alle policy pubbliche o alle funzioni personali Web.

La feature è in `apps/admin/src/features/annunci/`:

- `contracts.ts` e `validation.ts`: filtri, DTO e validazione pura.
- `server/query-input.ts`: input server e codifica/validazione cursore.
- `server/response.ts`: controllo runtime e proiezione esplicita della risposta.
- `server/service.ts`: servizio testabile con client della sessione umana.
- `server/queries.ts`: lettura per rendering tramite client SSR senza cache dati.

La verifica dei claim è estratta in
`features/auth/server/session-claims.ts` e riusata dal contesto Auth esistente.
Il servizio Annunci chiama `getClaims()` e poi **una sola RPC funzionale**,
senza `admin_get_context_v1` aggiuntiva o richieste per riga. Non conserva
decisioni del ruolo fra operazioni. I tipi RPC sono aggiunti al solo schema
`public` di `packages/database/src/index.ts`; confronto/generazione sullo schema
completo ancora richiesti nell'ambiente integrato.

`getClaims()` può comportare traffico Auth/JWKS secondo il progetto: il conteggio
di una RPC riguarda il livello dati della lista, non tutto il traffico della
pagina, del proxy e delle guardie. I futuri ingressi Action/Route Handler dovranno
fornire al servizio un client con scrittura cookie, come previsto dallo step 05.

## Contratto della lista

Input: oggetto con sole chiavi `search`, `status`, `type`, `visibility`, `limit`,
`cursor`. Valori predefiniti: ricerca vuota, stato/tipologia non filtrati,
visibilità `all`, limite 30, cursore assente. Input errati restituiscono
`INVALID_QUERY`; sessione/ruolo negati `ACCESS_DENIED`; errori operativi
`ANNOUNCEMENTS_UNAVAILABLE` con ID di correlazione. Nessun messaggio SQL, token,
query o dato account nei log; una lista vuota è un risultato riuscito distinto.

- `search`: massimo 200 caratteri Unicode dopo trim, coerente fra JS e SQL anche
  per spazi Unicode. UUID completo: confronto esatto, normalizzato minuscolo.
  Altrimenti sottostringa del titolo senza distinzione maiuscole/minuscole;
  `%`, `_` e `\` sono letterali.
- `status`: `pubblicato`, `in_revisione`, `rifiutato`, `in_attesa_pagamento`, oppure
  `null` per nessun filtro. Undici tipologie note elencate nel contratto TS.
  Stati/tipi sconosciuti restano consultabili senza il relativo filtro.
- `visibility`: `all`, `shown` (`nascosto=false`), `hidden` (`true`), `unknown`
  (`null`). **Shown non significa pubblicato o pubblico**: stato, oscuramento e
  privacy sono indipendenti; i valori nulli non diventano automaticamente false.
- `limit`: intero da 1 a 30. Lookahead interno di un record per `hasMore`, mai
  esposto come trentunesima riga; nessun conteggio totale o offset.
- Ordinamento `creato_il DESC NULLS LAST, uuid DESC`, supportato dall'indice
  completo `annuncio_admin_order_v1_idx`, indipendente dall'indice del feed pubblico.
  Cursore keyset valido anche se la riga di riferimento viene eliminata.

Ogni riga contiene `id`, `title`, `type`, `status`, `hidden`, `private`,
`creatorId`, `createdAt`, `updatedAt`, `rowFingerprint` e `author` con
`profileId`, `userId`, `displayName`, `anonymous`, `available`. Tutti gli ID sono
applicativi: nessun UUID Auth, contatto account, media o payload di dettaglio.
Date UTC con sei cifre frazionarie; non passano attraverso una conversione che
perde i microsecondi. La risposta server è `{ items, hasMore, nextCursor }`.

Il cursore frontend è Base64URL canonico, massimo 4096 caratteri; **non è un
segreto o una prova di autorizzazione**. Decodificato contiene versione 1,
UUID, data originale o `null` e tutti i filtri normalizzati. JS e SQL verificano
forma, data e corrispondenza dei filtri; cambiando filtri va azzerato il cursore.
Il limite può cambiare senza invalidarlo. La paginazione segue i dati correnti,
senza promettere uno snapshot immutabile durante modifiche concorrenti.

Il nome autore usa soltanto i sottoprofili pubblicamente visibili pertinenti
alla tipologia, con una selezione deterministica per evitare duplicazioni della
lista. Per nominativi anonimi: «Giocatore», «Squadra», «Staff sportivo»,
«Arbitro»; non viene esposto il nome reale. Profili/sottoprofili mancanti,
oscurati o non risolvibili mostrano «Profilo non disponibile» e mantengono
l'annuncio. Un flag di anonimato sconosciuto non autorizza l'esposizione del nome.

`rowFingerprint` è MD5 della **sola riga base** con serializzazione nel fuso
fisso. È un confronto di modifica, non un token di sicurezza né una versione
completa delle relazioni. 07B deve definire il confronto del dettaglio prima
delle mutazioni dello step 09. Nessuna mutazione o audit delle semplici letture
è introdotto qui. La pagina Annunci resta provvisoria fino allo step 08.

## Verifiche del 2026-10-24

**218 test riusciti, zero fallimenti e skip:** 79 nuovi su DB/server e 139 di
regressione Auth, audit server, autorizzazione e confine Web/Admin.

```powershell
node --test tests/admin-announcements-database.test.mjs tests/admin-announcements-server.test.mjs
node --test tests/admin-auth-server.test.mjs tests/admin-audit-server.test.mjs tests/admin-authorization-database.test.mjs tests/admin-web-boundary.test.mjs
npm run typecheck:admin
npm run typecheck
```

Typecheck delle due app e lint mirato dei file modificati riusciti. Test su
codice TS effettivo con loader isolato; nessun env reale, trasporto remoto,
avvio server, build di produzione o Docker.

Coperti ACL/owner/search path, diniego anonimi/chiavi tecniche e utenti ordinari,
varianti di `Admin`, sessione revocata/scaduta, email non confermata, policy non
attestata, chiamate dirette e revoca al successivo accesso. La chiave tecnica
resta negata anche attraverso un wrapper privilegiato creato solo nella fixture.
Pagine da 30, date uguali e microsecondi, date nulle, cursore cancellato/alterato,
filtri associati, ricerca letterale/Unicode/UUID, undici tipologie, anonimato,
fallback, assenza di fanout, DTO extra rimossi ed errori redatti verificati.
Provato anche il passaggio reale risultato PGlite → DTO/cursore frontend → SQL.
Migrazione senza schema richiesto: errore e rollback senza oggetti parziali.

Misura indicativa su 12.000 annunci sintetici: `EXPLAIN (ANALYZE, BUFFERS)` della
scansione base ordinata con limite 31 usa `annuncio_admin_order_v1_idx`, restituisce
31 righe, 3 shared hit blocks, circa 0,090 ms nel processo PGlite. RPC completa
misurata nello stesso processo: circa 2,83 ms per 1 risultato e 2,14 ms per 30;
il livello server emette una sola RPC in entrambi i casi. Sono osservazioni
sintetiche, **non latenze di produzione o EXPLAIN dell'intera RPC**.

Residui obbligatori nello step 07 complessivo e nel gate 16: schema completo,
advisor/ACL effettivi e compatibilità tipi, JWT/Auth/PostgREST reali, traffico
end-to-end, piano interno della RPC e costi di filtri/ricerche selettive e
cursori profondi con statistiche rappresentative. Non aggiunto un indice
trigramma senza misure che lo giustifichino. L'indice ordinato viene creato
transazionalmente: misurare durata e lock sul target isolato prima del rilascio.

## Operazioni manuali di integrazione

Il percorso M04 nella guida collegata sopra è completato: report iniziale,
installazione strutturalmente verificata dal report finale e confronto delle
protezioni acquisiti. Nessuna operazione manuale residua M04; non riapplicare
la migrazione su questa installazione.
Le indicazioni sotto rimangono riferimento per i target isolati delle prove
integrate, senza riaprire M01–M04 o richiedere Docker nel percorso corrente.

Per continuare lo sviluppo non serve applicare SQL al progetto reale. La policy
dell'operatore e i file `.env.local` non sono stati letti o modificati.

1. Riprendere 03B nell'ambiente isolato locale/staging con dati sintetici:
   verificare destinazione, backup e baseline completa. Controllare cronologia
   e oggetti già presenti, senza `db push` indiscriminato o riapplicazioni della
   foundation dichiarata già presente sul reale.
2. Ordine previsto per gli oggetti ancora assenti: foundation
   `20261024095639_admin_authorization_foundation.sql` → audit
   `20261024104822_admin_audit_foundation.sql` → ponte audit
   `20261024110910_admin_audit_server_bridge.sql` → questa migrazione 07A.
   La lista dipende direttamente dalla foundation; audit/ponte restano necessari
   per il percorso di login completo. La baseline include le precedenti migrazioni Web.
3. Dopo verifica dei prerequisiti, applicare **una volta come operatore SQL
   `postgres`** l'intero file 07A tramite SQL editor/runner dell'ambiente isolato.
   È transazionale e notifica il reload dello schema PostgREST al commit.
   Non richiede chiave tecnica nel servizio di lettura né configurazioni nuove.
4. Verificare owner, `SECURITY INVOKER` del wrapper, `SECURITY DEFINER` del ponte,
   search path vuoto, indice, permessi effettivi e schema `private` non esposto.
   Confrontare grant/policy delle tabelle con la baseline e tipi RPC con lo schema.
5. Eseguire prove integrate con sessioni sintetiche, prima negati poi Admin
   autorizzato secondo le procedure 03B: non attestare automaticamente la policy
   reale. Verificare massimo 30, cursori, revoca e costi completi; completare il
   runbook 16 prima di qualsiasi rilascio.

Query di catalogo, come operatore nell'ambiente isolato verificato:

```sql
select n.nspname, p.proname, p.prosecdef,
  p.proowner::regrole as owner, p.proconfig, p.proacl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where p.proname in ('admin_list_announcements_v1','list_admin_announcements_v1');
select indexdef from pg_catalog.pg_indexes
where schemaname='public' and indexname='annuncio_admin_order_v1_idx';
select r.role_name,
  has_function_privilege(r.role_name,'public.admin_list_announcements_v1(jsonb)','EXECUTE') as wrapper,
  has_function_privilege(r.role_name,'private.list_admin_announcements_v1(jsonb)','EXECUTE') as bridge
from (values ('anon'),('authenticated'),('service_role')) r(role_name);
```

Atteso: solo `authenticated` con EXECUTE su entrambe; il permesso di esecuzione
resta subordinato ai controlli interni della sessione/ruolo Admin.

### Recupero

Errore prima del commit: `ROLLBACK` se la sessione resta in transazione fallita;
correggere baseline/prerequisito e ripetere la prova isolata. Non aggiungere
grant sulle tabelle o rimuovere l'autorizzazione per aggirare un errore.
Dopo applicazione riuscita correggere con una nuova migrazione verificata,
conservando dati e foundation. Per sospendere soltanto la nuova lettura, come
`postgres` sul target verificato:

```sql
revoke execute on function public.admin_list_announcements_v1(jsonb) from authenticated;
revoke execute on function private.list_admin_announcements_v1(jsonb) from authenticated;
```

Non revocare globalmente `USAGE` sullo schema privato o alterare audit/Auth/Web.
Il ripristino dei due EXECUTE richiede correzione e prove riuscite. Tornare al
deploy precedente non annulla automaticamente la migrazione.

## Fonti

- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions).
- [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims).
- Guide Next.js installate: `node_modules/next/dist/docs/01-app/02-guides/data-security.md`.

## Prossimo step

[07B — Dettaglio Annunci](07b-annunci-dettaglio.md), **6.1 Sol, high**.
