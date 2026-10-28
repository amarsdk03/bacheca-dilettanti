import {isValidAnnouncementId} from "@/features/annunci/announcement-model";
import {createAdminClient} from "@/lib/supabase/admin";

const ANNOUNCEMENT_IMAGES_BUCKET = "immagini_annunci";
const CACHE_HEADERS = {"Cache-Control": "private, no-store, max-age=0"};
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
	const id = new URL(request.url).searchParams.get("id");
	if (!id || !isValidAnnouncementId(id)) return new Response(null, {status: 404, headers: CACHE_HEADERS});

	const admin = createAdminClient();
	const {data: announcement, error} = await admin
		.from("annuncio")
		.select("stato_annuncio, nascosto, privato, tipologia_annuncio, localita_annuncio(regione), media_annuncio(formato_media, link_media)")
		.is("eliminato_il", null).eq("uuid", id)
		.maybeSingle();
	if (error || !announcement) return new Response(null, {status: 404, headers: CACHE_HEADERS});
	if (announcement.tipologia_annuncio === "annuncio_servizi_consulenze" && announcement.localita_annuncio.length === 0) return new Response(null, {status: 404, headers: CACHE_HEADERS});

	const media = (Array.isArray(announcement.media_annuncio)
		? announcement.media_annuncio
		: [announcement.media_annuncio]
	).find((item) => item && ALLOWED_IMAGE_TYPES.has(item.formato_media ?? ""));
	if (!media?.link_media || !media.formato_media) return new Response(null, {status: 404, headers: CACHE_HEADERS});

	const {data: file, error: downloadError} = await admin.storage
		.from(ANNOUNCEMENT_IMAGES_BUCKET)
		.download(media.link_media, {}, {cache: "no-store"});
	if (downloadError || !file) return new Response(null, {status: 404, headers: CACHE_HEADERS});

	return new Response(await file.arrayBuffer(), {
		headers: {
			...CACHE_HEADERS,
			"Content-Type": media.formato_media,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
