import "server-only";

import type {SupabaseClient} from "@supabase/supabase-js";

import {PROFILE_IMAGE_MEDIA_FORMAT, profileImageRowsToMap,} from "@/features/profilo/profile-image";
import type {Database} from "@/server/supabase";

export async function loadProfileImageUrlMap(
	supabase: SupabaseClient<Database>,
	profileIds: readonly string[],
) {
	const ids = [...new Set(profileIds.filter(Boolean))];
	if (ids.length === 0) return new Map<string, string>();

	const rows = [];
	for (let offset = 0; offset < ids.length; offset += 100) {
		const {data, error} = await supabase
			.from("media_profilo")
			.select("uuid_profilo, sottoprofilo, link_media")
			.in("uuid_profilo", ids.slice(offset, offset + 100))
			.eq("formato_media", PROFILE_IMAGE_MEDIA_FORMAT)
			.not("sottoprofilo", "is", null);
		if (error) throw error;
		rows.push(...(data ?? []));
	}

	return profileImageRowsToMap(rows);
}
