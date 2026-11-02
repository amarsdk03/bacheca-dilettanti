import {publicProfileName} from "@/features/profilo/profile-public-name";
import {announcementContent} from "@/features/annunci/announcement-content";
import {buildAnnouncementSummarySections, summaryAnnouncementTitle, type AnnouncementSummarySection} from "@/features/annunci/announcement-summary";
import {projectAnnouncementSummaryProfile} from "@/features/annunci/announcement-summary-profile";
import {
	type AnnouncementDetailField,
	announcementDisplayLabel,
	type AnnouncementFact,
	type AnnouncementPlayerRoles,
	type AnnouncementType,
} from "@/features/annunci/announcement-model";
import type {ProfileDrafts, ProfileType, ProfileLocationDraft} from "@/features/profilo/profile-model";
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
	summarySections?: AnnouncementSummarySection[];
}

function announcementPreviewContacts(payload: PublishAnnouncementPayload) {
	const role = payload.announcement.contacts.contactRole?.trim();
	return [payload.announcement.contacts.email, payload.announcement.contacts.phone]
		.filter(Boolean)
		.map((contact) => role ? `${contact} (${role})` : contact);
}

function profileTitle(payload: PublishAnnouncementPayload, drafts: ProfileDrafts) {
	if (payload.profileType === "giocatore") return publicProfileName("giocatore", drafts.giocatore.nominativo_anonimo, [drafts.giocatore.nome, drafts.giocatore.cognome].filter(Boolean).join(" ") || "Giocatore") ?? "Profilo";
	if (payload.profileType === "squadra") return publicProfileName("squadra", drafts.squadra.nominativo_anonimo, drafts.squadra.nome_societa || "Squadra") ?? "Profilo";
	if (payload.profileType === "staff-sportivo") return publicProfileName("staff-sportivo", drafts["staff-sportivo"].nominativo_anonimo, [drafts["staff-sportivo"].nome, drafts["staff-sportivo"].cognome].filter(Boolean).join(" ") || "Staff sportivo") ?? "Profilo";
	if (payload.profileType === "arbitro") return publicProfileName("arbitro", drafts.arbitro.nominativo_anonimo, [drafts.arbitro.nome, drafts.arbitro.cognome].filter(Boolean).join(" ") || "Arbitro") ?? "Profilo";
	if (payload.profileType === "servizi-consulenze") return drafts["servizi-consulenze"].nome || "Servizi e professionisti";
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
	profileLocations: readonly ProfileLocationDraft[] = [],
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
	const authorProfile = projectAnnouncementSummaryProfile(payload.profileType, drafts[payload.profileType] as unknown as Record<string, unknown>, profileLocations.map(({regione, citta}) => ({region: regione, city: citta})));
	const author = profileTitle(payload, drafts);
	const content = announcementContent(type, detail, locations, true, payload.announcement.title);
	const profileExperiences = type === "annuncio_giocatore"
		? drafts.giocatore.storico_carriera
		: type === "annuncio_staff_sportivo"
			? drafts["staff-sportivo"].lista_esperienze
			: type === "annuncio_arbitro" ? drafts.arbitro.lista_esperienze : [];

	return {
		announcementType: type,
		profileType: payload.profileType,
		title: summaryAnnouncementTitle(type, payload.announcement.title, content.title, payload.anonymousProfile ? null : author),
		typeLabel: announcementDisplayLabel(type),
		author,
		description: content.description,
		locations: content.locations,
		contacts: announcementPreviewContacts(payload),
		facts: content.facts,
		fields: content.fields,
		playerRoles: content.playerRoles,
		genericLink: payload.announcement.extras.genericLink.trim() || null,
		imageUrl,
		imageLabel,
		status: "In revisione dopo l’invio",
		statusInfo: null,
		linkedTeams: type === "annuncio_arbitro" ? [] : experienceTeamReferences(profileExperiences, "titolo"),
		summarySections: buildAnnouncementSummarySections({type, ...content, authorProfile, raw: detail}),
	};
}

export function buildRegionalPublishPreviews(payload: PublishAnnouncementPayload, drafts: ProfileDrafts, imageUrl: string | null, imageLabel: string | null, profileLocations: readonly ProfileLocationDraft[]) {
	const regions = [...new Set(payload.announcement.locations.map(item => item.regione))].sort((a,b) => a.localeCompare(b,"it-IT"));
	if (payload.announcement.type === "annuncio_squadra_cerca_sponsor" || regions.length === 0) return [{region: null, preview: buildPublishPreview(payload,drafts,imageUrl,imageLabel,profileLocations)}];
	return regions.map(region => ({region, preview: buildPublishPreview({...payload, announcement: {...payload.announcement, locations: payload.announcement.locations.filter(item => item.regione === region)}}, drafts,imageUrl,imageLabel,profileLocations)}));
}
