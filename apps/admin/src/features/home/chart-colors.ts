const statusColors: Record<string, string> = {
  pubblicato: "#2fae66", in_revisione: "#e5a11a", rifiutato: "#e53935", in_attesa_pagamento: "#8c62d9",
};
const typeColors: Record<string, string> = {
  giocatore: "#2f6bff", squadra: "#2fae66", "staff-sportivo": "#f28a2e", arbitro: "#d4b21f",
  "torneo-evento": "#7f8ca8", "campi-impianti-sportivi": "#5b8f63", "servizi-consulenze": "#bfa42c", creators: "#e53935",
  annuncio_giocatore: "#2f6bff", annuncio_staff_sportivo: "#f28a2e", annuncio_arbitro: "#d4b21f",
  annuncio_squadra_cerca_giocatore: "#2fae66", annuncio_squadra_cerca_staff: "#78c83d",
  annuncio_squadra_cerca_partita: "#18b49d", annuncio_squadra_cerca_sponsor: "#147d58",
  annuncio_torneo_evento: "#7f8ca8", annuncio_campo_impianto: "#5b8f63",
  annuncio_servizi_consulenze: "#bfa42c", annuncio_creators: "#e53935",
};
export function categoryColor(metric: string, key: string) {
  return (metric === "announcements" ? statusColors : typeColors)[key] ?? (key === "unspecified" ? "#94a3b8" : "#64748b");
}
