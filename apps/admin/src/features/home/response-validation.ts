import { databaseTimestamp, record } from "../annunci/validation";
import { ADMIN_ANNOUNCEMENT_STATUSES, ADMIN_ANNOUNCEMENT_TYPES } from "../annunci/contracts";
import { HOME_AGE_BUCKETS, HOME_PROFILE_TYPES, type HomeChart, type HomeDistribution, type HomeMetric, type HomeSummary } from "./contracts";
function invalid(): never { throw new Error("INVALID_HOME_RESPONSE"); }
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const sum = (values: number[]) => { const n = values.reduce((a, b) => a + b, 0); if (!count(n)) invalid(); return n; };
export function parseHomeSummary(value: unknown): HomeSummary {
  if (!record(value) || !databaseTimestamp(value.asOf) || !count(value.users) || !count(value.announcements) || !count(value.pending) ||
    value.pending > value.announcements || !record(value.profits) || value.profits.available !== false) invalid();
  return { asOf: value.asOf, users: value.users, announcements: value.announcements, pending: value.pending, profits: { available: false } };
}
function distribution(value: unknown, keys: readonly string[], total: number): HomeDistribution {
  if (!Array.isArray(value) || value.length > keys.length) invalid();
  const seen = new Set<string>(), entries: HomeDistribution = [];
  for (const row of value) {
    if (!record(row) || typeof row.key !== "string" || !keys.includes(row.key) || seen.has(row.key) || !count(row.count)) invalid();
    seen.add(row.key); entries.push({ key: row.key, count: row.count });
  }
  if (sum(entries.map(e => e.count)) !== total) invalid();
  return entries;
}
function localParts(timestamp: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp)).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
}
function monthlySeries(value: unknown, asOf: string) {
  if (!Array.isArray(value) || value.length !== 12) invalid();
  const now = localParts(asOf), year = Number(now.year), month = Number(now.month), entries: { month: string; count: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const serial = year * 12 + month - 1 - 11 + i;
    const expected = String(Math.floor(serial / 12)).padStart(4, "0") + "-" + String(serial % 12 + 1).padStart(2, "0");
    const row = value[i]; if (!record(row) || row.month !== expected || !count(row.count)) invalid();
    entries.push({ month: expected, count: row.count });
  }
  return entries;
}
export function parseHomeChart(value: unknown, metric: HomeMetric): HomeChart {
  if (!record(value) || value.metric !== metric || !databaseTimestamp(value.asOf) || value.timezone !== "Europe/Rome") invalid();
  const base = { asOf: value.asOf, timezone: "Europe/Rome" as const };
  if (metric === "profits") {
    if (value.available !== false) invalid();
    return { ...base, metric, available: false, reason: "FINANCIAL_SOURCE_NOT_CONFIGURED", limitations: [] };
  }
  if (value.available !== true || !count(value.population) || !count(value.distributionTotal) || !record(value.excludedDates) ||
    !count(value.excludedDates.missingOrNonFinite) || !count(value.excludedDates.future) ||
    sum([value.excludedDates.missingOrNonFinite, value.excludedDates.future]) > value.population ||
    metric !== "users" && value.distributionTotal !== value.population) invalid();
  const distributionKeys = metric === "users" ? HOME_PROFILE_TYPES : metric === "announcements" ? ADMIN_ANNOUNCEMENT_STATUSES : ADMIN_ANNOUNCEMENT_TYPES;
  const common = { ...base, available: true as const, population: value.population, distributionTotal: value.distributionTotal,
    excludedDates: { missingOrNonFinite: value.excludedDates.missingOrNonFinite, future: value.excludedDates.future },
    distribution: distribution(value.distribution, [...distributionKeys, "unspecified", "other"], value.distributionTotal) };
  if (metric === "pending") {
    const age = distribution(value.age, HOME_AGE_BUCKETS, common.population);
    if (age.length !== HOME_AGE_BUCKETS.length || !age.every((e, i) => e.key === HOME_AGE_BUCKETS[i]) ||
      age.at(-1)!.count !== sum([common.excludedDates.missingOrNonFinite, common.excludedDates.future])) invalid();
    return { ...common, metric, definition: "PENDING_BY_CREATION_DATE", limitations: ["CURRENT_RECORDS_ONLY", "CREATION_NOT_REVIEW_ENTRY"], age: age as Extract<HomeChart, { metric: "pending" }>["age"] };
  }
  const series = monthlySeries(value.series, base.asOf);
  if (sum(series.map(e => e.count)) > common.population - common.excludedDates.missingOrNonFinite - common.excludedDates.future ||
    !record(value.period) || !databaseTimestamp(value.period.from) || value.period.to !== base.asOf) invalid();
  const start = localParts(value.period.from);
  if (start.year.padStart(4, "0") + "-" + start.month !== series[0].month || start.day !== "01" || start.hour !== "00" || start.minute !== "00" || start.second !== "00" || !value.period.from.endsWith(".000000Z")) invalid();
  const monthly = { ...common, series, period: { from: value.period.from, to: base.asOf } };
  return metric === "users" ? { ...monthly, metric, definition: "REGISTERED_USERS", limitations: ["CURRENT_RECORDS_ONLY", "LEGACY_REGISTRATION_DATES", "PROFILES_NOT_USERS"] } :
    { ...monthly, metric, definition: "NON_TRASHED_ANNOUNCEMENTS", limitations: ["CURRENT_RECORDS_ONLY"] };
}
