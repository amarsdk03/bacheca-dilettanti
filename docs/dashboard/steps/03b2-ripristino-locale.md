# 03B.2 — Ripristino locale e dati sintetici

**Stato:** Da iniziare  
**Modello consigliato:** 6.1 Sol, high  
**Dipendenze:** [03B.1](03b1-supabase-locale.md) concluso con acquisizione verificata.

[Master](../master_plan.md) · [Step 03](03-autorizzazione-database.md)

**Alternativa storica fuori dal percorso corrente:** l'utente ha scelto Node e
PGlite senza Docker. Questa procedura non è richiesta dai test o dallo step 16A;
non avviarla automaticamente. Vedere la [matrice 16A](16-verifica-rilascio/matrice-verifiche.md)
per la distinzione fra prove locali disponibili e prove integrate non eseguite.

## Attività e criteri di completamento

- Revisionare schema e catalogo acquisiti: dipendenze, proprietari, ACL, schemi
  aggiuntivi, estensioni, trigger e policy Auth/Storage, funzioni con effetti esterni.
  Escludere o sostituire integrazioni reali prima di attivare i relativi oggetti.
- Avviare lo stack separato, registrare le versioni effettive di PostgreSQL,
  Auth/PostgREST e la configurazione sessioni. Confrontare la struttura Auth con
  il target reale senza sovrascrivere gli oggetti gestiti da Supabase.
- Implementare il ripristino con preflight nello stesso processo e rifiuto di
  endpoint diversi da 127.0.0.1:55322. Provare il rifiuto prima di importare.
- Ripristinare lo schema già migrato senza riapplicare la foundation; ricreare
  la policy singleton **disabilitata** e i riferimenti necessari con dati sintetici.
- Ricostruire solo gli oggetti applicativi pertinenti sugli schemi gestiti dopo
  revisione delle differenze. Conservare proprietari e ACL delle funzioni con
  privilegi; non risolvere errori con grant indiscriminati.
- Creare identità di prova e un Admin dedicato usando Auth locale e lo script
  riservato, con UUID Auth/applicativo distinti. Nessun account o token reale.
- Predisporre credenziali locale-only per le prove; conservare gli env preesistenti
  delle app. Verificare schema, vincoli, mapping, policy disabilitata e assenza di
  attivazione sul progetto reale prima di dichiarare concluso il sottopasso.

## Limiti e operazioni manuali

Non ancora implementato: nessuno script di importazione va considerato pronto.
La baseline di upgrade precedente alla foundation non è disponibile; verificarne
la reperibilità e registrare il limite senza presentare il dump successivo come
prova dell'applicazione della migrazione.

**Prossimo:** [03B.3 — Prove integrate](03b3-verifiche-integrazione.md), **6.1 Sol, high**.
