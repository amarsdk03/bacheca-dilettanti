import assert from "node:assert/strict";
import { test } from "node:test";
import { createAnnouncementFixture, announcementListMigration, announcementTypes, listActor, listClaims, listId } from "./helpers/admin-announcements-fixture.mjs";

test("Admin announcement list on synthetic PostgreSQL", async (t) => {
  const h = await createAnnouncementFixture(); const { db,list,insert,reset,callAs } = h;
  t.after(() => db.close());
  const scenario = (name, run) => t.test(name, async () => { await reset(); await run(); });
  await scenario("explicit ACL/owner/search path and index, no new direct table access", async () => {
    const rows = (await db.query(`select n.nspname,p.prosecdef,p.proowner::regrole::text as owner,p.proconfig,p.proacl::text as acl
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('list_admin_announcements_v1','admin_list_announcements_v1')`)).rows;
    assert.equal(rows.length,2);
    for (const row of rows) { assert.equal(row.owner,"postgres"); assert(row.proconfig.includes('search_path=""')); assert(!/(?:^\{|,)=X\//.test(row.acl)); }
    assert.equal(rows.find((r)=>r.nspname==="public").prosecdef,false); assert.equal(rows.find((r)=>r.nspname==="private").prosecdef,true);
    assert.match((await db.query("select indexdef from pg_indexes where indexname='annuncio_admin_order_v1_idx'")).rows[0].indexdef,/creato_il DESC NULLS LAST, uuid DESC/);
    await assert.rejects(callAs("authenticated",listClaims(),"select * from public.annuncio"),/permission denied/);
  });
  await scenario("empty list remains an authorized result", async () => { assert.deepEqual(await list(),{items:[],hasMore:false,nextCursor:null}); });
  for (const role of ["anon","service_role"]) await scenario(`${role} cannot call list even with human Admin claims`, async () => {
    await assert.rejects(list({},listClaims(),role),/permission denied|ADMIN_ACCESS_DENIED/);
    await assert.rejects(callAs(role,listClaims(),"select private.list_admin_announcements_v1('{}')"),/permission denied|ADMIN_ACCESS_DENIED/);
  });
  for (const role of ["Utente","admin","ADMIN","Admin "," Admin"]) await scenario(`exact Admin required, not ${JSON.stringify(role)}`,async()=>{
    await db.query("update public.utente set tipologia_utente=$1 where utente_uuid=$2",[role,listActor.userId]);
    await assert.rejects(list({},listClaims({user_metadata:{role:"Admin"}})),/ADMIN_ACCESS_DENIED/);
  });
  for (const [name,sql] of [
    ["revoked session","delete from auth.sessions"],
    ["unconfirmed email","update auth.users set email_confirmed_at=null"],
    ["unreviewed policy","update private.admin_session_policy_v1 set verified_at=null"],
  ]) await scenario(`${name} prevents data and validation disclosure`,async()=>{
    await insert(1000); await db.exec(sql); await assert.rejects(list({limit:999}),/ADMIN_ACCESS_DENIED|ADMIN_SESSION_POLICY_UNVERIFIED/);
  });
  await scenario("expired JWT and service claims never authorize list",async()=>{
    await assert.rejects(list({},listClaims({exp:1})),/ADMIN_ACCESS_DENIED/);
    await assert.rejects(list({},listClaims({role:"service_role"})),/ADMIN_ACCESS_DENIED/);
  });
  await scenario("private bridge checks human identity when called directly",async()=>{
    await insert(1000);
    assert.equal((await callAs("authenticated",listClaims(),"select private.list_admin_announcements_v1('{}') as page")).rows[0].page.items.length,1);
    await assert.rejects(callAs("authenticated",listClaims({sub:listId(2),session_id:listId(502)}),"select private.list_admin_announcements_v1('{}')"),/ADMIN_ACCESS_DENIED/);
  });
  await scenario("technical caller stays denied even through an accidental privileged wrapper",async()=>{
    await insert(1000);
    await db.exec(`create function public.test_list_definer_proxy() returns jsonb language sql security definer set search_path='' as $$
      select private.list_admin_announcements_v1('{}'); $$;
      revoke all on function public.test_list_definer_proxy() from public;
      grant execute on function public.test_list_definer_proxy() to service_role;`);
    try {
      await assert.rejects(callAs("service_role",listClaims(),"select public.test_list_definer_proxy()"),/ADMIN_ACCESS_DENIED/);
    } finally { await db.exec("drop function public.test_list_definer_proxy()"); }
  });
  await scenario("page maximum is 30 and lookahead never leaks a 31st item",async()=>{
    for(let n=1000;n<1035;n++) await insert(n);
    const first=await list(); assert.equal(first.items.length,30); assert.equal(first.hasMore,true);
    assert.equal(first.nextCursor.createdAt,"2026-01-01T12:00:00.123456Z");
    const second=await list({cursor:first.nextCursor}); assert.equal(second.items.length,5); assert.equal(second.hasMore,false); assert.equal(second.nextCursor,null);
    assert.equal(new Set([...first.items,...second.items].map((r)=>r.id)).size,35);
  });
  await scenario("keyset preserves microseconds, ties and NULLS LAST after the cursor row is deleted",async()=>{
    for(const [n,date] of [[1000,"2026-01-01T12:00:00.000002Z"],[1001,"2026-01-01T12:00:00.000001Z"],[1002,"2026-01-01T12:00:00.000001Z"],[1003,null],[1004,null]]) await insert(n,{createdAt:date});
    let page=await list({limit:2}); assert.deepEqual(page.items.map((r)=>r.id),[listId(1000),listId(1002)]);
    const cursor=page.nextCursor; await db.query("delete from public.annuncio where uuid=$1",[cursor.id]);
    page=await list({limit:2,cursor}); assert.deepEqual(page.items.map((r)=>r.id),[listId(1001),listId(1004)]);
    assert.equal(page.nextCursor.createdAt,null);
    page=await list({limit:2,cursor:page.nextCursor}); assert.deepEqual(page.items.map((r)=>r.id),[listId(1003)]);
  });
  await scenario("cursor is bound to filters but can change page size",async()=>{
    await insert(1000); await insert(1001); const page=await list({limit:1});
    await assert.rejects(list({limit:1,status:"pubblicato",cursor:page.nextCursor}),/QUERY_INVALID/);
    assert.equal((await list({limit:30,cursor:page.nextCursor})).items.length,1);
  });
  await scenario("historical 07A database cursor preserves Unicode normalization", async()=>{
    await insert(1000,{title:"Équipe 😀"}); await insert(1001,{title:"Équipe 😀"});
    const search="\uFEFF\u00A0\tÉquipe 😀\u3000\u2028";
    const first=await list({search,limit:1});
    assert.equal(first.items[0].id,listId(1001)); assert.equal(first.nextCursor.filters.search,search.trim());
    const second=await list({search,limit:1,cursor:first.nextCursor});
    assert.equal(second.items[0].id,listId(1000)); assert.equal(second.nextCursor,null);
  });
  const invalidQueries=[null,[],{extra:true},{limit:0},{limit:31},{limit:1.5},{limit:"30"},{limit:null},{search:null},{search:3},{search:"x".repeat(201)},
    {status:"Pubblicato"},{type:"annuncio_creator"},{visibility:"visible"},{visibility:null},{cursor:[]},{cursor:{}},
    {cursor:{v:1,id:listId(1000),createdAt:"2026-02-31T12:00:00.000000Z",filters:{search:"",status:null,type:null,visibility:"all"}}}];
  for (const query of invalidQueries) await scenario(`invalid query is bounded ${JSON.stringify(query).slice(0,110)}`,async()=>{
    await assert.rejects(list(query),(error)=>error.code==="22023"&&error.message==="ADMIN_ANNOUNCEMENT_QUERY_INVALID");
  });
  await scenario("literal search escapes percent, underscore and backslash; UUID is exact/case-insensitive",async()=>{
    await insert(1000,{title:"Club 100%_\\ ricerca"}); await insert(1001,{title:"Club 100XXX ricerca"});
    for(const search of ["100%_\\"," RICERCA ",listId(1000).toUpperCase()]) {
      const page=await list({search}); assert(page.items.some((r)=>r.id===listId(1000)));
      if(search!==" RICERCA ") assert.equal(page.items.length,1);
    }
    assert.equal((await list({search:"%"})).items.length,1); assert.equal((await list({search:"_"})).items.length,1);
  });
  await scenario("status, privacy and hidden are independent, including unknown NULL values",async()=>{
    await insert(1000,{status:"pubblicato",hidden:false,private:true});
    await insert(1001,{status:"legacy",hidden:null,private:null});
    await insert(1002,{status:null,hidden:true,private:false});
    const shown=await list({status:"pubblicato",visibility:"shown",type:"annuncio_giocatore"});
    assert.equal(shown.items.length,1); assert.equal(shown.items[0].private,true);
    assert.equal((await list({visibility:"unknown"})).items[0].status,"legacy");
    assert.equal((await list({visibility:"hidden"})).items[0].status,null);
    assert.equal((await list()).items.length,3);
  });
  await scenario("all eleven types use the correct public subprofile, without join fanout",async()=>{
    for(let i=0;i<announcementTypes.length;i++) await insert(1000+i,{type:announcementTypes[i]});
    await db.query("insert into public.profilo_giocatore(uuid_profilo,nome) values($1,'Duplicate later')",[listActor.profileId]);
    const page=await list(); assert.equal(page.items.length,11); assert(page.items.every((r)=>r.author.available));
    assert.equal(page.items.find((r)=>r.type==="annuncio_creators").author.displayName,"Creator pubblico");
    assert.equal(page.items.find((r)=>r.type==="annuncio_giocatore").author.displayName,"Nome Pubblico");
  });
  for(const [table,type,label] of [["profilo_giocatore","annuncio_giocatore","Giocatore"],["profilo_squadra","annuncio_squadra_cerca_sponsor","Squadra"],
    ["profilo_staff_sportivo","annuncio_staff_sportivo","Staff sportivo"],["profilo_arbitro","annuncio_arbitro","Arbitro"]]) {
    await scenario(`anonymous ${type} never exposes real name or account contacts`,async()=>{
      await db.exec(`update public.${table} set nominativo_anonimo=true`); await insert(1000,{type});
      const page=await list(); assert.equal(page.items[0].author.displayName,label); assert.equal(page.items[0].author.anonymous,true);
      const serialized=JSON.stringify(page); assert(!serialized.includes("Nome")); assert(!serialized.includes("Pubblico")); assert(!serialized.includes("secret@example.test"));
      assert(!serialized.includes(listActor.authId)); assert(!serialized.includes('"auth_user_uuid"'));
    });
  }
  await scenario("missing/hidden profiles and unknown types retain announcements with safe fallbacks",async()=>{
    await insert(1000,{profileId:null}); await insert(1001,{profileId:listId(999)}); await insert(1002,{type:"legacy_type"});
    await insert(1003); await db.exec("update public.profilo set nascosto=true");
    const page=await list(); assert.equal(page.items.length,4);
    assert(page.items.every((r)=>r.author.displayName==="Profilo non disponibile"&&!r.author.available));
    assert.equal(page.items.find((r)=>r.id===listId(1002)).type,"legacy_type");
  });
  await scenario("base fingerprint changes without relying on timestamps; timezone is fixed",async()=>{
    await insert(1000); const original=(await list()).items[0];
    await db.exec("set timezone='Pacific/Auckland'");
    assert.equal((await list()).items[0].rowFingerprint,original.rowFingerprint);
    await db.query("update public.annuncio set titolo_annuncio='Changed' where uuid=$1",[original.id]);
    assert.notEqual((await list()).items[0].rowFingerprint,original.rowFingerprint);
    assert.equal((await list()).items[0].updatedAt,null); await db.exec("set timezone='UTC'");
  });
  await scenario("role revocation affects the next list operation",async()=>{
    await insert(1000); assert.equal((await list()).items.length,1);
    await db.query("update public.utente set tipologia_utente='Utente' where utente_uuid=$1",[listActor.userId]);
    await assert.rejects(list(),/ADMIN_ACCESS_DENIED/);
  });
  await scenario("representative ordered scan uses index and RPC remains bounded at 1/30 results",async()=>{
    await db.query(`insert into public.annuncio(uuid,creato_da,creato_il,titolo_annuncio)
      select md5(n::text)::uuid,$1::uuid,'2025-01-01'::timestamptz+n*interval '1 second','Synthetic '||n from generate_series(1,12000) n`,[listActor.authorId]);
    await db.exec("analyze public.annuncio");
    const plan=(await db.query(`explain (analyze,buffers,format json) select a.* from public.annuncio a order by creato_il desc nulls last,uuid desc limit 31`)).rows[0]["QUERY PLAN"];
    assert(JSON.stringify(plan).includes("annuncio_admin_order_v1_idx"));
    const measures=[];
    for(const limit of [1,30]) { const start=performance.now(); const page=await list({limit}); measures.push({limit,returned:page.items.length,elapsedMs:+(performance.now()-start).toFixed(2)}); assert.equal(page.items.length,limit); }
    t.diagnostic("Synthetic PGlite ordered base scan (not gateway/full RPC EXPLAIN): "+JSON.stringify(plan[0].Plan));
    t.diagnostic("Synthetic in-process RPC timings, no latency guarantee: "+JSON.stringify(measures));
  });
});

test("migration fails transactionally when required schema is missing",async()=>{
  const {db}=await createAnnouncementFixture({apply:false});
  try {
    await db.exec("drop table public.profilo_creator");
    await assert.rejects(db.exec(announcementListMigration),/ADMIN_ANNOUNCEMENT_SCHEMA_REQUIRED/);
    await db.exec("rollback");
    assert.equal((await db.query("select to_regprocedure('public.admin_list_announcements_v1(jsonb)') as rpc")).rows[0].rpc,null);
    assert.equal((await db.query("select to_regclass('public.annuncio_admin_order_v1_idx') as idx")).rows[0].idx,null);
  } finally { await db.close(); }
});
