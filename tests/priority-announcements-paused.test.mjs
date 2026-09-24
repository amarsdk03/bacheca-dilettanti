import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260924120000_pause_priority_announcements.sql", import.meta.url);
const submissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("priority pause blocks new paid publications before the publish core runs", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema auth;
			create schema private;
			create function auth.uid() returns uuid language sql stable as $$
				select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
			$$;
			create table private.publish_calls (visibility text not null);
			create function private.publish_announcement_core_v2(uuid, jsonb, text, text, text)
			returns jsonb language plpgsql as $$
			begin
				insert into private.publish_calls (visibility) values ($5);
				return '{"status":"skipped"}'::jsonb;
			end;
			$$;
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));

		await db.exec("set role authenticated");
		await assert.rejects(
			() => db.query("select public.publish_announcement_v2($1::uuid, '{}'::jsonb, 'terms', 'privacy', 'prioritario')", [submissionId]),
			/PRIORITY_PUBLICATION_DISABLED/,
		);
		await db.exec("reset role");
		assert.equal((await db.query("select count(*)::integer as count from private.publish_calls")).rows[0].count, 0);

		await db.exec("set role authenticated");
		const free = await db.query("select public.publish_announcement_v2($1::uuid, '{}'::jsonb, 'terms', 'privacy', 'gratuito') as result", [submissionId]);
		await db.exec("reset role");
		assert.equal(free.rows[0].result.status, "skipped");
		assert.deepEqual((await db.query("select visibility from private.publish_calls")).rows, [{visibility: "gratuito"}]);
	} finally {
		await db.close();
	}
});
