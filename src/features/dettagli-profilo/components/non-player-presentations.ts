import {CalendarDaysIcon, CircleCheckBigIcon, MapPinIcon, MegaphoneIcon, ShirtIcon, UsersIcon, WifiIcon} from "lucide-react";
import type {GenericProfileDetail, NonPlayerProfileType} from "../profile-detail-model";
import {formatProfileFactCount, getProfileDetailFields, getProfileDetailFieldValue, type ProfileDetailPresentation, type ProfileOverviewSection} from "./profile-detail-presentation";

const locations = {kind: "locations", title: "Località"} as const;
const social = {kind: "social"} as const;
const description = {kind: "field", title: "Descrizione", fieldLabel: "Presentazione"} as const;
const introduction = {...description, title: "Presentazione"} as const;
const standardSections: readonly ProfileOverviewSection[] = [locations, description, social];
const availability = {label: "Disponibilità", icon: CircleCheckBigIcon, getValue: (profile: GenericProfileDetail) => profile.availabilityLabel};
const age = {label: "Età", icon: CalendarDaysIcon};
const followers = (label: string) => ({label, icon: UsersIcon, getValue: (profile: GenericProfileDetail) => formatProfileFactCount(profile.followerCount)});
const announcements = (label: string) => ({label, icon: MegaphoneIcon, getValue: (profile: GenericProfileDetail) => formatProfileFactCount(profile.announcementCount)});

export const NON_PLAYER_PRESENTATIONS = {
	squadra: {
		badges: [{fieldLabel: "Categoria attuale Prima Squadra"}],
		facts: [followers("Follower"), announcements("Annunci pubblicati")],
		sections: standardSections,
		ecosystemName: "squadre", identifierName: "squadra",
	},
	"staff-sportivo": {
		badges: [{fieldLabel: "Figure professionali"}],
		facts: [age, {label: "Tipologie calcio", icon: ShirtIcon}, availability,
			{label: "Disponibile da remoto", fieldLabel: "Disponibile anche da remoto", icon: WifiIcon}],
		sections: standardSections,
		ecosystemName: "staff sportivi", identifierName: "staff sportivo",
		hasExperiences: true, careerLabel: "Esperienze e qualifiche",
	},
	arbitro: {
		badges: [{fieldLabel: "Tipologie calcio"}],
		facts: [age, availability],
		sections: standardSections,
		ecosystemName: "arbitri", identifierName: "arbitro", hasExperiences: true,
	},
	"torneo-evento": {
		badges: [{getValues: profile => {
			const field = getProfileDetailFields(profile).find(field => field.label === "Tipologie sportive");
			return (field?.items ?? []).map(value => `Torneo ${value.toLocaleLowerCase("it-IT")}`);
		}}],
		facts: [followers("Num. follower"), announcements("Eventi pubblicati")],
		sections: [locations, introduction, social],
		ecosystemName: "tornei ed eventi", identifierName: "torneo / evento", announcementsLabel: "Eventi pubblicati",
	},
	"campi-impianti-sportivi": {
		badges: [{fieldLabel: "Tipologia campi disponibili"}],
		facts: [{label: "Sede dell’impianto", icon: MapPinIcon, getValue: profile => {
			const address = getProfileDetailFieldValue(profile, "Indirizzo del campo");
			const places = profile.locations.map(({city, region}) => [city, region].filter(Boolean).join(", "));
			return [...new Set([address, ...places].filter(Boolean))].join(", ") || null;
		}}, followers("Num. follower"), announcements("Campi pubblicati")],
		sections: [locations, {kind: "field", title: "Tipologia campi disponibili", fieldLabel: "Tipologia campi disponibili", centered: true},
			description, {kind: "field", title: "Informazioni aggiuntive", fieldLabel: "Informazioni aggiuntive"}, social],
		ecosystemName: "campi", identifierName: "campo / impianto", announcementsLabel: "Campi disponibili",
	},
	"servizi-consulenze": {
		badges: [{fieldLabel: "Tipo di azienda / professione"}, {getValues: profile => profile.locations.map(({region}) => region)}],
		facts: [{label: "Sede azienda / professionista", fieldLabel: "Sede Azienda / Professionista", icon: MapPinIcon}, availability,
			followers("Num. follower"), announcements("Contenuti pubblicati")],
		sections: [introduction, {kind: "field", title: "Presentazione servizi", fieldLabel: "Servizi offerti"}, social],
		sidebarFields: [{title: "Tipo di azienda / professione", fieldLabel: "Tipo di azienda / professione"},
			{title: "Sede azienda / professionista", fieldLabel: "Sede Azienda / Professionista"}],
		ecosystemName: "servizi e professionisti", identifierName: "servizi e professionisti", announcementsLabel: "Contenuti / promozioni",
	},
	creators: {
		badges: [{fieldLabel: "Tipologia di contenuti"}],
		facts: [followers("Num. follower"), announcements("Num. annunci pubblicati")],
		sections: [{kind: "field", title: "Tipologia contenuti", fieldLabel: "Tipologia di contenuti", centered: true},
			introduction, {kind: "locations", title: "Zona/e di competenza"}, social],
		ecosystemName: "creators", identifierName: "creator",
	},
} satisfies Record<NonPlayerProfileType, ProfileDetailPresentation>;
