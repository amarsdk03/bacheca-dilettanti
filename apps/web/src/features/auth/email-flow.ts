export const AUTH_EMAIL_FLOW_METADATA_KEY = "email_flow";

export const AUTH_EMAIL_FLOW = {
	ANNOUNCEMENT_OTP: "announcement_otp",
	ACCOUNT_SIGNUP: "account_signup",
} as const;

export type AuthEmailFlow = (typeof AUTH_EMAIL_FLOW)[keyof typeof AUTH_EMAIL_FLOW];

export function createAuthEmailFlowMetadata(flow: AuthEmailFlow) {
	return {[AUTH_EMAIL_FLOW_METADATA_KEY]: flow};
}
