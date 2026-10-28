import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createTrashFixture } from "./helpers/admin-trash-fixture.mjs";
import { listId as id, listActor as actor, listClaims } from "./helpers/admin-announcements-fixture.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
test("Admin trash on synthetic PostgreSQL", async t => {
  const h = await createTrashFixture(), { db } = h; t.after(() => db.close()); await h.reset();
  const fresh = async (n, options = {}) => { await h.insert(n,options); await h.child(id(n),options.type ?? "annuncio_giocatore"); return h.detail(id(n)); };
  const row = async n => (await db.query("select * from public.annuncio where uuid=$1",[id(n)])).rows[0];
  await t.test("disabled release gate rejects even a direct authorized RPC", async () => {
    const d = await fresh(1000); assert.equal(d.moderation.capabilities.trash.reason,"TRASH_NOT_ENABLED");
    assert.equal((await h.moderate(id(1000),"trash",d.contentFingerprint,"Motivo interno")).status,"not_allowed");
    assert.equal((await row(1000)).eliminato_il,null);
    const activation=readFileSync(new URL("../supabase/scripts/dashboard_admin_enable_trash.sql",import.meta.url),"utf8");
    await assert.rejects(db.exec(activation),/ADMIN_TRASH_RELEASE_REVIEW_REQUIRED/); await db.exec("rollback");
    await assert.rejects(h.callAs("authenticated",listClaims(),"select * from private.admin_trash_release_v1"),/permission denied/);
    await db.exec(activation.replaceAll("boolean:=false","boolean:=true"));
    assert((await db.query("select enabled from private.admin_trash_release_v1")).rows[0].enabled);
  });
  await t.test("trash retains all children, status, privacy and media; restore stays under Admin hold", async () => {
    await db.query("insert into public.media_annuncio(uuid_annuncio,link_media) values($1,'https://example.test/image.png')",[id(1000)]);
    let d=await h.detail(id(1000)); const r=await h.moderate(id(1000),"trash",d.contentFingerprint,"Motivo interno"); assert.equal(r.status,"ok");
    let b=await row(1000); assert(b.eliminato_il); assert.equal(b.eliminato_da,actor.userId); assert(b.nascosto && b.oscurato_da_admin); assert.equal(b.stato_annuncio,"in_revisione");
    assert(!b.info_stato_annuncio?.includes("Motivo interno")); assert.equal((await db.query("select count(*)::int as n from public.media_annuncio where uuid_annuncio=$1",[id(1000)])).rows[0].n,1);
    d=await h.detail(id(1000)); assert(d.summary.trashed); assert(d.trash.deletedAt); assert.equal(d.trash.deletedBy,actor.userId);
    for(const op of ["approve","reject","hide","show"]) assert.equal(d.moderation.capabilities[op].reason,"IN_TRASH");
    await db.exec("update private.admin_trash_release_v1 set enabled=false");
    assert.equal((await h.moderate(id(1000),"restore",d.contentFingerprint)).status,"not_allowed");
    await db.exec("update private.admin_trash_release_v1 set enabled=true");
    assert.equal((await h.moderate(id(1000),"restore",d.contentFingerprint)).status,"ok"); b=await row(1000);
    assert.equal(b.eliminato_il,null); assert.equal(b.eliminato_da,null); assert(b.nascosto && b.oscurato_da_admin); assert.equal(b.stato_annuncio,"in_revisione");
    const events=(await db.query("select action,reason,changes from private.admin_audit_event_v1 order by occurred_at")).rows;
    assert.equal(events[0].action,"announcement.trash"); assert.equal(events[0].reason,"Motivo interno"); assert.equal(events[1].action,"announcement.restore");
    assert.deepEqual(events[0].changes.hidden,{before:false,after:true});
  });
  for(const [n,status] of [[1001,"pubblicato"],[1002,"in_attesa_pagamento"],[1003,"rifiutato"]]) await t.test(`preserves ${status} through trash/restore without publication notification`,async()=>{
    const d=await fresh(n,{status,private:true,hidden:true}); await h.moderate(id(n),"trash",d.contentFingerprint,"Verifica");
    await db.exec("truncate private.notifiche"); const now=await h.detail(id(n)); await h.moderate(id(n),"restore",now.contentFingerprint);
    const b=await row(n); assert.equal(b.stato_annuncio,status); assert(b.privato); assert(b.nascosto); assert.equal((await db.query("select count(*)::int as n from private.notifiche")).rows[0].n,0);
  });
  await t.test("legacy incomplete rows may be restored but cannot be made visible",async()=>{
    await h.insert(1004,{type:"legacy"}); let d=await h.detail(id(1004)); assert(!d.complete);
    await h.moderate(id(1004),"trash",d.contentFingerprint,"Legacy"); d=await h.detail(id(1004)); assert(d.moderation.capabilities.restore.allowed);
    await h.moderate(id(1004),"restore",d.contentFingerprint); d=await h.detail(id(1004)); assert(!d.moderation.capabilities.show.allowed);
  });
  await t.test("null legacy states stay frozen and Unicode reasons stay private and bounded",async()=>{
    let d=await fresh(1012,{status:null});
    assert.equal((await h.moderate(id(1012),"trash",d.contentFingerprint,"😀".repeat(1001))).status,"invalid");
    assert.equal((await h.moderate(id(1012),"trash",d.contentFingerprint,"😀".repeat(1000))).status,"ok");
    d=await h.detail(id(1012));assert(!JSON.stringify(d).includes("😀"));
    await assert.rejects(db.query("update public.annuncio set stato_annuncio='in_revisione' where uuid=$1",[id(1012)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    const pending=await fresh(1013,{status:"in_attesa_pagamento"});
    await h.moderate(id(1013),"trash",pending.contentFingerprint,"Controllo");
    await assert.rejects(db.query("update public.annuncio set stato_annuncio=null where uuid=$1",[id(1013)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
  });
  await t.test("list filter and cursor v2 bind trash scope",async()=>{
    const d=await fresh(1005); await h.moderate(id(1005),"trash",d.contentFingerprint,"Cestino");
    assert(!(await h.list()).items.some(r=>r.id===id(1005))); assert((await h.list({trash:"only"})).items.every(r=>r.trashed));
    const page=await h.list({trash:"all",limit:1}); assert.equal(page.nextCursor.v,2); assert.equal(page.nextCursor.filters.trash,"all");
    await assert.rejects(h.list({trash:"exclude",cursor:page.nextCursor}),/ADMIN_ANNOUNCEMENT_QUERY_INVALID/);
    await assert.rejects(h.list({trash:"all",cursor:{...page.nextCursor,v:1}}),/ADMIN_ANNOUNCEMENT_QUERY_INVALID/);
    const load=adminServerLoader(), base="apps/admin/src/features/annunci/server/";
    const {parseListQuery}=load(base+"query-input.ts"),{parseListResponse}=load(base+"response.ts");
    const query=parseListQuery({trash:"all",limit:1}),dto=parseListResponse(page,query);
    const next=parseListQuery({trash:"all",limit:1,cursor:dto.nextCursor});
    assert.equal(parseListResponse(await h.list({...next.filters,limit:next.limit,cursor:next.cursor}),next).items.length,1);
    const {parseDetailResponse}=load(base+"detail-response.ts");
    assert(parseDetailResponse(await h.detail(id(1005)),id(1005)).summary.trashed);
  });
  await t.test("version conflict, missing reason and failed audit never lose contents",async()=>{
    const d=await fresh(1006); assert.equal((await h.moderate(id(1006),"trash",d.contentFingerprint,null)).status,"invalid");
    await db.query("update public.annuncio_giocatore set descrizione_aggiuntiva='changed' where uuid_annuncio=$1",[id(1006)]);
    assert.equal((await h.moderate(id(1006),"trash",d.contentFingerprint,"Verifica")).status,"conflict");
    const current=await h.detail(id(1006)); await db.exec("create function private.fail_trash_audit() returns trigger language plpgsql as $$begin raise exception 'audit failure'; end$$; create trigger fail_trash_audit before insert on private.admin_audit_event_v1 for each row execute function private.fail_trash_audit()");
    assert.equal((await h.moderate(id(1006),"trash",current.contentFingerprint,"Verifica")).status,"unavailable"); assert.equal((await row(1006)).eliminato_il,null);
    await db.exec("drop trigger fail_trash_audit on private.admin_audit_event_v1; drop function private.fail_trash_audit()");
  });
  await t.test("even privileged table writers cannot erase or edit trashed content",async()=>{
    await assert.rejects(db.query("delete from public.annuncio where uuid=$1",[id(1005)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    await assert.rejects(db.query("update public.annuncio set titolo_annuncio='changed' where uuid=$1",[id(1005)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    await assert.rejects(db.query("delete from public.annuncio_giocatore where uuid_annuncio=$1",[id(1005)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    await assert.rejects(db.query("insert into public.localita_annuncio(uuid_annuncio,regione) values($1,'Lazio')",[id(1005)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    await assert.rejects(db.query("insert into public.annuncio_generico(uuid_annuncio,titolo) values($1,'Legacy')",[id(1005)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    await assert.rejects(db.query("update public.annuncio_giocatore set uuid_annuncio=$1 where uuid_annuncio=$2",[id(1006),id(1005)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    await db.query("delete from public.annuncio where uuid=$1",[id(1006)]); assert.equal(await row(1006),undefined);
  });
  await t.test("late payment records receipt and review without exposing trash",async()=>{
    let d=await fresh(1007,{status:"in_attesa_pagamento",private:true}); await db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1",[id(1007)]);
    await db.query("insert into private.announcement_submission(submission_id,announcement_id,utente_id,requested_visibility) values($1,$2,$3,'prioritario')",[id(2007),id(1007),actor.authorId]);
    d=await h.detail(id(1007)); await h.moderate(id(1007),"trash",d.contentFingerprint,"Verifica");
    await db.query("select public.record_priority_checkout_event_v1($1,$2,'cs_test','price_test',799,799,'complete','paid','pi_test',true)",[id(1007),id(2007)]);
    const b=await row(1007); assert(b.eliminato_il); assert(b.nascosto && b.oscurato_da_admin); assert.equal(b.stato_annuncio,"in_revisione"); assert(!b.priorita_attiva); assert(b.privato);
    assert((await db.query("select paid_at from private.announcement_submission where announcement_id=$1",[id(1007)])).rows[0].paid_at);
  });
  await t.test("checkout readers and writers reject trash; full refunds still reconcile",async()=>{
    const owned=await h.callAs("authenticated",listClaims({sub:id(2),session_id:id(502)}),"select public.get_owned_priority_checkout_v1($1) as result",[id(1007)]);
    assert.equal(owned.rows[0].result.status,"not_found");
    await assert.rejects(db.query("select public.record_priority_checkout_session_v1($1,$2,'cs_new','price_test',799,799,'open','unpaid',2)",[id(1007),id(2007)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
    assert.equal((await db.query("select public.record_priority_refund_v1('pi_test','re_test','succeeded',799,'eur') as result")).rows[0].result.status,"success");
    assert((await db.query("select refunded_at from private.announcement_submission where announcement_id=$1",[id(1007)])).rows[0].refunded_at);
    assert((await row(1007)).eliminato_il); assert((await row(1007)).oscurato_da_admin);
  });
  await t.test("old notification references lose saved titles, URLs and status information",async()=>{
    const ref=JSON.stringify({id:id(1005),kind:"annuncio",label:"Saved confidential title"});
    assert.equal((await db.query("select private.notification_target_ref($1,null) as result",[id(1005)])).rows[0].result,null);
    const display=(await db.query("select private.notification_display_ref($1::jsonb,true) as result",[ref])).rows[0].result;
    assert.deepEqual(display,{label:"Annuncio non più disponibile",href:null});
    await db.query("insert into private.notifiche(destinatario,tipo,evento,dati) values($1,'stato_annuncio','old-trash',jsonb_build_object('target',$2::jsonb,'state','rifiutato','info','Old announcement text'))",[actor.authorId,ref]);
    for(const version of [1,2]) {
      const result=(await db.query(`select public.get_notifications_v${version}($1) as result`,[actor.authorId])).rows[0].result;
      const item=result.items.find(r=>r.target?.label==="Annuncio non più disponibile"); assert(item); assert.equal(item.target.href,null); assert.equal(item.info,null); assert.equal(item.state,null);
      assert(!JSON.stringify(result).includes("Saved confidential title")); assert(!JSON.stringify(result).includes("Old announcement text"));
    }
  });
  await t.test("profile region pruning skips frozen children, but continues for active announcements",async()=>{
    for(const n of [1008,1009]) {
      await fresh(n,{type:"annuncio_servizi_consulenze"});
      await db.query("insert into public.localita_annuncio(uuid_annuncio,regione) values($1,'Lazio')",[id(n)]);
    }
    await h.moderate(id(1008),"trash",(await h.detail(id(1008))).contentFingerprint,"Verifica");
    await db.query("insert into public.restricted_profile_access values($1,'servizi-consulenze',array['Lombardia'])",[actor.profileId]);
    assert.equal((await db.query("select uuid_annuncio from public.localita_annuncio where uuid_annuncio in ($1,$2)",[id(1008),id(1009)])).rows.length,1);
    assert.equal((await db.query("select uuid_annuncio from public.localita_annuncio where uuid_annuncio=$1",[id(1008)])).rows.length,1);
    await h.moderate(id(1008),"restore",(await h.detail(id(1008))).contentFingerprint);
    const restored=await h.detail(id(1008));assert.equal(restored.moderation.capabilities.show.reason,"REGIONS_NOT_ALLOWED");
    assert.equal((await h.moderate(id(1008),"show",restored.contentFingerprint)).status,"not_allowed");
  });
  await t.test("priority expiry keeps the running clock and Admin trash hold",async()=>{
    await fresh(1010,{status:"pubblicato"});
    await db.query("update public.annuncio set livello_annuncio='prioritario',priorita_attiva=true,priorita_inizio_il=now()-interval '8 days',priorita_fine_il=now()-interval '1 day' where uuid=$1",[id(1010)]);
    await h.moderate(id(1010),"trash",(await h.detail(id(1010))).contentFingerprint,"Verifica");
    await db.exec("select private.expire_priority_announcements_v1()"); const b=await row(1010);
    assert(b.eliminato_il && b.nascosto && b.oscurato_da_admin); assert(!b.priorita_attiva); assert.equal(b.livello_annuncio,"gratuito");
  });
  await t.test("profile snapshot synchronization skips trash and still updates active content",async()=>{
    await fresh(1014); await db.query("update public.profilo_giocatore set tipologie_sport=array['Calcio 11'],ruoli_sport='{}' where uuid_profilo=$1",[actor.profileId]);
    const frozen=(await db.query("select to_jsonb(d) as data from public.annuncio_giocatore d where uuid_annuncio=$1",[id(1005)])).rows[0].data;
    await db.query("select private.sync_published_profile_snapshot_v1($1,'giocatore')",[id(1005)]);
    assert.deepEqual((await db.query("select to_jsonb(d) as data from public.annuncio_giocatore d where uuid_annuncio=$1",[id(1005)])).rows[0].data,frozen);
    await db.query("select private.sync_published_profile_snapshot_v1($1,'giocatore')",[id(1014)]);
    assert.deepEqual((await db.query("select tipologie_sport from public.annuncio_giocatore where uuid_annuncio=$1",[id(1014)])).rows[0].tipologie_sport,["Calcio 11"]);
  });
  await t.test("deferred automatic approval skips a row trashed before its trigger runs",async()=>{
    await db.exec("create constraint trigger test_auto_approval after insert on public.annuncio deferrable initially deferred for each row execute function private.auto_approve_new_announcement_until_v1(); begin");
    try {
      await h.insert(1011);
      const fp=(await db.query("select 'content-v1:'||encode(sha256(convert_to(private.admin_announcement_snapshot_v1($1)::text,'UTF8')),'hex') as fingerprint",[id(1011)])).rows[0].fingerprint;
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(listClaims())]);
      await db.exec("set local role authenticated");
      assert.equal((await db.query("select public.admin_moderate_announcement_v1($1,'trash',$2,'Controllo') as result",[id(1011),fp])).rows[0].result.status,"ok");
      await db.exec("reset role; commit");
      assert.equal((await row(1011)).stato_annuncio,"in_revisione");
    } catch(error) { await db.exec("rollback"); throw error; }
    await db.exec("drop trigger test_auto_approval on public.annuncio");
  });
  await t.test("revocation and technical callers cannot trash or restore",async()=>{
    const d=await h.detail(id(1005));
    for(const role of ["anon","service_role"]) await assert.rejects(h.moderate(id(1005),"restore",d.contentFingerprint,null,listClaims(),role),/permission denied|ADMIN_ACCESS_DENIED/);
    await db.query("update public.utente set tipologia_utente='admin' where utente_uuid=$1",[actor.userId]);
    await assert.rejects(h.moderate(id(1005),"restore",d.contentFingerprint),/ADMIN_ACCESS_DENIED/);
    await db.query("update public.utente set tipologia_utente='Admin' where utente_uuid=$1",[actor.userId]);
  });
  await t.test("restrictive policies hide parent and children despite a broad permissive policy",async()=>{
    await db.exec("grant select on public.annuncio,public.annuncio_giocatore to authenticated; create policy test_read on public.annuncio for select to authenticated using(true); create policy test_child_read on public.annuncio_giocatore for select to authenticated using(true)");
    assert.equal((await h.callAs("authenticated",listClaims(),"select uuid from public.annuncio where uuid=$1",[id(1005)])).rows.length,0);
    assert.equal((await h.callAs("authenticated",listClaims(),"select uuid_annuncio from public.annuncio_giocatore where uuid_annuncio=$1",[id(1005)])).rows.length,0);
    assert((await h.detail(id(1005))).summary.trashed);
  });
});
