import type { HomeChart, HomeLimitation } from "./contracts";
import { HOME_PROFILE_TYPES } from "./contracts";
import { ADMIN_ANNOUNCEMENT_STATUSES, ADMIN_ANNOUNCEMENT_TYPES } from "../annunci/contracts";
import { STATUS_LABELS, TYPE_LABELS } from "../annunci/presentation";

export type AvailableHomeChart = Extract<HomeChart, { available: true }>;
export type ChartRow = { key: string; label: string; count: number; fill: string };
const profiles = { giocatore: "Giocatore", squadra: "Squadra", "staff-sportivo": "Staff sportivo", arbitro: "Arbitro", "torneo-evento": "Torneo / Evento", "campi-impianti-sportivi": "Campi e impianti sportivi", "servizi-consulenze": "Servizi e consulenze", creators: "Creators" };
const ages = { "0_2": "0–2 giorni", "3_7": "3–7 giorni", "8_30": "8–30 giorni", over_30: "Oltre 30 giorni", unknown: "Data non disponibile" };
export const chartLimitations: Record<HomeLimitation, string> = {
  CURRENT_RECORDS_ONLY: "Sono rappresentati i record attualmente presenti, non uno storico immutabile. Gli annunci nel cestino sono esclusi.",
  LEGACY_REGISTRATION_DATES: "Le date di registrazione meno recenti possono essere state ricostruite dai dati disponibili.",
  PROFILES_NOT_USERS: "La distribuzione conta i profili degli utenti inclusi: uno stesso utente può avere più profili. Il denominatore è distinto dal totale utenti.",
  CREATION_NOT_REVIEW_ENTRY: "Le fasce misurano il tempo dalla creazione, non dall’ingresso in revisione. Non rappresentano lo storico della coda.",
};
export function monthLabel(month: string) {
  return new Intl.DateTimeFormat("it-IT", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-15T12:00:00Z"));
}
export function distributionRows(chart: AvailableHomeChart): ChartRow[] {
  const labels: Record<string, string> = chart.metric === "users" ? profiles : chart.metric === "announcements" ? STATUS_LABELS : TYPE_LABELS;
  const keys: readonly string[] = chart.metric === "users" ? HOME_PROFILE_TYPES : chart.metric === "announcements" ? ADMIN_ANNOUNCEMENT_STATUSES : ADMIN_ANNOUNCEMENT_TYPES;
  return chart.distribution.map(row => ({ ...row, label: labels[row.key] ?? (row.key === "unspecified" ? "Non specificata" : "Altro"),
    fill: `var(--chart-${row.key === "unspecified" ? 12 : row.key === "other" ? 13 : keys.indexOf(row.key) + 1})` }));
}
export function primaryRows(chart: AvailableHomeChart): ChartRow[] {
  return chart.metric === "pending" ? chart.age.map(row => ({ ...row, label: ages[row.key], fill: "var(--chart-1)" })) :
    chart.series.map(row => ({ key: row.month, label: monthLabel(row.month), count: row.count, fill: "var(--chart-1)" }));
}
