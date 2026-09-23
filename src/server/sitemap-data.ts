import "server-only";

import type {ProfileType} from "@/features/profilo/profile-model";
import {createAdminClient} from "@/lib/supabase/admin";

const BATCH_SIZE = 1_000;

export interface SitemapProfileEntry {
	id: string;
	type: ProfileType;
	updatedAt: string | null;
}

export interface SitemapAnnouncementEntry {
	id: string;
	createdAt: string | null;
}

const PROFILE_RELATIONS = [
	["profilo_giocatore", "giocatore"],
	["profilo_squadra", "squadra"],
	["profilo_staff_sportivo", "staff-sportivo"],
	["profilo_professionista_studente", "professionisti-studi"],
	["profilo_arbitro", "arbitro"],
	["profilo_creator", "creators"],
	["profilo_torneo_evento", "torneo-evento"],
	["profilo_campi_impianti", "campi-impianti-sportivi"],
] as const satisfies ReadonlyArray<readonly [string, ProfileType]>;

function records(value: unknown) {
	if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
	return value && typeof value === "object" ? [value as Record<string, unknown>] : [];
}

export async function loadSitemapProfiles(): Promise<SitemapProfileEntry[]> {
	const admin = createAdminClient();
	const entries: SitemapProfileEntry[] = [];
	for (let start = 0; ; start += BATCH_SIZE) {
		const {data, error} = await admin
			.from("profilo")
			.select(`
				uuid,
				ultima_modifica_il,
				profilo_giocatore(id, nascosto),
				profilo_squadra(id, nascosto),
				profilo_staff_sportivo(id, nascosto),
				profilo_professionista_studente(id, nascosto),
				profilo_arbitro(id, nascosto),
				profilo_creator(id, nascosto),
				profilo_torneo_evento(id, nascosto),
				profilo_campi_impianti(id, nascosto)
			`)
			.eq("nascosto", false)
			.not("uuid_utente", "is", null)
			.order("uuid", {ascending: true})
			.range(start, start + BATCH_SIZE - 1);
		if (error) {
			console.error("[sitemap] Profile lookup failed", {code: error.code});
			return entries;
		}

		for (const row of data ?? []) {
			for (const [relation, type] of PROFILE_RELATIONS) {
				if (!records(row[relation]).some((child) => child.nascosto === false)) continue;
				entries.push({id: row.uuid, type, updatedAt: row.ultima_modifica_il});
			}
		}
		if ((data?.length ?? 0) < BATCH_SIZE) break;
	}
	return entries;
}

export async function loadSitemapAnnouncements(): Promise<SitemapAnnouncementEntry[]> {
	const admin = createAdminClient();
	const entries: SitemapAnnouncementEntry[] = [];
	for (let start = 0; ; start += BATCH_SIZE) {
		const {data, error} = await admin
			.from("annuncio")
			.select("uuid, creato_il")
			.eq("stato_annuncio", "pubblicato")
			.eq("nascosto", false)
			.eq("privato", false)
			.order("uuid", {ascending: true})
			.range(start, start + BATCH_SIZE - 1);
		if (error) {
			console.error("[sitemap] Announcement lookup failed", {code: error.code});
			return entries;
		}
		entries.push(...(data ?? []).map((row) => ({id: row.uuid, createdAt: row.creato_il})));
		if ((data?.length ?? 0) < BATCH_SIZE) break;
	}
	return entries;
}
