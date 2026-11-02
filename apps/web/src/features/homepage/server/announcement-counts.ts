import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {getAnnouncementStorageTypes, parseAnnouncementDirectoryQuery} from "@/features/annunci/announcement-model";
import {HOMEPAGE_LIVE_CATEGORIES, type HomepageAnnouncementCounts} from "../homepage-live-categories";

export async function loadHomepageAnnouncementCounts(): Promise<HomepageAnnouncementCounts> {
	const counts: HomepageAnnouncementCounts = {giocatore: null, squadra: null, "staff-sportivo": null, "torneo-evento": null};
	try {
		const client = createAdminClient();
		await Promise.all(HOMEPAGE_LIVE_CATEGORIES.map(async ({type, directoryType}) => {
			try {
				const {count, error} = await client.from("annuncio")
					.select("uuid", {count: "exact", head: true})
					.in("tipologia_annuncio", getAnnouncementStorageTypes(parseAnnouncementDirectoryQuery({type: directoryType})))
					.eq("stato_annuncio", "pubblicato").eq("nascosto", false).eq("privato", false)
					.is("eliminato_il", null);
				if (!error && count !== null) counts[type] = count;
			} catch {
				// Keep other categories available if one count cannot be loaded.
			}
		}));
	} catch {
		// Missing service configuration must not prevent rendering the Homepage.
	}
	return counts;
}
