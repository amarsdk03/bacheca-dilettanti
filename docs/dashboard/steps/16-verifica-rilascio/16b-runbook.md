# 16B — Runbook di rilascio e recupero

**Stato:** Concluso  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** 16A concluso; migrazioni e script esistenti disponibili per revisione.

[Master](../../master_plan.md) · [Step 16](README.md) · [Matrice](matrice-verifiche.md)

## Obiettivo

Preparare il [runbook operativo](runbook-rilascio-recupero.md) con destinatari,
ordine e verifiche delle migrazioni, configurazioni, attivazioni e recupero.
Questa consegna è documentale: nessun collegamento al progetto, applicazione
SQL, modifica di credenziali, avvio servizi o deploy.

## Accettazione

- Percorsi, firme e dipendenze verificati contro i file esistenti.
- Foundation già dichiarata applicata distinta da applicazione verificata;
  nessuna riapplicazione o riparazione automatica della cronologia.
- Policy sessioni, provisioning, gate cestino e retention separati dalle migrazioni.
- Configurazioni senza segreti, identificativi mancanti espliciti, backup e
  recupero coerenti con entrambe le app e con Storage.
- Prove locali 16A e verifiche integrate/browser mancanti mantenute distinte.

## Risultati

Consegnato il **25 ottobre 2026**. Il runbook include registro dei destinatari
ancora da confermare, backup DB/Storage, riconciliazione della baseline e della
foundation dichiarata applicata, dieci migrazioni ordinate, configurazione dei
due progetti Vercel, variabili senza valori, account dedicato/policy sessioni,
accettazione, attivazioni distinte, recupero e monitoraggio.

Verificati contro i sorgenti: nomi e ordine dei dieci file, transazioni,
`lock_timeout` di M07–M10, firme RPC, variabili del backend, opzioni cookie,
parametri e codici di errore degli script, nome/schedule e fuso della retention.
Controllati collegamenti Markdown e riferimenti alle sezioni; fonti ufficiali
Supabase/Vercel consultate per backup e monorepo. Nessuna disponibilità di host,
configurazione, applicazione o prova di recupero esterna dichiarata verificata.

I test applicativi **non sono stati rieseguiti** per queste sole modifiche
documentali: restano le evidenze 16A, **1.275 test riusciti, zero fallimenti/skip**,
con typecheck Web/Admin e CSS riusciti, e i limiti della matrice. Nessuna API,
dipendenza, migrazione o script eseguibile aggiunto/modificato; `.env.local` e
parametri già compilati dall'utente non letti per ricavarne credenziali o copiati.
Non sono stati eseguiti dev server, build, Docker, comandi SQL remoti o deploy.

16B è concluso come consegna del documento, non come esecuzione delle sue
procedure. Step 16 e gli step precedenti con residui restano **Da terminare**.

## Operazioni manuali e prossimo passaggio

Nessuna operazione manuale durante 16B. Il runbook prepara operazioni future,
non le esegue e non autorizza automaticamente un rilascio.

Prossimo: **completamento delle verifiche residue dello step 16**,
**6.1 Sol, high**. Non sono previste nuove funzionalità della prima versione.
