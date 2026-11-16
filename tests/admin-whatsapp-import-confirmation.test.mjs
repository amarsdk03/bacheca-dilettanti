import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {randomUUID} from "node:crypto";
import {createDistributionFixture} from "./helpers/admin-distribution-fixture.mjs";
import {listClaims,listId} from "./helpers/admin-announcements-fixture.mjs";
import {creationInput,creationDomain} from "./helpers/admin-creation-data.mjs";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";

const read=name=>readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),"utf8");
const {createAnnouncementCreation}=adminServerLoader()("apps/admin/src/features/annunci/create/service.ts");
async function fixture(){
 const h=await createDistributionFixture();
 try{
   await h.db.exec(read("20261116145739_admin_distribution_all_statuses"));
   await h.db.exec(read("20261116162039_admin_announcement_publication_date"));
   await h.db.exec(read("20261116172357_admin_whatsapp_import_confirmation"));
   await h.db.exec("insert into private.distribution_channel_v1(name,url,channel_key,region) values ('Lombardia','https://www.whatsapp.com/channel/FixtureSource123','FixtureSource123','Lombardia'),('Lazio','https://www.whatsapp.com/channel/FixtureOther123','FixtureOther123','Lazio')");
   return h;
 }catch(error){await h.db.close();throw error;}
}
function payload(extra={}){
 const p=creationDomain.normalizeCreation(creationInput());
 return {author_mode:"unregistered",profile_id:null,profile_type:p.profileType,profile_draft:p.profileDraft,profile_locations:p.profileLocations,profile_social_links:p.profileSocialLinks,announcement_type:p.announcementType,announcement_title:p.announcementTitle,detail:p.detail,announcement_locations:[...p.announcementLocations,{regione:"Lazio",citta:"Roma"}],contacts:p.contacts,extras:{generic_link:""},authorized:true,source:"whatsapp",original_text:"Testo originale locale",message_url:null,reference_email:null,source_region:"Lombardia",...extra};
}
const create=(h,n,p)=>h.callAs("authenticated",listClaims(),"select public.admin_create_announcement_v4($1,$2::jsonb) result",[listId(n),JSON.stringify(p)]).then(r=>r.rows[0].result);

test("linkless creation atomically records a single origin confirmation, reads it by default and keeps other destinations unconfirmed",async()=>{
 const h=await fixture();
 try{
   const data=payload(),result=await create(h,80001,data);
   assert.equal(result.announcements.length,2);assert(result.announcements.every(a=>a.status==="in_revisione"));
   const info=await h.read("detail",{announcementId:result.announcementId});
   assert.equal(info.record.manual,true);assert.equal(info.record.confirmed,true);assert.equal(info.record.url,"");
   assert.equal(info.record.text,data.original_text);assert.equal(info.record.state,"source");assert.equal(info.sourceHere,true);
   assert.equal(info.record.channelName,"Lombardia");assert(info.record.postedAt);
   assert.equal((await h.db.query("select count(*)::int n from private.distribution_record_v1")).rows[0].n,1);
   assert.equal((await h.db.query("select count(*)::int n from private.distribution_revision_v1")).rows[0].n,1);
   const other=(await h.db.query("select id from private.distribution_channel_v1 where region='Lazio'")).rows[0].id;
   const destination=await h.read("detail",{announcementId:result.announcementId,channelId:other});
   assert.equal(destination.record,null);assert.equal(destination.sourceHere,false);
   assert.equal((await create(h,80001,data)).idempotent,true);
   await assert.rejects(create(h,80001,{...data,source_region:"Lazio"}),/ADMIN_CREATION_CONFLICT/);
   assert.equal((await h.db.query("select count(*)::int n from private.admin_audit_event_v1 where action='distribution.save'")).rows[0].n,1);
   await h.db.exec("update private.distribution_channel_v1 set active=false where region='Lombardia'");
   assert.equal((await create(h,80001,data)).idempotent,true,"Retry recovers the receipt even after the source channel was archived");
   const held=await h.read("detail",{recordId:info.record.id});assert.equal(held.record.manual,true);assert.equal(held.record.channelActive,false);
 }finally{await h.db.close();}
});

test("source region can differ from target regions and direct approval still works without implying other WhatsApp publications",async()=>{
 const h=await fixture();
 try{
   const result=await create(h,80002,payload({approve_immediately:true,publication_date:"2020-06-15",announcement_locations:[{regione:"Lazio",citta:"Roma"}]}));
   assert(result.announcements.every(a=>a.status==="pubblicato"));
   const info=await h.read("detail",{announcementId:result.announcementId});
   assert.equal(info.record.channelName,"Lombardia");assert.equal(info.record.manual,true);assert.equal(info.record.state,"source");
   assert.equal(info.detail,null,"Do not broaden export availability to unrelated regions just to show the retained origin");
   assert.equal((await h.db.query("select bool_and(posted_at>now()-interval '1 minute') as recent from private.distribution_record_v1")).rows[0].recent,true);
   const linked=await create(h,80003,payload({message_url:"https://www.whatsapp.com/channel/FixtureSource123/msg1"}));
   assert.equal((await h.db.query("select source_channel_id from private.admin_creation_submission_v1 where publication_uuid=$1",[linked.publicationId])).rows[0].source_channel_id,null);
   const manual=await create(h,80004,payload({source:"manual",original_text:null,message_url:null}));
   assert(manual.announcementId);assert.equal((await h.db.query("select count(*)::int n from private.distribution_record_v1")).rows[0].n,1);
   const channel=(await h.db.query("select id from private.distribution_channel_v1 where region='Lombardia'")).rows[0].id;
   const withLink=await h.read("detail",{announcementId:linked.announcementId,channelId:channel});
   assert.equal(withLink.sourceHere,true);assert.equal(withLink.record,null);
 }finally{await h.db.close();}
});

test("reposting an imported original creates a separate unconfirmed draft instead of reapplying automatic confirmation",async()=>{
 const h=await fixture();
 try{
   const result=await create(h,80006,payload());
   const original=await h.read("detail",{announcementId:result.announcementId});
   const saved=await h.write("save",{requestId:randomUUID(),announcementId:result.announcementId,channelId:original.record.channelId,recordId:original.record.id,
     text:"Nuova ricondivisione da confermare",url:"",manual:false,templateVersion:"2026-11-v1",sourceHash:original.sourceHash,version:original.record.version,repost:true});
   assert.equal(saved.status,"ok");
   const next=await h.read("detail",{announcementId:result.announcementId});
   assert.equal(next.record.id,saved.id);assert.equal(next.record.manual,false);assert.equal(next.record.confirmed,false);assert.equal(next.record.state,"draft");
   const old=await h.read("detail",{recordId:original.record.id});assert.equal(old.record.superseded,true);assert.equal(old.record.manual,true);
 }finally{await h.db.close();}
});

test("missing, archived or ambiguous origin channels and failed confirmation leave no partial creation",async()=>{
 const h=await fixture();
 try{
   const count=async()=> (await h.db.query("select (select count(*) from public.annuncio)::int a,(select count(*) from public.profilo)::int p,(select count(*) from private.admin_creation_submission_v1)::int s")).rows[0];
   const initial=await count();
   for(const region of ["Basilicata",null])await assert.rejects(create(h,80005,payload({source_region:region})),/ADMIN_CREATION_SOURCE_CHANNEL_UNAVAILABLE/);
   await h.db.exec("update private.distribution_channel_v1 set active=false where region='Lombardia'");
   await assert.rejects(create(h,80005,payload()),/ADMIN_CREATION_SOURCE_CHANNEL_UNAVAILABLE/);
   await h.db.exec("update private.distribution_channel_v1 set active=true; insert into private.distribution_channel_v1(name,url,channel_key,region) values ('Duplicato','https://www.whatsapp.com/channel/FixtureDuplicate','FixtureDuplicate','Lombardia')");
   await assert.rejects(create(h,80005,payload()),/ADMIN_CREATION_SOURCE_CHANNEL_UNAVAILABLE/);
   assert.deepEqual(await count(),initial);
   await h.db.exec("delete from private.distribution_channel_v1 where channel_key='FixtureDuplicate'; create function private.fail_import_fixture() returns trigger language plpgsql as $$ begin raise exception 'TEST_CONFIRMATION_FAILURE'; end $$; create trigger fixture_confirmation_failure before insert on private.distribution_record_v1 for each row execute function private.fail_import_fixture()");
   await assert.rejects(create(h,80005,payload()),/TEST_CONFIRMATION_FAILURE/);assert.deepEqual(await count(),initial);
   await assert.rejects(h.callAs("authenticated",{...listClaims(),sub:listId(2)},"select public.admin_resolve_whatsapp_import_channel_v1('Lombardia')"),/ADMIN_|ACCESS/);
   await assert.rejects(h.callAs("anon",{},"select public.admin_create_announcement_v4($1,$2::jsonb)",[randomUUID(),JSON.stringify(payload())]),/permission denied/);
   await assert.rejects(h.callAs("authenticated",listClaims(),"select * from private.distribution_record_v1"),/permission denied/);
 }finally{await h.db.close();}
});

test("missing channel preflight informs the author tab before any upload; missing migration fails closed",async()=>{
 const input=creationInput();input.version=2;input.canonical=adminServerLoader()("apps/admin/src/features/annunci/create/canonical-draft.ts").migrateCanonicalDraft(input);
 input.provenance={source:"whatsapp",rawText:"🔵 GIOCATORE CERCA SQUADRA",messageUrl:"",context:{channelRegion:"Basilicata"}};
 const calls=[];let code="22023";
 const service=createAnnouncementCreation({session:async()=>({actorId:input.submissionId,rpc:async(name,args)=>{calls.push(name);return name==="admin_get_announcement_submission_v1"?{data:null,error:null}:{data:null,error:{code,message:code==="22023"?"ADMIN_CREATION_SOURCE_CHANNEL_UNAVAILABLE":"Missing function"}};}}),upload:()=>assert.fail("No upload without an available origin channel")});
 const result=await service.submit(input);assert.equal(result.status,"invalid");assert.equal(result.issues[0].tab,"author");assert.equal(result.issues[0].code,"SOURCE_CHANNEL_UNAVAILABLE");
 assert(!calls.includes("admin_create_announcement_v4"));
 code="PGRST202";assert.equal((await service.submit(input)).status,"unavailable");
});
