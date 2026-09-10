import type {ProfileDrafts} from "@/features/profilo/profile-model";
import type {PublishAnnouncementPayload} from "@/features/pubblica-annuncio/publish-model";
import {getTipologia} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export interface AnnouncementPreviewFact {
	label: string;
	value: string;
}

export interface AnnouncementPreviewData {
	id?: string;
	title: string;
	typeLabel: string;
	author: string;
	description: string | null;
	locations: string[];
	contacts: string[];
	facts: AnnouncementPreviewFact[];
	genericLink: string | null;
	videoHighlights: string | null;
	imageUrl: string | null;
	imageLabel: string | null;
	status: string | null;
	statusInfo: string | null;
}

function joined(value: string[] | null | undefined) {
	return value?.filter(Boolean).join(", ") || null;
}

function profileTitle(payload: PublishAnnouncementPayload, drafts: ProfileDrafts) {
	if (payload.profileType === "giocatore") return [drafts.giocatore.nome, drafts.giocatore.cognome].filter(Boolean).join(" ") || "Giocatore";
	if (payload.profileType === "squadra") return drafts.squadra.nome_societa || "Squadra";
	if (payload.profileType === "staff-sportivo") return [drafts["staff-sportivo"].nome, drafts["staff-sportivo"].cognome].filter(Boolean).join(" ") || "Staff sportivo";
	if (payload.profileType === "arbitro") return [drafts.arbitro.nome, drafts.arbitro.cognome].filter(Boolean).join(" ") || "Arbitro";
	if (payload.profileType === "torneo-evento") return drafts["torneo-evento"].nome_organizzazione || "Organizzazione";
	return drafts["campi-impianti-sportivi"].nome_organizzazione || "Campo o impianto";
}

export function formatPreviewStatus(status: string | null) {
	if (status === "in_revisione") return "In attesa di approvazione";
	if (status === "pubblicato") return "Pubblicato";
	if (status === "rifiutato") return "Non approvato";
	return status?.replaceAll("_", " ") ?? null;
}

export function buildPublishPreview(
	payload: PublishAnnouncementPayload,
	drafts: ProfileDrafts,
	imageUrl: string | null,
	imageLabel: string | null,
): AnnouncementPreviewData {
	const profile = profileTitle(payload, drafts);
	const option = getTipologia(payload.profileType);
	const subtype = option?.sottotipologie?.find(({valore}) => valore === payload.teamSubtype);
	const detail = payload.announcement.detail as unknown as Record<string, unknown>;
	const facts: AnnouncementPreviewFact[] = [];
	const addFact = (label: string, value: string | null | undefined) => {
		if (value) facts.push({label, value});
	};

	addFact("Tipologie", joined(detail.tipologie_sport as string[] | undefined));
	addFact("Categorie", joined((detail.categorie_ricercate ?? detail.categorie_avversario) as string[] | undefined));
	addFact("Ruoli", joined(detail.ruoli_principali as string[] | undefined));
	addFact("Annate", joined(detail.annate_ricercate as string[] | undefined));
	addFact("Stagione", detail.stagione as string | undefined);
	addFact("Figura ricercata", detail.figura_ricercata as string | undefined);
	addFact("Settore", detail.settore as string | undefined);
	addFact("Nome evento", detail.nome_evento as string | undefined);
	addFact("Disponibilità", detail.orari as string | undefined);
	addFact("Servizi", detail.servizi_inclusi as string | undefined);

	const description = [
		detail.descrizione_aggiuntiva,
		detail.requisiti,
		detail.supporto_cercato,
		detail.offerta_fornita,
	].find((value) => typeof value === "string" && value.trim()) as string | undefined;
	const title = payload.profileType === "giocatore"
		? `${profile} cerca una nuova opportunità`
		: payload.profileType === "staff-sportivo"
			? `${profile} è disponibile`
			: payload.profileType === "arbitro"
				? `${profile} è disponibile per nuovi incarichi`
				: (detail.nome_evento as string | undefined) || subtype?.nome || profile;

	return {
		title,
		typeLabel: subtype?.nome ?? option?.nome ?? payload.profileType,
		author: profile,
		description: description?.trim() || null,
		locations: payload.announcement.locations.map(({regione, citta}) => [citta, regione].filter(Boolean).join(", ")),
		contacts: [payload.announcement.contacts.email, payload.announcement.contacts.phone].filter(Boolean),
		facts,
		genericLink: payload.announcement.extras.genericLink.trim() || null,
		videoHighlights: payload.announcement.extras.videoHighlights.trim() || null,
		imageUrl,
		imageLabel,
		status: "In revisione dopo l’invio",
		statusInfo: null,
	};
}
