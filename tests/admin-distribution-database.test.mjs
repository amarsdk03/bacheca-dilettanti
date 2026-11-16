import assert from "node:assert/strict";
import {test} from "node:test";
import {randomUUID} from "node:crypto";
import {createDistributionFixture} from "./helpers/admin-distribution-fixture.mjs";
import {listId as id,listClaims,listActor} from "./helpers/admin-announcements-fixture.mjs";

test("distribution migration, channel, public queue, confirmation and idempotent receipt", async () => {
  const h = await createDistributionFixture();
  try {
    assert.deepEqual(await h.read("choices"), []);
    const channel = await h.write("channel_save", {requestId: randomUUID(), name: "Lombardia", url: "https://www.whatsapp.com/channel/FixtureChannel123", region: "Lombardia", active: true});
    assert.equal(channel.status, "ok");
    await h.insert(710, {status: "pubblicato"});
    await h.db.query("insert into public.localita_annuncio(uuid_annuncio,regione,citta) values($1,'Lombardia','Milano')", [id(710)]);
    const queue = await h.read("queue"); assert.equal(queue.items.length, 1);
    assert.equal((await h.read("choices",{announcementId:id(710)})).length,1);
    assert.deepEqual(await h.read("choices",{announcementId:id(301)}),[]);
    const info = await h.read("detail", {announcementId: id(710), channelId: channel.id});
    assert.ok(info.sourceHash); assert.equal(info.record, null);
    const input = {requestId: randomUUID(), announcementId: id(710), channelId: channel.id, text: "Messaggio", url: "", manual: true, templateVersion: "2026-11-v1", sourceHash: info.sourceHash, version: 0};
    const saved = await h.write("save", input); assert.equal(saved.status, "ok");
    assert.deepEqual(await h.write("save", input), saved);
    assert.equal((await h.write("save", {...input,text:"Richiesta diversa"})).status,"conflict");
    assert.equal((await h.read("queue")).items.length, 0);
    const history = await h.read("publications"); assert.equal(history.items[0].manual, true); assert.equal(history.items[0].confirmed, true);
    assert.equal((await h.auditList({action: "distribution.save"})).items.length, 1);
    await h.db.query("update public.annuncio set nascosto=true where uuid=$1",[id(710)]);
    assert.equal((await h.read("publications")).items[0].state,"unavailable");
    assert.equal((await h.write("save",{...input,requestId:randomUUID(),recordId:saved.id,version:1})).status,"not_allowed");
  } finally {await h.db.close();}
});

test("regional grouping, drafts, link validation, stale content and explicit repost preserve history",async()=>{
  const h=await createDistributionFixture();
  try {
    const national=await h.write("channel_save",{requestId:randomUUID(),name:"Nazionale",url:"https://whatsapp.com/channel/National123",region:null,active:true});
    const regional=await h.write("channel_save",{requestId:randomUUID(),name:"Lazio",url:"https://www.whatsapp.com/channel/RegionLazio123",region:"Lazio",active:true});
    for(const[n,region]of [[720,"Lazio"],[721,"Lombardia"]]){await h.insert(n,{status:"pubblicato"});await h.db.query("insert into public.annuncio_giocatore(uuid_annuncio) values($1) on conflict(uuid_annuncio) do nothing",[id(n)]);await h.db.query("insert into public.localita_annuncio(uuid_annuncio,regione) values($1,$2)",[id(n),region]);await h.db.query("update public.annuncio set gruppo_pubblicazione=$1,regione_pubblicazione=$2 where uuid=$3",[id(900),region,id(n)]);}
    let queue=await h.read("queue");assert.equal(queue.items.length,1);assert.equal(queue.items[0].destinations.length,2);
    assert.deepEqual((await h.read("detail",{announcementId:id(721),channelId:regional.id})).detail.locations.map(l=>l.region),["Lazio"]);
    let info=await h.read("detail",{announcementId:id(720),channelId:national.id});assert.equal(info.detail.locations.length,2);
    const payload={announcementId:id(720),channelId:national.id,text:"Personalizzato",url:"",manual:false,templateVersion:"2026-11-v1",sourceHash:info.sourceHash,version:0};
    let saved=await h.write("save",{...payload,requestId:randomUUID()});assert.equal(saved.status,"ok");
    info=await h.read("detail",{recordId:saved.id});assert.equal(info.record.state,"draft");assert.equal(info.record.text,"Personalizzato");
    await assert.rejects(h.write("save",{...payload,requestId:randomUUID(),recordId:saved.id,version:info.record.version,url:"https://www.whatsapp.com/channel/OtherChannel/999"}),/INVALID_INPUT/);
    const publish={...payload,recordId:saved.id,version:info.record.version,url:"https://www.whatsapp.com/channel/National123/123"};
    assert.equal((await h.write("save",{...publish,requestId:randomUUID()})).status,"ok");
    info=await h.read("detail",{recordId:saved.id});assert.equal(info.record.state,"published");
    await h.db.query("update public.annuncio set ultima_modifica_il=now() where uuid=$1",[id(720)]);
    assert.equal((await h.read("detail",{recordId:saved.id})).record.state,"published");
    await h.db.query("update public.annuncio_giocatore set descrizione_aggiuntiva='Nuovo testo' where uuid_annuncio=$1",[info.detail.summary.id]);
    info=await h.read("detail",{recordId:saved.id});assert.equal(info.record.state,"stale");
    assert.equal((await h.write("save",{...publish,requestId:randomUUID(),version:info.record.version})).status,"conflict");
    const repost=await h.write("save",{...payload,requestId:randomUUID(),recordId:saved.id,version:info.record.version,sourceHash:info.sourceHash,repost:true});assert.equal(repost.status,"ok");assert.notEqual(repost.id,saved.id);
    assert.equal((await h.read("detail",{recordId:saved.id})).record.superseded,true);
    assert.equal((await h.read("detail",{recordId:repost.id})).record.state,"draft");
    assert.equal((await h.call("admin_list_announcements_v1",[{}])).items.find(r=>r.id===id(721)).whatsappStatus,"exported");
    const ch=(await h.read("choices")).find(c=>c.id===national.id);
    assert.equal((await h.write("channel_save",{...ch,requestId:randomUUID(),active:false})).status,"ok");
    assert.equal((await h.write("save",{...payload,requestId:randomUUID()})).status,"not_allowed");
    assert.equal((await h.read("publications")).items.length,2);
  }finally{await h.db.close();}
});

test("legacy exports stay unassigned, assignment is explicit and audit failures roll back",async()=>{
  const h=await createDistributionFixture({async beforeMigration(h){await h.insert(730,{status:"pubblicato"});await h.db.query("update private.announcement_whatsapp_v1 set message_text='Vecchio messaggio',message_url='https://www.whatsapp.com/channel/LegacyChannel123/5',template_version='2026-11-v1',updated_at=now() where announcement_id=$1",[id(730)]);}});
  try{
    let history=await h.read("publications");assert.equal(history.items[0].state,"unassigned");assert.equal(history.items[0].text,"Vecchio messaggio");
    const channel=await h.write("channel_save",{requestId:randomUUID(),name:"Storico",url:"https://www.whatsapp.com/channel/LegacyChannel123",region:null,active:true});
    const old=history.items[0],info=await h.read("detail",{recordId:old.id,channelId:channel.id});
    const body={requestId:randomUUID(),recordId:old.id,announcementId:id(730),channelId:channel.id,sourceHash:info.sourceHash,text:old.text,url:old.url,manual:false,templateVersion:old.templateVersion,version:old.version};
    assert.equal((await h.write("save",body)).status,"ok");
    history=await h.read("publications");assert.equal(history.items[0].channelId,channel.id);assert.equal(history.items[0].text,old.text);
    await assert.rejects(h.db.query("update private.announcement_whatsapp_v1 set message_text='Stale client' where announcement_id=$1",[id(730)]),/DISTRIBUTION_RELOAD_REQUIRED/);
    const updated=await h.read("detail",{recordId:old.id});
    assert.equal((await h.write("save",{...body,requestId:randomUUID(),version:updated.record.version,url:""})).status,"confirmation_required");
    await h.db.exec("create function private.fail_distribution_audit() returns trigger language plpgsql as $$ begin if new.action='distribution.save' then raise exception 'AUDIT_DOWN'; end if; return new; end $$;create trigger fail_distribution_audit before insert on private.admin_audit_event_v1 for each row execute function private.fail_distribution_audit()");
    await assert.rejects(h.write("save",{...body,requestId:randomUUID(),version:updated.record.version,url:"",revoke:true}),/AUDIT_DOWN/);
    assert.equal((await h.read("detail",{recordId:old.id})).record.confirmed,true);
    await h.db.exec("drop trigger fail_distribution_audit on private.admin_audit_event_v1");
    assert.equal((await h.write("save",{...body,requestId:randomUUID(),version:updated.record.version,url:"",revoke:true})).status,"ok");
    assert.equal((await h.read("detail",{recordId:old.id})).history.length,3);
  }finally{await h.db.close();}
});

test("imported messages retain origin and require an explicit repost on their source channel",async()=>{
  const h=await createDistributionFixture();
  try {
    await h.insert(735,{status:"pubblicato"});
    await h.db.query("insert into public.localita_annuncio(uuid_annuncio,regione) values($1,'Lombardia')",[id(735)]);
    await h.db.query("insert into private.regional_publication(id,owner_id) values($1,$2)",[id(935),listActor.authorId]);
    await h.db.query("insert into private.regional_publication_item(publication_id,announcement_id,region) values($1,$2,'Lombardia')",[id(935),id(735)]);
    await h.db.query("insert into private.admin_creation_submission_v1(actor_auth_uuid,submission_uuid,publication_uuid,payload_hash,source,message_url,original_text) values($1,$2,$3,$4,'whatsapp','https://www.whatsapp.com/channel/ImportedChannel123/5','Originale')",[listActor.authId,id(936),id(935),'a'.repeat(64)]);
    const channel=await h.write("channel_save",{requestId:randomUUID(),name:"Origine",url:"https://www.whatsapp.com/channel/ImportedChannel123",region:"Lombardia",active:true});
    assert.equal((await h.read("queue")).items.length,0);
    const sourceQueue=await h.read("queue",{state:"source"});assert.equal(sourceQueue.items.length,1);assert.equal(sourceQueue.items[0].origin,"imported");
    const info=await h.read("detail",{announcementId:id(735),channelId:channel.id});assert.equal(info.sourceHere,true);
    const body={announcementId:id(735),channelId:channel.id,sourceHash:info.sourceHash,text:"Nuovo messaggio",url:"",manual:true,version:0,templateVersion:"2026-11-v1"};
    assert.equal((await h.write("save",{...body,requestId:randomUUID()})).status,"source_exists");
    assert.equal((await h.write("save",{...body,requestId:randomUUID(),repost:true})).status,"ok");
    assert.equal((await h.call("admin_list_announcements_v1",[{}])).items.find(r=>r.id===id(735)).whatsappStatus,"imported");
  }finally{await h.db.close();}
});

test("distribution RPCs deny anonymous, ordinary users, service role and direct private access",async()=>{
 const h=await createDistributionFixture();try{
  for(const[role,claims]of [["anon",{}],["service_role",{}],["authenticated",listClaims({sub:id(2),session_id:id(502)})]]){
    await assert.rejects(h.call("admin_distribution_read_v1",["channels","{}"],claims,role));
    await assert.rejects(h.call("admin_distribution_write_v1",["channel_save","{}"],claims,role));
  }
  await assert.rejects(h.callAs("authenticated",listClaims(),"select * from private.distribution_record_v1"));
  await assert.rejects(h.callAs("authenticated",listClaims(),"select private.distribution_detail_v1($1,null)",[listActor.profileId]));
  await assert.rejects(h.write("channel_save",{requestId:randomUUID(),name:"Valido",url:"https://www.whatsapp.com/channel/ValidChannel123",region:null,active:"true"}),/INVALID_INPUT/);
  await assert.rejects(h.write("channel_save",{requestId:randomUUID(),name:"Valido",url:"https://www.whatsapp.com/channel/ValidChannel123",region:null,active:true,extra:true}),/INVALID_INPUT/);
 }finally{await h.db.close();}
});

test("queue pagination stays bounded and new failure actions are readable through the audit bridge",async()=>{
  const h=await createDistributionFixture();
  try {
    await h.write("channel_save",{requestId:randomUUID(),name:"Nazionale",url:"https://www.whatsapp.com/channel/Pagination123",region:null,active:true});
    for(let n=800;n<835;n++)await h.insert(n,{status:"pubblicato"});
    const first=await h.read("queue"),second=await h.read("queue",{offset:30});
    assert.equal(first.items.length,30);assert.equal(first.hasMore,true);
    assert.equal(second.items.length,5);assert.equal(second.hasMore,false);
    assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,35);
    for(const action of ["distribution.save","distribution.channel_save"]){
      await h.call("admin_record_server_audit_v1",[action,"failure",randomUUID(),listActor.authId,listActor.userId,null,"STATE_CONFLICT"],{role:"service_role"},"service_role");
      const events=await h.auditList({action,outcome:"failure"});assert.equal(events.items.length,1);
      assert.deepEqual((await h.auditDetail(events.items[0].id)).changes,{});
    }
  }finally{await h.db.close();}
});
