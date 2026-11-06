# Rifinitura unslop della dashboard Admin

Intervento concluso nei sorgenti. Solo presentazione della dashboard autenticata;
Login escluso. Conservati Roboto/Roboto Mono, palette, light/dark, ordine delle
sezioni e funzionalità. Nessuna nuova migrazione SQL per questa rifinitura.

## Audit e direzione

La struttura esistente richiedeva una rifinitura mirata:

- Home: saluto generico, titoli e numeri troppo marcati, valori delle legende
  mescolati alle etichette, note dei grafici poco distinte dal contenuto.
- Navigazione: pesi dei caratteri, distanze dei gruppi e contorni attivi più
  evidenti del necessario.
- Registro: gerarchia dei filtri e dei risultati diversa da Annunci, pulsante
  dettagli lungo rispetto alla colonna, allineamenti e distanze incoerenti.
- Stati condivisi: testo informale e promessa temporale nelle sezioni future,
  titoli e icone non uniformi rispetto ai pannelli operativi.

Prodotto: console per gestire la bacheca del calcio dilettantistico.
Carattere: operativo, sobrio, preciso.
Mondo: redazione sportiva.
Momenti: indicatori, grafici e contenuti reali.
Firma: stati e risultati leggibili, motivi espliciti dei blocchi.

## Passaggi applicati

1. **Spaziatura:** distanza fra gruppi della sidebar 24 px e fra etichette e link
   8 px; righe desktop 36 px, target mobile conservati a 44 px. Compattezza e
   distanze dei KPI, filtri del registro e righe delle tabelle uniformate.
2. **Colore:** conservati i colori semantici e i temi; eliminate le ombre delle
   card dark. Il link attivo usa una superficie neutra e un segno laterale;
   i pulsanti ghost disabilitati non competono con le azioni disponibili.
3. **Icone:** Lucide con tratto 1.5, allineamento dei KPI corretto, rimosse le
   icone decorative dai titoli di pagina; icone funzionali conservate.
4. **Testi:** Home diventa “Panoramica della bacheca”; sezioni future con stato
   esplicito; azioni del registro più brevi e coerenti con Annunci.
5. **Tipografia:** titoli e valori prevalentemente a peso 500, etichette e
   metadati 12/16 px, numeri con spaziatura normale e cifre tabulari.
6. **Layout:** conteggio degli eventi nella pagina accanto al titolo del registro;
   colonne delle tabelle riequilibrate; legende con etichetta e valore separati.
7. **Dettagli:** stati vuoti e informativi, pannelli, popup e controlli condividono
   le stesse regole. Restano focus visibile, testo accessibile, scorrimento delle
   tabelle e scrollbar nascosta nella sidebar compatta.
8. **Contenuti visivi:** grafici e indicatori reali conservati; valori delle
   legende allineati a destra, metadati raggruppati. Nessun asset decorativo generato.
9. **Movimento:** conservate le transizioni brevi già presenti e il rispetto di
   reduced motion; nessuna nuova animazione o dipendenza.

## Consegna

Solo lettura dei sorgenti e revisione statica del diff. Nessun test, browser,
lint, typecheck, build, server, deploy o accesso a servizi remoti.
Resa visiva e comportamento runtime non verificati dall'agente.

Questa rifinitura richiede soltanto il deploy Admin. La migrazione per i blocchi
di moderazione di Annunci resta quella già documentata in
[annunci-ui-moderazione.md](annunci-ui-moderazione.md), senza nuove dipendenze SQL.

Metodo: **unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0**.
