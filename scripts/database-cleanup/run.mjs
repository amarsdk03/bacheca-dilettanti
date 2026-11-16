import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";
import {mkdir,readFile,stat,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {inventorySql,cleanupSql} from "./sql.mjs";
import {parseInventory,validateInventory,classifyStorage,RESET,KEEP} from "./policy.mjs";
import {backupStorage,storageBackups,pruneStorage} from "./storage.mjs";

const root=fileURLToPath(new URL("../../",import.meta.url));
const output=resolve(root,".local/database-cleanup");
export async function fileDigest(path) {
  let info;
  try {info=await stat(path);} catch(error) {
    if(error.code==="ENOENT") throw new Error(`Backup database non trovato: ${path}. Crea prima il dump completo indicato nella guida, oppure passa il percorso del backup esistente.`);
    throw error;
  }
  if(!info.isFile() || info.size===0) throw new Error("Il backup database deve essere un file non vuoto.");
  const hash=createHash("sha256");
  for await(const chunk of createReadStream(path)) hash.update(chunk);
  return {file:resolve(path),bytes:info.size,sha256:hash.digest("hex")};
}

const help=`Pulizia una tantum: nessuna connessione SQL automatica, nessun caricamento .env.
  node scripts/database-cleanup/run.mjs inventory
  node scripts/database-cleanup/run.mjs prepare --manifest PATH (--database-backup PATH | --skip-database-backup) [--storage-backup DIR]
  node scripts/database-cleanup/run.mjs backup-storage --manifest PATH --origin https://PROJECT.supabase.co [--storage-backup DIR]
  node scripts/database-cleanup/run.mjs prune-storage --manifest PATH --after PATH --origin https://PROJECT.supabase.co [--storage-backup DIR] [--apply]

Gli ultimi due comandi richiedono BACHECA_CLEANUP_SERVICE_ROLE_KEY nell'ambiente
del solo processo operativo. Non passare chiavi sulla riga di comando.
Output e copie Storage: .local/database-cleanup/ (esclusa da Git).
`;

async function remoteClient(origin) {
  if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(origin??"")) throw new Error("Specificare esplicitamente l'origine Supabase con --origin, senza slash finale.");
  const key=process.env.BACHECA_CLEANUP_SERVICE_ROLE_KEY;
  if(!key) throw new Error("Manca BACHECA_CLEANUP_SERVICE_ROLE_KEY nel processo operativo.");
  const {createClient}=await import("@supabase/supabase-js");
  return createClient(origin,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

export async function main(args) {
  const [command,...rest]=args,options={};
  if(!command || command==="--help") {console.log(help);return;}
  const allowed={inventory:[],prepare:["manifest","database-backup","skip-database-backup","storage-backup"],"backup-storage":["manifest","origin","storage-backup"],"prune-storage":["manifest","after","origin","storage-backup","apply"]}[command];
  if(!allowed) throw new Error(help);
  for(let i=0;i<rest.length;i++) {
    const key=rest[i].replace(/^--/,"");
    if(!rest[i].startsWith("--") || !allowed.includes(key) || Object.hasOwn(options,key)) throw new Error("Argomento non valido: "+rest[i]);
    options[key]=["apply","skip-database-backup"].includes(key)?true:rest[++i];
    if(options[key]===undefined || typeof options[key]==="string" && options[key].startsWith("--")) throw new Error("Valore mancante: "+key);
  }
  await mkdir(output,{recursive:true});
  if(command==="inventory") {
    await writeFile(join(output,"inventory.sql"),inventorySql,{mode:0o600});
    console.log("Esegui .local/database-cleanup/inventory.sql nel SQL Editor ed esporta la cella inventory in inventory.json.");return;
  }
  if(!options.manifest) throw new Error("Specificare --manifest.");
  const data=validateInventory(parseInventory(await readFile(resolve(options.manifest),"utf8")));
  const storage=classifyStorage(data),storageDirectory=options["storage-backup"]?resolve(options["storage-backup"]):join(output,"storage-backup");
  if(command==="backup-storage") {
    console.log({backedUp:await backupStorage(await remoteClient(options.origin),data,storageDirectory)});return;
  }
  if(command==="prune-storage") {
    if(!options.after) throw new Error("Specificare --after con l'inventario successivo al COMMIT SQL.");
    const after=parseInventory(await readFile(resolve(options.after),"utf8"));
    console.log(await pruneStorage(await remoteClient(options.origin),data,after,storageDirectory,{apply:Boolean(options.apply)}));return;
  }
  if(options["database-backup"] && options["skip-database-backup"]) throw new Error("Scegliere --database-backup oppure --skip-database-backup.");
  if(!options["database-backup"] && !options["skip-database-backup"]) throw new Error("Specificare --database-backup oppure --skip-database-backup per rinunciarvi esplicitamente.");
  const database=options["skip-database-backup"]?{skippedByOperator:true}:await fileDigest(resolve(options["database-backup"]));
  let storageCopies=[],storagePending=false;
  // SQL changes ownership only. Bytes are removed in the separate API phase,
  // which still enforces actual, verified Storage backups before any deletion.
  let hasStorageIndex=false;
  try {await stat(join(storageDirectory,"index.json"));hasStorageIndex=true;} catch(error) {
    if(error.code==="ENOENT") storagePending=storage.remove.length>0;else throw error;
  }
  if(hasStorageIndex) storageCopies=await storageBackups(data,storageDirectory);
  const backups={database,storage:storageCopies,storagePending};
  const script=cleanupSql(data,backups);
  await writeFile(join(output,"apply.sql"),script,{mode:0o600});
  const describe=data.tables.filter(t=>!t.name.startsWith("auth.") && !t.name.startsWith("storage.")).map(t=>`| ${t.name} | ${t.count} | ${RESET.includes(t.name)||KEEP[t.name]==="false"?"Azzera":t.name==="public.utente"?"Conserva soltanto admin":"Conserva"} |`).join("\n");
  const report=`# Reset completo preparato, non eseguito — reset-all-content-v2\n\nDestinazione: database reale da cui proviene inventory.json. Lo stack locale di testing resta invariato.\n\nDa eliminare: ${data.deleteAuthIds.length} account Auth, TUTTI i ${data.announcements.length} annunci, TUTTI i ${data.keepProfiles.length+data.deleteProfiles.length} profili, TUTTE le ${data.reports.length} segnalazioni e tutte le loro dipendenze.\n\nDa conservare: account admin, 18 canali VUOTI, cataloghi, configurazioni e struttura del database.\n\nStorage: ${storage.keep.length} file conservati (logo), ${storage.remove.length} file da rimuovere successivamente via API.\n\nBackup database: ${database.skippedByOperator?"omesso su richiesta esplicita dell’operatore":"file verificato per esistenza e SHA-256; completezza e ripristinabilità non certificate"}.\nBackup Storage: ${storagePending?"da completare prima di prune-storage --apply; lo SQL conserva tutti i file":"verificato o non necessario"}.\n\n| Tabella | Righe iniziali | Operazione |\n| --- | ---: | --- |\n${describe}\n\nIl file apply.sql verifica nuovamente inventario e schema. Prima del COMMIT controlla zero annunci, profili e segnalazioni, un account e 18 canali intatti.\n`;
  await writeFile(join(output,"summary.md"),report,{mode:0o600});
  await writeFile(join(output,"storage-plan.json"),JSON.stringify(storage,null,2)+"\n",{mode:0o600});
  console.log("Preparati .local/database-cleanup/apply.sql, summary.md e storage-plan.json. Nessun dato remoto modificato.");
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
}
