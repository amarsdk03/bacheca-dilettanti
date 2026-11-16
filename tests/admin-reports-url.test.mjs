import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
const {parseReportsUrl, reportsHref} = adminServerLoader()("apps/admin/src/features/community/reports-url.ts");
test("report filters and pagination survive a shareable URL", () => {
  const href = reportsHref({search: "mario@example.test", status: "working", target: "profilo", from: "2026-01-01", to: "2026-11-15", offset: 30});
  const parsed = parseReportsUrl(new URL(href, "http://localhost").searchParams);
  assert.equal(parsed.valid, true);
  assert.deepEqual(parsed.query, {search: "mario@example.test", status: "working", target: "profilo", from: "2026-01-01", to: "2026-11-15", offset: 30});
});
test("active means open and in progress and is explicit in the URL", () => {
  assert.equal(reportsHref({status: "active"}), "/segnalazioni?status=active");
  assert.equal(parseReportsUrl(new URLSearchParams()).query.status, "all");
});
test("invalid or duplicate filters do not silently select another view", () => {
  for (const value of ["status=unknown", "status=open&status=all", "offset=1", "offset=-1", "from=2026-02-30", "extra=x"]) assert.equal(parseReportsUrl(new URLSearchParams(value)).valid, false);
});
