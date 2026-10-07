import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migration = readFileSync(new URL("../supabase/migrations/20261005130030_centro_notifiche.sql", import.meta.url), "utf8");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
test("notification database: events, history, pagination, links, contacts and permissions", {skip: !existsSync(engineUrl)}, async (t) => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	t.after(() => db.close());
	await db.exec(`
		create role anon; create role authenticated; create role service_role bypassrls;
		create schema private; grant usage on schema private to service_role;
		create table public.utente (utente_uuid uuid primary key, registrato_il timestamptz default now());
		create table public.profilo (uuid uuid primary key, uuid_utente uuid references public.utente, nascosto boolean default false, tipologia_principale text default 'giocatore');
		create table public.annuncio (uuid uuid primary key, autore_annuncio uuid references public.profilo, titolo_annuncio text, stato_annuncio text, info_stato_annuncio text, nascosto boolean default false, privato boolean default false);
		create table public.profilo_follow (uuid_profilo_follower uuid references public.profilo, uuid_profilo_seguito uuid references public.profilo, creato_il timestamptz default clock_timestamp(), primary key(uuid_profilo_follower,uuid_profilo_seguito));
		create table public.restricted_profile_access (profile_id uuid references public.profilo, profile_type text, enabled_at timestamptz default clock_timestamp(), primary key(profile_id,profile_type));
		create table private.segnalazioni (id bigint generated always as identity primary key, uuid_annuncio uuid references public.annuncio, uuid_profilo uuid references public.profilo, uuid_utente_segnalatore uuid references public.utente);
		create table private.manifestazioni_interesse (id bigint generated always as identity primary key, uuid_utente_destinatario uuid references public.utente, uuid_profilo_mittente uuid references public.profilo, sottoprofilo_mittente text, uuid_annuncio uuid references public.annuncio, uuid_profilo_destinatario uuid references public.profilo, sottoprofilo_destinatario text, email text, telefono text, creato_il timestamptz default clock_timestamp());
	`);
	for (const name of ["giocatore","squadra","staff_sportivo","arbitro","torneo_evento","campi_impianti","servizi_consulenze","creator"]) {
		await db.exec(`create table public.profilo_${name} (uuid_profilo uuid references public.profilo, nascosto boolean default false, nome text, cognome text, nome_societa text, nome_creator text, nome_organizzazione text)`);
	}
	for (let n=1;n<=3;n++) {
		await db.query("insert into public.utente(utente_uuid) values ($1)", [id(n)]);
		await db.query("insert into public.profilo(uuid,uuid_utente) values ($1,$2)", [id(n+10),id(n)]);
		await db.query("insert into public.profilo_giocatore(uuid_profilo,nome,cognome) values ($1,$2,'Rossi')", [id(n+10),`Mario ${n}`]);
	}
	await db.query("insert into public.annuncio values ($1,$2,'Annuncio storico','pubblicato',null,false,false)",[id(30),id(12)]);
	await db.query("insert into private.manifestazioni_interesse(uuid_utente_destinatario,uuid_profilo_mittente,sottoprofilo_mittente,uuid_annuncio,email,telefono,creato_il) values ($1,$2,'giocatore',$3,'mario@example.it','3331234567','2026-09-01T10:00:00Z')",[id(2),id(11),id(30)]);
	await db.exec(migration);
	await db.exec("grant select,insert,update,delete on all tables in schema public,private to service_role; grant usage,select on all sequences in schema private to service_role; set role service_role");
	const page = async (user=2,limit=20,cursor=null) => (await db.query("select public.get_notifications_v1($1,$2,$3,$4) result",[id(user),limit,cursor?.date??null,cursor?.id??null])).rows[0].result;
	const count = async (user=2) => (await page(user,0)).unreadCount;
	await t.test("old interests are backfilled unread with original date and contacts only for the recipient",async () => {
		const result = await page();
		assert.equal(result.unreadCount,1);
		assert.equal(result.items[0].email,"mario@example.it");
		assert.equal(result.items[0].actor.label,"Mario 1 Rossi");
		assert.match(result.items[0].createdAt,/2026-09-01/);
		assert.equal((await page(1)).items.length,0);
	});
	await t.test("fresh interest creates exactly one notification",async () => {
		await db.query("insert into private.manifestazioni_interesse(uuid_utente_destinatario,uuid_profilo_mittente,sottoprofilo_mittente,uuid_profilo_destinatario,sottoprofilo_destinatario,email) values ($1,$2,'giocatore',$3,'giocatore','new@example.it')",[id(2),id(11),id(12)]);
		assert.equal(await count(),2);
	});
	await t.test("duplicate follows are silent; following again creates a new event",async () => {
		await db.query("insert into public.profilo_follow(uuid_profilo_follower,uuid_profilo_seguito) values ($1,$2) on conflict do nothing",[id(11),id(12)]);
		await db.query("insert into public.profilo_follow(uuid_profilo_follower,uuid_profilo_seguito) values ($1,$2) on conflict do nothing",[id(11),id(12)]);
		assert.equal(await count(),3);
		await db.exec("delete from public.profilo_follow");
		await db.query("insert into public.profilo_follow(uuid_profilo_follower,uuid_profilo_seguito) values ($1,$2)",[id(11),id(12)]);
		assert.equal(await count(),4);
	});
	await t.test("announcement status and first public publication notify the right users once",async () => {
		await db.query("insert into public.annuncio values ($1,$2,'Nuovo annuncio','in_revisione','In attesa',false,false)",[id(31),id(12)]);
		assert.equal(await count(),5);
		assert.equal(await count(1),0);
		await db.query("update public.annuncio set stato_annuncio='pubblicato' where uuid=$1",[id(31)]);
		assert.equal(await count(1),1);
		assert.equal(await count(),6);
		await db.query("update public.annuncio set nascosto=true where uuid=$1",[id(31)]);
		await db.query("update public.annuncio set nascosto=false where uuid=$1",[id(31)]);
		await db.query("update public.annuncio set stato_annuncio='rifiutato',info_stato_annuncio='Contenuto incompleto' where uuid=$1",[id(31)]);
		assert.equal((await page()).items[0].info,"Contenuto incompleto");
		assert.equal((await page()).items[0].target.href,"/il-tuo-profilo?sezione=annunci");
		await db.query("update public.annuncio set stato_annuncio='pubblicato' where uuid=$1",[id(31)]);
		assert.equal(await count(1),1);
		await db.query("update public.annuncio set nascosto=true where uuid=$1",[id(30)]);
		await db.query("update public.annuncio set nascosto=false where uuid=$1",[id(30)]);
		assert.equal(await count(1),1);
	});
	await t.test("only authenticated report senders receive confirmations and grants notify special profiles",async () => {
		await db.query("insert into private.segnalazioni(uuid_annuncio,uuid_utente_segnalatore) values ($1,$2)",[id(31),id(1)]);
		assert.equal(await count(1),2);
		await db.query("insert into private.segnalazioni(uuid_annuncio) values ($1)",[id(31)]);
		assert.equal(await count(1),2);
		await db.query("insert into public.restricted_profile_access(profile_id,profile_type) values ($1,'creators') on conflict do nothing",[id(11)]);
		assert.equal(await count(1),3);
	});
	await t.test("reading IDs is scoped to the recipient and limited to displayed batches",async () => {
		const ids = (await page()).items.map((item)=>item.id);
		const before = await count();
		await db.query("select public.mark_notifications_read_v1($1,$2)",[id(1),ids]);
		assert.equal(await count(),before);
		await db.query("select public.mark_notifications_read_v1($1,$2)",[id(2),ids.slice(0,3)]);
		assert.equal(await count(),before-3);
		await assert.rejects(()=>db.query("select public.mark_notifications_read_v1($1,$2)",[id(2),Array(21).fill(ids[0])]),{code:"22023"});
	});
	await t.test("cursor pagination preserves timestamp precision and excludes new items from subsequent pages",async () => {
		for(let n=0;n<43;n++) await db.query("insert into private.notifiche(destinatario,tipo,evento,creato_il) values ($1,'novita',$2,'2026-10-05T10:00:00.123456Z')",[id(3),`test:${n}`]);
		const first=await page(3); assert.equal(first.items.length,20); assert.match(first.nextCursor.date,/123456/);
		await db.query("insert into private.notifiche(destinatario,tipo,evento) values ($1,'novita','new')",[id(3)]);
		const second=await page(3,20,first.nextCursor); const third=await page(3,20,second.nextCursor);
		assert.equal(second.items.length,20); assert.equal(third.items.length,3); assert.equal(third.nextCursor,null);
		assert.equal(new Set([...first.items,...second.items,...third.items].map(item=>item.id)).size,43);
		assert.equal((await page(3,0)).items.length,0);
	});
	await t.test("deleted interest contacts disappear and unavailable profiles lose their links",async () => {
		await db.query("update public.profilo set nascosto=true where uuid=$1",[id(11)]);
		assert.equal((await page()).items.find(item=>item.type==="interesse").actor.href,null);
		await db.exec("delete from private.manifestazioni_interesse");
		assert.equal((await page()).items.find(item=>item.type==="interesse").email,null);
	});
	await t.test("browser roles cannot read contacts, forge notifications or invoke service RPCs",async () => {
		for(const role of ["anon","authenticated"]) {
			await db.exec(`reset role; set role ${role}`);
			await assert.rejects(()=>db.exec("select * from private.notifiche"),{code:"42501"});
			await assert.rejects(()=>page(),{code:"42501"});
			await assert.rejects(()=>db.query("select public.mark_notifications_read_v1($1,'{}')",[id(2)]),{code:"42501"});
		}
	});
});
