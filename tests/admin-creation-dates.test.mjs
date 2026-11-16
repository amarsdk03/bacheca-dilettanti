import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
import {creationInput, creationDomain} from "./helpers/admin-creation-data.mjs";
import {createCreationFixture} from "./helpers/admin-creation-fixture.mjs";
import {listClaims, listId} from "./helpers/admin-announcements-fixture.mjs";

const load = adminServerLoader(), base = "apps/admin/src/features/annunci/create/";
const {publicationToday, validPublicationDate, withBirthYearDefaults} = load(base + "date-defaults.ts");
const {migrateCanonicalDraft} = load(base + "canonical-draft.ts");
const {parseWhatsAppMessage} = load(base + "whatsapp-parser.ts");
const {createAnnouncementCreation} = load(base + "service.ts");
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");

test("publication dates use the Italian day, reject invalid/future days and allow omission", () => {
  const now = new Date("2026-11-16T23:30:00Z");
  assert.equal(publicationToday(now), "2026-11-17");
  for (const value of ["", "1900-01-01", "2024-02-29", "2026-11-17"]) assert(validPublicationDate(value, now), value);
  for (const value of ["1899-12-31", "2026-11-18", "2026-02-30", "2026-2-3", "bad"]) assert.equal(validPublicationDate(value, now), false, value);
  assert(creationDomain.validateCreation({...creationInput(), publicationDate:"2999-01-01"}).some(issue => issue.path === "announcement.publicationDate"));
});

test("admin birth defaults fill only missing day/month and WhatsApp years no longer require a fictitious correction", () => {
  const empty = {anno_nascita:"", mese_nascita:"", giorno_nascita:""};
  assert.deepEqual(withBirthYearDefaults(empty, "anno_nascita", "2001"), {anno_nascita:"2001", mese_nascita:"Gennaio", giorno_nascita:"1"});
  assert.equal(empty.anno_nascita, "");
  assert.deepEqual(withBirthYearDefaults({...empty, mese_nascita:"Marzo", giorno_nascita:"12"}, "anno_nascita", "2000"), {anno_nascita:"2000", mese_nascita:"Marzo", giorno_nascita:"12"});
  assert.equal(withBirthYearDefaults(empty, "anno_nascita", "20").mese_nascita, "");
  const extraction = parseWhatsAppMessage("🔵 GIOCATORE CERCA SQUADRA\n📅 Anno: 2001", "", "", {channelRegion:"Lombardia"});
  assert(!extraction.issues.some(issue => issue.path === "profile.birthDate"));
  const canonical = migrateCanonicalDraft({...creationInput(), profile:extraction.profile});
  assert.equal(canonical.profiles.giocatore.anno_nascita, "2001");
  assert.equal(canonical.profiles.giocatore.mese_nascita, "Gennaio");
  assert.equal(canonical.profiles.giocatore.giorno_nascita, "1");
});

test("selected publication date reaches the versioned RPC and invalid dates never trigger creation", async () => {
  const calls = [], id = listId(51000); let missingRpc = false;
  const service = createAnnouncementCreation({session:async()=>({actorId:id,rpc:async(name,args)=>{
    calls.push({name,args});
    if (name === "admin_create_announcement_v3" && missingRpc) return {error:{code:"PGRST202"},data:null};
    return {error:null,data:name === "admin_get_announcement_submission_v1" ? null : {status:"success",publicationId:id,announcementId:id,announcements:[{id,region:"Lombardia",status:"in_revisione"}],idempotent:false}};
  }}),upload:async()=>{throw new Error("No upload expected");}});
  assert.equal((await service.submit({...creationInput(),publicationDate:"2020-06-15"})).status,"ok");
  assert.equal(calls.at(-1).name,"admin_create_announcement_v3");
  assert.equal(calls.at(-1).args.p_payload.publication_date,"2020-06-15");
  calls.length=0;
  assert.equal((await service.submit({...creationInput(),publicationDate:"2999-01-01"})).status,"invalid");
  assert.equal(calls.length,0);
  missingRpc=true;
  assert.equal((await service.submit({...creationInput(),publicationDate:"2020-06-15"})).status,"unavailable");
});

test("the publication day survives WhatsApp re-analysis and session restoration, but resets for a new announcement", async () => {
  const dependencies={react:await import("react"),"react/jsx-runtime":await import("react/jsx-runtime"),zustand:await import("zustand"),"zustand/middleware":await import("zustand/middleware")};
  const loader=adminServerLoader({dependencies});
  const {createAnnouncementDraftStore}=loader(base+"store.tsx");
  const {applyWhatsAppExtraction}=loader(base+"whatsapp-draft.ts");
  const entries=new Map(),storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
  const store=createAnnouncementDraftStore("local-admin",storage);
  const extraction=parseWhatsAppMessage("🔵 GIOCATORE CERCA SQUADRA\n📅 Anno: 2001", "", "", {channelRegion:"Lombardia"});
  store.setState({mode:"whatsapp",whatsappAuthorMode:"unregistered"});
  applyWhatsAppExtraction(store,extraction);
  const key=Object.keys(store.getState().drafts)[0],draft=store.getState().drafts[key];
  store.setState({drafts:{[key]:{...draft,values:{...draft.values,publicationDate:"2020-06-15"}}}});
  applyWhatsAppExtraction(store,extraction);
  const restored=createAnnouncementDraftStore("local-admin",storage);await restored.persist.rehydrate();
  assert.equal(restored.getState().drafts[key].values.publicationDate,"2020-06-15");
  restored.getState().clear(true);
  assert.deepEqual(restored.getState().drafts,{});
});

test("publication migration preserves regional dates, direct approval, current audit time and idempotency", async () => {
  const h = await createCreationFixture();
  try {
    await h.db.exec(migration("20261111163837_admin_direct_approval_whatsapp_export"));
    await h.db.exec(migration("20261116162039_admin_announcement_publication_date"));
    const p = creationDomain.normalizeCreation(creationInput());
    const data = {author_mode:"unregistered",profile_id:null,profile_type:p.profileType,profile_draft:p.profileDraft,profile_locations:p.profileLocations,profile_social_links:p.profileSocialLinks,announcement_type:p.announcementType,announcement_title:p.announcementTitle,detail:p.detail,announcement_locations:[...p.announcementLocations,{regione:"Lazio",citta:"Roma"}],contacts:p.contacts,extras:{generic_link:""},authorized:true,source:"whatsapp",original_text:"Local fixture",message_url:null,reference_email:null,publication_date:"2020-06-15"};
    const call = (id, payload, claims=listClaims(), role="authenticated") => h.callAs(role,claims,"select public.admin_create_announcement_v3($1,$2::jsonb) result",[listId(id),JSON.stringify(payload)]).then(r=>r.rows[0].result);
    for (const approve of [false,true]) {
      const id=approve?51002:51001, payload={...data,...(approve?{approve_immediately:true}:{})};
      const result=await call(id,payload);
      assert.equal(result.announcements.length,2);
      assert(result.announcements.every(a=>a.status===(approve?"pubblicato":"in_revisione")));
      const rows=await h.db.query("select to_char(a.creato_il at time zone 'Europe/Rome','YYYY-MM-DD HH24:MI:SS') as local_date, g.created_at=a.creato_il as same_date from public.annuncio a join private.regional_publication g on g.id=a.gruppo_pubblicazione where g.id=$1",[result.publicationId]);
      assert.equal(rows.rows.length,2);
      assert(rows.rows.every(row=>row.local_date==="2020-06-15 00:00:00" && row.same_date),JSON.stringify(rows.rows));
      assert.equal((await call(id,payload)).idempotent,true);
      await assert.rejects(call(id,{...payload,publication_date:"2020-06-16"}),/ADMIN_CREATION_CONFLICT/);
    }
    for (const date of ["2026-02-30","2999-01-01","1899-12-31",null,42]) await assert.rejects(call(51003,{...data,publication_date:date}),/ADMIN_CREATION_DATE_INVALID/);
    await assert.rejects(call(51004,data,{...listClaims(),sub:listId(2)}),/ADMIN_|ACCESS/);
    const {publication_date,...legacy}=data;
    const current=await call(51005,legacy);
    assert((await h.db.query("select creato_il > now()-interval '1 minute' as recent from public.annuncio where uuid=$1",[current.announcementId])).rows[0].recent);
    assert.equal((await h.db.query("select count(*)::int n from private.admin_audit_event_v1 where action='announcement.create'")).rows[0].n,3);
    assert((await h.db.query("select bool_and(occurred_at > now()-interval '1 minute') as recent from private.admin_audit_event_v1 where action='announcement.create'")).rows[0].recent);
  } finally {await h.db.close();}
});
