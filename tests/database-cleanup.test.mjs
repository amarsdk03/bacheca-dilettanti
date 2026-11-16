import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,rm,writeFile} from "node:fs/promises";
import {join,dirname,resolve} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {createCleanupFixture,cleanupId} from "./helpers/database-cleanup-fixture.mjs";
import {createDistributionFixture} from "./helpers/admin-distribution-fixture.mjs";
import {ADMIN_ID,CHANNEL_KEYS,RESET,parseInventory,validateInventory,classifyStorage} from "../scripts/database-cleanup/policy.mjs";
import {inventorySql,cleanupSql} from "../scripts/database-cleanup/sql.mjs";
import {backupStorage,storageBackups,pruneStorage} from "../scripts/database-cleanup/storage.mjs";
import {fileDigest} from "../scripts/database-cleanup/run.mjs";

const backups={database:{sha256:"a".repeat(64)},storage:[{sha256:"b".repeat(64)}]};
const inventory=async db=>(await db.exec(inventorySql)).find(x=>x.rows?.[0]?.inventory).rows[0].inventory;
async function failedSql(db,sql,pattern) {
  await assert.rejects(db.exec(sql),pattern);
  await db.exec("rollback");
}
async function usingFixture(fn) {const h=await createCleanupFixture();try{await fn(h.db);}finally{await h.db.close();}}
const stable=data=>Object.fromEntries(Object.entries(data).filter(([key])=>!["capturedAt","managedAuthTables"].includes(key)));

test("inventario read-only: catalogo completo, nessuna password/testo privato, XML e nomi speciali",()=>usingFixture(async db=>{
  const before=(await db.query("select count(*) n from pg_class where relnamespace in ('public'::regnamespace,'private'::regnamespace)")).rows[0].n;
  const data=validateInventory(await inventory(db));
  assert.equal(data.reports.length,4);assert.equal(data.channels.length,18);assert.equal(data.announcements.length,3);
  assert.deepEqual(data.keepProfiles,[cleanupId(201),cleanupId(202)]);
  assert.deepEqual(data.deleteProfiles,[cleanupId(203)]);
  assert.equal(data.paymentBlockers.length,0);
  const text=JSON.stringify(data);
  for(const privateValue of ["private-local-fixture","Messaggio privato","Originale WhatsApp","Motivo 1","Testo da conservare"]) assert.ok(!text.includes(privateValue));
  assert.ok(data.objects.some(o=>o.name==="author/a & b.jpg"));
  assert.equal(classifyStorage(data).remove.length,3);
  assert.deepEqual(parseInventory(JSON.stringify([{inventory:JSON.stringify(data)}])),data);
  assert.equal((await db.query("select count(*) n from pg_class where relnamespace in ('public'::regnamespace,'private'::regnamespace)")).rows[0].n,before);
}));

test("reset completo: elimina annunci anche cestinati, profili e segnalazioni; conserva admin e 18 canali",()=>usingFixture(async db=>{
  const data=await inventory(db);
  const result=await db.exec(cleanupSql(data,backups));
  const summary=result.find(x=>x.rows?.[0]?.cleanup_result).rows[0].cleanup_result;
  assert.equal(summary.deletedAccounts,2);assert.equal(summary.announcements,0);
  assert.equal(summary.cleanupScope,"reset-all-content-v2");
  for(const table of ["public.annuncio","public.profilo","private.segnalazioni","public.annuncio_giocatore","public.profilo_giocatore","public.media_annuncio","public.media_profilo"]) assert.equal((await db.query(`select count(*) n from ${table}`)).rows[0].n,0);
  assert.deepEqual((await db.query("select id from auth.users")).rows,[{id:ADMIN_ID}]);
  assert.equal((await db.query("select count(*) n from auth.sessions")).rows[0].n,1);
  assert.equal((await db.query("select count(*) n from auth.refresh_tokens")).rows[0].n,1);
  assert.equal((await db.query("select user_id from auth.sessions")).rows[0].user_id,ADMIN_ID);
  assert.equal((await db.query("select count(*) n from public.profilo where uuid_utente is not null")).rows[0].n,0);
  assert.deepEqual((await db.query("select channel_key from private.distribution_channel_v1 order by channel_key")).rows.map(r=>r.channel_key),CHANNEL_KEYS);
  for(const table of RESET) if((await db.query("select to_regclass($1) t",[table])).rows[0].t) assert.equal((await db.query(`select count(*) n from ${table}`)).rows[0].n,0);
  assert.equal((await db.query("select count(*) n from private.annunci_notificati")).rows[0].n,0);
  assert.equal((await db.query("select count(*) n from private.regional_publication")).rows[0].n,0);
  assert.equal((await db.query("select tgenabled from pg_trigger where tgname='zz_guard_announcement_trash_v1'")).rows[0].tgenabled,"O");
  assert.equal((await db.query("select to_regprocedure('pg_temp.cleanup_hash(text,text,boolean)') f")).rows[0].f,null);
  assert.equal((await db.query("select count(*) n from storage.objects where owner=$1::uuid and owner_id=$1::text",[ADMIN_ID])).rows[0].n,3);
  assert.equal((await inventory(db)).schemaHash,data.schemaHash);
}));

test("rinuncia esplicita al backup DB: SQL consentito, byte Storage intatti e copie ancora obbligatorie per prune",()=>usingFixture(async db=>{
  const before=await inventory(db);
  assert.throws(()=>cleanupSql(before,{database:{skippedByOperator:false},storagePending:true}),/rinuncia esplicita/);
  assert.throws(()=>cleanupSql(before,{database:{skippedByOperator:true}}),/copie di sicurezza/);
  const sql=cleanupSql(before,{database:{skippedByOperator:true},storagePending:true,storage:[]});
  await db.exec(sql);
  const after=await inventory(db);
  assert.equal(after.deleteAuthIds.length,0);
  assert.equal(after.objects.length,before.objects.length);
  assert.deepEqual(after.announcements,[]);
}));

test("inventario obsoleto: cambi a contenuti o schema impediscono qualsiasi cancellazione",()=>usingFixture(async db=>{
  let data=await inventory(db);
  await db.exec("update public.annuncio set titolo_annuncio='Modifica dopo inventario' where uuid='"+cleanupId(301)+"'");
  await failedSql(db,cleanupSql(data,backups),/CLEANUP_INVENTORY_CHANGED/);
  assert.equal((await db.query("select count(*) n from auth.users")).rows[0].n,3);
  data=await inventory(db);
  await db.exec("create table public.dato_non_classificato(id integer)");
  await failedSql(db,cleanupSql(data,backups),/CLEANUP_INVENTORY_CHANGED/);
  const changed=await inventory(db);
  assert.throws(()=>validateInventory(changed),/classificare/);
}));

test("identità, segnalazioni, canali, pagamenti e tabelle sconosciute devono essere classificati prima di preparare SQL",()=>usingFixture(async db=>{
  const data=await inventory(db);
  assert.throws(()=>cleanupSql({...data,admin:{...data.admin,id:cleanupId(2)}},backups),/Identità admin/);
  assert.doesNotThrow(()=>cleanupSql({...data,reports:[]},backups));
  assert.throws(()=>cleanupSql({...data,channels:data.channels.slice(1)},backups),/18 concordati/);
  assert.throws(()=>cleanupSql({...data,tables:[...data.tables,{name:"public.sconosciuta",count:0,hash:"a".repeat(32)}]},backups),/classificare/);
  assert.throws(()=>cleanupSql(data,{}),/copie di sicurezza/);
  await db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1",[cleanupId(301)]);
  const paymentData=await inventory(db);
  assert.equal(paymentData.paymentBlockers.length,1);
  await db.exec(cleanupSql(paymentData,backups));
  assert.equal((await inventory(db)).announcements.length,0);
}));

test("errore tardivo dopo DELETE: rollback ripristina account, file, storico e trigger",()=>usingFixture(async db=>{
  await db.exec(`create function private.synthetic_failure() returns trigger language plpgsql as $$ begin
    raise exception 'SYNTHETIC_DELETE_FAILURE'; end $$;
    create trigger synthetic_failure before delete on auth.users for each row execute function private.synthetic_failure();`);
  const before=await inventory(db);
  await failedSql(db,cleanupSql(before,backups),/SYNTHETIC_DELETE_FAILURE/);
  assert.deepEqual(stable(await inventory(db)),stable(before));
  assert.equal((await db.query("select tgenabled from pg_trigger where tgname='zz_guard_announcement_trash_v1'")).rows[0].tgenabled,"O");
}));

test("modifiche indirette ai dati protetti causano rollback anche se il trigger non fallisce",()=>usingFixture(async db=>{
  await db.exec(`create function private.synthetic_corruption() returns trigger language plpgsql as $$ begin
    update private.distribution_channel_v1 set name='Corruzione involontaria';return old;end $$;
    create trigger synthetic_corruption before delete on auth.users for each row execute function private.synthetic_corruption();`);
  const before=await inventory(db);
  await failedSql(db,cleanupSql(before,backups),/CLEANUP_PROTECTED_DATA_CHANGED/);
  assert.deepEqual(stable(await inventory(db)),stable(before));
}));

test("trasferimento proprietà compatibile con il timestamp Storage; nessuna modifica a byte o percorsi",()=>usingFixture(async db=>{
  await db.exec(`create function storage.synthetic_touch() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
    create trigger synthetic_touch before update on storage.objects for each row execute function storage.synthetic_touch();`);
  const before=await inventory(db);
  await db.exec(cleanupSql(before,backups));
  const after=await inventory(db);
  assert.deepEqual(after.objects.map(o=>[o.id,o.name,o.metadata]),before.objects.map(o=>[o.id,o.name,o.metadata]));
  assert.ok(after.objects.every(o=>o.owner===ADMIN_ID));
}));

test("Storage: reset include anche immagini referenziate; bucket e oggetti sconosciuti bloccati",()=>usingFixture(async db=>{
  const data=await inventory(db),candidate=data.objects.find(o=>o.id===cleanupId(903));
  const shared={...data,references:[...data.references,{bucket:"immagini_profili",url:"https://fixture.supabase.co/storage/v1/object/sign/immagini_profili/author%2Fremove.jpg?token=private",keep:true}]};
  assert.equal(classifyStorage(shared).remove.length,3);
  assert.equal(classifyStorage({...data,references:[...data.references,{bucket:"immagini_profili",url:"/storage/v1/object/public/immagini_profili/author/remove.jpg",keep:true}]}).remove.length,3);
  assert.throws(()=>classifyStorage({...data,objects:[...data.objects,{...candidate,id:cleanupId(904),bucket:"unknown",name:"x"}]}),/classificare/);
  assert.equal(classifyStorage({...data,references:[...data.references,{bucket:"immagini_profili",path:"missing.jpg",keep:true}]}).remove.length,3);
}));

function storageClient(objects,{refs={},changed=false,failDownload=false}={}) {
  const removed=[];
  return {removed,storage:{from:bucket=>({
    info:async name=>({data:{id:objects.find(o=>o.bucket===bucket&&o.name===name)?.id,updatedAt:objects.find(o=>o.bucket===bucket&&o.name===name)?.updatedAt},error:null}),
    download:async()=>({data:new Blob([changed?"BAD":"abc"]),error:failDownload?{message:"failure"}:null}),
    remove:async names=>{removed.push(...names.map(name=>`${bucket}/${name}`));return {error:null};},
  })},from:table=>({select:()=>({order:()=>({range:async()=>({data:refs[table]??[],error:null})})})})};
}

test("upload gestiti senza owner e immagini condivise eliminabili; logo conservato",()=>usingFixture(async db=>{
  const data=await inventory(db);
  const orphan={...data.objects[0],id:cleanupId(904),bucket:"immagini_annunci",owner:null,name:`${cleanupId(2)}/${cleanupId(905)}/${"a".repeat(64)}.jpg`};
  const logo={...orphan,id:cleanupId(906),bucket:"foto_profilo",name:"bachecadilettanti.png"};
  const withUploads={...data,objects:[...data.objects,orphan,logo]};
  const result=classifyStorage(withUploads);
  assert.ok(result.remove.some(o=>o.id===orphan.id));
  assert.ok(result.keep.some(o=>o.id===logo.id));
  assert.ok(!result.remove.some(o=>o.id===logo.id));
  assert.ok(classifyStorage({...withUploads,references:[...data.references,{bucket:orphan.bucket,url:orphan.name,keep:true}]}).remove.some(o=>o.id===orphan.id));
  assert.throws(()=>classifyStorage({...data,objects:[...data.objects,{...orphan,name:"unrecognized.jpg"}]}),/immagini_annunci\/unrecognized.jpg/);
}));

test("backup e prune di orfani service-role senza proprietario e con timestamp S3 diverso da SQL",()=>usingFixture(async db=>{
  const directory=await mkdtemp(join(tmpdir(),"bd-cleanup-"));
  try {
    const name=`${cleanupId(2)}/${cleanupId(905)}/${"a".repeat(64)}.jpg`;
    await db.query("insert into storage.objects(id,bucket_id,name,owner,owner_id,metadata) values($1,'immagini_annunci',$2,null,null,'{\"size\":3,\"lastModified\":\"2025-12-31T00:00:00Z\"}')",[cleanupId(904),name]);
    const before=await inventory(db);
    function client(objects) {
      const c=storageClient(objects),original=c.storage.from;
      c.storage.from=bucket=>({...original(bucket),info:async name=>{
        const o=objects.find(o=>o.bucket===bucket&&o.name===name);
        return {data:{id:o.id,lastModified:o.metadata?.lastModified??o.updatedAt},error:null};
      }});
      return c;
    }
    assert.equal(await backupStorage(client(before.objects),before,directory),4);
    await db.exec(cleanupSql(before,backups));
    const after=await inventory(db),c=client(after.objects);
    assert.equal(after.objects.find(o=>o.id===cleanupId(904)).owner,null);
    assert.equal((await pruneStorage(c,before,after,directory,{apply:true})).removed,4);
    assert.ok(c.removed.includes(`immagini_annunci/${name}`));
    const modified=structuredClone(before);
    modified.objects.find(o=>o.id===cleanupId(904)).metadata.lastModified="2020-01-01Z";
    await assert.rejects(backupStorage(client(before.objects),modified,directory),/Oggetto Storage cambiato/);
  } finally {
    assert.equal(dirname(resolve(directory)),resolve(tmpdir()));
    await rm(directory,{recursive:true,force:true});
  }
}));

test("backup e rimozione Storage via API: preflight, hash, nuove referenze, dry-run, nessun segreto o rete",()=>usingFixture(async db=>{
  const directory=await mkdtemp(join(tmpdir(),"bd-cleanup-"));
  try {
    const before=await inventory(db),client=storageClient(before.objects);
    await assert.rejects(fileDigest(join(directory,"missing.dump")),/Backup database non trovato/);
    await assert.rejects(storageBackups(before,directory),/Esegui prima il comando backup-storage/);
    assert.equal(await backupStorage(client,before,directory),3);
    assert.equal((await storageBackups(before,directory)).length,3);
    await db.exec(cleanupSql(before,backups));
    const after=await inventory(db);
    assert.deepEqual(await pruneStorage(storageClient(after.objects),before,after,directory),{candidates:3,removed:0});
    await assert.rejects(pruneStorage(storageClient(after.objects,{changed:true}),before,after,directory,{apply:true}),/Contenuto Storage cambiato/);
    await assert.rejects(pruneStorage(storageClient(after.objects,{refs:{media_profilo:[{link_media:"https://fixture.supabase.co/storage/v1/object/public/immagini_profili/author%2Fremove.jpg"}]}}),before,after,directory,{apply:true}),/nuovamente referenziato/);
    const deletion=storageClient(after.objects);
    assert.equal((await pruneStorage(deletion,before,after,directory,{apply:true})).removed,3);
    assert.equal(deletion.removed.length,3);
    const index=JSON.parse(await readFile(join(directory,"index.json"),"utf8"));
    await writeFile(join(directory,index[0].file),"tampered");
    await assert.rejects(storageBackups(before,directory),/Copia Storage non valida/);
    const dbBackup=join(directory,"backup.dump");await writeFile(dbBackup,"fixture backup");
    assert.equal((await fileDigest(dbBackup)).sha256,createHash("sha256").update("fixture backup").digest("hex"));
  } finally {
    assert.equal(dirname(resolve(directory)),resolve(tmpdir()));
    await rm(directory,{recursive:true,force:true});
  }
}));

test("canali autorizzati corrispondono alla migrazione originale",async()=>{
  const source=await readFile(new URL("../supabase/migrations/20261116144004_admin_distribution_regional_channels.sql",import.meta.url),"utf8");
  assert.deepEqual([...source.matchAll(/'(0029[A-Za-z0-9]+)'/g)].map(m=>m[1]).sort(),CHANNEL_KEYS);
  assert.equal(await readFile(new URL("../supabase/scripts/testing_cleanup_inventory.sql",import.meta.url),"utf8"),inventorySql);
});

test("compatibilità info: lastModified SQL o S3; ID assente richiede ETag; byte diversi bloccano il backup",()=>usingFixture(async db=>{
  const directory=await mkdtemp(join(tmpdir(),"bd-cleanup-"));
  try {
    const data=await inventory(db);
    for(const o of data.objects) o.metadata={...o.metadata,lastModified:"2025-12-31T00:00:00Z",eTag:'"900150983cd24fb0d6963f7d28e17f72"'};
    function client({clock="sql",omitId=false,wrongTag=false,changed=false}={}) {
      const c=storageClient(data.objects,{changed}),original=c.storage.from;
      c.storage.from=bucket=>({...original(bucket),info:async name=>{
        const o=data.objects.find(o=>o.bucket===bucket&&o.name===name);
        return {data:{...(omitId?{}:{id:o.id}),size:3,etag:wrongTag?"0".repeat(32):o.metadata.eTag,lastModified:clock==="sql"?o.updatedAt:o.metadata.lastModified},error:null};
      }});
      return c;
    }
    assert.equal(await backupStorage(client(),data,directory),3);
    assert.equal(await backupStorage(client({clock:"s3"}),data,directory),3);
    assert.equal(await backupStorage(client({omitId:true}),data,directory),3);
    await assert.rejects(backupStorage(client({wrongTag:true}),data,directory),/Oggetto Storage cambiato/);
    await assert.rejects(backupStorage(client({changed:true}),data,directory),/Contenuto Storage diverso/);
  } finally {
    assert.equal(dirname(resolve(directory)),resolve(tmpdir()));
    await rm(directory,{recursive:true,force:true});
  }
}));

test("integrazione sulla fixture delle migrazioni Admin: moderazione, profili, community e distribuzione",async()=>{
  const h=await createDistributionFixture();
  try {
    await h.db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'bachecadilettanti@gmail.com',now())",[ADMIN_ID]);
    await h.db.query("insert into public.utente(utente_uuid,auth_user_uuid,tipologia_utente) values($1,$2,'Admin')",[cleanupId(101),ADMIN_ID]);
    await h.insert(900);
    await h.db.exec("update public.annuncio set nascosto=true,oscurato_da_admin=true,eliminato_il='2026-01-02Z',eliminato_da='"+ADMIN_ID+"'");
    await h.db.exec("insert into private.segnalazioni(uuid_annuncio,motivazione) select uuid,'Segnalazione da conservare' from public.annuncio cross join generate_series(1,4) limit 4");
    await h.db.exec(await readFile(new URL("../supabase/migrations/20261116144004_admin_distribution_regional_channels.sql",import.meta.url),"utf8"));
    const before=await inventory(h.db);
    assert.ok(before.tables.some(t=>t.name==="public.profile_type_state"));
    await h.db.exec(cleanupSql(before,{database:backups.database,storage:[]}));
    const after=await inventory(h.db);
    assert.equal(after.deleteAuthIds.length,0);assert.equal(after.reports.length,0);assert.equal(after.channels.length,18);
    assert.deepEqual(after.announcements,[]);assert.equal(after.schemaHash,before.schemaHash);
  } finally {await h.db.close();}
});
