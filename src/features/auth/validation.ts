import type {AuthFieldErrors} from "@/features/auth/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getText(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === "string" ? value : "";
}

export function validateEmailPassword(formData: FormData) {
	const email = getText(formData, "email").trim().toLowerCase();
	const password = getText(formData, "password");
	const fieldErrors: AuthFieldErrors = {};

	if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
		fieldErrors.email = "Inserisci un indirizzo email valido.";
	}

	if (!password) {
		fieldErrors.password = "Inserisci la password.";
	} else if (password.length > 128) {
		fieldErrors.password = "La password non può superare 128 caratteri.";
	}

	return {email, password, fieldErrors};
}

export function validateRegistration(formData: FormData) {
	const {email, password, fieldErrors} = validateEmailPassword(formData);
	const name = getText(formData, "name").trim().replace(/\s+/g, " ");
	const confirmPassword = getText(formData, "confirmPassword");

	if (name.length < 2 || name.length > 80) {
		fieldErrors.name = "Inserisci un nome compreso tra 2 e 80 caratteri.";
	}

	if (password && password.length < 8) {
		fieldErrors.password = "La password deve contenere almeno 8 caratteri.";
	}

	if (password !== confirmPassword) {
		fieldErrors.confirmPassword = "Le password non coincidono.";
	}

	return {name, email, password, fieldErrors};
}

export function validateNewPassword(formData: FormData) {
	const password = getText(formData, "password");
	const confirmPassword = getText(formData, "confirmPassword");
	const fieldErrors: AuthFieldErrors = {};

	if (password.length < 8) {
		fieldErrors.password = "La password deve contenere almeno 8 caratteri.";
	} else if (password.length > 128) {
		fieldErrors.password = "La password non può superare 128 caratteri.";
	}

	if (password !== confirmPassword) {
		fieldErrors.confirmPassword = "Le password non coincidono.";
	}

	return {password, fieldErrors};
}

export function hasFieldErrors(fieldErrors: AuthFieldErrors) {
	return Object.keys(fieldErrors).length > 0;
}
