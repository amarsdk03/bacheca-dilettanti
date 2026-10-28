import type { AuditListResult } from "../audit/read-contracts";
export const HOME_METRICS = ["users", "announcements", "pending", "profits"] as const;
export type HomeMetric = typeof HOME_METRICS[number];
export const HOME_PROFILE_TYPES = ["giocatore", "squadra", "staff-sportivo", "arbitro", "torneo-evento", "campi-impianti-sportivi", "servizi-consulenze", "creators"] as const;
export const HOME_AGE_BUCKETS = ["0_2", "3_7", "8_30", "over_30", "unknown"] as const;
export type HomeSummary = { asOf: string; users: number; announcements: number; pending: number; profits: { available: false } };
export type HomeDistribution = { key: string; count: number }[];
export type HomeLimitation = "CURRENT_RECORDS_ONLY" | "LEGACY_REGISTRATION_DATES" | "PROFILES_NOT_USERS" | "CREATION_NOT_REVIEW_ENTRY";
type ChartBase = { asOf: string; timezone: "Europe/Rome"; limitations: HomeLimitation[] };
type AvailableChart = ChartBase & { available: true; population: number; excludedDates: { missingOrNonFinite: number; future: number };
  distributionTotal: number; distribution: HomeDistribution };
type MonthlyChart = AvailableChart & { series: { month: string; count: number }[]; period: { from: string; to: string } };
export type HomeChart = (MonthlyChart & { metric: "users"; definition: "REGISTERED_USERS" }) |
  (MonthlyChart & { metric: "announcements"; definition: "NON_TRASHED_ANNOUNCEMENTS" }) |
  (AvailableChart & { metric: "pending"; age: { key: typeof HOME_AGE_BUCKETS[number]; count: number }[]; definition: "PENDING_BY_CREATION_DATE" }) |
  (ChartBase & { metric: "profits"; available: false; reason: "FINANCIAL_SOURCE_NOT_CONFIGURED" });
export type HomeFailure = { status: "invalid"; code: "INVALID_QUERY" | "INVALID_METRIC" } | { status: "denied"; code: "ACCESS_DENIED" } |
  { status: "unavailable"; code: "HOME_UNAVAILABLE"; correlationId: string };
export type HomeSummaryResult = { status: "ok"; summary: HomeSummary } | HomeFailure;
export type HomeChartResult = { status: "ok"; chart: HomeChart } | HomeFailure;
export type HomeActivityResult = AuditListResult;
