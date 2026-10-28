import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compareM08Reports } from './compare-m08-reports.mjs';
function unwrap(v){const r=Array.isArray(v)?v[0]:v;return r?.m09_report??r;}
function support(rows){
  if(!Array.isArray(rows)||rows.length!==2)throw new Error('M09_BOTH_SUPPORT_TABLES_REQUIRED');
  const map=new Map();
  for(const r of rows){
    if(!['auth.users','private.admin_audit_event_v1'].includes(r.identity)||typeof r.present!=='boolean'||!/^[a-f0-9]{32}$/.test(r.fingerprint_md5)||map.has(r.identity))throw new Error('M09_INVALID_SUPPORT_FINGERPRINT');
    map.set(r.identity,r);
  }return map;
}
export function compareM09Reports(before,current){
  const a=unwrap(before),b=unwrap(current);
  if(a?.step!=='M09'||b?.step!=='M09')throw new Error('M09_REPORTS_REQUIRED');
  const base=compareM08Reports({...a,step:'M08'},{...b,step:'M08'});
  const am=support(a.support_table_fingerprints),bm=support(b.support_table_fingerprints);
  const differences=[];
  for(const [identity,r] of am){const other=bm.get(identity);if(r.present!==other.present||r.fingerprint_md5!==other.fingerprint_md5)differences.push({identity,before:r,current:other});}
  return {...base,step:'M09_COMPARISON',matches:base.matches&&differences.length===0,supportTablesCompared:2,supportTableDifferences:differences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{if(process.argv.length!==4)throw new Error('Usage: node scripts/dashboard-integration/compare-m09-reports.mjs before.json current.json');
    const result=compareM09Reports(...process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8'))));
    console.log(JSON.stringify(result,null,2));process.exitCode=result.matches?0:2;
  }catch(e){console.error(e.message);process.exitCode=1;}
}
