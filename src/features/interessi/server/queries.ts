import "server-only";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import type {InterestContext, InterestTarget} from "@/features/interessi/interest-model";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

export const INTEREST_PROFILE_TABLES = {
	giocatore: "profilo_giocatore", squadra: "profilo_squadra", "staff-sportivo": "profilo_staff_sportivo",
	arbitro: "profilo_arbitro", "torneo-evento": "profilo_torneo_evento", "campi-impianti-sportivi": "profilo_campi_impianti",
	"servizi-consulenze": "profilo_servizi_consulenze", creators: "profilo_creator",
} as const satisfies Record<ProfileType, string>;

export async function getInterestContext(target: InterestTarget): Promise<InterestContext> {
	try {
		const admin = createAdminClient();
		let recipientProfileId = target.id;
		if (target.kind === "annuncio") {
			const {data, error} = await admin.from("annuncio").select("autore_annuncio")
				.eq("uuid", target.id).eq("stato_annuncio", "pubblicato").eq("nascosto", false).eq("privato", false).maybeSingle();
			if (error) throw new Error("INTEREST_TARGET_UNAVAILABLE");
			if (!data?.autore_annuncio) return {status: "unavailable"};
			recipientProfileId = data.autore_annuncio;
		} else {
			const {data, error} = await admin.from(INTEREST_PROFILE_TABLES[target.profileType]).select("id")
				.eq("uuid_profilo", target.id).eq("nascosto", false).maybeSingle();
			if (error) throw new Error("INTEREST_TARGET_UNAVAILABLE");
			if (!data) return {status: "unavailable"};
		}
		const {data: recipient, error: recipientError} = await admin.from("profilo").select("uuid_utente")
			.eq("uuid", recipientProfileId).eq("nascosto", false).maybeSingle();
		if (recipientError) throw new Error("INTEREST_RECIPIENT_UNAVAILABLE");
		if (!recipient?.uuid_utente) return {status: "unavailable"};
		const {data: recipientUser, error: recipientUserError} = await admin.from("utente").select("registrato_il")
			.eq("utente_uuid", recipient.uuid_utente).maybeSingle();
		if (recipientUserError) throw new Error("INTEREST_RECIPIENT_UNAVAILABLE");
		if (!recipientUser?.registrato_il) return {status: "unavailable"};
		const account = await getAuthenticatedViewer();
		if (account?.utenteId === recipient.uuid_utente) return {status: "unavailable"};
		if (!account) return {status: "guest"};
		if (!account.utenteId || !account.registeredAt) return {status: "registration-required"};
		const client = await createClient();
		const {data: profile, error} = await client.from("profilo").select("uuid, tipologia_principale")
			.eq("uuid_utente", account.utenteId).eq("nascosto", false).maybeSingle();
		if (error) throw new Error("INTEREST_PROFILES_UNAVAILABLE");
		if (!profile) return {status: "profile-required"};
		const profiles = await Promise.all(PROFILE_OPTIONS.map(async ({value, label}) => {
			const {data, error} = await client.from(INTEREST_PROFILE_TABLES[value]).select("id")
				.eq("uuid_profilo", profile.uuid).eq("nascosto", false).maybeSingle();
			if (error) throw new Error("INTEREST_PROFILES_UNAVAILABLE");
			return data ? {type: value, label, isPrimary: value === profile.tipologia_principale} : null;
		}));
		const options = profiles.filter((option) => option !== null);
		return options.length ? {status: "ready", profiles: options} : {status: "profile-required"};
	} catch (error) {
		console.error("[interests] Context lookup failed", {cause: error instanceof Error ? error.message : "unknown"});
		return {status: "error"};
	}
}
