export const MAX_LINK_ANNUNCIO_LENGTH = 2048;

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
