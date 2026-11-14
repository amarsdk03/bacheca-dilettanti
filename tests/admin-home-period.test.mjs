import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";

const {homePeriod, resolveHomeRange, recentHomeRange, currentRomeMonth} = adminServerLoader()("apps/admin/src/features/home/period.ts");
const chart = {
  asOf: "2026-11-13T10:00:00Z",
  series: Array.from({length: 12}, (_, i) => ({month: i === 0 ? "2025-12" : `2026-${String(i).padStart(2, "0")}`, count: i + 1})),
};

test("defaults to all twelve months; presets stay within server coverage", () => {
  assert.deepEqual(resolveHomeRange(chart, null), {from: "2025-12", to: "2026-11"});
  assert.deepEqual(recentHomeRange(chart, 3), {from: "2026-09", to: "2026-11"});
  assert.deepEqual(recentHomeRange(chart, 6), {from: "2026-06", to: "2026-11"});
  assert.equal(homePeriod(chart, null, "monthly").total, 78);
});
test("refresh clamps expired selections without empty or reversed intervals", () => {
  assert.deepEqual(resolveHomeRange(chart, {from: "2024-01", to: "2024-06"}), {from: "2025-12", to: "2025-12"});
  assert.deepEqual(resolveHomeRange(chart, {from: "2026-10", to: "2027-01"}), {from: "2026-10", to: "2026-11"});
});
test("calendar quarters sum real months, including zero, and label incomplete groups", () => {
  const result = homePeriod(chart, null, "quarterly");
  assert.deepEqual(result.rows.map(r => [r.key, r.count, r.partial]), [
    ["2025-Q4", 1, true], ["2026-Q1", 9, false], ["2026-Q2", 18, false], ["2026-Q3", 27, false], ["2026-Q4", 23, true],
  ]);
  const zeros = {...chart, series: chart.series.map(r => ({...r, count: 0}))};
  assert(homePeriod(zeros, null, "quarterly").rows.every(r => r.count === 0));
});
test("annual aggregation keeps years separate and never implies full year coverage", () => {
  assert.deepEqual(homePeriod(chart, null, "yearly").rows.map(r => [r.key, r.count, r.partial]), [["2025", 1, true], ["2026", 77, true]]);
});
test("filter endpoints are inclusive and summary totals match the displayed series", () => {
  const result = homePeriod(chart, {from: "2026-02", to: "2026-04"}, "quarterly");
  assert.deepEqual(result.rows.map(r => [r.count, r.partial]), [[7, true], [5, true]]);
  assert.equal(result.total, 12); assert.equal(result.monthly.length, 3);
});
test("comparison excludes the current Rome month and uses the last two selected complete months", () => {
  const result = homePeriod(chart, null, "yearly");
  assert.equal(result.latest.month, "2026-10"); assert.equal(result.previous.month, "2026-09");
  assert.deepEqual(result.change, {difference: 1, percent: 10});
  const filtered = homePeriod(chart, {from: "2026-05", to: "2026-06"}, "monthly");
  assert.equal(filtered.change.difference, 1); assert.equal(filtered.latest.month, "2026-06");
  assert.equal(currentRomeMonth("2026-10-31T23:30:00Z"), "2026-11");
});
test("insufficient months and a zero baseline never produce a fabricated percentage", () => {
  assert.equal(homePeriod(chart, {from: "2026-10", to: "2026-11"}, "monthly").change, null);
  const zero = {...chart, series: chart.series.map(r => r.month === "2026-09" ? {...r, count: 0} : r)};
  assert.equal(homePeriod(zero, null, "monthly").change, null);
  const falling = {...chart, series: chart.series.map(r => r.month === "2026-10" ? {...r, count: 5} : r)};
  assert.deepEqual(homePeriod(falling, null, "monthly").change, {difference: -5, percent: -50});
});
