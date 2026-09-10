export const MAX_LINK_ANNUNCIO_LENGTH = 2048;
export const MAX_ANNOUNCEMENT_IMAGE_BYTES = 5 * 1024 * 1024;
export const ANNOUNCEMENT_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function isLinkAnnuncioValid(link: string) {
	const valore = link.trim();
	if (valore === "") return true;
	if (valore.length > MAX_LINK_ANNUNCIO_LENGTH) return false;

	try {
		const url = new URL(valore);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function getAnnouncementImageError(file: Pick<File, "size" | "type"> | null) {
	if (!file) return null;
	if (!(ANNOUNCEMENT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
		return "Seleziona un’immagine PNG, JPEG o WebP.";
	}
	if (file.size > MAX_ANNOUNCEMENT_IMAGE_BYTES) {
		return "L’immagine non può superare 5 MB.";
	}
	return null;
}
