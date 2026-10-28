export interface EmailLinkState {
	status: "idle" | "error";
	message?: string;
}

export const INITIAL_EMAIL_LINK_STATE: EmailLinkState = {status: "idle"};

export type EmailLinkCredential =
	| {kind: "token_hash"; value: string}
	| {kind: "code"; value: string};

const CREDENTIAL_PATTERN = /^[A-Za-z0-9._~-]{16,1024}$/;

export function isEmailLinkCredentialValue(value: unknown): value is string {
	return typeof value === "string" && CREDENTIAL_PATTERN.test(value);
}

export function parseEmailLinkCredential(
	params: Record<string, string | string[] | undefined>,
	expectedType: "email" | "recovery",
): EmailLinkCredential | null {
	const tokenHash = params.token_hash;
	const code = params.code;
	const type = params.type;

	if (isEmailLinkCredentialValue(tokenHash) && code === undefined && type === expectedType) {
		return {kind: "token_hash", value: tokenHash};
	}
	if (isEmailLinkCredentialValue(code) && tokenHash === undefined && (type === undefined || type === expectedType)) {
		return {kind: "code", value: code};
	}
	return null;
}
