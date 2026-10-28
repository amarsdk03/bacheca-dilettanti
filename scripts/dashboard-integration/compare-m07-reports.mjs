import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const fields = ["present","relkind","relpersistence","owner","rls","force_rls","acl_md5","privileges_md5",
  "columns_md5","policies_md5","indexes_md5","constraints_md5","triggers_md5"];
function report(input) {
  const value = Array.isArray(input) ? input[0] : input;
  return value?.m07_report ?? value;
}
function tables(input) {
  const value = report(input);
  if (value?.transaction_read_only !== "on") throw new Error("M07_READ_ONLY_REPORT_REQUIRED");
  const rows = value.unchanged_table_fingerprints ?? value.tables;
  if (!Array.isArray(rows) || rows.length !== 33) throw new Error("M07_ALL_33_TABLES_REQUIRED");
  const map = new Map();
  for (const row of rows) {
    if (!row.schema_name || !row.table_name || fields.some(key => !Object.hasOwn(row,key))) throw new Error("M07_INCOMPLETE_TABLE_FINGERPRINT");
    const key = `${row.schema_name}.${row.table_name}`;
    if (map.has(key)) throw new Error("M07_DUPLICATE_TABLE_IDENTITY");
    map.set(key,row);
  }
  return map;
}
export function compareM07Reports(before, current) {
  const a = tables(before); const b = tables(current); const differences = [];
  for (const identity of new Set([...a.keys(),...b.keys()])) {
    if (!a.has(identity) || !b.has(identity)) { differences.push({identity,missing:!a.has(identity)?"before":"current"}); continue; }
    for (const field of fields) if (a.get(identity)[field] !== b.get(identity)[field]) {
      differences.push({identity,field,before:a.get(identity)[field],current:b.get(identity)[field]});
    }
  }
  return {step:"M07_COMPARISON",matches:differences.length === 0,beforeTables:a.size,currentTables:b.size,
    matchedTables:[...a.keys()].filter(identity => b.has(identity) && !differences.some(d => d.identity === identity)).length,
    differences,gateValueVerified:false,releaseAuthorized:false,
    note:"Compares like M07 fingerprint formats only. Gate/SQL status, project identity and release are separate evidence."};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error("Usage: node scripts/dashboard-integration/compare-m07-reports.mjs before.json current.json");
    const result = compareM07Reports(...process.argv.slice(2).map(p => JSON.parse(readFileSync(p,"utf8"))));
    console.log(JSON.stringify(result,null,2));
    process.exitCode = result.matches ? 0 : 2;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
