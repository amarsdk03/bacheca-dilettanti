import {isAnnouncementListed} from "@/features/annunci/announcement-visibility";
import {isValidAnnouncementId} from "@/features/annunci/announcement-model";
import {createAdminClient} from "@/lib/supabase/admin";

const ANNOUNCEMENT_IMAGES_BUCKET = "immagini_annunci";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
	const id = new URL(request.url).searchParams.get("id");
	if (!id || !isValidAnnouncementId(id)) return new Response(null, {status: 404});

	const admin = createAdminClient();
	const {data: announcement, error} = await admin
		.from("annuncio")
		.select("stato_annuncio, nascosto, privato, media_annuncio(formato_media, link_media)")
		.eq("uuid", id)
		.maybeSingle();
	if (error || !announcement) return new Response(null, {status: 404});

	const media = (Array.isArray(announcement.media_annuncio)
		? announcement.media_annuncio
		: [announcement.media_annuncio]
	).find((item) => item && ALLOWED_IMAGE_TYPES.has(item.formato_media ?? ""));
	if (!media?.link_media || !media.formato_media) return new Response(null, {status: 404});

	const {data: file, error: downloadError} = await admin.storage
		.from(ANNOUNCEMENT_IMAGES_BUCKET)
		.download(media.link_media, {}, {cache: "no-store"});
	if (downloadError || !file) return new Response(null, {status: 404});

	const listed = isAnnouncementListed(
		announcement.stato_annuncio,
		announcement.nascosto,
		announcement.privato,
	);

	return new Response(await file.arrayBuffer(), {
		headers: {
			"Cache-Control": listed
				? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
				: "private, no-store, max-age=0",
			"Content-Type": media.formato_media,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
