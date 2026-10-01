import {announcementContent} from "@/features/annunci/announcement-content";
import {
	type AnnouncementDetailField,
	announcementDisplayLabel,
	type AnnouncementFact,
	type AnnouncementPlayerRoles,
	type AnnouncementType,
} from "@/features/annunci/announcement-model";
import type {ProfileDrafts, ProfileType} from "@/features/profilo/profile-model";
import type {PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import {experienceTeamReferences, type TeamProfileReference} from "@/features/profilo/team-profile";
import type {PublishAnnouncementPayload} from "@/features/pubblica-annuncio/publish-model";

export interface AnnouncementPreviewData {
	id?: string;
	announcementType: AnnouncementType;
	profileType: ProfileType;
	title: string;
	typeLabel: string;
	author: string;
	description: string | null;
	locations: PublicProfileLocation[];
	contacts: string[];
	facts: AnnouncementFact[];
	fields: AnnouncementDetailField[];
	playerRoles: AnnouncementPlayerRoles | null;
	genericLink: string | null;
	imageUrl: string | null;
	imageLabel: string | null;
	status: string | null;
	statusInfo: string | null;
	linkedTeams: TeamProfileReference[];
}

function profileTitle(payload: PublishAnnouncementPayload, drafts: ProfileDrafts) {
	if (payload.profileType === "giocatore") return [drafts.giocatore.nome, drafts.giocatore.cognome].filter(Boolean).join(" ") || "Giocatore";
	if (payload.profileType === "squadra") return drafts.squadra.nome_societa || "Squadra";
	if (payload.profileType === "staff-sportivo") return [drafts["staff-sportivo"].nome, drafts["staff-sportivo"].cognome].filter(Boolean).join(" ") || "Staff sportivo";
	if (payload.profileType === "arbitro") return [drafts.arbitro.nome, drafts.arbitro.cognome].filter(Boolean).join(" ") || "Arbitro";
	if (payload.profileType === "servizi-consulenze") return [drafts["servizi-consulenze"].nome, drafts["servizi-consulenze"].cognome].filter(Boolean).join(" ") || "Servizi e consulenze";
	if (payload.profileType === "creators") return drafts.creators.nome_creator || "Creator";
	if (payload.profileType === "torneo-evento") return drafts["torneo-evento"].nome_organizzazione || "Organizzazione";
	return drafts["campi-impianti-sportivi"].nome_organizzazione || "Campo o impianto";
}

export function formatPreviewStatus(status: string | null) {
	if (status === "in_attesa_pagamento") return "Pagamento da completare";
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
	const type = payload.announcement.type;
	const detail = {...payload.announcement.detail} as Record<string, unknown>;

	// The publish RPC snapshots these profile values into the announcement.
	if (type === "annuncio_giocatore") {
		const playerRoles = drafts.giocatore.ruoli_sport;
		const roles = playerRoles && typeof playerRoles === "object" && !Array.isArray(playerRoles)
			? playerRoles as Record<string, unknown>
			: {};
		detail.tipologie_sport = drafts.giocatore.tipologie_sport;
		detail.ruoli_principali = Array.isArray(roles.principali) ? roles.principali : [];
		detail.ruoli_secondari = Array.isArray(roles.specifici) ? roles.specifici : [];
	} else if (type === "annuncio_squadra_cerca_giocatore") {
		detail.tipologie_sport = drafts.squadra.tipologie_sport;
	} else if (type === "annuncio_staff_sportivo") {
		detail.figure_professionali = drafts["staff-sportivo"].figure_professionali;
		detail.disponibilita_occupazione = drafts["staff-sportivo"].disponibilita;
		detail.disponibile_remoto = drafts["staff-sportivo"].disponibile_remoto;
		detail.lista_esperienze = drafts["staff-sportivo"].lista_esperienze;
		detail.qualifiche_licenze = [...(Array.isArray(drafts["staff-sportivo"].storico_esperienze) ? drafts["staff-sportivo"].storico_esperienze : []), ...(Array.isArray(drafts["staff-sportivo"].qualifiche_licenze) ? drafts["staff-sportivo"].qualifiche_licenze : [])];
	} else if (type === "annuncio_arbitro") {
		detail.disponibilita_occupazione = drafts.arbitro.disponibilita;
		detail.lista_esperienze = drafts.arbitro.lista_esperienze;
		detail.qualifiche_licenze = drafts.arbitro.qualifiche_licenze;
	}

	const locations = payload.announcement.locations.map(({regione, citta}) => ({region: regione, city: citta}));
	if (type === "annuncio_creators") {
		const title = (typeof payload.announcement.title === "string" ? payload.announcement.title.trim() : "")
			|| (typeof detail.titolo_post === "string" && detail.titolo_post.trim() ? detail.titolo_post.trim() : "Annuncio creator");
		const description = typeof detail.descrizione_post === "string" && detail.descrizione_post.trim() ? detail.descrizione_post.trim() : null;
		const location = locations.map(({city, region}) => [city, region].filter(Boolean).join(", ")).join(", ") || "Località non specificata";
		return {
			announcementType: type,
			profileType: payload.profileType,
			title,
			typeLabel: announcementDisplayLabel(type),
			author: profileTitle(payload, drafts),
			description,
			locations,
			contacts: [payload.announcement.contacts.email, payload.announcement.contacts.phone].filter(Boolean),
			facts: [{kind: "location", label: "Zone di ricerca", value: location}],
			fields: [],
			playerRoles: null,
			genericLink: payload.announcement.extras.genericLink.trim() || null,
			imageUrl,
			imageLabel,
			status: "In revisione dopo l’invio",
			statusInfo: null,
			linkedTeams: [],
		};
	}
	const content = announcementContent(type, detail, locations, true, payload.announcement.title);
	const profileExperiences = type === "annuncio_giocatore"
		? drafts.giocatore.storico_carriera
		: type === "annuncio_staff_sportivo"
			? drafts["staff-sportivo"].lista_esperienze
			: type === "annuncio_arbitro" ? drafts.arbitro.lista_esperienze : [];

	return {
		announcementType: type,
		profileType: payload.profileType,
		title: content.title,
		typeLabel: announcementDisplayLabel(type),
		author: profileTitle(payload, drafts),
		description: content.description,
		locations: content.locations,
		contacts: [payload.announcement.contacts.email, payload.announcement.contacts.phone].filter(Boolean),
		facts: content.facts,
		fields: content.fields,
		playerRoles: content.playerRoles,
		genericLink: payload.announcement.extras.genericLink.trim() || null,
		imageUrl,
		imageLabel,
		status: "In revisione dopo l’invio",
		statusInfo: null,
		linkedTeams: experienceTeamReferences(profileExperiences, type === "annuncio_giocatore" || type === "annuncio_staff_sportivo" ? "titolo" : "ente"),
	};
}
