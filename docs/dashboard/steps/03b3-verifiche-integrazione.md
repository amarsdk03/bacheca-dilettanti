# 03B.3 — Prove integrate di autorizzazione

**Stato:** Da iniziare  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** [03B.2](03b2-ripristino-locale.md) concluso.

[Master](../master_plan.md) · [Step 03](03-autorizzazione-database.md)

**Alternativa storica fuori dal percorso corrente:** l'utente ha scelto Node e
PGlite senza Docker. Il percorso locale 03B non è un prerequisito dei test.
Le prove Auth/PostgREST non eseguite restano tali: vedere la
[matrice 16A](16-verifica-rilascio/matrice-verifiche.md), senza equiparare i mock
o la simulazione dei claim a un gateway Supabase realmente avviato.

## Attività e criteri di completamento

- Attestare la policy del solo ambiente locale, provarne prima il diniego e poi
  il ramo positivo con login Auth e JWT verificato da PostgREST. Supportare e
  verificare gli eventuali limiti richiesti dalla versione/configurazione target.
- Provare anonimi, ordinari, ruolo esatto e varianti, email non confermata,
  mapping assente, identità bloccata, token scaduti/manipolati, sessioni scadute
  e revocate. Provare rinnovo e revoca ruolo/sessione tra richieste reali.
- Verificare grant/RLS e accessi diretti agli helper, escalation da API/RPC,
  registrazione/pubblicazione ordinaria completa e ownership concorrente.
- Misurare lookup indicizzati, numero chiamate e controlli una volta per
  operazione; eseguire advisor pertinenti senza assimilare PGlite a Supabase.
- Confrontare/rigenerare i tipi dallo schema verificato; registrare versioni,
  risultati, differenze col target reale e limiti di copertura.
- Provare l'applicazione transazionale della migrazione su uno schema completo
  precedente attendibile. Se manca, lo step 03 resta **Da terminare** anche se
  le prove funzionali sullo schema già migrato passano.

## Operazioni manuali e avanzamento

Non sono autorizzati test o attivazione automatica sul progetto reale. Documentare
separatamente l'eventuale rilascio, con precondizioni e recupero. Chiudere lo step
03 soltanto dopo tutti i suoi criteri; le prove mancanti bloccano il rilascio.
Lo sviluppo dello step 04 con PGlite è ammesso dalla successiva scelta dell'utente.

**Prossimo dopo il completamento:** [04 — Audit persistente](04-audit-persistente.md),
**6.1 Sol, high**.
