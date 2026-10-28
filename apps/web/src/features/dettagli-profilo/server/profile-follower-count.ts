import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/server/supabase";
import type {NonPlayerProfileType} from "../profile-detail-model";

export async function loadProfileFollowerCount(supabase: SupabaseClient<Database>, profileId: string, type: NonPlayerProfileType): Promise<number | null> {
	try {
		// Return only an aggregate for this exact subprofile, never follower identities.
		const {count, error} = await supabase.from("profilo_follow")
			.select("uuid_profilo_seguito", {count: "exact", head: true})
			.eq("uuid_profilo_seguito", profileId)
			.eq("sottoprofilo_seguito", type);
		if (error) throw error;
		return count;
	} catch (error) {
		console.error("[dettagli-profilo] Follower count unavailable", {
			code: error && typeof error === "object" && "code" in error ? error.code : undefined,
		});
		return null;
	}
}
