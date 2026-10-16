import "server-only";

import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/server/supabase";
import {PROFILE_OPTIONS} from "@/features/profilo/profile-model";
import {resolvedProfileImageUrl} from "@/features/profilo/profile-image";
import {loadProfileImageUrlMap} from "@/features/profilo/server/profile-images";
import type {SubprofileSelectOption} from "@/features/profilo/SubprofileSelect";

const DEFINITIONS = {
	giocatore: {table: "profilo_giocatore", fields: "id, nome, cognome"},
	squadra: {table: "profilo_squadra", fields: "id, nome_societa"},
	"staff-sportivo": {table: "profilo_staff_sportivo", fields: "id, nome, cognome"},
	arbitro: {table: "profilo_arbitro", fields: "id, nome, cognome"},
	"torneo-evento": {table: "profilo_torneo_evento", fields: "id, nome_organizzazione"},
	"campi-impianti-sportivi": {table: "profilo_campi_impianti", fields: "id, nome_organizzazione"},
	"servizi-consulenze": {table: "profilo_servizi_consulenze", fields: "id, nome"},
	creators: {table: "profilo_creator", fields: "id, nome_creator"},
} as const;

/** Private identities for an already authenticated owner, never for public DTOs. */
export async function loadOwnedSubprofileIdentities(client: SupabaseClient<Database>, userId: string, profileId: string): Promise<SubprofileSelectOption[]> {
	const {data: owner, error} = await client.from("profilo").select("uuid, link_foto_profilo")
		.eq("uuid", profileId).eq("uuid_utente", userId).eq("nascosto", false).maybeSingle();
	if (error) throw error;
	if (!owner) return [];
	const images = await loadProfileImageUrlMap(client, [owner.uuid]);
	const options = await Promise.all(PROFILE_OPTIONS.map(async ({value: type, label}) => {
		const definition = DEFINITIONS[type];
		const {data, error} = await client.from(definition.table).select(definition.fields)
			.eq("uuid_profilo", owner.uuid).eq("nascosto", false).maybeSingle();
		if (error) throw error;
		if (!data) return null;
		const row = data as unknown as Record<string, unknown>;
		const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
		const title = [row.nome, row.cognome].map(text).filter(Boolean).join(" ")
			|| text(row.nome_societa ?? row.nome_creator ?? row.nome_organizzazione) || label;
		return {type, title, imageUrl: resolvedProfileImageUrl(images, owner.uuid, type, owner.link_foto_profilo)};
	}));
	return options.filter(option => option !== null);
}
