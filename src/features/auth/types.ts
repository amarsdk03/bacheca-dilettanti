export type AuthActionStatus = "idle" | "error" | "success";

export interface AuthFieldErrors {
	name?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
}

export interface AuthActionState {
	status: AuthActionStatus;
	message?: string;
	fieldErrors?: AuthFieldErrors;
}

export const INITIAL_AUTH_STATE: AuthActionState = {
	status: "idle",
};

export interface ViewerDTO {
	fullName: string;
	email: string;
	avatarUrl: string | null;
	initials: string;
	createdAt: string;
	lastSignInAt: string | null;
}
