import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function loadSource(relativePath) {
	const file = path.join(root, relativePath);
	const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			esModuleInterop: true,
		},
		fileName: file,
	});
	const loadedModule = {exports: {}};
	new Function("require", "module", "exports", outputText)(require, loadedModule, loadedModule.exports);
	return loadedModule.exports;
}

const {
	isReportTarget,
	normalizeReportReason,
	readReportRpcResult,
} = loadSource("src/features/segnalazioni/report-model.ts");

test("report targets must identify an announcement or profile with a UUID", () => {
	const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	assert.equal(isReportTarget({kind: "annuncio", id}), true);
	assert.equal(isReportTarget({kind: "profilo", id}), true);
	assert.equal(isReportTarget({kind: "utente", id}), false);
	assert.equal(isReportTarget({kind: "annuncio", id: "not-a-uuid"}), false);
});

test("report reasons are optional, trimmed and limited to 300 characters", () => {
	assert.deepEqual(normalizeReportReason(null), {valid: true, reason: null});
	assert.deepEqual(normalizeReportReason("   "), {valid: true, reason: null});
	assert.deepEqual(normalizeReportReason("  Contenuto offensivo  "), {
		valid: true,
		reason: "Contenuto offensivo",
	});
	assert.equal(normalizeReportReason("a".repeat(300)).valid, true);
	assert.equal(normalizeReportReason("a".repeat(301)).valid, false);
	assert.equal(normalizeReportReason("⚽".repeat(300)).valid, true);
});

test("report RPC responses expose only supported application states", () => {
	assert.deepEqual(readReportRpcResult({status: "success"}), {status: "success"});
	assert.deepEqual(readReportRpcResult({status: "invalid_target"}), {status: "invalid_target"});
	assert.deepEqual(
		readReportRpcResult({status: "rate_limited", retryAt: "2026-09-18T10:00:00Z"}),
		{status: "rate_limited", retryAt: "2026-09-18T10:00:00.000Z"},
	);
	assert.equal(readReportRpcResult({status: "unexpected"}), null);
});

test("detail pages render the shared action bar for their displayed element", () => {
	const announcement = readFileSync(path.join(root, "src/features/annunci/components/details/AnnouncementDetailsLayout.tsx"), "utf8");
	const profile = readFileSync(path.join(root, "src/features/dettagli-profilo/DettagliProfilo.tsx"), "utf8");
	const actions = readFileSync(path.join(root, "src/features/segnalazioni/DetailActions.tsx"), "utf8");

	assert.match(announcement, /<DetailActions/);
	assert.match(announcement, /kind: "annuncio"/);
	assert.match(profile, /<DetailActions/);
	assert.match(profile, /kind: "profilo"/);
	assert.match(actions, /Link copiato negli appunti/);
	assert.match(actions, /<DialogTrigger[\s\S]+Segnala[\s\S]+<\/DialogTrigger>/);
	assert.match(actions, /<InteractionButton target=\{target\} state=\{interaction\} href=\{href\}/);
	assert.match(actions, /maxLength=\{REPORT_REASON_MAX_LENGTH\}/);
});

test("the migration keeps reports private and enforces target, reason and cooldown rules", () => {
	const migrationsDirectory = path.join(root, "supabase/migrations");
	const migrationName = "20260917124241_segnalazioni.sql";
	assert.equal(existsSync(path.join(migrationsDirectory, migrationName)), true);
	const sql = readFileSync(path.join(migrationsDirectory, migrationName), "utf8");

	assert.match(sql, /create table private\.segnalazioni/i);
	assert.match(sql, /uuid_utente_segnalatore uuid/i);
	assert.match(sql, /num_nonnulls\(uuid_annuncio, uuid_profilo\) = 1/i);
	assert.match(sql, /char_length\(motivazione\) between 1 and 300/i);
	assert.match(sql, /stato_annuncio = 'pubblicato'[\s\S]+nascosto is false[\s\S]+privato is false/i);
	assert.match(sql, /pg_advisory_xact_lock/i);
	assert.match(sql, /interval '24 hours'/i);
	assert.match(sql, /force row level security/i);
	assert.match(sql, /revoke all on table private\.segnalazioni from public, anon, authenticated/i);
	assert.match(sql, /grant execute on function public\.submit_segnalazione_v1[\s\S]+to service_role/i);
});
