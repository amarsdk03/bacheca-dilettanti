import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compareM07Reports } from './compare-m07-reports.mjs';

function report(value) {
  const r = Array.isArray(value) ? value[0] : value;
  return r?.m08_report ?? r;
}
function routines(value) {
  if (!Array.isArray(value) || value.length===0) throw new Error('M08_ROUTINE_FINGERPRINTS_REQUIRED');
  const map=new Map();
  for (const row of value) {
    if (!row.identity || !row.kind || !/^[0-9a-f]{32}$/.test(row.fingerprint_md5)) throw new Error('M08_INCOMPLETE_ROUTINE_FINGERPRINT');
    if (map.has(row.identity)) throw new Error('M08_DUPLICATE_ROUTINE_IDENTITY');
    map.set(row.identity,row);
  }
  return map;
}
export function compareM08Reports(before,current) {
  const a=report(before),b=report(current);
  if (a?.step!=='M08' || b?.step!=='M08') throw new Error('M08_REPORTS_REQUIRED');
  const tableComparison=compareM07Reports(a,b);
  const ar=routines(a.unchanged_routine_fingerprints),br=routines(b.unchanged_routine_fingerprints);
  const differences=[];
  for (const identity of new Set([...ar.keys(),...br.keys()])) {
    if (!ar.has(identity)||!br.has(identity)) differences.push({identity,missing:!ar.has(identity)?'before':'current'});
    else if (ar.get(identity).kind!==br.get(identity).kind || ar.get(identity).fingerprint_md5!==br.get(identity).fingerprint_md5) differences.push({identity,before:ar.get(identity),current:br.get(identity)});
  }
  return {step:'M08_COMPARISON',matches:tableComparison.matches&&differences.length===0,tableComparison,
    beforeRoutines:ar.size,currentRoutines:br.size,unchangedRoutineDifferences:differences,
    gateValueVerified:false,releaseAuthorized:false};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length!==4) throw new Error('Usage: node scripts/dashboard-integration/compare-m08-reports.mjs before.json current.json');
    const result=compareM08Reports(...process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8'))));
    console.log(JSON.stringify(result,null,2));process.exitCode=result.matches?0:2;
  } catch(error) { console.error(error.message);process.exitCode=1; }
}
