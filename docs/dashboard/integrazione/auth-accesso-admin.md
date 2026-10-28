# IN02 — Auth, policy sessione e accesso Admin

**Stato:** Concluso.  
**Ultimo aggiornamento:** 2026-10-27, policy applicata e deroga una tantum verificata.  
**Modello consigliato:** 6.1 Sol, high.  
**Dipendenze:** [M10 verificata](10-home-dati.md), progetto `nsytraextbndfyprwzts` confermato.

[Master](../master_plan.md) · [Runbook, account e policy](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md#7-account-dedicato-e-policy-della-sessione-operazioni-distinte).

Pronti i prerequisiti Auth/PostgREST: runtime, attestazione della policy,
identità autorizzata con ruolo esattamente Admin e configurazione Data API
confermata dall'utente. La richiesta esplicita dell'utente del 27 ottobre
sostituisce, per la sola identità indicata, il requisito di creare un nuovo
account dedicato. Le prove reali di login, rinnovo, revoca e isolamento Web/Admin
restano il passo successivo; non sono attestate dalla chiusura IN02.
Il gate del cestino resta disabilitato; nessun Cron o rilascio avviato.

## Configurazione e policy applicata

La fonte dei valori Auth e degli schemi esposti è la trascrizione dell'utente
del pannello del progetto, non un'estrazione indipendente della Management API.

| Impostazione | Valore confermato | Riscontro |
| --- | --- | --- |
| Time-box user sessions | 0, never | `timebox_seconds=NULL`, disabilitato confermato |
| Inactivity timeout | 0, never | `inactivity_timeout_seconds=NULL`, disabilitato confermato |
| Single session per user | Disattivo | `single_session_per_user=false` |
| Access token expiry | 3600 secondi | È la scadenza JWT; nessun secondo valore richiesto |
| Rilevamento refresh token compromessi | Enabled | Protezione Auth mantenuta |
| Refresh token reuse interval | 10 secondi | Non è il timeout di inattività |
| Exposed schemas | `public, graphql_public` | `private` escluso nell'elenco confermato, gateway ancora da provare |

[Documentazione ufficiale sulle sessioni](https://supabase.com/docs/guides/auth/sessions).
La configurazione condivisa Auth del pannello non è stata modificata.

Applicato il [template policy invariato](../../../supabase/scripts/dashboard_admin_verify_session_policy.sql)
dopo consenso esplicito dell'utente. Rilettura MCP:
`verified_at=2026-10-27T10:40:38.206092+00:00`, durate NULL,
single-session false, unsupported settings false. Una sola riga coerente.
Il precedente rifiuto automatico per assenza di consenso è superato dal
consenso successivo e dall'applicazione verificata.

## Deroga autorizzata per l'identità esistente

Il controllo precedente aveva correttamente negato la promozione:
l'identità fornita era un Utente registrato, con profili e annunci.
L'utente ha poi richiesto espressamente di conservarla e promuoverla una sola
volta, anziché creare un nuovo account. UUID Auth e consenso sono conservati
nelle evidenze locali; nessuna password o chiave in documentazione.

**Sorgente:** [20261027104339_admin_existing_account_exception.sql](../../../supabase/migrations/20261027104339_admin_existing_account_exception.sql),
creato con CLI `migration new`, applicato tramite MCP al solo progetto
`nsytraextbndfyprwzts`. **Versione remota:** `20261027104542`,
nome `admin_existing_account_exception`. Non riapplicare e non usare come
provisioning generico su altri progetti.

La transazione:

1. Richiede operatore SQL senza claim JWT, policy attestata, identità Auth
   pronta, stato Utente registrato e definizione nota del trigger originale.
2. Blocca le scritture della tabella per la sola transazione e risolve la
   coppia UUID Auth/UUID applicativo già esistente.
3. Conserva `registrato_il` e introduce nel CHECK di registrazione una sola
   eccezione, vincolata a **entrambi** gli identificativi, con confronti
   null-safe e vincolo immediatamente validato. Nessuna esenzione per altri
   account, identità NULL o UUID ricollegati.
4. Consente il passaggio soltanto all'operatore e a quella coppia, aggiorna
   `tipologia_utente='Admin'` e `ultima_modifica_il`, poi ripristina
   esattamente la definizione originale del trigger prima del commit.
   Nessun trigger disabilitato e nessun grant aggiuntivo.
5. Verifica che gli altri campi dell'account e i conteggi dei suoi profili e
   annunci siano conservati. Un errore annulla schema e promozione insieme.

Rilettura MCP delle **10:46:26 UTC**, poi nuovo verificatore delle
**10:48:26 UTC**: una sola identità collegata, email confermata e account
attivo con ruolo esattamente Admin; registrazione, profili e annunci presenti;
vincolo validato e legato alla coppia corretta. Impronte dei tre controlli
account/proprietà/Web identiche a prima, trigger attivo, EXECUTE privato e
scrittura ordinaria del ruolo negati. Gate cestino falso.
La deroga al CHECK deve restare finché si conserva questo Admin registrato;
non è corretto ripristinare il vecchio CHECK lasciando una riga incompatibile.

Il [provisioning ordinario](../../../supabase/scripts/dashboard_admin_provision.sql)
resta invariato e richiede account dedicati per il futuro. Il trigger originale
continua a vietare nuove promozioni di account con contenuti. L'Admin promosso
resta escluso dalle funzioni personali della Web e dalla creazione di nuovi
profili/annunci personali. I contenuti storici conservano proprietario e dati.
Email e password Auth sono invariate; l'accesso Admin usa quelle credenziali.

## Runtime e limiti delle verifiche

`apps/admin/.env.local` è già configurato dopo autorizzazione esplicita:
soltanto URL, chiave pubblica e chiave server audit riutilizzati dalla Web.
File ignorato da Git e non tracciato, caricamento con `@next/env` verificato,
Web originale invariata e allowlist dei runner di test invariata.
Nessuna richiesta di rete con la chiave server per configurarlo.

Cookie distinti verificati nei sorgenti: Admin `bacheca-admin-auth-token`,
Web `sb-nsytraextbndfyprwzts-auth-token`, logout Admin con scope `local`.
La separazione con sessioni reali resta da provare, così come login,
audit backend, rinnovo e revoca via gateway.

**53 test PGlite riusciti, zero fallimenti/skip**, inclusi quattro test
aggiuntivi: conservazione completa dei dati sintetici, guardia/ACL ripristinati,
contesto Admin valido, dinieghi successivi, vincolo non trasferibile e
rollback completo dopo errore. Lint del nuovo file riuscito.
Advisor prima/dopo: **25 riscontri esistenti in cinque categorie, zero
riscontri aggiunti o rimossi** nel confronto delle finding identity.
Non sono stati corretti avvisi estranei al perimetro.

## Verificatore corrente ed evidenze

[dashboard_admin_verify_in02.sql](../../../supabase/scripts/dashboard_admin_verify_in02.sql)
è READ ONLY, limitato all'identità indicata e alle protezioni pertinenti:
eseguito via MCP con tutti gli esiti booleani veri. Impronte di routine
fissate alla definizione corrente di questo progetto. Non legge token,
non esporta email/contenuti e non imposta claim JWT.

M07–M10 restano checkpoint storici verificati. La nuova eccezione modifica
intenzionalmente il vincolo di una tabella: i vecchi confronti che richiedono
tutti i vincoli identici al checkpoint M10 possono segnalarla.
Non usarli per ripristinare M01, rieseguire M07 o rimuovere la deroga.
Per questa modifica usare il verificatore IN02 e le evidenze prima/dopo.

Evidenze ignorate da Git in `.local/dashboard-integration/`:
`in02-user-settings-20261027.json`, `in02-exception-before.json`,
`in02-exception-after.json` e rispettive risposte MCP,
`in02-exception-application.tool-response.json`,
`in02-exception-advisors-before.json`,
`in02-exception-advisors-after.json`, `in02-exception-tests.log`,
`in02-final-verification.json` e risposta MCP,
`in02-completion.json`. I report dei rifiuti e della diagnosi iniziale
restano storici, senza essere riscritti come applicazioni riuscite.
Un diagnostico troppo ampio è stato respinto: sostituito da verifiche
mirate approvate; nessuna esportazione del suo payload.

## Recupero e prossimo passo

Un errore prima del commit annulla sia la promozione sia il cambiamento del
vincolo. Un esito incerto richiede lettura dello stato e della cronologia;
il file rifiuta il replay su un account già promosso.

Per revocare il ruolo, un operatore autorizzato può riportare l'account a
Utente: il trigger originale lo permette e le operazioni Admin successive
sono negate. Per rimuovere anche l'eccezione al CHECK, prima demuovere
l'account, poi ripristinare nella stessa transazione il predicato originale
`tipologia_utente collate "C" is distinct from 'Admin' or registrato_il is null`.
Non cambiare registrazione o contenuti per far passare il vecchio vincolo.
Questa procedura di recupero non è stata eseguita.

**Operazioni manuali residue IN02:** nessuna; non serve un nuovo UUID.
**Prossimo step:** accettazione reale Auth/PostgREST e Web/Admin secondo il
[runbook §8](../steps/16-verifica-rilascio/runbook-rilascio-recupero.md#8-accettazione-e-attivazioni-finali).
Non avviato automaticamente. Nessun deploy, Cron, attivazione cestino o
ripristino incluso nella chiusura.
