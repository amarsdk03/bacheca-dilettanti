import type {AvailableHomeChart, ChartRow} from "./chart-presentation";
import {distributionRows} from "./chart-presentation";
import {homeBucketKey, resolveHomeRange, type HomeAggregation, type HomeRange} from "./period";

import {categoryColor} from "./chart-colors";

export function splitHomeRows(chart: AvailableHomeChart, rows: ChartRow[], aggregation: HomeAggregation, selection: HomeRange | null = null) {
  const buckets = new Map(rows.map(row => [row.key, {} as Record<string, number>]));
  const range = "series" in chart ? resolveHomeRange(chart, selection) : null;
  const active = new Set<string>();
  for (const bucket of chart.breakdown ?? []) {
    if (range && (bucket.key < range.from || bucket.key > range.to)) continue;
    const key = chart.metric === "pending" ? bucket.key : homeBucketKey(bucket.key, aggregation);
    const target = buckets.get(key);
    if (!target) continue;
    for (const category of bucket.counts) {
      const field = `category_${category.key}`;
      target[field] = (target[field] ?? 0) + category.count;
      if (category.count > 0) active.add(category.key);
    }
  }
  const categories = distributionRows({...chart, distribution: [...active].sort().map(key => ({key, count: 0}))}).map(row => ({...row, fill: categoryColor(chart.metric, row.key)}));
  return { categories, rows: rows.map(row => ({...row, ...Object.fromEntries(categories.map(c => [`category_${c.key}`, buckets.get(row.key)?.[`category_${c.key}`] ?? 0]))})) };
}
