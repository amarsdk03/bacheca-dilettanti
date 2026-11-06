# Annunci: interfaccia e correzioni di moderazione

Implementazione della rifinitura mirata concordata: Roboto nella dashboard autenticata,
Roboto Mono per i dati tecnici, filtri e tabella più compatti, stati e motivi di blocco
leggibili. Login escluso; palette e modalità light/dark conservate.

Direzione applicata con **unslop by Damir Sokolovsky
([@heydamir](https://x.com/heydamir)), CC BY 4.0**: console di moderazione sobria,
con il contenuto dell'annuncio in primo piano. Nessuna immagine generata o animazione aggiunta.

## Comportamento

- I percorsi immagine prodotti dal caricamento Web (`UUID/UUID/SHA256.jpg`, `.png`,
  `.webp`, con MIME coerente) sono descrittori Storage validi, non URL pericolosi.
  Non comportano più `INCOMPLETE_CONTENT`. La validazione avviene sia in SQL sia nel parser Admin.
- Il bucket `immagini_annunci` resta privato. Nessun download, URL firmato o accesso
  Storage viene aggiunto all'Admin. La validità del percorso non certifica l'esistenza del file.
- Il pulsante **Apri sul sito**, nel dettaglio, riutilizza la conferma dei collegamenti
  esterni e apre `/dettagli-annuncio?id=<UUID>` in una nuova scheda. È disponibile
  anche in revisione; per gli annunci nel cestino resta disabilitato con spiegazione.
  L'immagine viene servita esclusivamente dal percorso già esistente della Web.
- Il titolo personalizzato è opzionale: approvazione e rimozione dell'oscuramento
  non richiedono più `TITLE_REQUIRED`. Tutti gli altri controlli restano in vigore.
- Il campo aggiuntivo `displayTitle` riproduce il titolo pubblico di `announcementContent`
  per le undici tipologie, comprese le normalizzazioni di ruoli e figure. Il titolo
  originale resta separato e non viene modificato. Elenco, dettaglio, conferma e CSV
  usano il titolo di visualizzazione. La ricerca conserva il criterio attuale
  sul titolo personalizzato o UUID, come indicato nell'etichetta del campo.
- Un URL realmente non sicuro, un percorso non riconosciuto o un'anomalia del
  contenuto continuano a impedire l'approvazione. I motivi specifici compaiono
  anche accanto alle azioni e nel dialogo.

## Rilascio

1. Applicare prima `supabase/migrations/20261106180007_admin_annunci_media_titles.sql`
   tramite il consueto processo di migrazione. Contiene solo funzioni private e
   sostituzioni delle funzioni Admin esistenti, mantenendo autorizzazioni, fingerprint,
   pagamento, regioni, cestino e audit. Nessun aggiornamento ai contenuti salvati o alle policy Storage.
2. Per Admin, configurare facoltativamente **`NEXT_PUBLIC_WEB_URL`** con la sola origine
   della piattaforma, senza percorso/query/credenziali. In produzione il default è
   `https://www.bachecadilettanti.it`; in locale impostare `http://localhost:3000`
   (o l'origine del proprio servizio Web locale). Il valore pubblico è incorporato
   nella compilazione Next, quindi configurarlo prima del deploy.
3. Distribuire Admin. Non è richiesto un deploy Web.

## Verifica effettuata e limiti

Solo revisione statica dei sorgenti e del diff, inclusi percorsi/MIME validi,
destinazioni malformate, titolo assente/vuoto/personalizzato, regole delle undici
tipologie, autorizzazioni e collegamento esterno. Nessun test, typecheck, lint,
browser, server, build, query o migrazione su database eseguiti.

La migrazione non è stata applicata al progetto remoto. Le correzioni SQL diventano
operative dopo il rilascio descritto sopra; il funzionamento runtime e la resa
visiva non sono stati verificati dall'agente.
