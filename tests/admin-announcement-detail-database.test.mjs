import assert from "node:assert/strict";
import { test } from "node:test";
import { createDetailFixture, detailMigration } from "./helpers/admin-announcement-detail-fixture.mjs";
import { announcementTypes, listActor, listClaims, listId } from "./helpers/admin-announcements-fixture.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const load=adminServerLoader();
const { DETAIL_FIELDS }=load("apps/admin/src/features/annunci/detail-fields.ts");
const { parseDetailResponse }=load("apps/admin/src/features/annunci/server/detail-response.ts");
const id=listId(1000);
const history={id:"row-1",titolo:"Titolo",ente:"Organizzazione",periodoDa:"2020",periodoA:"oggi",descrizione:"Descrizione",stato:"non-specificare"};
const samples={ text:"Testo dell’annuncio",number:25,boolean:false,strings:["Calcio a 11"],history:[history],
  schedule:[{giorno:"lunedi",attivo:true,dalle:"09:00",alle:"18:00"}],prizes:[{id:"premio-1",posto:"1",titoloPremio:"Trofeo"}] };

test("Admin announcement detail on synthetic PostgreSQL",async(t)=>{
  const h=await createDetailFixture(); const {db,reset,insert,child,detail,callAs}=h; t.after(()=>db.close());
  const scenario=(name,run)=>t.test(name,async()=>{await reset();await run();});
  const seed=async(type="annuncio_giocatore",values={})=>{await insert(1000,{type});await child(id,type,values);};
  await scenario("owners, ACL and search paths constrain public/technical callers",async()=>{
    const funcs=(await db.query(`select n.nspname,p.proname,p.prosecdef,p.proowner::regrole::text as owner,p.proconfig,
      has_function_privilege('anon',p.oid,'execute') as anon,has_function_privilege('service_role',p.oid,'execute') as technical,
      has_function_privilege('authenticated',p.oid,'execute') as human
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where p.proname in ('admin_get_announcement_v1','get_admin_announcement_v1','admin_announcement_detail_spec_v1','admin_announcement_snapshot_v1','admin_announcement_author_v1','admin_announcement_field_v1')`)).rows;
    assert.equal(funcs.length,6);
    for(const f of funcs){assert.equal(f.owner,"postgres");assert(f.proconfig.includes('search_path=""'));assert(!f.anon&&!f.technical);
      assert.equal(f.human,["admin_get_announcement_v1","get_admin_announcement_v1"].includes(f.proname));}
    assert.equal(funcs.find(f=>f.proname==="admin_get_announcement_v1").prosecdef,false);
    assert.equal(funcs.find(f=>f.proname==="get_admin_announcement_v1").prosecdef,true);
    for(const role of ["authenticated","service_role","anon"]) await assert.rejects(callAs(role,listClaims(),"select private.admin_announcement_snapshot_v1($1)",[id]),/permission denied/);
    await assert.rejects(callAs("authenticated",listClaims(),"select * from public.contatto_annuncio"),/permission denied/);
  });
  await scenario("only an authorized caller can distinguish absence or null input",async()=>{
    assert.equal(await detail(id),null); await assert.rejects(detail(null),e=>e.code==="22023");
    const ordinary=listClaims({sub:listId(2),session_id:listId(502)});
    await assert.rejects(detail(id,ordinary),/ADMIN_ACCESS_DENIED/); await assert.rejects(detail(null,ordinary),/ADMIN_ACCESS_DENIED/);
    for(const role of ["anon","service_role"]) await assert.rejects(detail(id,listClaims(),role),/permission denied|ADMIN_ACCESS_DENIED/);
  });
  for(const role of ["Utente","admin","ADMIN","Admin "," Admin",null]) await scenario(`denies role ${JSON.stringify(role)} even with Admin metadata`,async()=>{
    await seed(); await db.query("update public.utente set tipologia_utente=$1 where utente_uuid=$2",[role,listActor.userId]);
    await assert.rejects(detail(id,listClaims({user_metadata:{role:"Admin"}})),/ADMIN_ACCESS_DENIED/);
  });
  for(const [label,sql] of [["revoked session","delete from auth.sessions"],["unconfirmed email","update auth.users set email_confirmed_at=null"],
    ["policy unreviewed","update private.admin_session_policy_v1 set verified_at=null"]]) await scenario(`${label} denies even absent announcements`,async()=>{
    await db.exec(sql); await assert.rejects(detail(id),/ADMIN_ACCESS_DENIED|ADMIN_SESSION_POLICY_UNVERIFIED/);
  });
  await scenario("expired/technical JWT and privileged technical proxy cannot authorize",async()=>{
    await seed(); await assert.rejects(detail(id,listClaims({exp:1})),/ADMIN_ACCESS_DENIED/);
    await assert.rejects(detail(id,listClaims({role:"service_role"})),/ADMIN_ACCESS_DENIED/);
    await db.exec(`create function public.test_detail_proxy(uuid) returns jsonb language sql security definer set search_path='' as $$ select private.get_admin_announcement_v1($1); $$;
      revoke all on function public.test_detail_proxy(uuid) from public; grant execute on function public.test_detail_proxy(uuid) to service_role;`);
    try {await assert.rejects(callAs("service_role",listClaims(),"select public.test_detail_proxy($1)",[id]),/ADMIN_ACCESS_DENIED/);}
    finally{await db.exec("drop function public.test_detail_proxy(uuid)");}
  });
  for(const type of announcementTypes) await scenario(`projects ${type}, aligns SQL/TS spec and summary with list`,async()=>{
    const spec=DETAIL_FIELDS[type]; const values=Object.fromEntries(Object.entries(spec).map(([key,kind])=>[key,samples[kind]]));
    await seed(type,values);
    const wire=await detail(id); const dto=parseDetailResponse(wire,id); assert.equal(dto.content.type,type); assert.equal(dto.complete,true);
    assert.deepEqual((await db.query("select private.admin_announcement_detail_spec_v1($1) as spec",[type])).rows[0].spec,spec);
    assert.deepEqual(dto.summary,(await h.list()).items[0]);
    assert.equal(Object.keys(dto.content.fields).length,Object.keys(spec).length);
    assert(!JSON.stringify(wire).includes("author-secret@example.test")); assert(!JSON.stringify(wire).includes(listActor.authId));
  });
  await scenario("missing/unknown detail retains base and nullable visibility",async()=>{
    await insert(1000,{hidden:null,private:true,status:"legacy"}); let wire=await detail(id);
    assert.equal(wire.complete,false); assert.deepEqual(wire.issues,["DETAIL_MISSING"]); parseDetailResponse(wire,id);
    await db.query("update public.annuncio set tipologia_annuncio='legacy' where uuid=$1",[id]); wire=await detail(id);
    assert.equal(wire.content.type,"unsupported"); assert.deepEqual(wire.content.fields,{}); assert.deepEqual(wire.issues,["UNSUPPORTED_TYPE"]);
    assert.equal(parseDetailResponse(wire,id).summary.hidden,null);
  });
  for(const [table,type,label] of [["profilo_giocatore","annuncio_giocatore","Giocatore"],["profilo_squadra","annuncio_squadra_cerca_staff","Squadra"],
    ["profilo_staff_sportivo","annuncio_staff_sportivo","Staff sportivo"],["profilo_arbitro","annuncio_arbitro","Arbitro"]]) await scenario(`anonymous author ${type} stays anonymous`,async()=>{
    await seed(type); await db.exec(`update public.${table} set nominativo_anonimo=true`);
    const wire=await detail(id); assert.equal(wire.summary.author.displayName,label); assert.equal(wire.summary.author.anonymous,true);
    assert(!JSON.stringify(wire).includes("Nome Pubblico"));
  });
  await scenario("hidden/missing author does not hide the announcement or reveal names",async()=>{
    await seed(); await db.exec("update public.profilo set nascosto=true");
    assert.equal((await detail(id)).summary.author.displayName,"Profilo non disponibile");
    await db.query("update public.annuncio set autore_annuncio=null where uuid=$1",[id]);
    assert.equal((await detail(id)).summary.author.profileId,null);
  });
  for(const state of ["anonymous","hidden","missing","wrong-instance","unknown-anonymity","invalid-reference"]) await scenario(`history team ${state} never leaks saved names, even via direct RPC`,async()=>{
    const entry={...history,titolo:"OLD PRIVATE TEAM",ente:"OLD PRIVATE TEAM",squadraProfiloId:listActor.profileId};
    if(state==="wrong-instance")entry.squadraIstanzaId=999999;
    if(state==="invalid-reference")entry.squadraProfiloId="broken-reference";
    if(state==="anonymous")await db.exec("update public.profilo_squadra set nominativo_anonimo=true");
    if(state==="unknown-anonymity")await db.exec("update public.profilo_squadra set nominativo_anonimo=null");
    if(state==="hidden")await db.exec("update public.profilo set nascosto=true");
    if(state==="missing")await db.exec("delete from public.profilo_squadra");
    await seed("annuncio_staff_sportivo",{lista_esperienze:[entry],qualifiche_licenze:[entry]});
    const wire=await detail(id); assert(!JSON.stringify(wire).includes("OLD PRIVATE TEAM")); assert(!JSON.stringify(wire).includes("Squadra pubblica"));
    assert.equal(wire.content.fields.lista_esperienze[0].titolo,"Squadra"); assert.equal(wire.content.fields.qualifiche_licenze[0].ente,"Squadra");
    parseDetailResponse(wire,id);
  });
  await scenario("team name refresh changes presentation, never the source fingerprint",async()=>{
    await seed("annuncio_staff_sportivo",{lista_esperienze:[{...history,titolo:"OLD",squadraProfiloId:listActor.profileId}]});
    const original=await detail(id); assert.equal(original.content.fields.lista_esperienze[0].titolo,"Squadra pubblica");
    await db.exec("update public.profilo_squadra set nome_societa='Nome aggiornato'");
    const changed=await detail(id); assert.equal(changed.content.fields.lista_esperienze[0].titolo,"Nome aggiornato");
    assert.equal(changed.contentFingerprint,original.contentFingerprint);
  });
  await scenario("nested JSON properties are projected, malformed fields and truncation are explicit",async()=>{
    await seed("annuncio_staff_sportivo",{lista_esperienze:[{...history,accountEmail:"secret-extra@example.test"}],qualifiche_licenze:{accountEmail:"secret-extra@example.test"}});
    let wire=await detail(id); assert(!JSON.stringify(wire).includes("secret-extra")); assert.equal(wire.content.fields.qualifiche_licenze,null);
    assert(wire.issues.includes("INVALID_FIELD:lista_esperienze")); assert(wire.issues.includes("INVALID_FIELD:qualifiche_licenze"));
    await db.query("update public.annuncio_staff_sportivo set lista_esperienze=$1",[Array(61).fill(history)]);
    wire=await detail(id); assert.equal(wire.content.fields.lista_esperienze.length,60); assert.equal(wire.complete,false);
  });
  await scenario("100 locations survive; oversized legacy collections are flagged and fully fingerprinted",async()=>{
    await seed(); await db.query("insert into public.localita_annuncio(uuid_annuncio,regione,citta) select $1,'Lazio','Città '||n from generate_series(1,100) n",[id]);
    let wire=await detail(id); assert.equal(wire.locations.length,100); assert.equal(parseDetailResponse(wire,id).locations.length,100);
    assert.equal(wire.complete,true);
    await db.query("insert into public.media_annuncio(uuid_annuncio,formato_media,link_media) select $1,'image/png','https://media.example.test/'||n from generate_series(1,31) n",[id]);
    wire=await detail(id); assert.equal(wire.media.length,30); assert(wire.issues.includes("COLLECTION_TRUNCATED:media"));
    const fp=wire.contentFingerprint; await db.query("update public.media_annuncio set link_media='https://changed.example.test' where id=(select max(id) from public.media_annuncio)");
    assert.notEqual((await detail(id)).contentFingerprint,fp);
  });
  await scenario("relation identifiers retain bigint precision through PostgreSQL and the DTO",async()=>{
    await seed(); await db.exec("alter table public.media_annuncio alter column id restart with 9007199254740993");
    await db.query("insert into public.media_annuncio(uuid_annuncio,link_media) values($1,'https://media.example.test/a')",[id]);
    const wire=await detail(id); assert.equal(wire.media[0].id,"9007199254740993"); assert.equal(parseDetailResponse(wire,id).media[0].id,"9007199254740993");
  });
  await scenario("full fingerprint is stable in other timezones and covers invisible raw detail changes",async()=>{
    await seed(); const a=await detail(id); await db.exec("set timezone='Pacific/Auckland'");
    assert.equal((await detail(id)).contentFingerprint,a.contentFingerprint);
    await db.query("update public.annuncio_giocatore set info_mostrate=$1 where uuid_annuncio=$2",[{hidden:"opaque"},id]);
    const b=await detail(id); assert.notEqual(a.contentFingerprint,b.contentFingerprint); assert.equal(a.summary.rowFingerprint,b.summary.rowFingerprint);
    assert(!JSON.stringify(b).includes("opaque")); await db.exec("set timezone='UTC'");
    await db.query("update public.annuncio set titolo_annuncio='Cambiato' where uuid=$1",[id]);
    const c=await detail(id); assert.notEqual(c.contentFingerprint,b.contentFingerprint); assert.notEqual(c.summary.rowFingerprint,b.summary.rowFingerprint);
    assert.equal(c.summary.updatedAt,null);
  });
  for(const [table,column,extra] of [["localita_annuncio","regione",""],["contatto_annuncio","valore",",tipo"],["link_social_annuncio","sublink",""],["media_annuncio","link_media",""]])
    await scenario(`fingerprint covers insert/update/delete of ${table}`,async()=>{
      await seed(); const a=await detail(id);
      await db.query(`insert into public.${table}(uuid_annuncio,${column}${extra}) values($1,$2${extra?",'email'":""})`,[id,"original"]);
      const b=await detail(id); assert.notEqual(b.contentFingerprint,a.contentFingerprint); assert.equal(b.summary.rowFingerprint,a.summary.rowFingerprint);
      await db.query(`update public.${table} set ${column}='changed' where uuid_annuncio=$1`,[id]); const c=await detail(id); assert.notEqual(c.contentFingerprint,b.contentFingerprint);
      await db.query(`delete from public.${table} where uuid_annuncio=$1`,[id]); assert.equal((await detail(id)).contentFingerprint,a.contentFingerprint);
    });
  await scenario("next operation observes role and session revocation",async()=>{
    await seed(); assert(await detail(id)); await db.query("update public.utente set tipologia_utente='Utente' where utente_uuid=$1",[listActor.userId]);
    await assert.rejects(detail(id),/ADMIN_ACCESS_DENIED/);
    await db.query("update public.utente set tipologia_utente='Admin' where utente_uuid=$1",[listActor.userId]); await db.exec("delete from auth.sessions");
    await assert.rejects(detail(id),/ADMIN_ACCESS_DENIED/);
  });
  await scenario("indexed lookup remains targeted with a representative synthetic dataset",async()=>{
    await db.query(`insert into public.annuncio(uuid,creato_da,creato_il) select md5(n::text)::uuid,$1,now() from generate_series(1,12000) n`,[listActor.authorId]);
    await db.exec("insert into public.annuncio_giocatore(uuid_annuncio,descrizione_aggiuntiva) select uuid,'Sintetico' from public.annuncio");
    await db.exec("insert into public.localita_annuncio(uuid_annuncio,regione) select uuid,'Lazio' from public.annuncio");
    await db.exec("analyze public.annuncio; analyze public.annuncio_giocatore; analyze public.localita_annuncio");
    const target=(await db.query("select uuid from public.annuncio limit 1")).rows[0].uuid;
    for(const [table,column] of [["annuncio","uuid"],["annuncio_giocatore","uuid_annuncio"],["localita_annuncio","uuid_annuncio"]]){
      const plan=(await db.query(`explain (analyze,buffers,format json) select * from public.${table} where ${column}=$1`,[target])).rows[0]["QUERY PLAN"];
      assert(/Index|Bitmap/.test(JSON.stringify(plan))); t.diagnostic(`${table} lookup plan: ${JSON.stringify(plan[0].Plan)}`);
    }
    const start=performance.now(); const wire=await detail(target); assert.equal(wire.summary.id,target);
    t.diagnostic(`Synthetic in-process detail RPC, not gateway/full EXPLAIN: ${(performance.now()-start).toFixed(2)} ms`);
  });
});

test("detail migration preserves existing ACL/RLS and rolls back on incompatible schema",async()=>{
  const h=await createDetailFixture({apply:false}); const {db}=h;
  try {
    const catalog=async()=> (await db.query(`select c.relname,c.relacl::text,c.relrowsecurity,c.relforcerowsecurity,
      (select jsonb_agg(to_jsonb(p)) from pg_policy p where p.polrelid=c.oid) as policies
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`)).rows;
    const before=await catalog(); await db.exec(detailMigration); assert.deepEqual(await catalog(),before);
    // Separate transaction on the same fixture: rollback must remove the attempted objects.
    await db.exec("drop function public.admin_get_announcement_v1(uuid); drop function private.get_admin_announcement_v1(uuid); drop function private.admin_announcement_snapshot_v1(uuid); drop function private.admin_announcement_author_v1(uuid,text); drop function private.admin_announcement_field_v1(jsonb,text,text); drop function private.admin_announcement_detail_spec_v1(text); alter table public.annuncio_creator drop column contenuto_post");
    await assert.rejects(db.exec(detailMigration),/ADMIN_ANNOUNCEMENT_DETAIL_SCHEMA_REQUIRED/); await db.exec("rollback");
    assert.equal((await db.query("select to_regprocedure('public.admin_get_announcement_v1(uuid)') as fn")).rows[0].fn,null);
    assert.equal((await db.query("select to_regprocedure('private.admin_announcement_detail_spec_v1(text)') as fn")).rows[0].fn,null);
    assert.deepEqual(await catalog(),before);
    await db.exec("alter table public.annuncio_creator add column contenuto_post text; alter table public.annuncio_creator drop constraint annuncio_creator_pkey");
    await assert.rejects(db.exec(detailMigration),/ADMIN_ANNOUNCEMENT_DETAIL_UNIQUE_REQUIRED/); await db.exec("rollback");
    assert.equal((await db.query("select to_regprocedure('public.admin_get_announcement_v1(uuid)') as fn")).rows[0].fn,null);
  } finally {await db.close();}
});
