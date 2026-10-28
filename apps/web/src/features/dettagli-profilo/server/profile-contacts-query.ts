import "server-only";

import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {createAdminClient} from "@/lib/supabase/admin";
import type {ProfileType} from "@/features/profilo/profile-model";

export interface ProfileContacts {
	email: string | null;
	phone: string | null;
}

export async function getProfileContacts(id: string, type: ProfileType): Promise<ProfileContacts | null> {
	if (type !== "servizi-consulenze" && type !== "creators") return null;
	if (!await getAuthenticatedViewer()) return null;
	const supabase = createAdminClient();
	const {data: base, error: baseError} = await supabase.from("profilo")
		.select("uuid").eq("uuid", id).eq("nascosto", false).not("uuid_utente", "is", null).maybeSingle();
	if (baseError || !base) return null;
	if (type === "creators") {
		const {data, error} = await supabase.from("profilo_creator")
			.select("contatto_email").eq("uuid_profilo", id).eq("nascosto", false).maybeSingle();
		if (error) console.error("[profile-contacts] Creator contacts unavailable", {code: error.code});
		return data ? {email: data.contatto_email, phone: null} : null;
	}
	const {data, error} = await supabase.from("profilo_servizi_consulenze")
		.select("contatto_email, contatto_telefono").eq("uuid_profilo", id).eq("nascosto", false).maybeSingle();
	if (error) console.error("[profile-contacts] Professional contacts unavailable", {code: error.code});
	const {data: locations, error: locationError} = await supabase.from("localita_profilo").select("regione").eq("uuid_profilo", id).eq("sottoprofilo", type).limit(1);
	if (locationError || !locations?.length) return null;
	return data ? {email: data.contatto_email, phone: data.contatto_telefono} : null;
}
