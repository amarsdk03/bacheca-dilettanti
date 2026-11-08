import assert from "node:assert/strict";
import {test} from "node:test";
import {createCreationFixture} from "./helpers/admin-creation-fixture.mjs";
import {listClaims, listActor, listId} from "./helpers/admin-announcements-fixture.mjs";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
import {creationInput,creationDomain} from "./helpers/admin-creation-data.mjs";
const load = adminServerLoader();
const {normalizeCreation} = load("apps/admin/src/features/annunci/create/domain.ts");
const {createAnnouncementCreation}=load("apps/admin/src/features/annunci/create/service.ts");
const submission = listId(20001);
function payload() {
  const p = normalizeCreation({version:1,submissionId:submission,authorMode:"unregistered",profileId:null,profileType:"giocatore",teamType:"Cerca giocatori",
    profile:{name:"Mario",birthDate:"2000-01-01",gender:"Uomo",nationality:"IT",sports:["Calcio 11"],availability:"Svincolato",mainRoles:["Portiere"],region:"Lombardia",city:"Milano"},
    announcement:{categories:["Qualsiasi"],locations:[{region:"Lombardia",city:"Milano"},{region:"Lazio",city:"Roma"}],publicPhone:"+393331234567"},referenceEmail:"",authorized:true});
  return {author_mode:"unregistered",profile_id:null,profile_type:p.profileType,profile_draft:p.profileDraft,profile_locations:p.profileLocations,profile_social_links:p.profileSocialLinks,
    announcement_type:p.announcementType,announcement_title:p.announcementTitle,detail:p.detail,announcement_locations:p.announcementLocations,contacts:p.contacts,
    extras:{generic_link:""},authorized:true,source:"whatsapp",original_text:"Messaggio di prova locale",message_url:null,reference_email:null};
}
test("Admin creation is atomic, pending, anonymous, regionally grouped, private and idempotent", async () => {
  const h = await createCreationFixture();
  const call = (id,data,claims=listClaims(),role="authenticated") => h.callAs(role,claims,"select public.admin_create_announcement_v1($1::uuid,$2::jsonb) as result",[id,JSON.stringify(data)]).then(r=>r.rows[0].result);
  try {
    const data=payload(), first=await call(submission,data);
    assert.equal(first.status,"success"); assert.equal(first.announcements.length,2);
    assert.ok(first.announcements.every(a=>a.status==="in_revisione"));
    assert.deepEqual(first.announcements.map(a=>a.region),["Lazio","Lombardia"]);
    assert.equal((await call(submission,data)).idempotent,true);
    assert.equal((await h.db.query("select count(*)::int n from public.annuncio")).rows[0].n,2);
    const rows=(await h.db.query("select a.creato_da,p.uuid_utente,p.confermato_il,p.verificato_il from public.annuncio a join public.profilo p on p.uuid=a.autore_annuncio")).rows;
    assert.ok(rows.every(r=>Object.values(r).every(v=>v===null)));
    assert.equal((await h.db.query("select count(*)::int n from auth.users")).rows[0].n,2);
    assert.equal((await h.db.query("select count(*)::int n from private.notifiche")).rows[0].n,0);
    assert.equal((await h.db.query("select count(*)::int n from private.admin_audit_event_v1 where action='announcement.create'")).rows[0].n,1);
    const detail=await h.detail(first.announcementId); assert.equal(detail.origin.kind,"whatsapp"); assert.equal(detail.summary.fromWhatsApp,true);
    const audit=await h.auditList({action:"announcement.create"}); assert.equal(audit.items[0].action,"announcement.create");
    const page=await h.list();assert.ok(page.items.every(item=>item.fromWhatsApp===true));
    await assert.rejects(call(submission,{...data,announcement_title:"Changed"}), /ADMIN_CREATION_CONFLICT/);
    await assert.rejects(call(listId(20002),data,{...listClaims(),sub:listId(2)}),/ADMIN_|ACCESS/);
    await assert.rejects(h.callAs("authenticated",listClaims(),"select * from private.admin_creation_submission_v1"), /permission denied/);
    await assert.rejects(call(listId(20003),{...data,detail:{categorie_ricercate:[]}}), /INCOMPLETE|INVALID/);
    assert.equal((await h.db.query("select count(*)::int n from private.admin_creation_submission_v1")).rows[0].n,1);
  } finally {await h.db.close();}
});

test("all eleven registered announcement variants preserve ownership and enabled-profile requirements",async()=>{
  const h=await createCreationFixture();
  try {
    const service=createAnnouncementCreation({session:async()=>({actorId:listActor.authId,rpc:async(name,args)=>{
      const signatures={admin_search_announcement_authors_v1:["$1::text",[args.p_query]],admin_get_announcement_submission_v1:["$1::uuid",[args.p_submission]],admin_create_announcement_v1:["$1::uuid,$2::jsonb",[args.p_submission,JSON.stringify(args.p_payload)]]};
      assert.ok(Object.hasOwn(signatures,name));const [signature,params]=signatures[name];
      try {return {data:(await h.callAs("authenticated",listClaims(),`select public.${name}(${signature}) as result`,params)).rows[0].result,error:null};}
      catch(error){return {data:null,error:{code:error.code,message:error.message}};}
    }}),upload:async()=>assert.fail("No image selected")});
    await h.db.query("insert into public.restricted_profile_access values($1,'servizi-consulenze',array['Lombardia']),($1,'creators',array['Lombardia'])",[listActor.profileId]);
    const tableNames={giocatore:"profilo_giocatore",squadra:"profilo_squadra","staff-sportivo":"profilo_staff_sportivo",arbitro:"profilo_arbitro","torneo-evento":"profilo_torneo_evento","campi-impianti-sportivi":"profilo_campi_impianti","servizi-consulenze":"profilo_servizi_consulenze",creators:"profilo_creator"};
    let n=21000;
    for(const [type,table] of Object.entries(tableNames)) {
      const base=creationInput(type),draft=creationDomain.canonicalProfile(type,base.profile);
      const columns=(await h.db.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1",[table])).rows.map(r=>r.column_name).filter(c=>Object.hasOwn(draft,c));
      await h.db.query(`update public.${table} set (${columns.join(',')})=(select ${columns.join(',')} from jsonb_populate_record(null::public.${table},$1::jsonb)) where uuid_profilo=$2`,[JSON.stringify(draft),listActor.profileId]);
      await h.db.query("insert into public.localita_profilo(uuid_profilo,sottoprofilo,regione,citta) values($1,$2,'Lombardia','Milano')",[listActor.profileId,type]);
      for(const team of type==="squadra"?["Cerca giocatori","Cerca staff","Cerca partite amichevoli","Cerca sponsor"]:["Cerca giocatori"]) {
        const input={...creationInput(type,team),authorMode:"registered",profileId:`${listActor.profileId}:${type}`};
        input.submissionId=listId(++n);
        const response=await service.submit(input);assert.equal(response.status,"ok",JSON.stringify({type,team,response}));
        const result=response.receipt;
        assert.ok(result.announcements.every(a=>a.status==="in_revisione"));
        const owner=(await h.db.query("select creato_da,autore_annuncio from public.annuncio where uuid=$1",[result.announcementId])).rows[0];
        assert.equal(owner.creato_da,listActor.authorId);assert.equal(owner.autore_annuncio,listActor.profileId);
      }
    }
    const authors=(await h.callAs("authenticated",listClaims(),"select public.admin_search_announcement_authors_v1($1) authors",[listActor.profileId])).rows[0].authors;
    assert.equal(authors.length,1);assert.equal(authors[0].profiles.length,8);
    await h.db.query("delete from public.restricted_profile_access where profile_type='creators'");
    const available=(await h.callAs("authenticated",listClaims(),"select public.admin_search_announcement_authors_v1($1) authors",[listActor.profileId])).rows[0].authors;
    assert.equal(available[0].profiles.some(p=>p.type==="creators"),false);
  }finally{await h.db.close();}
});

test("the six anonymous profile types save their complete drafts and social links without provisioning Auth users",async()=>{
  const h=await createCreationFixture();
  try {
    let n=22000;
    for(const type of ["giocatore","squadra","staff-sportivo","arbitro","torneo-evento","campi-impianti-sportivi"]) {
      const input=creationInput(type);input.profile.social=[{platform:"Sito web",url:"https://example.test/"}];
      const p=creationDomain.normalizeCreation(input),data={...payload(),source:"manual",original_text:null,profile_type:type,profile_draft:p.profileDraft,profile_locations:p.profileLocations,profile_social_links:p.profileSocialLinks,announcement_type:p.announcementType,detail:p.detail,announcement_locations:p.announcementLocations,contacts:p.contacts};
      const result=(await h.callAs("authenticated",listClaims(),"select public.admin_create_announcement_v1($1,$2::jsonb) as result",[listId(++n),JSON.stringify(data)])).rows[0].result;
      assert.equal(result.status,"success",type);
      assert.equal((await h.db.query("select creato_da from public.annuncio where uuid=$1",[result.announcementId])).rows[0].creato_da,null);
    }
    assert.equal((await h.db.query("select count(*)::int n from public.link_social_profilo")).rows[0].n,6);
    assert.equal((await h.db.query("select count(*)::int n from auth.users")).rows[0].n,2);
  }finally{await h.db.close();}
});
