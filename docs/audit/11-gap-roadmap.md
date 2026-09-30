# 11 — Gap funzionali, integrazioni e roadmap

## 1. Obiettivo e ambito

Confrontare categorie promesse e percorsi effettivi dalla selezione alla pagina pubblica; distinguere funzionalità attive, disabilitate e dipendenze operative. Analisi statica del commit `5f76766d21ac7e4ea7e8f71ab39fbfbabb14901d`, senza modifiche applicative né accesso al progetto hosted.

## 2. File/aree analizzate

- Modelli e wizard: `src/features/profilo/profile-model.ts`, `src/features/pubblica-annuncio/{publish-model.ts,PubblicaAnnuncio.tsx,components/AnnouncementDetailsForm.tsx,components/SelezionaTipologiaAnnuncio.tsx,server/validation.ts,server/actions.ts}`.
- Lettura pubblica: `src/features/annunci/{announcement-model.ts,announcement-content.ts,server/queries.ts,components/cards/AnnouncementCard.tsx,DettagliAnnuncioPubblico.tsx}`, `src/features/profili/server/queries.ts`.
- Integrazioni e flussi: `src/features/registrati/Registrati.tsx`, `src/features/profilo/{IlTuoProfilo.tsx,server/actions.ts}`, `src/features/homepage/components/HomepageWorkInProgressNotice.tsx`, `src/components/redirects/ComingSoon.tsx`, `src/features/{aggiornamenti/ShareButtons.tsx,segnalazioni/DetailActions.tsx}`, `src/app`, `supabase/config.toml`, `docs/supabase-auth-setup.md`.
- Persistenza e verifica: `supabase/migrations/20260824195350_publish_announcement_workflow.sql`, `supabase/migrations/20260928141148_refactor_profile_publication_fields.sql`, `tests/{announcement-cards,announcement-details}.test.mjs`. Test mirati: **37/37 pass**; coprono preview di 10 tipi e dettaglio pubblico dei 9 tipi ammessi, senza provare la pubblicazione hosted dei Creator. Modifiche preesistenti all'avvio: master modificato e `10-accessibilita.md` non tracciato; preservate.

### Matrice categorie

| Categoria annunci | UI e validazione | Persistenza locale | Visualizzazione pubblica | Esito |
|---|---|---|---|---|
| Giocatore | Sì | RPC e tabella dettaglio | Card e dettaglio | Percorso previsto |
| Squadra: cerca giocatore, staff, partita, sponsor | Sì, quattro sottotipi | RPC e quattro dettagli | Quattro card e dettagli | Percorso previsto |
| Staff sportivo; Arbitro | Sì | RPC e dettagli | Card e dettagli | Percorso previsto |
| Torneo/evento; Campi/impianti | Sì | RPC e dettagli | Card e dettagli | Percorso previsto |
| Creator | Sì | Supporto aggiunto dalla migrazione del 28 settembre | Escluso da query e renderer pubblici | **Gap 11-F01** |
| Professionisti e studi | Disabilitato | Componenti e tabella storici; nessun percorso di pubblicazione corrente | Filtro mostrato, risultati esclusi | **Roadmap 11-F02** |
| Ente sportivo/Società | Nessun tipo attivo distinto; componente `AziendeEnti` nel wizard storico | Nessuna mappatura corrente | Nessuna vista distinta | **Decisione di prodotto** |

La matrice descrive collegamenti nel codice, non conferma il funzionamento sul progetto Supabase hosted. Fonti di controllo incrociato: `publish-model.ts:24`, `publish-model.ts:36`, `validation.ts:230`, `validation.ts:319`, `announcement-content.ts:17`, `AnnouncementCard.tsx:13`.

## 3. Findings per severità

### 🟠 Alto

**11-F01 — Gli annunci Creator possono entrare nel flusso di pubblicazione ma non in quello pubblico.** `src/features/pubblica-annuncio/publish-model.ts:31` include `"creators"`; `:289` lo mappa a `"annuncio_creators"`. `src/features/pubblica-annuncio/server/validation.ts:319` lo valida e la migrazione `supabase/migrations/20260928141148_refactor_profile_publication_fields.sql:470` aggiunge il mapping nel core SQL. Tuttavia `src/features/annunci/announcement-content.ts:17` elenca solo nove tipi e `src/features/annunci/server/queries.ts:237`, `:610`, `:824` scartano gli altri anche se pubblicati. `src/features/annunci/components/cards/AnnouncementCard.tsx:13` e `src/features/annunci/DettagliAnnuncioPubblico.tsx:25` non hanno il caso Creator. **Impatto:** un annuncio Creator accettato e successivamente approvato non compare nella directory e il dettaglio pubblico restituisce non trovato; preview e scheda reale divergono. **Azione:** completare insieme modello, query, mapping dei dettagli, card, pagina dettaglio e test end-to-end, oppure sospendere esplicitamente la selezione Creator finché il percorso non è completo. Verificare prima che la migrazione sia applicata al progetto hosted.

### 🟡 Medio

**11-F02 — Lo sblocco a 20 profili è annunciato ma non implementato; Professionisti e studi resta disabilitato.** `src/features/pubblica-annuncio/components/SelezionaTipologiaAnnuncio.tsx:109` promette lo sblocco al raggiungimento di `PROFILE_DIRECTORY_UNLOCK_PROFILE_COUNT`; `src/features/profilo/profile-model.ts:98` fissa la soglia a 20, ma `:100-111` usa il flag statico `PROFILI_LIMITATI = true`. `src/features/profili/server/queries.ts:476`, `:544` esclude sempre il tipo limitato. Inoltre `src/features/registrati/Registrati.tsx:772` lo marca coming soon e `src/features/profilo/server/actions.ts:319` impedisce l'abilitazione. Il filtro annunci resta presente in `src/features/annunci/announcement-model.ts:230`. **Impatto:** la promessa in UI non corrisponde a una transizione automatica e il filtro può restare vuoto. **Azione:** decidere se la soglia sia una regola di prodotto; poi implementare una condizione misurabile e coerente in tutti i percorsi o correggere il testo/filtro e mantenere la categoria disabilitata. I componenti `AnnuncioProfessionistiStudi.tsx` e `AnnuncioAziendeEnti.tsx` sono raggiunti soltanto dal vecchio `components/DettagliAnnuncio.tsx`; il wizard corrente usa `AnnouncementDetailsForm` (`PubblicaAnnuncio.tsx:385`). Non considerarli feature pronta.

**11-F03 — La revisione annunci richiede un processo operativo da confermare.** `src/features/pubblica-annuncio/server/actions.ts:465` restituisce `"in_revisione"`; la migrazione `supabase/migrations/20260824195350_publish_announcement_workflow.sql:955` salva tale stato e `src/features/annunci/announcement-visibility.ts:2` espone in bacheca soltanto `"pubblicato"`. Le route in `src/app` non contengono una console di moderazione; la migrazione `supabase/migrations/20260911120000_priority_announcement_checkout.sql:559`, `:582` gestisce effetti dei passaggi a pubblicato/rifiutato ma non costituisce un'interfaccia di approvazione. **Impatto:** senza un'operazione esterna documentata, le nuove pubblicazioni restano in revisione; per quelle prioritarie il rifiuto tocca anche il flusso rimborso già analizzato al Punto 5. **Azione:** documentare e verificare sul progetto hosted chi può approvare/rifiutare, come registra motivazione e come controlla coda, notifiche e rimborsi; progettare una console solo se la gestione manuale non è adeguata. L'assenza di una console nel repo non prova l'assenza di un processo nel Dashboard.

**11-F04 — Provider SMTP e consegna delle email hosted non verificabili dal repository.** `supabase/config.toml:236-246` configura template locali; `:248-255` contiene solo un esempio SMTP commentato. `docs/supabase-auth-setup.md:100-120` richiede esplicitamente copia dei template e configurazione del provider nel Dashboard hosted. **Impatto:** signup, recupero password e OTP della pubblicazione dipendono da impostazioni e recapito non attestati dal codice; la precedente “fix Aruba” non è confermabile e la documentazione locale non dimostra quale provider sia attivo. **Azione:** controllare nel Dashboard provider, mittente, URL/template, rate limit e log di consegna; provare signup, recovery e OTP su caselle di test. Non registrare credenziali nel report.

### 🟢 Basso

**11-F05 — Il consenso newsletter è raccolto, ma l'invio non ha un percorso applicativo individuato.** `src/features/registrati/Registrati.tsx:896` offre l'opt-in; `src/features/profilo/server/actions.ts:504` salva `consenso_newsletter`; `src/features/profilo/IlTuoProfilo.tsx:920` permette di modificarlo. Nelle aree applicative mirate risultano lettura/scrittura della preferenza, senza job o endpoint di invio. **Impatto:** il testo `"Riceverai notizie e newsletter"` (`actions.ts:525`) può creare un'aspettativa che dipende da un servizio esterno non verificato. **Azione:** confermare se esiste una piattaforma mailing esterna sincronizzata; se prevista, definire sincronizzazione, revoca ed evidenza del consenso nella roadmap. Non dedurre assenza di campagne esterne dal solo repo.

### 💡 Nice-to-have / esiti senza difetto confermato

- **Coming-soon email:** `src/components/redirects/ComingSoon.tsx:188` è una pagina legacy senza import nelle route correnti; il banner attuale `src/features/homepage/components/HomepageWorkInProgressNotice.tsx:21` porta a `/contatti` e il contatto usa `mailto:` (`src/features/contatti/Contatti.tsx:64`). Non esiste quindi un form email coming-soon attivo da “collegare”.
- **Condivisione:** gli aggiornamenti hanno WhatsApp, Facebook, X e copia link (`src/features/aggiornamenti/ShareButtons.tsx:17`); annunci e profili copiano il link (`src/features/segnalazioni/DetailActions.tsx:121`). Estendere i pulsanti social ai dettagli è **decisione manuale di prodotto**, non un guasto accertato.
- **Ente sportivo/Società:** `src/features/pubblica-annuncio/components/AnnuncioAziendeEnti.tsx:12` appartiene al flusso storico; nessun tipo dedicato è nella lista pubblicabile (`src/features/pubblica-annuncio/publish-model.ts:24`). Decidere se sia un nuovo profilo/annuncio o un caso di Squadra prima di pianificare la realizzazione.

## 4. Checklist azioni

### Eseguibili da agente AI — fase di implementazione successiva

- [ ] **11-F01:** definire e completare il percorso Creator fino a card/dettaglio/query e test su record pubblicato, oppure disabilitare coerentemente la pubblicazione fino al completamento.
- [ ] **11-F02:** allineare flag, filtro e testo della soglia alla decisione di prodotto; evitare un filtro selezionabile senza risultati possibili.
- [ ] **11-F03:** dopo la scelta del processo, predisporre strumenti di moderazione, motivazioni, audit e verifiche per stati/visibilità, senza cambiare stati o rimborsi durante l'audit.
- [ ] **11-F05:** se prevista, progettare integrazione newsletter con sincronizzazione dell'opt-out e test pertinenti; in alternativa adeguare il messaggio di conferma.

### Da fare manualmente dall'utente

- [ ] Verificare quali migrazioni, specialmente quella Creator del 28 settembre, sono applicate nel progetto hosted; nessuna è stata creata da questo audit.
- [ ] Confermare chi e come approva/rifiuta annunci oggi, inclusi segnalazioni, notifiche e rimborsi delle inserzioni prioritarie; fornire un account o una procedura di test se si vuole verificare il flusso reale.
- [ ] Verificare provider SMTP attivo (Aruba, Resend o altro) e fare prove di recapito di signup, recupero e OTP sul progetto hosted; controllare i log senza condividere segreti.
- [ ] Decidere se e quando attivare Professionisti e studi, cosa rappresenti la soglia dei 20 profili, e se Ente sportivo/Società richieda una categoria autonoma.
- [ ] Confermare servizio newsletter esterno e politica di invio; decidere se estendere la condivisione social ad annunci e profili.

## 5. Domande aperte / decisioni da prendere

1. La pubblicazione Creator deve essere disponibile ora? Quale revisione e quali migrazioni sono effettivamente deployate?
2. Esiste una coda di moderazione gestita nel Dashboard Supabase o in un sistema esterno? Chi decide e registra approvazione/rifiuto?
3. “20 profili” indica una regola automatica, una soglia di lancio decisa manualmente o testo da rimuovere?
4. Quale servizio gestisce SMTP e newsletter hosted? Sono disponibili esiti di invio recenti su caselle di test?
5. Ente sportivo/Società è un tipo distinto da Squadra? La condivisione social completa è richiesta sui dettagli?

## 6. Stato finale e punto successivo

**Completato il 2026-09-29** come confronto statico mirato; 37 test annunci passati. Non sono stati effettuati accesso hosted, email di prova, approvazioni o verifica del deploy. Le discrepanze confermate nel codice e le verifiche esterne restano separate nei findings.

Migrazioni create/applicate: **0**. Nessuna nuova migrazione da applicare manualmente; verificare separatamente lo stato delle migrazioni preesistenti, in particolare quella Creator.

Prossimo: **Punto 12 — Pulizia, dipendenze e strumenti di verifica**, profilo consigliato **GPT-6 Luna · medium · Default**. Ripartire dal [master](AUDIT-MASTER.md), impostando prima il punto su **In corso**.
