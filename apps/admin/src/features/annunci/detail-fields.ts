/** Content columns only. No account/profile payloads or opaque info_mostrate JSON. */
export const DETAIL_FIELDS = {
  annuncio_giocatore: { tipologie_sport: "strings", ruoli_principali: "strings", ruoli_secondari: "strings", categorie_ricercate: "strings", descrizione_aggiuntiva: "text" },
  annuncio_squadra_cerca_giocatore: { gruppo_squadra: "text", tipologie_sport: "strings", ruoli_principali: "strings", ruoli_secondari: "strings", annata_da: "number", annata_a: "number", annate_ricercate: "strings", stagione: "text", descrizione_aggiuntiva: "text" },
  annuncio_squadra_cerca_staff: { figura_ricercata: "text", figure_ricercate: "strings", settore: "text", compenso_mensile: "number", requisiti: "text", stagione: "text", periodo_dal: "text", periodo_al: "text", descrizione_aggiuntiva: "text" },
  annuncio_squadra_cerca_partita: { gruppo_squadra: "text", categorie_avversario: "strings", disponibilita_trasferta: "text", periodo_dal: "text", periodo_al: "text", orario_dalle: "text", orario_alle: "text", descrizione_aggiuntiva: "text" },
  annuncio_squadra_cerca_sponsor: { categoria_settore: "text", supporto_cercato: "text", offerta_fornita: "text", descrizione_aggiuntiva: "text" },
  annuncio_staff_sportivo: { figure_professionali: "strings", tipologie_sport: "strings", categorie_ricercate: "strings", disponibilita_occupazione: "text", disponibilita_spostamento: "text", disponibile_remoto: "boolean", descrizione_aggiuntiva: "text", lista_esperienze: "history", qualifiche_licenze: "history" },
  annuncio_arbitro: { tipologie_sport: "strings", categorie_ricercate: "strings", disponibilita_occupazione: "text", disponibilita_spostamento: "text", automunito: "text", descrizione_aggiuntiva: "text", lista_esperienze: "history", qualifiche_licenze: "history" },
  annuncio_torneo_evento: { nome_evento: "text", modalita_iscrizione: "text", annate_ammesse_da: "text", annate_ammesse_a: "text", numero_squadre: "number", costo_partecipazione: "number", tipo_partecipazione: "text", tipologie_sport: "strings", lista_premi_trofei: "prizes", descrizione_aggiuntiva: "text" },
  annuncio_campo_impianto: { tipologie_sport: "strings", orari: "schedule", costo_partenza: "number", servizi_inclusi: "text", indirizzo: "text", descrizione_aggiuntiva: "text" },
  annuncio_servizi_consulenze: { figura_professionale: "strings", specializzazione: "text", presentazione_servizi: "text", tipologie_sport: "strings", automunito: "text", lista_esperienze: "history", qualifiche_licenze: "history", descrizione_aggiuntiva: "text" },
  annuncio_creators: { titolo_post: "text", descrizione_post: "text", contenuto_post: "text", descrizione_aggiuntiva: "text" },
} as const;

export type DetailType = keyof typeof DETAIL_FIELDS;
export type HistoryEntry = { id: string | null; titolo: string | null; ente: string | null; periodoDa: string | null; periodoA: string | null; descrizione: string | null; stato: string | null; squadraProfiloId: string | null; squadraIstanzaId: string | null };
export type ScheduleEntry = { giorno: string | null; attivo: boolean | null; dalle: string | null; alle: string | null };
export type PrizeEntry = { id: string | null; posto: string | null; titoloPremio: string | null };
type FieldValues = { text: string; number: number; boolean: boolean; strings: string[]; history: HistoryEntry[]; schedule: ScheduleEntry[]; prizes: PrizeEntry[] };
export type DetailFieldKind = keyof FieldValues;
export type DetailFieldValue = FieldValues[DetailFieldKind] | null;
export type DetailContent = { [T in DetailType]: { type: T; fields: { [F in keyof typeof DETAIL_FIELDS[T]]: FieldValues[Extract<typeof DETAIL_FIELDS[T][F], DetailFieldKind>] | null } } }[DetailType] | { type: "unsupported"; fields: Record<string, never> };
