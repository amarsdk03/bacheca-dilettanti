import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compareM09Reports } from './compare-m09-reports.mjs';
function unwrap(v){const r=Array.isArray(v)?v[0]:v;return r?.m10_report??r;}
export function compareM10Reports(before,current){
  const a=unwrap(before),b=unwrap(current);
  if(a?.step!=='M10'||b?.step!=='M10')throw new Error('M10_REPORTS_REQUIRED');
  return {...compareM09Reports({...a,step:'M09'},{...b,step:'M09'}),step:'M10_COMPARISON'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{if(process.argv.length!==4)throw new Error('Usage: node scripts/dashboard-integration/compare-m10-reports.mjs before.json current.json');
    const result=compareM10Reports(...process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8'))));
    console.log(JSON.stringify(result,null,2));process.exitCode=result.matches?0:2;
  }catch(e){console.error(e.message);process.exitCode=1;}
}
