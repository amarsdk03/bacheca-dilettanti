# Step 16 — Chiusura dello sviluppo e consegna finale

**Stato:** Concluso — sviluppo e collaudo locale.

**Chiusura:** 28 ottobre 2026.

**Modello consigliato:** 6.1 Sol, high.

[Master](../../master_plan.md) · [Step 16](README.md) ·
[Matrice V01–V20](matrice-verifiche.md) · [Runbook](runbook-rilascio-recupero.md).

## Decisione dell'utente e perimetro concluso

L'utente ha confermato di aver ridistribuito Web e Admin e ha accettato le
ultime verifiche live. Questa è **accettazione su conferma dell'utente**,
distinta dai test eseguiti dall'agente. I trenta controlli reali di IN03 e le
altre evidenze storiche conservano risultati, date e limiti originali.

L'utente ha scelto esplicitamente **Chiusura sviluppo**: sviluppo e collaudo
sono conclusi; attivazione cestino, job Cron/retention e prova completa di
ripristino restano operazioni manuali separate, senza bloccare la consegna.
Non sono dichiarate eseguite, non sono state attivate e non aprono nuovi step.

**Tutti i test futuri dell'agente sono soltanto locali**, con fixture e servizi
sintetici. Non sono stati contattati Vercel, Supabase o altri servizi remoti
per test. Il controllo HTTP usa una copia senza file env reali; anche la
verifica finale dei tipi è ripetuta nella copia isolata con env sintetico.
La regola è registrata anche nelle istruzioni della repository.

## Favicon e manifest Admin consegnati

- Copiati identici dalla Web i sei file ICO/PNG: favicon, 16×16, 32×32,
  Apple Touch Icon 180×180 e Android 192×192/512×512, nella public Admin.
- Aggiunto manifest statico: nome Dashboard Admin | Bacheca Dilettanti,
  nome breve Bacheca Admin, descrizione dell'area amministrativa, lingua it,
  id/start/scope /, display standalone, tema e sfondo bianchi.
- Il manifest usa i PNG Android con dimensioni effettive, senza duplicare
  il logo 1254×1254 sotto etichette di dimensioni diverse.
- Metadata HTML collegati a manifest e icone; titolo e noindex conservati.
  Proxy escluso soltanto per i nomi esatti degli asset, senza bypass generici
  per JSON/PNG e senza alterare le guardie delle pagine o API.
- Nessun duplicato app/public di favicon nella dashboard. Nessuna modifica
  ai file o al manifest della Web, nessun service worker aggiunto.

## Verifiche locali eseguite

| Verifica | Esito |
| --- | --- |
| Typecheck Admin: Next typegen e tsc | Riuscito, anche nella copia isolata senza env reali |
| ESLint dei due sorgenti Admin modificati | Riuscito, zero errori e avvisi |
| Identità dei sei asset copiati | SHA-256 uguali agli originali Web |
| Manifest | JSON valido, riferimenti esistenti e dimensioni PNG corrette |
| HTTP locale degli asset e manifest | Sette risposte 200, Content-Type corretti, corpi identici ai file sorgenti |
| HTML locale del login | Link manifest/favicon/Apple presenti e noindex conservato |
| Esclusioni del proxy | Asset nominati esclusi, API e nomi simili ancora inclusi |
| Asset con cookie Auth sintetico valido | Zero richieste al servizio Auth locale |
| Accesso anonimo alle rotte protette | Annunci torna al login, API Home restituisce 403/denied |
| Isolamento e pulizia | Copia app senza env reali, fixture Auth loopback, processi di test fermati |

Il controllo HTTP è stato eseguito su una copia isolata con gli helper locali
esistenti. Nessun nuovo test unitario che duplichi l'implementazione, nessuna
build di produzione aggiuntiva o ripetizione della regressione generale per
questa modifica agli asset. Evidenza in
.local/dashboard-integration/admin-branding-local-report.json (ignorata da Git).

## Operazioni manuali separate e stato reale

| Operazione | Stato / procedura |
| --- | --- |
| Ultimo push e redeploy Admin | Necessari per pubblicare i favicon/manifest appena aggiunti; non eseguiti dall'agente |
| Cestino | Ultimo gate verificato disabilitato; eventuale attivazione secondo runbook §8.1 e relativi prerequisiti |
| Retention audit/Cron | Attivazione e prima esecuzione pianificata non attestate; procedura runbook §8.2 |
| Backup aggiornato e prova di ripristino | Copia M02 leggibile verificata; restore completo non provato, da eseguire in destinazione separata secondo runbook §3/§9 |

Questa chiusura non abilita le operazioni né cancella i loro prerequisiti.
Non occorrono nuove connessioni SQL o altri test live per la consegna dello
sviluppo concordata. Gli stati 03–16 e M07 sono chiusi nel perimetro dello
sviluppo; le vecchie liste di residui restano come cronologia e limiti.

**Esito: sviluppo e collaudo locale conclusi; pronto per il push e il redeploy
degli ultimi asset.** Nessun ulteriore step preparatorio aperto.
