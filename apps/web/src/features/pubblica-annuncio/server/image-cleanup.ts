import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

/** Call only with paths obtained from owned DB rows or the server's own upload. */
export async function removeUnreferencedAnnouncementImages(paths: readonly string[]) {
	const admin = createAdminClient();
	for (const path of new Set(paths)) {
		// Include private, hidden and trashed announcements: all still own their file.
		const {data, error} = await admin.from("media_annuncio").select("id").eq("link_media", path).limit(1);
		if (error) {console.error("[announcement-images] Reference check failed", {code: error.code}); continue;}
		if (data?.length) continue;
		const {error: removalError} = await admin.storage.from("immagini_annunci").remove([path]);
		if (removalError) console.error("[announcement-images] Cleanup failed", {message: removalError.message});
	}
}
