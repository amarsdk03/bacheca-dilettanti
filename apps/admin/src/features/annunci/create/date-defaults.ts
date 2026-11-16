import {isValidIsoDate} from "@bacheca/announcements/features/pubblica-annuncio/publish-field-validation";

const italianDate = new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit"});
export function publicationToday(now = new Date()): string {
  const parts = italianDate.formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function validPublicationDate(value: string, now = new Date()): boolean {
  return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && isValidIsoDate(value) && value <= publicationToday(now);
}

/** Admin-only convention for profiles whose source supplies just a birth year. */
export function withBirthYearDefaults<T extends object>(draft: T, key: PropertyKey, value: unknown): T {
  const next = {...draft, [key]: value};
  if (key === "anno_nascita" && typeof value === "string" && /^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= new Date().getFullYear()) {
    const birth = next as Record<string, unknown>;
    if (!birth.mese_nascita) birth.mese_nascita = "Gennaio";
    if (!birth.giorno_nascita) birth.giorno_nascita = "1";
  }
  return next;
}
