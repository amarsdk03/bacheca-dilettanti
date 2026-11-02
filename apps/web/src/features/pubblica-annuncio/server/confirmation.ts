import {experienceTeamReferences, publicTeamExperienceNames} from "@/features/profilo/team-profile";
import "server-only";
import {publicProfileName} from "@/features/profilo/profile-public-name";

import {isAnnouncementListed} from "@/features/annunci/announcement-visibility";
import {
	type ActiveAnnouncementType,
	announcementContent,
	isActiveAnnouncementType
} from "@/features/annunci/announcement-content";

import {
	type AnnouncementDirectoryItem,
	announcementDisplayLabel,
	announcementOption,
	isValidAnnouncementId,
} from "@/features/annunci/announcement-model";
import {loadRelatedPublicAnnouncements} from "@/features/annunci/server/queries";
import {type AnnouncementPreviewData, formatPreviewStatus} from "@/features/pubblica-annuncio/announcement-preview";
import {buildAnnouncementSummarySections, summaryAnnouncementTitle} from "@/features/annunci/announcement-summary";
import {projectAnnouncementSummaryProfile} from "@/features/annunci/announcement-summary-profile";
import {currentPlayerCareer} from "@/features/profilo/current-team";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {loadPublicTeamProfiles} from "@/features/profilo/server/public-team-profiles";
import {parseRegionalPublication, type RegionalAnnouncementReference} from "../regional-publication";


export type PublishConfirmationResult =
	| {status: "ok"; preview: AnnouncementPreviewData; suggestions: AnnouncementDirectoryItem[]; awaitingPayment: boolean; isListed: boolean; publicationId?: string; regionalAnnouncements?: RegionalAnnouncementReference[]}
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
	annuncio_servizi_consulenze: "annuncio_servizi_consulenze",
	annuncio_creators: "annuncio_creator",
};

async function loadAuthorSummary(profileId: string, type: ActiveAnnouncementType) {
	const admin = createAdminClient();
	const {data, error} = await admin
		.from("profilo")
		.select(`
			uuid,
			uuid_utente,
			profilo_giocatore(id, nascosto, nominativo_anonimo, nome, cognome, anno_nascita, tipologie_sport, ruoli_sport, disponibilita, categoria_attuale, squadra_attuale_nome, squadra_attuale_profilo_id, squadra_attuale_id, squadra_attuale_torneo, squadra_attuale_dal, storico_carriera),
			profilo_squadra(id, nascosto, nominativo_anonimo, nome_societa, tipologie_sport, categoria_attuale, torneo_attuale_nome),
			profilo_staff_sportivo(id, nascosto, nominativo_anonimo, nome, cognome, tipologie_sport, figure_professionali),
			profilo_servizi_consulenze(id, nascosto, nome, specializzazioni, sede_professionista, disponibilita),
			profilo_arbitro(id, nascosto, nominativo_anonimo, nome, cognome, tipologie_sport),
			profilo_torneo_evento(id, nascosto, nome_organizzazione, tipologie_sport),
			profilo_campi_impianti(id, nascosto, nome_organizzazione, tipologie_sport),
			profilo_creator(id, nascosto, nome_creator, tipologia_contenuti),
			localita_profilo(id_sottoprofilo, sottoprofilo, regione, citta)
		`)
		.eq("nascosto", false)
		.eq("uuid", profileId)
		.maybeSingle();
	if (error || !data) return null;
	const row = data as unknown as Record<string, unknown>;
	const profileType = announcementOption(type).profileType;
	const child = records(row[
		profileType === "giocatore" ? "profilo_giocatore"
			: profileType === "squadra" ? "profilo_squadra"
				: profileType === "staff-sportivo" ? "profilo_staff_sportivo"
					: profileType === "servizi-consulenze" ? "profilo_servizi_consulenze"
					: profileType === "arbitro" ? "profilo_arbitro"
						: profileType === "torneo-evento" ? "profilo_torneo_evento"
							: profileType === "creators" ? "profilo_creator" : "profilo_campi_impianti"
	]).find(item => item.nascosto === false);
	if (!child) return null;
	const fullName = profileType === "servizi-consulenze" ? cleanText(child.nome) : [cleanText(child.nome), cleanText(child.cognome)].filter(Boolean).join(" ");
	const name = publicProfileName(profileType, child.nominativo_anonimo, cleanText(child.nome_creator) ?? cleanText(child.nome_societa)
		?? cleanText(child.nome_organizzazione)
		?? (fullName || null));
	const rawCareer = profileType === "giocatore" ? currentPlayerCareer(child) : [];
	let teams = new Map();
	try {
		teams = new Map((await loadPublicTeamProfiles(admin, experienceTeamReferences(rawCareer, "titolo").map(team => team.profileId))).map(team => [team.profileId, team]));
	} catch (error) {
		console.error("[publish-confirmation] Profile career lookup failed", {cause: error instanceof Error ? error.name : "unknown"});
	}
	const career = publicTeamExperienceNames(rawCareer, teams, "titolo");
	const locations = records(row.localita_profilo).filter(item => item.sottoprofilo === profileType && (item.id_sottoprofilo === null || item.id_sottoprofilo === child.id)).flatMap(item => {
		const region = cleanText(item.regione);
		return region ? [{region, city: cleanText(item.citta)}] : [];
	});
	return {name, registered: row.uuid_utente !== null, profile: projectAnnouncementSummaryProfile(profileType, child, locations, Array.isArray(career) ? career : [])};
}

export async function loadPublishConfirmation(id: string): Promise<PublishConfirmationResult> {
	if (!isValidAnnouncementId(id)) return {status: "not-found"};

	try {
		const supabase = await createClient();
		const {data, error} = await supabase
			.from("annuncio")
			.select(`
				uuid,
				gruppo_pubblicazione,
				titolo_annuncio,
				autore_annuncio,
				tipologia_annuncio,
				stato_annuncio,
				nascosto,
				privato,
				info_stato_annuncio,
				annuncio_giocatore(categorie_ricercate, tipologie_sport, ruoli_principali, ruoli_secondari, descrizione_aggiuntiva),
				annuncio_squadra_cerca_giocatore(gruppo_squadra, tipologie_sport, ruoli_principali, ruoli_secondari, annate_ricercate, annata_da, annata_a, stagione, descrizione_aggiuntiva),
				annuncio_squadra_cerca_staff(figura_ricercata, figure_ricercate, settore, compenso_mensile, requisiti, stagione, periodo_dal, periodo_al, descrizione_aggiuntiva),
				annuncio_squadra_cerca_partita(gruppo_squadra, categorie_avversario, disponibilita_trasferta, periodo_dal, periodo_al, orario_dalle, orario_alle, descrizione_aggiuntiva),
				annuncio_squadra_cerca_sponsor(categoria_settore, supporto_cercato, offerta_fornita, descrizione_aggiuntiva),
				annuncio_staff_sportivo(figure_professionali, tipologie_sport, categorie_ricercate, disponibilita_occupazione, disponibilita_spostamento, disponibile_remoto, descrizione_aggiuntiva, lista_esperienze, qualifiche_licenze),
				annuncio_arbitro(tipologie_sport, categorie_ricercate, disponibilita_occupazione, automunito, disponibilita_spostamento, descrizione_aggiuntiva, lista_esperienze, qualifiche_licenze),
				annuncio_torneo_evento(nome_evento, tipologie_sport, modalita_iscrizione, annate_ammesse_da, annate_ammesse_a, numero_squadre, costo_partecipazione, tipo_partecipazione, lista_premi_trofei, descrizione_aggiuntiva),
				annuncio_campo_impianto(tipologie_sport, orari, costo_partenza, servizi_inclusi, descrizione_aggiuntiva, indirizzo),
				annuncio_servizi_consulenze(figura_professionale, specializzazione, presentazione_servizi, tipologie_sport, descrizione_aggiuntiva),
				annuncio_creator(titolo_post, descrizione_post),
				localita_annuncio(regione, citta),
				contatto_annuncio(tipo, valore, referente),
				link_social_annuncio(piattaforma, sublink),
				media_annuncio(formato_media, link_media)
			`)
			.is("eliminato_il", null).eq("uuid", id)
			.maybeSingle();
		if (error) {
			console.error("[publish-confirmation] Owner query failed", {code: error.code});
			return {status: "error"};
		}
		if (!data || !isActiveAnnouncementType(data.tipologia_annuncio)) return {status: "not-found"};

		const row = data as unknown as Record<string, unknown>;
		const type = data.tipologia_annuncio;
		const option = announcementOption(type);
		const detail = firstRecord(row[type === "annuncio_creators" ? "annuncio_creator" : DETAIL_TABLE_BY_TYPE[type]]) ?? {};
		const locations = records(row.localita_annuncio).flatMap((location) => {
			const region = cleanText(location.regione);
			if (!region) return [];
			return [{region, city: cleanText(location.citta)}];
		});
		let content = announcementContent(type, detail, locations, true, cleanText(row.titolo_annuncio));
		const contacts = records(row.contatto_annuncio).flatMap((contact) => {
			const value = cleanText(contact.valore), role = cleanText(contact.referente);
			return value ? [role ? `${value} (${role})` : value] : [];
		});
		const links = records(row.link_social_annuncio);
		const genericLink = cleanText(links.find(({piattaforma}) => piattaforma === "link_annuncio")?.sublink);
		const media = records(row.media_annuncio).find(({formato_media}) => typeof formato_media === "string" && formato_media.startsWith("image/"));
		const imagePath = cleanText(media?.link_media);
		const imageUrl = imagePath ? `/api/metadata/annuncio-immagine?id=${encodeURIComponent(id)}` : null;

		const authorSummary = await loadAuthorSummary(String(data.autore_annuncio), type).catch(error => {
			console.error("[publish-confirmation] Author summary lookup failed", {cause: error instanceof Error ? error.name : "unknown"});
			return null;
		});
		const author = authorSummary?.name ?? option.label;
		let teamReferences = experienceTeamReferences(type === "annuncio_arbitro" ? [] : detail.lista_esperienze, type === "annuncio_staff_sportivo" ? "titolo" : "ente");
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
  const savedExperiences = detail.lista_esperienze;
  const savedQualifications = detail.qualifiche_licenze;
  if (type === "annuncio_staff_sportivo" || type === "annuncio_arbitro") {
   if (type !== "annuncio_arbitro") detail.lista_esperienze = publicTeamExperienceNames(savedExperiences, new Map(), type === "annuncio_staff_sportivo" ? "titolo" : "ente");
   detail.qualifiche_licenze = publicTeamExperienceNames(savedQualifications, new Map(), "ente");
   content = announcementContent(type, detail, locations, true, cleanText(row.titolo_annuncio));
  }
		let linkedTeams = teamReferences.map(reference => ({profileId: reference.profileId, name: "Squadra"}));
		try {
			const resolvedTeams = await loadPublicTeamProfiles(
				createAdminClient(),
				teamReferences.map(({profileId}) => profileId),
			);
			const teamsById = new Map(resolvedTeams.map((team) => [team.profileId, team]));
			linkedTeams = teamReferences.map((reference) => teamsById.get(reference.profileId) ?? {profileId: reference.profileId, name: "Squadra"});
   if (type === "annuncio_staff_sportivo" || type === "annuncio_arbitro") {
    if (type !== "annuncio_arbitro") detail.lista_esperienze = publicTeamExperienceNames(savedExperiences, teamsById, type === "annuncio_staff_sportivo" ? "titolo" : "ente");
    detail.qualifiche_licenze = publicTeamExperienceNames(savedQualifications, teamsById, "ente");
    content = announcementContent(type, detail, locations, true, cleanText(row.titolo_annuncio));
   }
		} catch (error) {
			console.error("[publish-confirmation] Linked team lookup failed", {cause: error instanceof Error ? error.name : "unknown"});
		}
		const preview: AnnouncementPreviewData = {
			id,
			announcementType: type,
			profileType: option.profileType,
			title: summaryAnnouncementTitle(type, row.titolo_annuncio, content.title, authorSummary?.registered ? authorSummary.name : null),
			typeLabel: announcementDisplayLabel(type),
			author,
			description: content.description,
			locations: content.locations,
			contacts,
			facts: content.facts,
			fields: content.fields,
			playerRoles: content.playerRoles,
			genericLink,
			imageUrl,
			imageLabel: imagePath ? "Immagine allegata" : null,
			status: formatPreviewStatus(cleanText(data.stato_annuncio)),
			statusInfo: cleanText(data.info_stato_annuncio),
			linkedTeams,
			summarySections: buildAnnouncementSummarySections({type, ...content, authorProfile: authorSummary?.profile ?? null, raw: detail}),
		};
		const suggestions = type === "annuncio_creators" ? [] : await loadRelatedPublicAnnouncements(id, type, locations.map(({region}) => region), cleanText(row.gruppo_pubblicazione));
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

export async function loadRegionalPublishConfirmation(publicationId: string, selectedId?: string): Promise<PublishConfirmationResult> {
	if (!isValidAnnouncementId(publicationId)) return {status: "not-found"};
	try {
		const client = await createClient();
		const {data, error} = await client.rpc("get_owned_regional_publication_v1", {p_id: publicationId});
		if (error) return {status: "error"};
		const publication = parseRegionalPublication(data);
		if (!publication) return {status: "not-found"};
		const id = selectedId || publication.announcementId;
		if (!publication.announcements.some(item => item.id === id)) return {status: "not-found"};
		const result = await loadPublishConfirmation(id);
		return result.status === "ok" ? {...result, publicationId, regionalAnnouncements: publication.announcements} : result;
	} catch {return {status: "error"};}
}
