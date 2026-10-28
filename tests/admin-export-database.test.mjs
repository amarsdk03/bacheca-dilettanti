import assert from "node:assert/strict";
import { test } from "node:test";
import { createExportFixture, selection } from "./helpers/admin-export-fixture.mjs";
import { listId as id,listActor as actor,listClaims } from "./helpers/admin-announcements-fixture.mjs";

test("current-page export with atomic audit on synthetic PostgreSQL",async t=>{
  const h=await createExportFixture(),{db}=h;t.after(()=>db.close());
  const scenario=async(name,fn)=>t.test(name,async()=>{await h.reset();await db.exec("truncate private.admin_audit_event_v1");await fn();});
  const events=async()=>(await db.query("select * from private.admin_audit_event_v1 where action='announcement.export' order by occurred_at")).rows;
  await scenario("explicit wrapper/bridge ACL and preserved legacy audit contract",async()=>{
    const rows=(await db.query("select n.nspname,p.prosecdef,p.provolatile,p.proconfig,pg_get_userbyid(p.proowner) as owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where proname in ('export_admin_announcements_v1','admin_export_announcements_v1') order by n.nspname")).rows;
    assert.equal(rows.length,2);assert(rows[0].prosecdef);assert(!rows[1].prosecdef);assert(rows.every(r=>r.owner==='postgres'&&r.provolatile==='v'&&r.proconfig.includes('search_path=""')));
    for(const role of ['anon','service_role']) assert(!(await db.query("select has_function_privilege($1,'public.admin_export_announcements_v1(jsonb,jsonb)','execute') as allowed",[role])).rows[0].allowed);
    assert((await db.query("select private.admin_audit_payload_valid_v1('announcement.export','success',null,null,'{}','{\"row_count\":0}') as valid")).rows[0].valid);
  });
  for(const size of [1,30]) await scenario(`exports exactly ${size} ordered rows and audits their IDs without contents`,async()=>{
    for(let n=0;n<size;n++)await h.insert(1000+n);
    const page=await h.list(),rows=selection(page.items),result=await h.exportPage({},rows);
    assert.equal(result.status,'ok');assert.deepEqual(result.items,page.items);assert.equal(result.items.length,size);
    const [event]=await events();assert.equal(event.actor_utente_uuid,actor.userId);assert.equal(event.resource_type,'announcement_export');assert.equal(event.event_uuid,result.eventId);assert.equal(event.correlation_uuid,result.correlationId);
    assert.deepEqual(event.details.announcement_ids,rows.map(r=>r.id));assert.equal(event.details.row_count,size);assert.equal(event.details.columns.length,6);
    assert(!JSON.stringify(event).includes('Titolo'));assert(!JSON.stringify(event).includes('Pubblico'));
  });
  await scenario("lookahead never exports the next page and deep cursor preserves selection order",async()=>{
    for(let n=0;n<35;n++)await h.insert(1000+n);
    const first=await h.list();const second=await h.list({cursor:first.nextCursor});
    const result=await h.exportPage({cursor:first.nextCursor},selection(second.items));assert.equal(result.status,'ok');assert.equal(result.items.length,5);assert.deepEqual(result.items.map(r=>r.id),second.items.map(r=>r.id));
    assert.equal((await h.exportPage({},selection(second.items))).status,'conflict');assert.equal((await events()).length,1);
  });
  await scenario("empty, duplicate, excessive, forged or malformed selections never produce a success event",async()=>{
    await h.insert(1000);const rows=selection((await h.list()).items);
    for(const value of [null,{},[],Array(31).fill(rows[0]),[rows[0],rows[0]],[{...rows[0],id:'bad'}],[{...rows[0],rowFingerprint:'bad'}],[{...rows[0],authorName:null}],[{...rows[0],extra:true}]]) assert.equal((await h.exportPage({},value)).status,'invalid');
    assert.equal((await h.exportPage({},[{...rows[0],id:id(9999)}])).status,'conflict');
    for(const query of [null,[],{extra:true},{limit:1},{limit:31},{limit:null},{cursor:{v:1}},{trash:'Only'}]) assert.equal((await h.exportPage(query,rows)).status,'invalid');
    assert.deepEqual(await events(),[]);
  });
  for(const change of ['update','delete','insert','author','order']) await scenario(`a ${change} changing the page requires refresh, with no substitute or audit success`,async()=>{
    await h.insert(1000);await h.insert(1001);const rows=selection((await h.list()).items);
    if(change==='update')await db.query("update public.annuncio set titolo_annuncio='Changed' where uuid=$1",[id(1000)]);
    if(change==='delete')await db.query("delete from public.annuncio where uuid=$1",[id(1000)]);
    if(change==='insert')await h.insert(1002);
    if(change==='author')await db.query("update public.profilo_giocatore set nome='Changed' where uuid_profilo=$1",[actor.profileId]);
    if(change==='order')rows.reverse();
    const result=await h.exportPage({},rows);assert.equal(result.status,'conflict');assert(!('items'in result));assert.deepEqual(await events(),[]);
  });
  await scenario("exact filters and trash scope are honored without enabling trash actions",async()=>{
    await h.insert(1000,{status:'pubblicato'});await h.insert(1001,{status:'rifiutato'});
    await db.query("update public.annuncio set eliminato_il=now(),eliminato_da=$2,nascosto=true,oscurato_da_admin=true where uuid=$1",[id(1000),actor.userId]);
    for(const query of [{trash:'only'},{trash:'all'},{status:'rifiutato'}]) {
      const page=await h.list(query);assert.equal((await h.exportPage(query,selection(page.items))).status,'ok');
    }
    assert.equal((await h.exportPage({},selection((await h.list({trash:'only'})).items))).status,'conflict');
    assert.equal((await events()).length,3);
  });
  await scenario("audit outage rolls back the success and withholds every row",async()=>{
    await h.insert(1000);const rows=selection((await h.list()).items);
    await db.exec("create function private.fail_export_audit() returns trigger language plpgsql as $$begin raise exception 'private audit error'; end$$;create trigger fail_export_audit before insert on private.admin_audit_event_v1 for each row execute function private.fail_export_audit()");
    try{const result=await h.exportPage({},rows);assert.equal(result.status,'unavailable');assert(!('items'in result));assert(!JSON.stringify(result).includes('private'));assert.deepEqual(await events(),[]);}
    finally{await db.exec("drop trigger fail_export_audit on private.admin_audit_event_v1;drop function private.fail_export_audit()");}
  });
  await scenario("forged resource arrays cannot enter audit through the extended validator",async()=>{
    for(const ids of [[id(1),id(1)],['BAD'],[null],[id(1),id(2)]]) {
      const details={row_count:ids.length===2&&ids[0]!==ids[1]?1:ids.length,announcement_ids:ids};
      assert(!(await db.query("select private.admin_audit_payload_valid_v1('announcement.export','success',null,null,'{}',$1::jsonb) as valid",[JSON.stringify(details)])).rows[0].valid);
    }
  });
  for(const kind of ['Utente','admin','ADMIN','Admin ']) await scenario(`role ${JSON.stringify(kind)} cannot export even with current Admin claims`,async()=>{
    await h.insert(1000);const rows=selection((await h.list()).items);await db.query("update public.utente set tipologia_utente=$1 where utente_uuid=$2",[kind,actor.userId]);
    await assert.rejects(h.exportPage({},rows),/ADMIN_ACCESS_DENIED/);assert.deepEqual(await events(),[]);
  });
  await scenario("revoked sessions and technical roles are denied, including direct bridge calls",async()=>{
    await h.insert(1000);const rows=selection((await h.list()).items);
    for(const role of ['anon','service_role'])await assert.rejects(h.exportPage({},rows,listClaims(),role),/permission denied|ADMIN_ACCESS_DENIED/);
    await db.query("delete from auth.sessions where id=$1",[actor.sessionId]);
    await assert.rejects(h.exportPage({},rows),/ADMIN_ACCESS_DENIED/);
    await assert.rejects(h.callAs('authenticated',listClaims(),"select private.export_admin_announcements_v1('{}',$1::jsonb)",[JSON.stringify(rows)]),/ADMIN_ACCESS_DENIED/);
    assert.deepEqual(await events(),[]);
  });
  await scenario("the technical audit bridge still cannot attest export success",async()=>{
    await assert.rejects(h.callAs('service_role',listClaims({role:'service_role'}),"select public.admin_record_server_audit_v1('announcement.export','success',$1,$2,$3)",[id(3000),actor.authId,actor.userId]),/ADMIN_SERVER_AUDIT_EVENT_INVALID/);
    assert.deepEqual(await events(),[]);
  });
});
