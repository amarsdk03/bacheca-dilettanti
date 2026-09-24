import "server-only";

import {isAnnouncementListed} from "@/features/annunci/announcement-visibility";
import {announcementContent, isActiveAnnouncementType, type ActiveAnnouncementType} from "@/features/annunci/announcement-content";

import {
	type AnnouncementDirectoryItem,
	announcementOption,
	isValidAnnouncementId,
} from "@/features/annunci/announcement-model";
import {loadRelatedPublicAnnouncements} from "@/features/annunci/server/queries";
import {type AnnouncementPreviewData, formatPreviewStatus} from "@/features/pubblica-annuncio/announcement-preview";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {experienceTeamReferences} from "@/features/profilo/team-profile";
import {loadPublicTeamProfiles} from "@/features/profilo/server/public-team-profiles";

const ANNOUNCEMENT_IMAGES_BUCKET = "immagini_annunci";

export type PublishConfirmationResult =
	| {status: "ok"; preview: AnnouncementPreviewData; suggestions: AnnouncementDirectoryItem[]; awaitingPayment: boolean; isListed: boolean}
	| {status: "not-found"}
	| {status: "error"};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function records(value: unknown) {
	return Array.isArray(value) ? value.filter(isRecord) : isRecord(value) ? [value] : [];
}

function firstRecord(value: unknown) {
	return records(value)[0] ?? null;
}

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

const DETAIL_TABLE_BY_TYPE: Record<ActiveAnnouncementType, string> = {
	annuncio_giocatore: "annuncio_giocatore",
	annuncio_squadra_cerca_giocatore: "annuncio_squadra_cerca_giocatore",
	annuncio_squadra_cerca_staff: "annuncio_squadra_cerca_staff",
	annuncio_squadra_cerca_partita: "annuncio_squadra_cerca_partita",
	annuncio_squadra_cerca_sponsor: "annuncio_squadra_cerca_sponsor",
	annuncio_staff_sportivo: "annuncio_staff_sportivo",
	annuncio_arbitro: "annuncio_arbitro",
	annuncio_torneo_evento: "annuncio_torneo_evento",
	annuncio_campo_impianto: "annuncio_campo_impianto",
};

async function loadAuthorName(profileId: string, type: ActiveAnnouncementType) {
	const admin = createAdminClient();
	const {data, error} = await admin
		.from("profilo")
		.select(`
			uuid,
			profilo_giocatore(nome, cognome),
			profilo_squadra(nome_societa),
			profilo_staff_sportivo(nome, cognome),
			profilo_arbitro(nome, cognome),
			profilo_torneo_evento(nome_organizzazione),
			profilo_campi_impianti(nome_organizzazione)
		`)
		.eq("uuid", profileId)
		.maybeSingle();
	if (error || !data) return null;
	const row = data as unknown as Record<string, unknown>;
	const profileType = announcementOption(type).profileType;
	const child = firstRecord(row[
		profileType === "giocatore" ? "profilo_giocatore"
			: profileType === "squadra" ? "profilo_squadra"
				: profileType === "staff-sportivo" ? "profilo_staff_sportivo"
					: profileType === "arbitro" ? "profilo_arbitro"
						: profileType === "torneo-evento" ? "profilo_torneo_evento"
							: "profilo_campi_impianti"
	]);
	if (!child) return null;
	const fullName = [cleanText(child.nome), cleanText(child.cognome)].filter(Boolean).join(" ");
	return cleanText(child.nome_societa)
		?? cleanText(child.nome_organizzazione)
		?? (fullName || null);
}

export async function loadPublishConfirmation(id: string): Promise<PublishConfirmationResult> {
	if (!isValidAnnouncementId(id)) return {status: "not-found"};

	try {
		const supabase = await createClient();
		const {data, error} = await supabase
			.from("annuncio")
			.select(`
				uuid,
				autore_annuncio,
				tipologia_annuncio,
				stato_annuncio,
				nascosto,
				privato,
				info_stato_annuncio,
				annuncio_giocatore(categorie_ricercate, tipologie_sport, ruoli_principali, ruoli_secondari, descrizione_aggiuntiva),
				annuncio_squadra_cerca_giocatore(tipologie_sport, ruoli_principali, ruoli_secondari, annate_ricercate, stagione, descrizione_aggiuntiva),
				annuncio_squadra_cerca_staff(figura_ricercata, settore, compenso_mensile, requisiti, periodo_dal, periodo_al, descrizione_aggiuntiva),
				annuncio_squadra_cerca_partita(categorie_avversario, disponibilita_trasferta, periodo_dal, periodo_al, orario_dalle, orario_alle, descrizione_aggiuntiva),
				annuncio_squadra_cerca_sponsor(categoria_settore, supporto_cercato, offerta_fornita, descrizione_aggiuntiva),
				annuncio_staff_sportivo(figure_professionali, tipologie_sport, categorie_ricercate, disponibilita_occupazione, disponibilita_spostamento, descrizione_aggiuntiva, lista_esperienze),
				annuncio_arbitro(tipologie_sport, categorie_ricercate, disponibilita_occupazione, automunito, disponibilita_spostamento, descrizione_aggiuntiva, lista_esperienze),
				annuncio_torneo_evento(nome_evento, tipologie_sport, modalita_iscrizione, annate_ammesse_da, annate_ammesse_a, numero_squadre, costo_partecipazione, tipo_partecipazione, lista_premi_trofei, descrizione_aggiuntiva),
				annuncio_campo_impianto(tipologie_sport, orari, costo_partenza, servizi_inclusi, descrizione_aggiuntiva),
				localita_annuncio(regione, citta),
				contatto_annuncio(tipo, valore),
				link_social_annuncio(piattaforma, sublink),
				media_annuncio(formato_media, link_media)
			`)
			.eq("uuid", id)
			.maybeSingle();
		if (error) {
			console.error("[publish-confirmation] Owner query failed", {code: error.code});
			return {status: "error"};
		}
		if (!data || !isActiveAnnouncementType(data.tipologia_annuncio)) return {status: "not-found"};

		const row = data as unknown as Record<string, unknown>;
		const type = data.tipologia_annuncio;
		const option = announcementOption(type);
		const detail = firstRecord(row[DETAIL_TABLE_BY_TYPE[type]]) ?? {};
		const locations = records(row.localita_annuncio).flatMap((location) => {
			const region = cleanText(location.regione);
			if (!region) return [];
			return [{region, city: cleanText(location.citta)}];
		});
		const content = announcementContent(type, detail, locations, true);
		const contacts = records(row.contatto_annuncio).flatMap((contact) => cleanText(contact.valore) ?? []);
		const links = records(row.link_social_annuncio);
		const genericLink = cleanText(links.find(({piattaforma}) => piattaforma === "link_annuncio")?.sublink);
		const videoHighlights = cleanText(links.find(({piattaforma}) => piattaforma === "video_highlights")?.sublink);
		const media = records(row.media_annuncio).find(({formato_media}) => typeof formato_media === "string" && formato_media.startsWith("image/"));
		const imagePath = cleanText(media?.link_media);
		let imageUrl: string | null = null;
		if (imagePath) {
			const {data: signed, error: signedError} = await createAdminClient().storage
				.from(ANNOUNCEMENT_IMAGES_BUCKET)
				.createSignedUrl(imagePath, 600);
			if (signedError) console.error("[publish-confirmation] Signed image URL failed", {message: signedError.message});
			imageUrl = signed?.signedUrl ?? null;
		}

		const author = await loadAuthorName(String(data.autore_annuncio), type) ?? option.label;
		let teamReferences = experienceTeamReferences(detail.lista_esperienze);
		if (type === "annuncio_giocatore") {
			const {data: player, error: playerError} = await createAdminClient()
				.from("profilo_giocatore")
				.select("storico_carriera")
				.eq("uuid_profilo", String(data.autore_annuncio))
				.maybeSingle();
			if (playerError) {
				console.error("[publish-confirmation] Player team lookup failed", {code: playerError.code});
			} else {
				teamReferences = experienceTeamReferences(player?.storico_carriera, "titolo");
			}
		}
		let linkedTeams = teamReferences;
		try {
			const resolvedTeams = await loadPublicTeamProfiles(
				createAdminClient(),
				teamReferences.map(({profileId}) => profileId),
			);
			const teamsById = new Map(resolvedTeams.map((team) => [team.profileId, team]));
			linkedTeams = teamReferences.map((reference) => teamsById.get(reference.profileId) ?? reference);
		} catch (error) {
			console.error("[publish-confirmation] Linked team lookup failed", {cause: error instanceof Error ? error.name : "unknown"});
		}
		const preview: AnnouncementPreviewData = {
			id,
			announcementType: type,
			profileType: option.profileType,
			title: content.title,
			typeLabel: option.label,
			author,
			description: content.description,
			locations: content.locations,
			contacts,
			facts: content.facts,
			fields: content.fields,
			playerRoles: content.playerRoles,
			genericLink,
			videoHighlights,
			imageUrl,
			imageLabel: imagePath ? "Immagine allegata" : null,
			status: formatPreviewStatus(cleanText(data.stato_annuncio)),
			statusInfo: cleanText(data.info_stato_annuncio),
			linkedTeams,
		};
		const suggestions = await loadRelatedPublicAnnouncements(id, type, locations.map(({region}) => region));
		return {
			status: "ok",
			preview,
			suggestions,
			awaitingPayment: data.stato_annuncio === "in_attesa_pagamento",
			isListed: isAnnouncementListed(data.stato_annuncio, data.nascosto, data.privato),
		};
	} catch (error) {
		console.error("[publish-confirmation] Unexpected query failure", {cause: error instanceof Error ? error.name : "unknown"});
		return {status: "error"};
	}
}
