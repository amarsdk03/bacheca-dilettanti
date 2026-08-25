export interface RegistrationEmailRecoveryInput {
	email: string;
}

export interface RegistrationEmailRecoveryVerificationInput extends RegistrationEmailRecoveryInput {
	code: string;
}

export type RequestRegistrationEmailRecoveryResult =
	| {status: "new_email"}
	| {status: "sent"; message: string}
	| {status: "verified"; email: string; message: string}
	| {status: "already_registered"; message: string}
	| {status: "rate_limited" | "error"; message: string};

export type VerifyRegistrationEmailRecoveryResult =
	| {status: "verified"; email: string; message: string}
	| {status: "already_registered"; message: string}
	| {status: "invalid" | "expired" | "rate_limited" | "error"; message: string};
