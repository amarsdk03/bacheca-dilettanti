import {isInteractionId} from "@/features/interazioni/interaction-model";
import {isProfileType, type ProfileType} from "@/features/profilo/profile-model";
import {isValidPhone} from "@/features/pubblica-annuncio/publish-field-validation";
import {EMAIL_PATTERN} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export type InterestTarget = {kind: "annuncio"; id: string} | {kind: "profilo"; id: string; profileType: ProfileType};
export interface InterestProfileOption {type: ProfileType; label: string; isPrimary: boolean}
export type InterestContext =
	| {status: "ready"; profiles: InterestProfileOption[]}
	| {status: "guest" | "registration-required" | "profile-required" | "error" | "unavailable"};
export type InterestField = "profileType" | "email" | "phone" | "contacts" | "ownershipConsent" | "sharingConsent";
export type InterestResult =
	| {status: "success"}
	| {status: "guest" | "registration-required"}
	| {status: "error"; message: string; fieldErrors?: Partial<Record<InterestField, string>>; retryAt?: string};

export const INTEREST_CONSENT_VERSION = "2026-10-05-v1";
export const INTEREST_OWNERSHIP_CONSENT = "Confermo di essere il titolare del contatto indicato oppure di essere autorizzato dal titolare a utilizzarlo e condividerlo tramite Bacheca Dilettanti.";
export const INTEREST_SHARING_CONSENT = "Autorizzo Bacheca Dilettanti a condividere il contatto indicato con il gestore di questo profilo e accetto che possa essere utilizzato per ricontattare me o il titolare del contatto in relazione a questa manifestazione di interesse.";

export function isInterestTarget(value: unknown): value is InterestTarget {
	if (!value || typeof value !== "object") return false;
	const target = value as Record<string, unknown>;
	return isInteractionId(target.id) && (target.kind === "annuncio" || (target.kind === "profilo"
		&& typeof target.profileType === "string" && isProfileType(target.profileType)));
}

export function validateInterestForm(form: FormData) {
	const read = (name: string) => typeof form.get(name) === "string" ? (form.get(name) as string).trim() : "";
	const profileType = read("profileType");
	const email = read("email").toLowerCase();
	const phone = read("phone");
	const ownershipConsent = form.get("ownershipConsent") === "on";
	const sharingConsent = form.get("sharingConsent") === "on";
	const fieldErrors: Partial<Record<InterestField, string>> = {};
	if (!isProfileType(profileType)) fieldErrors.profileType = "Seleziona un sottoprofilo valido.";
	if (!email && !phone) fieldErrors.contacts = "Inserisci almeno un contatto tra email e telefono.";
	if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) fieldErrors.email = "Inserisci un indirizzo email valido.";
	if (phone && !isValidPhone(phone)) fieldErrors.phone = "Inserisci un numero di telefono valido.";
	if (!ownershipConsent) fieldErrors.ownershipConsent = "Conferma di essere il titolare del contatto o di essere autorizzato a condividerlo.";
	if (!sharingConsent) fieldErrors.sharingConsent = "Autorizza la condivisione del contatto per proseguire.";
	return {profileType, email: email || null, phone: phone || null, ownershipConsent, sharingConsent, fieldErrors};
}

const RETRY_FORMAT = new Intl.DateTimeFormat("it-IT", {dateStyle: "long", timeStyle: "short", timeZone: "Europe/Rome"});
export function interestRpcResult(data: unknown): InterestResult {
	const result = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
	if (result?.status === "success") return {status: "success"};
	if (result?.status === "daily_limit" || result?.status === "target_limit") {
		const retryDate = typeof result.retryAt === "string" ? new Date(result.retryAt) : null;
		const retryAt = retryDate && Number.isFinite(retryDate.getTime()) ? retryDate.toISOString() : undefined;
		return {status: "error", retryAt, message: (result.status === "daily_limit"
			? "Hai raggiunto il limite di 10 manifestazioni di interesse al giorno."
			: "Hai già manifestato interesse per questo annuncio o sottoprofilo negli ultimi 60 giorni.")
			+ (retryAt ? ` Potrai riprovare il ${RETRY_FORMAT.format(new Date(retryAt))}.` : "")};
	}
	if (result?.status === "invalid_sender") return {status: "error", message: "Il sottoprofilo selezionato non è più disponibile. Riapri il modulo e riprova."};
	if (result?.status === "invalid_target" || result?.status === "own_target") return {status: "error", message: "Non puoi manifestare interesse per questo contenuto: è tuo oppure non è più disponibile."};
	return {status: "error", message: "Non è stato possibile inviare la manifestazione di interesse. Riprova tra poco."};
}
