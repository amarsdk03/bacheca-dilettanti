export const INVITATION_CODE_LENGTH = 16;
export const INVITATION_CODE_PATTERN = /^[0-9A-F]{16}$/;

export function normalizeInvitationCode(value: string): string {
	return value.trim().toUpperCase();
}

export function getInvitationCodeError(value: string): string | undefined {
	const normalized = normalizeInvitationCode(value);
	return normalized && !INVITATION_CODE_PATTERN.test(normalized)
		? "Inserisci un codice invito valido di 16 caratteri."
		: undefined;
}
