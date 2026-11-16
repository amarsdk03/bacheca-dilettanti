import type {HomeChart} from "./contracts";
import {type ChartRow, monthLabel} from "./chart-presentation";

export type MonthlyHomeChart = Extract<HomeChart, { series: unknown }>;
export type HomeAggregation = "monthly" | "quarterly" | "yearly";
export type HomeRange = { from: string; to: string };
export type PeriodRow = ChartRow & { partial: boolean };
export function homeBucketKey(month: string, aggregation: HomeAggregation) {
  return aggregation === "monthly" ? month : aggregation === "quarterly" ? `${month.slice(0, 4)}-Q${Math.ceil(Number(month.slice(5)) / 3)}` : month.slice(0, 4);
}

export function currentRomeMonth(asOf: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit" }).formatToParts(new Date(asOf));
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

/** Clamp a remembered selection to the actual months returned by the server. */
export function resolveHomeRange(chart: MonthlyHomeChart, selection: HomeRange | null): HomeRange {
  const first = chart.series[0].month, last = chart.series.at(-1)!.month;
  const bound = (value: string) => value < first ? first : value > last ? last : value;
  const from = bound(selection?.from ?? first), to = bound(selection?.to ?? last);
  return { from: from > to ? to : from, to };
}

export function recentHomeRange(chart: MonthlyHomeChart, months: number): HomeRange {
  return { from: chart.series[Math.max(0, chart.series.length - months)].month, to: chart.series.at(-1)!.month };
}

export function homePeriod(chart: MonthlyHomeChart, selection: HomeRange | null, aggregation: HomeAggregation) {
  const range = resolveHomeRange(chart, selection), current = currentRomeMonth(chart.asOf);
  const monthly = chart.series.filter(row => row.month >= range.from && row.month <= range.to);
  const groups = new Map<string, { count: number; months: string[] }>();
  for (const row of monthly) {
    const key = homeBucketKey(row.month, aggregation);
    const group = groups.get(key) ?? { count: 0, months: [] };
    group.count += row.count; group.months.push(row.month); groups.set(key, group);
  }
  const expected = aggregation === "monthly" ? 1 : aggregation === "quarterly" ? 3 : 12;
  const rows: PeriodRow[] = [...groups].map(([key, group]) => ({
    key, count: group.count, fill: "var(--chart-1)",
    label: aggregation === "monthly" ? monthLabel(key) : aggregation === "quarterly" ? `T${key.at(-1)} ${key.slice(0, 4)}` : key,
    partial: group.months.length < expected || group.months.some(month => month >= current),
  }));
  const complete = monthly.filter(row => row.month < current);
  const latest = complete.at(-1), previous = complete.at(-2);
  const comparable = !!latest && !!previous && previous.count > 0;
  return {
    range, rows, monthly, total: monthly.reduce((sum, row) => sum + row.count, 0),
    latest, previous,
    change: comparable ? { difference: latest.count - previous.count, percent: (latest.count - previous.count) / previous.count * 100 } : null,
    partial: rows.some(row => row.partial),
  };
}
