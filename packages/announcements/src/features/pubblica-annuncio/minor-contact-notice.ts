import {birthMonthNumber,daysInBirthMonth,getItalyDateParts} from "../profilo/birth-date.ts";
import type {ProfileDrafts} from "../profilo/profile-model.ts";
import type {PublishableProfileType} from "./publish-model.ts";
export function getMinorContactNotice(profileType: PublishableProfileType, drafts: ProfileDrafts) {
	if (profileType === "servizi-consulenze") return false;
	if (
		profileType !== "giocatore"
		&& profileType !== "staff-sportivo"
		&& profileType !== "arbitro"
	) return true;
	const draft = drafts[profileType];
	const year = Number(draft.anno_nascita);
	const month = birthMonthNumber(draft.mese_nascita);
	const day = Number(draft.giorno_nascita);
	if (!Number.isInteger(year) || year < 1900 || !month || !Number.isInteger(day) || day < 1 || day > daysInBirthMonth(year, month)) return true;
	const today = getItalyDateParts();
	let age = today.year - year;
	if (today.month < month || (today.month === month && today.day < day)) age--;
	return age < 18;
}

