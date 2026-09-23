export function isAnnouncementListed(status: string | null, hidden: boolean | null, privateAnnouncement: boolean | null) {
	return status === "pubblicato" && hidden === false && privateAnnouncement === false;
}

export function announcementPreviewNotice(status: string | null) {
	if (status === "in_revisione") return {
		title: "Annuncio in attesa di revisione",
		description: "Questo annuncio non è ancora stato approvato.",
	};
	if (status === "in_attesa_pagamento") return {
		title: "Annuncio da completare",
		description: "Il pagamento deve essere completato. La revisione inizierà dopo la conferma del pagamento.",
	};
	if (status === "rifiutato") return {
		title: "Annuncio non approvato",
		description: "Questo annuncio non ha superato la revisione.",
	};
	if (status === "pubblicato") return {
		title: "Annuncio disponibile solo tramite link",
		description: "L’autore ha escluso questo annuncio dalla bacheca pubblica.",
	};
	return {
		title: "Annuncio non pubblicato",
		description: "Questo annuncio non è attualmente pubblicato in bacheca.",
	};
}
