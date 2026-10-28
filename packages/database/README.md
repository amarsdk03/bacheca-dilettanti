# Tipi database condivisi

`@bacheca/database` espone il contratto Supabase esistente da `src/index.ts`:
`Database`, `Json`, helper delle tabelle, enum e `Constants`.

Non contiene client, credenziali o query. Le due app dichiarano una dipendenza
workspace e compilano il sorgente TypeScript tramite Next.js. Nella webapp
`@/server/supabase` resta un ingresso di compatibilità verso questo pacchetto.

Quando si rigenerano i tipi dallo schema approvato, aggiornare
`packages/database/src/index.ts`, evitando di sovrascrivere il file di
compatibilità Web. Verificare quindi `npm run typecheck` e
`npm run typecheck:admin` dalla root. L'estrazione nello step 02 non modifica
lo schema e non richiede migrazioni.
