export const REPORT_REASON_MAX_LENGTH = 300;

export type ReportTargetKind = "annuncio" | "profilo";

export interface ReportTarget {
	kind: ReportTargetKind;
	id: string;
}

export type ReportActionState =
	| {status: "idle"}
	| {status: "success"; message: string}
	| {status: "rate_limited"; message: string; retryAt: string | null}
	| {status: "error"; message: string; reasonError?: string};

export const INITIAL_REPORT_ACTION_STATE: ReportActionState = {status: "idle"};

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function isReportTarget(value: unknown): value is ReportTarget {
	if (!value || typeof value !== "object") return false;
	const target = value as Partial<ReportTarget>;
	return (target.kind === "annuncio" || target.kind === "profilo")
		&& typeof target.id === "string"
		&& UUID_PATTERN.test(target.id);
}

export function normalizeReportReason(value: unknown):
	| {valid: true; reason: string | null}
	| {valid: false; message: string} {
	if (typeof value !== "string") return {valid: true, reason: null};

	const reason = value.trim();
	if (!reason) return {valid: true, reason: null};
	if (Array.from(reason).length > REPORT_REASON_MAX_LENGTH) {
		return {
			valid: false,
			message: `La motivazione può contenere al massimo ${REPORT_REASON_MAX_LENGTH} caratteri.`,
		};
	}

	return {valid: true, reason};
}

export function readReportRpcResult(value: unknown):
	| {status: "success"}
	| {status: "rate_limited"; retryAt: string | null}
	| {status: "invalid_target"}
	| null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const result = value as {status?: unknown; retryAt?: unknown};

	if (result.status === "success") return {status: "success"};
	if (result.status === "invalid_target") return {status: "invalid_target"};
	if (result.status === "rate_limited") {
		const retryAt = typeof result.retryAt === "string" && !Number.isNaN(Date.parse(result.retryAt))
			? new Date(result.retryAt).toISOString()
			: null;
		return {status: "rate_limited", retryAt};
	}

	return null;
}
