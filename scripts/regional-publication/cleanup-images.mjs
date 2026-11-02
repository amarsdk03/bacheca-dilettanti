import {createClient} from "@supabase/supabase-js";
import {pathToFileURL} from "node:url";

// Release operation only. Does not load .env files; never invoked by local tests.
export async function cleanupRegionalLegacyImages(client, {apply = false, log = console.log} = {}) {
	const {data, error} = await client.rpc("regional_legacy_image_cleanup_candidates_v1");
	if (error) throw new Error(`Inventory failed (${error.code ?? "unknown"})`);
	const summary = {candidates: data?.length ?? 0, removed: 0, shared: 0, skipped: 0};
	for (const {path} of data ?? []) {
		if (typeof path !== "string" || !path || path.startsWith("/") || path.includes(":") || path.split("/").includes("..")) {
			summary.skipped++; continue;
		}
		// Recheck all live, private, hidden and trashed references immediately before removal.
		const references = await client.from("media_annuncio").select("id").eq("link_media", path).limit(1);
		if (references.error) throw new Error(`Reference check failed (${references.error.code ?? "unknown"})`);
		if (references.data?.length) {summary.shared++; continue;}
		if (!apply) {log(`[dry-run] ${path}`); continue;}
		const removal = await client.storage.from("immagini_annunci").remove([path]);
		if (removal.error) throw new Error(`Storage removal failed (${removal.error.statusCode ?? "unknown"})`);
		summary.removed++;
	}
	return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		if (process.argv.slice(2).some(arg => arg !== "--apply")) throw new Error("Usage: node scripts/regional-publication/cleanup-images.mjs [--apply]");
		const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
		if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY explicitly for the release target.");
		const client = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
		console.log(await cleanupRegionalLegacyImages(client, {apply: process.argv.includes("--apply")}));
	} catch (error) {
		console.error(error.message); process.exitCode = 1;
	}
}
