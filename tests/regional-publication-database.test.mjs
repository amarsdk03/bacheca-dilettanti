import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {PGlite} from "./helpers/pglite.mjs";
import {createTrashFixture} from "./helpers/admin-trash-fixture.mjs";
import {listId, listActor, listClaims} from "./helpers/admin-announcements-fixture.mjs";

const schema = readFileSync(new URL("../supabase/migrations/20261102145910_regional_publication_schema.sql", import.meta.url), "utf8");
const backfill = readFileSync(new URL("../supabase/migrations/20261102151000_regional_publication_backfill.sql", import.meta.url), "utf8");
const activate = readFileSync(new URL("../supabase/migrations/20261102151100_regional_publication_activate.sql", import.meta.url), "utf8");
const adminLegacyFix = readFileSync(new URL("../supabase/scripts/regional_publication_admin_legacy_fix.sql", import.meta.url), "utf8");
const types = ["annuncio_giocatore", "annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_partita", "annuncio_squadra_cerca_sponsor", "annuncio_staff_sportivo", "annuncio_arbitro", "annuncio_torneo_evento", "annuncio_campo_impianto", "annuncio_servizi_consulenze", "annuncio_creators"];
const actor = "11111111-1111-4111-8111-111111111111", owner = "22222222-2222-4222-8222-222222222222", author = "33333333-3333-4333-8333-333333333333";
const locations = [{regione: "Veneto", citta: null}, {regione: "Lazio", citta: "Roma"}, {regione: "Lazio", citta: "Viterbo"}, {regione: "Toscana", citta: "Firenze"}, {regione: "Lombardia", citta: "Milano"}];
async function fixture(active = true) {
	const db = await PGlite.create();
	await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('fixture.actor',true),''),'${actor}')::uuid$$;
    create table public.utente(utente_uuid uuid primary key,auth_user_uuid uuid,registrato_il timestamptz);
    insert into public.utente values('${owner}','${actor}',now()),('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555',now());
    create table public.profilo(uuid uuid primary key,uuid_utente uuid);
    insert into public.profilo values('${author}','${owner}'),('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444');
    create table public.profilo_follow(uuid_profilo_follower uuid,uuid_profilo_seguito uuid);
    insert into public.profilo_follow values('66666666-6666-4666-8666-666666666666','${author}');
    create table public.annuncio(uuid uuid primary key default gen_random_uuid(),autore_annuncio uuid,creato_da uuid,creato_il timestamptz default now(),ultima_modifica_il timestamptz default now(),tipologia_annuncio text,stato_annuncio text default 'in_revisione',nascosto boolean default false,privato boolean default false,oscurato_da_admin boolean default false,eliminato_il timestamptz,eliminato_da uuid,livello_annuncio text default 'gratuito',titolo_annuncio text,info_stato_annuncio text);
    create table public.localita_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid references public.annuncio on delete cascade,regione text,citta text);
    create table public.media_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid references public.annuncio on delete cascade,link_media text,formato_media text);
    create table public.contatto_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid references public.annuncio on delete cascade,tipo text,valore text,referente text);
    create table public.link_social_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid references public.annuncio on delete cascade,piattaforma text,sublink text);
    create table public.annuncio_salvato(uuid_annuncio uuid references public.annuncio on delete cascade,uuid_utente uuid);
    create table private.announcement_submission(submission_id uuid primary key,announcement_id uuid references public.annuncio on delete set null,utente_id uuid,created_at timestamptz default now(),requested_announcement_id uuid,requested_visibility text default 'gratuito',stripe_checkout_session_id text,stripe_payment_intent_id text,paid_at timestamptz);
    create table private.annunci_notificati(annuncio uuid primary key references public.annuncio on delete cascade);
    create table private.notifiche(id bigint generated always as identity,destinatario uuid,tipo text,evento text,dati jsonb,unique(destinatario,evento));
    create table private.single_calls(id bigint generated always as identity);
    create table private.activity_audit(id uuid);
    create function private.notification_profile_ref(uuid) returns jsonb language sql as $$select jsonb_build_object('id',$1,'kind','profilo','label','Profilo')$$;
    create function private.notification_target_ref(uuid,uuid) returns jsonb language sql as $$select jsonb_build_object('id',$1,'kind','annuncio','label','Titolo')$$;
    create function private.notify_announcement_v1() returns trigger language plpgsql as $$begin return new; end$$;
    create trigger notification_announcement after insert or update of stato_annuncio,nascosto,privato on public.annuncio for each row execute function private.notify_announcement_v1();
    create function private.track_announcement_activity() returns trigger language plpgsql as $$begin insert into private.activity_audit values(new.uuid); return null; end$$;
    create constraint trigger announcement_activity_change after insert or update on public.annuncio deferrable initially deferred for each row execute function private.track_announcement_activity();
    create function public.publish_announcement_core_v1(uuid,jsonb,text,text) returns jsonb language sql as $$select '{}'::jsonb$$;
    create function public.publish_announcement_v1(uuid,jsonb,text,text) returns jsonb language sql as $$select '{}'::jsonb$$;
  `);
	for (const type of types) await db.exec(`create table public.${type === "annuncio_creators" ? "annuncio_creator" : type}(id bigint generated always as identity primary key,uuid_annuncio uuid references public.annuncio on delete cascade,data jsonb);`);
	// The installed business writer is separately exercised by the publication suites.
	// This fixture isolates orchestration, finalized snapshots and one-call quota semantics.
	await db.exec(`create function public.publish_announcement_v2(uuid,jsonb,text,text,text) returns jsonb language plpgsql security definer set search_path='' as $$
    declare a uuid; old_id uuid; tab text; begin
      select announcement_id into old_id from private.announcement_submission where submission_id=$1;
      if found then
        if old_id is null then raise exception 'SUBMISSION_ALREADY_CONSUMED'; end if;
        return jsonb_build_object('status','success','announcementId',old_id,'idempotent',true);
      end if;
      if exists(select 1 from public.utente where utente_uuid='${owner}' and registrato_il is null) and exists(select 1 from private.announcement_submission where created_at>now()-interval '24 hours') then return jsonb_build_object('status','rate_limited','retryAt',now()+interval '24 hours'); end if;
      insert into private.single_calls default values;
      insert into public.annuncio(autore_annuncio,creato_da,tipologia_annuncio,titolo_annuncio) values('${author}','${owner}',$2->>'announcement_type','Titolo') returning uuid into a;
      tab:=case when $2->>'announcement_type'='annuncio_creators' then 'annuncio_creator' else $2->>'announcement_type' end;
      execute format('insert into public.%I(uuid_annuncio,data) values($1,$2)',tab) using a,($2->'detail')||jsonb_build_object('final_snapshot','preserved');
      insert into public.localita_annuncio(uuid_annuncio,regione,citta) select a,x->>'regione',x->>'citta' from jsonb_array_elements($2->'announcement_locations') x;
      insert into public.contatto_annuncio(uuid_annuncio,tipo,valore,referente) values(a,'email','test@example.test','Segreteria');
      insert into public.link_social_annuncio(uuid_annuncio,piattaforma,sublink) values(a,'link_annuncio','https://example.test');
      insert into public.media_annuncio(uuid_annuncio,link_media,formato_media) values(a,'local-fixture/shared.png','image/png');
      insert into private.announcement_submission(submission_id,announcement_id,utente_id) values($1,a,'${owner}');
      return jsonb_build_object('status','success','announcementId',a,'idempotent',false);
    end$$;`);
	await db.exec(schema);
	if (active) {await db.exec(backfill); await db.exec(activate);}
	return db;
}
async function publish(db, type = types[0], submissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", selected = locations) {
	return (await db.query("select public.publish_announcement_v3($1,$2::jsonb,'terms','privacy','gratuito') result", [submissionId, JSON.stringify({announcement_type: type, announcement_locations: selected, detail: {description: "Prima riga\nSeconda riga", roles: ["Allenatore"], remote: false, price: 0}})])).rows[0].result;
}

test("regional publisher creates four independent copies with all finalized sidecars, for all eleven types", async () => {
	const db = await fixture();
	try {
		for (const [index, type] of types.entries()) {
			const result = await publish(db, type, `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12,"0")}`, type === "annuncio_squadra_cerca_sponsor" ? [] : type === "annuncio_campo_impianto" ? locations.slice(1,2) : locations);
			const count = ["annuncio_squadra_cerca_sponsor","annuncio_campo_impianto"].includes(type) ? 1 : 4;
			assert.equal(result.announcements.length,count);
			assert.equal(new Set(result.announcements.map(item => item.id)).size,count);
			for (const item of result.announcements) {
				const rows = (await db.query("select distinct regione from public.localita_annuncio where uuid_annuncio=$1", [item.id])).rows;
				assert.equal(rows.length, type === "annuncio_squadra_cerca_sponsor" ? 0 : 1);
				assert.equal(rows[0]?.regione ?? null, item.region);
				const tab = type === "annuncio_creators" ? "annuncio_creator" : type;
				const data = (await db.query(`select data from public.${tab} where uuid_annuncio=$1`, [item.id])).rows[0].data;
				assert.equal(data.final_snapshot,"preserved"); assert.equal(data.remote,false); assert.equal(data.price,0);
				for (const table of ["media_annuncio","contatto_annuncio","link_social_annuncio"]) assert.equal((await db.query(`select count(*)::int n from public.${table} where uuid_annuncio=$1`,[item.id])).rows[0].n,1);
			}
			if (count===4) assert.deepEqual(result.announcements.map(item=>item.region),["Lazio","Lombardia","Toscana","Veneto"]);
		}
		assert.equal((await db.query("select count(*)::int n from private.single_calls")).rows[0].n,11);
		// Deduplicate BEFORE limiting: six groups, even if a group has many copies.
		await db.exec("update public.annuncio set stato_annuncio='pubblicato' where tipologia_annuncio<>'annuncio_servizi_consulenze'");
		const latest = (await db.query("select * from public.latest_regional_announcement_ids_v1()")).rows;
		assert.equal(latest.length,6);
		const groups = (await db.query("select distinct gruppo_pubblicazione from public.annuncio where uuid=any($1::uuid[])",[latest.map(item=>item.id)])).rows;
		assert.equal(groups.length,6);
	} finally {await db.close();}
});

test("one anonymous quota, idempotent partial deletion and ownership checks", async () => {
	const db = await fixture();
	try {
		await db.exec(`update public.utente set registrato_il=null where utente_uuid='${owner}'`);
		const first = await publish(db);
		assert.equal(first.announcements.length,4);
		assert.deepEqual((await publish(db)).announcements,first.announcements);
		await db.query("delete from public.annuncio where uuid=$1",[first.announcementId]);
		const retry = await publish(db);
		assert.equal(retry.announcements.length,3); assert.equal(retry.idempotent,true);
		assert.equal((await db.query("select count(*)::int n from private.single_calls")).rows[0].n,1);
		assert.equal((await publish(db,types[0],"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).status,"rate_limited");
		await db.exec("set fixture.actor='55555555-5555-4555-8555-555555555555'");
		await assert.rejects(publish(db), /SUBMISSION_ID_CONFLICT/);
		assert.equal((await db.query("select public.get_owned_regional_publication_v1($1) value",[first.publicationId])).rows[0].value,null);
		await db.exec(`set fixture.actor='${actor}'`);
		await db.query("delete from public.annuncio where gruppo_pubblicazione=$1",[first.publicationId]);
		await assert.rejects(publish(db), /SUBMISSION_ALREADY_CONSUMED/);
	} finally {await db.close();}
});

test("regional failure rolls back the entire writer and notifications; siblings keep independent moderation", async () => {
	const db = await fixture();
	try {
		await db.exec("alter table public.localita_annuncio add constraint test_reject_region check(regione<>'Veneto')");
		await assert.rejects(publish(db), /test_reject_region/);
		assert.equal((await db.query("select count(*)::int n from public.annuncio")).rows[0].n,0);
		assert.equal((await db.query("select count(*)::int n from private.regional_publication")).rows[0].n,0);
		await db.exec("alter table public.localita_annuncio drop constraint test_reject_region");
		const result = await publish(db);
		for (const item of result.announcements) await db.query("update public.annuncio set stato_annuncio='pubblicato' where uuid=$1",[item.id]);
		assert.equal((await db.query("select count(*)::int n from private.notifiche where tipo='annuncio_seguito'")).rows[0].n,1);
		assert.equal((await db.query("select count(*)::int n from private.notifiche where tipo='stato_annuncio'")).rows[0].n,8);
		assert.equal((await db.query("select * from public.latest_regional_announcement_ids_v1()")).rows.length,1);
		await db.query("update public.annuncio set nascosto=true where uuid=$1",[result.announcementId]);
		assert.equal((await db.query("select count(*)::int n from public.annuncio where nascosto=false")).rows[0].n,3);
		await assert.rejects(db.query("update public.localita_annuncio set regione='Piemonte' where uuid_annuncio=$1",[result.announcements[1].id]), /REGIONAL_ANNOUNCEMENT_INCONSISTENT/);
	} finally {await db.close();}
});

test("backfill preserves original UUID, interactions and dates, suppresses activity/notifications and removes paid test records", async () => {
	const db = await fixture(false);
	try {
		const result = (await db.query("select public.publish_announcement_v2($1,$2::jsonb,'terms','privacy','gratuito') result",["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",JSON.stringify({announcement_type:types[0],announcement_locations:locations,detail:{text:"saved"}})])).rows[0].result;
		await db.query("update public.annuncio set creato_il='2025-01-01',stato_annuncio='pubblicato' where uuid=$1",[result.announcementId]);
		await db.query("update public.annuncio set creato_da=null where uuid=$1",[result.announcementId]);
		await db.query("insert into public.annuncio_salvato values($1,$2)",[result.announcementId,owner]);
		const paid = (await db.query("insert into public.annuncio(autore_annuncio,creato_da,tipologia_annuncio,livello_annuncio) values($1,$2,'annuncio_giocatore','prioritario') returning uuid",[author,owner])).rows[0].uuid;
		await db.query("insert into private.announcement_submission(submission_id,announcement_id,utente_id,requested_visibility) values(gen_random_uuid(),$1,$2,'prioritario')",[paid,owner]);
		await db.query("insert into public.media_annuncio(uuid_annuncio,link_media) values($1,'paid-only.png'),($1,'local-fixture/shared.png')",[paid]);
		const before = (await db.query("select count(*)::int n from private.notifiche")).rows[0].n;
		await db.exec("truncate private.activity_audit");
		await db.exec(backfill); await db.exec(activate);
		assert.equal((await db.query("select count(*)::int n from private.notifiche")).rows[0].n,before);
		assert.equal((await db.query("select count(*)::int n from private.activity_audit")).rows[0].n,0);
		assert.equal((await db.query("select count(*)::int n from public.annuncio where uuid=$1",[paid])).rows[0].n,0);
		assert.equal((await db.query("select count(*)::int n from private.regional_publication_backup where reason='remove_legacy_test_payment'")).rows[0].n,1);
		const original = (await db.query("select * from public.annuncio where uuid=$1",[result.announcementId])).rows[0];
		assert.equal(original.regione_pubblicazione,"Lazio");
		assert.equal((await db.query("select count(*)::int n from public.annuncio_salvato")).rows[0].n,1);
		assert.equal((await db.query("select count(*)::int n from public.annuncio where creato_il='2025-01-01' and stato_annuncio='pubblicato'")).rows[0].n,4);
		assert.equal((await publish(db)).announcements.length,4);
		assert.deepEqual((await db.query("select * from public.regional_legacy_image_cleanup_candidates_v1()")).rows,[{path:"paid-only.png"}]);
	} finally {await db.close();}
});

test("regional backfill respects real Admin/trash guards, typed sidecars, holds and private permissions", async () => {
	const h=await createTrashFixture(), {db}=h;
	try {
		await h.reset();
		await db.exec(`alter table private.manifestazioni_interesse add column uuid_annuncio uuid;
      alter table private.announcement_submission add foreign key(announcement_id) references public.annuncio on delete set null;
      create function public.publish_announcement_core_v1(uuid,jsonb,text,text) returns jsonb language sql as $$select '{}'::jsonb$$;
      create function public.publish_announcement_v1(uuid,jsonb,text,text) returns jsonb language sql as $$select '{}'::jsonb$$;`);
		for (const n of [6001,6002,6003]) {
			await h.insert(n,{hidden:n!==6001,private:n===6002});
			await h.child(listId(n),"annuncio_giocatore",{descrizione_aggiuntiva:"Testo completo",categorie_ricercate:["eccellenza"]});
			await db.query("insert into public.localita_annuncio(uuid_annuncio,regione,citta) values($1,'Lazio','Roma'),($1,'Lazio','Viterbo'),($1,'Veneto','Venezia')",[listId(n)]);
		}
		await db.query("update public.annuncio set oscurato_da_admin=true,eliminato_il=now(),eliminato_da=$2 where uuid=$1",[listId(6003),listActor.userId]);
		const original=(await db.query("select * from public.annuncio where uuid=$1",[listId(6003)])).rows[0];
		await h.insert(6004); await h.child(listId(6004),"annuncio_giocatore");
		await db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1",[listId(6004)]);
		await db.query("insert into private.announcement_submission(submission_id,announcement_id,utente_id,requested_visibility) values($1,$2,$3,'prioritario')",[listId(7004),listId(6004),listActor.authorId]);
		// Reproduce historical data that predates the Admin ownership guard.
		await h.insert(6005); await h.child(listId(6005),"annuncio_giocatore",{descrizione_aggiuntiva:"Storico Admin"});
		await db.query("insert into public.localita_annuncio(uuid_annuncio,regione) values($1,'Lazio'),($1,'Veneto')",[listId(6005)]);
		await db.exec("alter table public.annuncio disable trigger reject_admin_announcement_owner_v1");
		await db.query("update public.annuncio set creato_da=$2 where uuid=$1",[listId(6005),listActor.userId]);
		await db.exec("alter table public.annuncio enable trigger reject_admin_announcement_owner_v1");
		await db.exec(schema);
		await assert.rejects(db.exec(backfill),/ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
		await db.exec("rollback");
		assert.equal((await db.query("select count(*)::int n from public.annuncio where gruppo_pubblicazione is not null")).rows[0].n,0);
		await db.exec(adminLegacyFix); await db.exec(backfill); await db.exec(activate);
		assert.equal((await db.query("select count(*)::int n from public.annuncio")).rows[0].n,8);
		assert.equal((await db.query("select count(*)::int n from public.annuncio where creato_da=$1",[listActor.userId])).rows[0].n,2);
		assert.equal((await db.query("select count(*)::int n from public.annuncio_giocatore where descrizione_aggiuntiva='Storico Admin'")).rows[0].n,2);
		await assert.rejects(db.query("insert into public.annuncio(uuid,creato_da,autore_annuncio,tipologia_annuncio) values($1,$2,$3,'annuncio_giocatore')",[listId(9000),listActor.userId,listActor.profileId]),/ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
		await assert.rejects(db.query("insert into public.profilo(uuid,uuid_utente) values($1,$2)",[listId(9001),listActor.userId]),/ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
		const frozen=(await db.query("select * from public.annuncio where gruppo_pubblicazione=(select gruppo_pubblicazione from public.annuncio where uuid=$1)",[listId(6003)])).rows;
		assert.equal(frozen.length,2);
		for (const item of frozen) {
			assert.equal(item.eliminato_il.getTime(),original.eliminato_il.getTime());
			assert.equal(item.stato_annuncio,original.stato_annuncio); assert(item.nascosto && item.oscurato_da_admin);
		}
		assert.equal((await db.query("select announcement_id from private.announcement_submission where submission_id=$1",[listId(7004)])).rows[0].announcement_id,null);
		assert.equal((await db.query("select count(*)::int n from public.annuncio_giocatore where descrizione_aggiuntiva='Testo completo'")).rows[0].n,6);
		for (const role of ["anon","authenticated","service_role"]) {
			await assert.rejects(h.callAs(role,listClaims(),"select * from private.regional_publication"),/permission denied/);
			await assert.rejects(h.callAs(role,listClaims(),"select private.regional_split_announcement($1,$2)",[listId(6001),listId(6001)]),/permission denied/);
			await assert.rejects(h.callAs(role,listClaims(),"select public.publish_announcement_v1($1,'{}','t','p')",[listId(8000)]),/permission denied/);
		}
		await assert.rejects(h.callAs("service_role",listClaims(),"update public.annuncio set regione_pubblicazione='Puglia' where uuid=$1",[listId(6001)]),/REGIONAL_IDENTITY_PROTECTED/);
		await assert.rejects(db.query("delete from public.annuncio where uuid=$1",[listId(6003)]),/ANNOUNCEMENT_TRASH_PROTECTED/);
		const detail=await h.detail(listId(6001));
		assert.equal((await h.moderate(listId(6001),"approve",detail.contentFingerprint)).status,"ok");
		const sibling=(await db.query("select stato_annuncio from public.annuncio where gruppo_pubblicazione=(select gruppo_pubblicazione from public.annuncio where uuid=$1) and uuid<>$1",[listId(6001)])).rows[0];
		assert.equal(sibling.stato_annuncio,"in_revisione");
		assert.equal((await db.query("select enabled from private.admin_trash_release_v1")).rows[0].enabled,false);

		// Revoking a professional region retains the regional record under hold.
		await db.exec("begin");
		await db.query("insert into public.restricted_profile_access values($1,'servizi-consulenze',array['Lazio','Veneto'])",[listActor.profileId]);
		const prof=(await db.query("select gruppo_pubblicazione from public.annuncio where uuid=$1",[listId(6002)])).rows[0].gruppo_pubblicazione;
		await db.query("update public.annuncio set tipologia_annuncio='annuncio_servizi_consulenze',stato_annuncio='pubblicato',nascosto=false,privato=false where gruppo_pubblicazione=$1",[prof]);
		await db.exec("commit");
		await db.query("update public.restricted_profile_access set allowed_regions=array['Lazio'] where profile_id=$1",[listActor.profileId]);
		const revoked=(await db.query("select * from public.annuncio where gruppo_pubblicazione=$1 and regione_pubblicazione='Veneto'",[prof])).rows[0];
		assert(revoked.nascosto && revoked.oscurato_da_admin);
		assert.equal((await db.query("select count(*)::int n from public.localita_annuncio where uuid_annuncio=$1",[revoked.uuid])).rows[0].n,1);
		await assert.rejects(db.query("update public.annuncio set nascosto=false,oscurato_da_admin=false where uuid=$1",[revoked.uuid]),/PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
	} finally {await db.close();}
});
