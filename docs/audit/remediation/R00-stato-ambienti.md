# R00 — Stato ambienti e decisioni preliminari

**Stato:** In attesa approvazione. **Approvazione all'esecuzione:** non ancora ricevuta. **Data piano:** 2026-09-29. **Commit di riferimento:** `5f76766d21ac7e4ea7e8f71ab39fbfbabb14901d`. **Profilo consigliato:** GPT-6 Sol · medium · Default, per il confronto di configurazioni e metadati fra servizi.

## Obiettivo e risultati attesi

Raccogliere solo metadati e decisioni necessari a ordinare le correzioni dei [finding 01-F01](../01-segreti-git.md), [03-F02](../03-autorizzazioni-supabase.md) e [11-F03–F04](../11-gap-roadmap.md). A fine R00 devono esistere: confronto delle versioni delle migrazioni locali/remote, stato verificabile dei permessi delle tabelle esposte o elenco dei dati mancanti, responsabile della moderazione, provider SMTP identificato e modalità Stripe usata in locale/hosted. Nessuna migrazione o configurazione viene modificata in R00.

## Dati da raccogliere

### 1. Migrazioni Supabase registrate

Nel progetto **hosted corretto**, aprire **Dashboard → SQL Editor** ed eseguire questa query di sola lettura. Condividere le sole colonne `version` e `name`, per esempio con copia della tabella o CSV, senza `statements`, credenziali o record utente:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

Se la colonna `name` non è disponibile, usare `select version from supabase_migrations.schema_migrations order by version;`. In alternativa, se il progetto locale è già collegato al progetto corretto, `supabase migration list --linked` confronta file locali e storico remoto. Confrontare ogni `version` con il prefisso del nome dei **48 file** attualmente in `supabase/migrations/`, riportando `presenti in entrambi`, `solo locali` e `solo remoti`; identificare esplicitamente la migrazione Creator `20260928141148`. Non interpretare il timestamp nel nome come data effettiva di applicazione.

Lo storico prova quali versioni sono **registrate**, non certifica l'attuale schema né modifiche eseguite direttamente nel Dashboard. Differenze di storico o schema richiedono un piano separato di riconciliazione prima di creare/applicare migrazioni. Riferimenti: [CLI Supabase](https://supabase.com/docs/reference/cli/supabase-migration-list), [guida migrazioni](https://supabase.com/docs/guides/deployment/database-migrations).

### 2. Metadati RLS/permessi

Per il limite documentato in `03-F02`, chiedere un export **senza righe applicative** della configurazione delle tabelle `public` e `private`. Sono sufficienti come prima passata le seguenti query di sola lettura nel SQL Editor:

```sql
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'private')
  and c.relkind in ('r', 'p')
order by n.nspname, c.relname;
```

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname in ('public', 'private')
order by schemaname, tablename, policyname;
```

Confrontare tabella per tabella con la matrice del [Punto 3](../03-autorizzazioni-supabase.md), distinguendo policy assenti intenzionali, grant/viste/RPC ancora non osservati e differenze reali. Non dichiarare risolto `03-F02` dal solo flag RLS: se servono grant di colonne, definizioni RPC o policy Storage, registrarli come metadati ulteriori da ottenere nello stesso R00.

### 3. Decisioni e configurazioni esterne

- **01-F01, Stripe:** confermare solo se lo sviluppo ordinario usa `test/sandbox` o `live`, e se esistono ricevute/rimborsi da riconciliare nel progetto attivo. Non inviare chiavi, importi o dati cliente. Se esistono eventi attivi pendenti, proporre R03 prima di R02 nel master.
- **11-F03, moderazione:** identificare chi può approvare/rifiutare, in quale interfaccia (Dashboard, sistema esterno o procedura manuale), come sono tracciati motivazione, notifiche e rimborsi; verificare se esiste una coda operativa.
- **11-F04, SMTP:** annotare provider hosted (Aruba, Resend o altro), stato di configurazione di mittente/template/limiti e disponibilità di log; la sola configurazione non prova la consegna. Una prova su casella di test va concordata e registrata separatamente.

## Procedura dopo l'approvazione di R00

1. Registrare nel [master](../AUDIT-MASTER.md) approvazione esplicita e ambito; segnare `Approvato`, poi `In corso` con checkpoint prima della ricognizione.
2. Ricevere i risultati SQL e le risposte manuali; confrontarli con i 48 nomi di migrazione e con i report esistenti. Omettere dai documenti valori segreti e dati personali.
3. Nella sezione **Resoconto** qui sotto registrare per ciascun finding: osservazione, fonte/data, esito `Verificato`, `In attesa verifica` o `Rinviato`, e azione successiva. Separare migrazioni registrate, schema osservato e configurazione del servizio.
4. Chiudere come `Completato` solo se i criteri sopra sono soddisfatti; altrimenti lasciare `In verifica` con dati mancanti nominati. Fermarsi dopo R00. Nessuna applicazione remota, test che invia email, rimborso o correzione di dati rientra in questo pacchetto.

## Controlli e condizioni di chiusura

- [ ] Ogni versione locale è classificata rispetto allo storico remoto; eventuali versioni solo remote/locali sono elencate, senza presumere che siano da applicare.
- [ ] RLS e policy di `public`/`private` sono confrontate almeno al livello dei metadati sopra; limiti su grant, RPC e Storage sono espliciti.
- [ ] Responsabili/processo di moderazione, provider SMTP e uso Stripe live/test sono confermati oppure indicati come mancanti.
- [ ] La presenza di pagamenti/rimborsi da riconciliare determina l'ordine R02/R03 in modo documentato.
- [ ] Report e master indicano data, esiti, limiti e stato del pacchetto. Migrazioni create/applicate in R00: **0**; nessuna nuova da applicare manualmente.

## Resoconto dell'esecuzione

**Non iniziato.** Compilare solo dopo approvazione del piano R00 e ricezione dei dati necessari. Checkpoint attuale: piano pronto, nessuna query remota eseguita.
