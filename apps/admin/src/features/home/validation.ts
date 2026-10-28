import { HOME_METRICS, type HomeMetric } from "./contracts";
export function homeMetric(value: unknown): value is HomeMetric { return typeof value === "string" && HOME_METRICS.includes(value as HomeMetric); }
