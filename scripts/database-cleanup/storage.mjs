import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {resolve, join} from "node:path";
import {ADMIN_ID, classifyStorage, validateInventory,storageReferenceKeys} from "./policy.mjs";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export async function storageBackups(data, directory) {
  const {remove} = classifyStorage(validateInventory(data));
  if (!remove.length) return [];
  let entries;
  try {entries=JSON.parse(await readFile(join(directory,"index.json"),"utf8"));} catch(error) {
    if(error.code==="ENOENT") throw new Error(`Manca il backup dei ${remove.length} file Storage da eliminare. Esegui prima il comando backup-storage indicato nella guida.`);
    throw error;
  }
  const result = [];
  for (const item of remove) {
    const entry = entries.find(e=>e.id===item.id && e.bucket===item.bucket && e.name===item.name);
    if (!entry || !/^[a-f0-9]{64}\.bin$/.test(entry.file)) throw new Error(`Copia Storage mancante: ${item.bucket}/${item.name}`);
    const file=resolve(directory,entry.file),bytes=await readFile(file);
    if (sha256(bytes)!==entry.sha256 || Number(item.metadata?.size ?? bytes.length)!==bytes.length) throw new Error(`Copia Storage non valida: ${item.name}`);
    result.push({...entry,file});
  }
  return result;
}

function checkObject(item,info) {
  // Storage deployments expose either SQL updated_at or the S3 modification
  // time as lastModified. Match either recorded clock, never a time tolerance.
  const actualTime=info?.lastModified??info?.updatedAt;
  const expectedTimes=[item.updatedAt,item.metadata?.lastModified].filter(Boolean).map(t=>new Date(t).getTime());
  const expectedTag=cleanTag(item.metadata?.eTag??item.metadata?.etag);
  const actualTag=cleanTag(info?.eTag??info?.etag);
  const idMatches=info?.id?info.id===item.id:Boolean(expectedTag&&actualTag===expectedTag);
  const timeMatches=expectedTimes.includes(new Date(actualTime).getTime());
  const tagMatches=!actualTag||!expectedTag||actualTag===expectedTag;
  const sizeMatches=info?.size===undefined||item.metadata?.size===undefined||Number(info.size)===Number(item.metadata.size);
  if (!info || !idMatches || !timeMatches || !tagMatches || !sizeMatches) throw new Error(`Oggetto Storage cambiato: ${item.bucket}/${item.name} (id: ${idMatches?"ok":"diverso o assente"}; data API: ${actualTime??"assente"}; date inventario: ${[item.updatedAt,item.metadata?.lastModified].filter(Boolean).join(", ")}; ETag: ${tagMatches?"ok":"diverso"}; dimensione: ${sizeMatches?"ok":"diversa"}).`);
}

const cleanTag=value=>typeof value==="string"?value.replace(/^W\//,"").replaceAll('"',"").toLowerCase():null;
function checkDownloadedBytes(item,bytes) {
  const tag=cleanTag(item.metadata?.eTag??item.metadata?.etag);
  if(/^[a-f0-9]{32}$/.test(tag??"") && createHash("md5").update(bytes).digest("hex")!==tag) throw new Error(`Contenuto Storage diverso dall'inventario: ${item.name}`);
}

export async function backupStorage(client,data,directory) {
  const {remove}=classifyStorage(validateInventory(data));
  await mkdir(directory,{recursive:true});
  const entries=[];
  for(const item of remove) {
    const bucket=client.storage.from(item.bucket);
    const info=await bucket.info(item.name);
    if(info.error) throw new Error(`Lettura metadati Storage fallita: ${item.name}`);
    checkObject(item,info.data);
    const download=await bucket.download(item.name);
    if(download.error) throw new Error(`Download Storage fallito: ${item.name}`);
    const bytes=new Uint8Array(await download.data.arrayBuffer()),hash=sha256(bytes),file=`${hash}.bin`;
    if(Number(item.metadata?.size ?? bytes.length)!==bytes.length) throw new Error(`Dimensione Storage cambiata: ${item.name}`);
    checkDownloadedBytes(item,bytes);
    await writeFile(join(directory,file),bytes,{mode:0o600});
    entries.push({...item,file,sha256:hash});
  }
  await writeFile(join(directory,"index.json"),JSON.stringify(entries,null,2)+"\n",{mode:0o600});
  return entries.length;
}

async function currentReferences(client) {
  const refs=[];
  for(const [table,columns,key,bucket] of [
    ["media_annuncio","link_media","id","immagini_annunci"],
    ["media_profilo","link_media,storage_path","id","immagini_profili"],
    ["profilo","link_foto_profilo","uuid","immagini_profili"],
  ]) {
    for(let offset=0;;offset+=1000) {
      const result=await client.from(table).select(columns).order(key).range(offset,offset+999);
      if(result.error) throw new Error(`Verifica riferimenti fallita: ${table}`);
      for(const row of result.data??[]) refs.push({bucket,keep:true,path:row.storage_path,url:row.link_media??row.link_foto_profilo});
      if((result.data?.length??0)<1000) break;
    }
  }
  return refs.filter(r=>r.path||r.url);
}

// Operational helper only. Tests inject a fake client; it never loads .env.
// Writers/uploads must remain paused between the inventory and the last remove.
export async function pruneStorage(client,before,after,directory,{apply=false}={}) {
  validateInventory(before);validateInventory(after);
  if(after.deleteAuthIds.length || after.tables.find(t=>t.name==="public.utente")?.count!==1 || after.schemaHash!==before.schemaHash) throw new Error("La pulizia SQL degli account non risulta completata o lo schema è cambiato.");
  if(after.announcements.length || after.reports.length || after.keepProfiles.length || after.deleteProfiles.length) throw new Error("La pulizia completa dei contenuti non risulta completata.");
  const {remove}=classifyStorage(before),backups=await storageBackups(before,directory);
  const result={candidates:remove.length,removed:0};
  // Preflight all files/references before the first irreversible API operation.
  const liveKeys=new Set((await currentReferences(client)).flatMap(storageReferenceKeys));
  for(const item of remove) {
    const current=after.objects.find(o=>o.id===item.id && o.bucket===item.bucket && o.name===item.name);
    const expectedOwner=item.owner && before.deleteAuthIds.includes(item.owner)?ADMIN_ID:item.owner;
    if(!current || current.owner!==expectedOwner) throw new Error(`Proprietà Storage cambiata o non trasferita: ${item.name}`);
    if(liveKeys.has(`${item.bucket}/${item.name}`)) throw new Error(`Oggetto nuovamente referenziato: ${item.name}`);
    const bucket=client.storage.from(item.bucket),info=await bucket.info(item.name);
    if(info.error) throw new Error(`Lettura metadati Storage fallita: ${item.name}`);
    checkObject(current,info.data);
    const download=await bucket.download(item.name);
    if(download.error || sha256(new Uint8Array(await download.data.arrayBuffer()))!==backups.find(b=>b.id===item.id)?.sha256) throw new Error(`Contenuto Storage cambiato: ${item.name}`);
  }
  if(apply) for(const item of remove) {
    const response=await client.storage.from(item.bucket).remove([item.name]);
    if(response.error) throw new Error(`Rimozione Storage fallita dopo ${result.removed} file; riprendere dall'inventario aggiornato.`);
    result.removed++;
  }
  return result;
}
