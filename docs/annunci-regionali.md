# Annunci separati per regione

Implementazione del piano approvato il 2 novembre 2026. Le migrazioni e gli strumenti sono preparati nel repository; nessuna operazione remota è stata eseguita dall’agente.

## Comportamento

- Un invio in quattro regioni crea quattro annunci con UUID distinti. Due città della stessa regione restano nello stesso annuncio. Tutti i dettagli, gli snapshot del profilo, i contatti, i link e le immagini sono conservati.
- Il salvataggio del profilo, l’OTP, i consensi, la ricevuta idempotente e la quota anonima nelle 24 ore sono gestiti una volta per invio, richiamando una sola volta il writer esistente. L’intera operazione è transazionale.
- Ogni copia ha moderazione, visibilità, riservatezza, salvataggi, segnalazioni e manifestazioni d’interesse indipendenti. Le immagini condivise vengono rimosse dallo Storage solo quando nessun annuncio le referenzia, compresi quelli privati, nascosti e nel cestino.
- La ripetizione dello stesso invio restituisce le copie ancora esistenti e fuori dal cestino. Non ricrea le copie eliminate. Se tutte sono state eliminate, l’invio è consumato. Le ricevute di appartenenza sopravvivono alle cancellazioni.
- Le conferme mostrano numero di annunci, collegamenti regionali e stato di ogni copia. Restano supportati i vecchi URL con `?id=`. Il nuovo URL con `?publication=` è consultabile solo dal proprietario.
- La homepage mostra un rappresentante pubblico per invio, selezionato prima del limite di sei risultati. I contatori e la ricerca contano invece tutti gli annunci regionali. I suggerimenti escludono le copie dello stesso invio. I follower ricevono una sola notifica alla prima pubblicazione pubblica del gruppo; il proprietario riceve gli aggiornamenti delle singole copie.
- Sponsor: annuncio unico, senza aggiungere campi; il badge usa la sede della squadra quando univoca. Campi e impianti mantengono la singola sede prevista dal form. Il badge regionale compare solo sulle card di `/annunci`; resta anche la riga «Zona/e di ricerca».
- Per i professionisti, la revoca di una regione oscura la relativa copia con blocco amministrativo, conservando località e storico. Finché la regione è revocata, la copia non può essere resa pubblica. Il ripristino dell’autorizzazione non rimuove automaticamente il blocco. Il precedente comportamento di rimozione delle località resta valido per i record non ancora convertiti.

## Conversione dei dati preesistenti

L’UUID originale rimane sulla prima regione in ordine alfabetico; i link e le interazioni esistenti rimangono su quell’UUID. Le altre copie hanno UUID nuovi e nessuna interazione inventata. Date, stato, privacy, oscuramento amministrativo e cestino restano conservati. La conversione non genera notifiche o nuova attività del profilo.

Come concordato, gli annunci prioritari o collegati a una richiesta di pagamento vengono eliminati perché sono dati di test. Il criterio comprende `livello_annuncio = prioritario` oppure una ricevuta collegata tramite `announcement_id`/`requested_announcement_id` con visibilità prioritaria, sessione Checkout, PaymentIntent o `paid_at`. Le ricevute restano conservate con il collegamento cancellato secondo le FK esistenti: non vengono chiamati Stripe, rimborsi o altri servizi di pagamento. Un evento di pagamento tardivo non può ricreare l’annuncio.

Prima di ogni trasformazione/cancellazione, `private.regional_publication_backup` conserva una copia JSON del record, dei dettagli, dei contatti, delle località, dei media, delle interazioni e della ricevuta. Questa copia applicativa integra il backup completo del database e dello Storage: non sostituisce una procedura di ripristino.

## Rilascio in tre fasi

Non applicare tutte e tre le nuove migrazioni insieme con un rilascio automatico. Preparare artefatti distinti o usare il meccanismo esistente di applicazione selettiva e registrazione delle migrazioni. Le altre migrazioni precedenti devono già essere presenti, inclusa `20261101120000_profile_and_announcement_field_adjustments.sql`.

1. **Espansione**: applicare soltanto `20261102145910_regional_publication_schema.sql`. Aggiunge colonne nullable, strutture private e RPC. Il flag di pubblicazione regionale resta spento e i vecchi client `publish_announcement_v2` continuano a usare il writer preservato. La homepage può già usare il nuovo lettore che supporta anche gli annunci non convertiti.
2. **Web compatibile e manutenzione**: distribuire questa versione Web, poi bloccare pubblicazioni e modifiche/cancellazioni durante la conversione. Il nuovo invio v3, finché il flag è spento, restituisce il messaggio di manutenzione senza creare annunci. Eseguire l’inventario in `supabase/scripts/regional_publication_preflight.sql`, verificare lo scope dei dati di test da eliminare e acquisire un backup completo recuperabile del database e degli oggetti Storage. Risolvere regioni sconosciute o vuote prima di procedere. Applicare `20261102151000_regional_publication_backfill.sql`, che blocca le scritture della tabella e converte tutti i record, compresi quelli nascosti e nel cestino. Un errore annulla l’intera migrazione.
   Prima del backfill applicare `supabase/scripts/regional_publication_admin_legacy_fix.sql`: permette la copia dei soli annunci storici creati da Admin durante la transazione protetta, mantenendo il divieto per le altre scritture. Serve anche quando la migrazione di espansione è già stata applicata.
3. **Attivazione**: verificare i dati con le query sotto, poi applicare `20261102151100_regional_publication_activate.sql`. Installa gli invarianti differiti e attiva il writer regionale. I vecchi entry point v1/core non sono più eseguibili dai client; v2 delega a v3. Riabilitare il traffico di scrittura, invalidare le cache pubbliche e verificare i percorsi concordati tramite l’operatore del rilascio.

La migrazione non abilita il cestino Admin, non modifica la retention/Cron e non esegue una prova di ripristino completa. Queste operazioni restano separate. La conferma utente del 28 ottobre 2026 sui precedenti controlli live e redeploy rimane una conferma storica, distinta dai test locali dell’agente per questa modifica.

## Verifiche prima dell’attivazione

Le prime tre query devono restituire zero righe. Gli annunci senza località mantengono una regione nulla; gli sponsor restano senza località di ricerca.

```sql
select uuid from public.annuncio where gruppo_pubblicazione is null;

select a.uuid,a.regione_pubblicazione
from public.annuncio a left join public.localita_annuncio l on l.uuid_annuncio=a.uuid
group by a.uuid having count(distinct btrim(l.regione))>1
  or min(btrim(l.regione)) is distinct from a.regione_pubblicazione;

select a.uuid from public.annuncio a
where not exists(select 1 from private.regional_publication_item i
  where i.publication_id=a.gruppo_pubblicazione and i.announcement_id=a.uuid
    and i.region is not distinct from a.regione_pubblicazione);

select reason,count(*) from private.regional_publication_backup group by reason;
select gruppo_pubblicazione,count(*),array_agg(regione_pubblicazione order by regione_pubblicazione)
from public.annuncio group by gruppo_pubblicazione;
select enabled from private.regional_publication_release;
```

Confrontare con l’inventario iniziale, sottraendo gli annunci di test eliminati. Verificare su esempi originali e copie i dettagli specifici, città, media, contatti, date, privacy e blocchi. Le interazioni precedenti devono essere presenti solo sull’UUID originale.

## Pulizia delle sole immagini dei test eliminati

Dopo avere conservato il backup Storage, lo script seguente propone solo i percorsi presenti nei backup con motivo `remove_legacy_test_payment` e senza riferimenti attuali. Non carica file `.env`: l’operatore deve fornire esplicitamente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` del target di rilascio. Non stampare o salvare la chiave nei log.

```text
node scripts/regional-publication/cleanup-images.mjs
node scripts/regional-publication/cleanup-images.mjs --apply
```

Il primo comando è un inventario; il secondo rimuove gli oggetti. Ogni percorso viene ricontrollato immediatamente prima della rimozione; quelli ancora condivisi vengono conservati. URL esterni e percorsi anomali vengono saltati. La pulizia è ripetibile e non modifica ricevute o backup. Nessuna pulizia remota è stata eseguita durante l’implementazione.

## Recupero

Se la conversione fallisce, PostgreSQL annulla tutta la transazione: mantenere la manutenzione, correggere la causa e ripetere la fase. Se fallisce solo l’attivazione, mantenere i dati convertiti e ripetere quella fase dopo la correzione. Prima di ripristinare un backup completo, fermare tutte le scritture e applicare la procedura operativa di ripristino già documentata, inclusi gli oggetti Storage se rimossi.

Dopo l’attivazione non riaccorpare automaticamente gli annunci: possono già avere interazioni e stati diversi. Per un rollback applicativo mantenere il nuovo schema/writer e un Web compatibile con v2/v3, oppure lasciare la manutenzione fino a una correzione. Non spegnere semplicemente il flag ripristinando il writer singolo: gli invarianti attivi impedirebbero nuovi annunci non convertiti. Non eliminare ricevute, appartenenze permanenti o backup per sbloccare un invio consumato.

## Verifiche locali

I test SQL usano PGlite con dati sintetici, incluse le funzioni reali delle migrazioni Admin/moderazione/cestino; le suite di pubblicazione esistenti verificano separatamente il writer preservato. I test Web usano fixture e client simulati, senza credenziali o servizi remoti.

```text
node --test tests/regional-publication-database.test.mjs tests/regional-publication-web.test.mjs
npm run typecheck
npm run typecheck:admin
```
