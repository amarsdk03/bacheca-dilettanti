# Dati dei codici invito per la futura dashboard

La dashboard amministrativa è un'applicazione separata. Il sito salva i dati necessari in Supabase:

- `public.utente.codice_invito`: codice stabile del singolo account registrato. È `NULL` per gli account non ancora registrati.
- `public.invito`: una riga per invitato, con `uuid_invitante`, `uuid_invitato`, `codice_invito` usato, `registrato_il`, `confermato_il` e `considerato`.
- `considerato` parte da `false` e può diventare `true` solo dopo la verifica email. Il sito non lo modifica.

La dashboard deve mostrare solo le righe con `confermato_il IS NOT NULL`. Può collegare entrambi gli UUID a `public.utente.utente_uuid` per leggere le email degli account. Per ogni invitante, il totale degli invitati è il numero di righe confermate; il totale ancora da valutare filtra inoltre `considerato = false`. Il conteggio mostrato nel sito include anche gli inviti già considerati.

La tabella `invito` non concede accesso diretto ai client `anon` e `authenticated`. Il backend della futura dashboard dovrà autorizzare i propri operatori e usare credenziali server con i soli privilegi necessari. Non esporre la chiave `service_role` nel browser.

Applicare la migrazione dei codici invito prima di distribuire la versione del sito che legge `utente.codice_invito` e `invito`.
