import type {ProfileType} from "@/features/profilo/profile-model";

export type AuthActionStatus = "idle" | "error" | "success";

export interface AuthFieldErrors {
	email?: string;
	password?: string;
	confirmPassword?: string;
}

export interface AuthActionState {
	status: AuthActionStatus;
	message?: string;
	email?: string;
	fieldErrors?: AuthFieldErrors;
	step?: 1 | 2 | 3;
	profileType?: ProfileType;
	reason?: "already_registered" | "email_not_confirmed" | "email_verification_required";
}

export const INITIAL_AUTH_STATE: AuthActionState = {
	status: "idle",
};

export interface ViewerDTO {
	fullName: string;
	email: string;
	avatarUrl: string | null;
	initials: string;
	authMethod: string;
	emailConfirmedAt: string | null;
	createdAt: string;
	lastSignInAt: string | null;
}
