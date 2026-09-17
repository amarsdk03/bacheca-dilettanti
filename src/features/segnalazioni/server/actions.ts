"use server";

import "server-only";

import {createHash, randomBytes} from "node:crypto";
import {cookies} from "next/headers";

import {
	isReportTarget,
	normalizeReportReason,
	readReportRpcResult,
	type ReportActionState,
	type ReportTarget,
} from "@/features/segnalazioni/report-model";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

const ANONYMOUS_REPORTER_COOKIE = "bd-report-visitor-v1";
const ANONYMOUS_REPORTER_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const REPORT_COOLDOWN_MESSAGE = "Hai già inviato una segnalazione meno di 24h fa";
const GENERIC_REPORT_ERROR = "Non è stato possibile inviare la segnalazione. Riprova tra poco.";

async function getAuthenticatedReporterId() {
	const sessionClient = await createClient();
	const {data: claimsData, error: claimsError} = await sessionClient.auth.getClaims();
	const subject = claimsData?.claims?.sub;

	if (claimsError || typeof subject !== "string") return null;

	const {data: {user}, error: userError} = await sessionClient.auth.getUser();
	if (userError || !user || user.id !== subject || !user.email_confirmed_at) {
		throw new Error("INVALID_AUTHENTICATED_REPORTER");
	}

	const admin = createAdminClient();
	const {data: reporter, error: reporterError} = await admin
		.from("utente")
		.select("utente_uuid")
		.eq("auth_user_uuid", user.id)
		.maybeSingle();

	if (reporterError || !reporter?.utente_uuid) {
		if (reporterError) {
			console.error("[reports] Reporter lookup failed", {code: reporterError.code});
		}
		throw new Error("MISSING_REPORTER_ACCOUNT");
	}

	return reporter.utente_uuid;
}

async function getAnonymousReporterHash() {
	const cookieStore = await cookies();
	const currentValue = cookieStore.get(ANONYMOUS_REPORTER_COOKIE)?.value;
	const anonymousKey = currentValue && ANONYMOUS_REPORTER_PATTERN.test(currentValue)
		? currentValue
		: randomBytes(32).toString("base64url");

	cookieStore.set(ANONYMOUS_REPORTER_COOKIE, anonymousKey, {
		httpOnly: true,
		maxAge: 60 * 60 * 24,
		path: "/",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});

	return createHash("sha256").update(anonymousKey, "utf8").digest("hex");
}

export async function submitReport(
	target: ReportTarget,
	_previousState: ReportActionState,
	formData: FormData,
): Promise<ReportActionState> {
	if (!isReportTarget(target)) {
		return {status: "error", message: "Il contenuto da segnalare non è valido."};
	}

	const normalizedReason = normalizeReportReason(formData.get("reason"));
	if (!normalizedReason.valid) {
		return {
			status: "error",
			message: normalizedReason.message,
			reasonError: normalizedReason.message,
		};
	}

	try {
		const reporterUserId = await getAuthenticatedReporterId();
		const anonymousKeyHash = reporterUserId ? null : await getAnonymousReporterHash();
		const admin = createAdminClient();
		const {data, error} = await admin.rpc("submit_segnalazione_v1", {
			p_anonymous_key_hash: anonymousKeyHash,
			p_reason: normalizedReason.reason,
			p_reporter_user_uuid: reporterUserId,
			p_target_kind: target.kind,
			p_target_uuid: target.id,
		});

		if (error) {
			console.error("[reports] Report RPC failed", {code: error.code});
			return {status: "error", message: GENERIC_REPORT_ERROR};
		}

		const result = readReportRpcResult(data);
		if (result?.status === "success") {
			return {status: "success", message: "Segnalazione inviata. Grazie per il contributo."};
		}
		if (result?.status === "rate_limited") {
			return {
				status: "rate_limited",
				message: REPORT_COOLDOWN_MESSAGE,
				retryAt: result.retryAt,
			};
		}
		if (result?.status === "invalid_target") {
			return {status: "error", message: "Questo contenuto non è più disponibile."};
		}

		return {status: "error", message: GENERIC_REPORT_ERROR};
	} catch (error) {
		console.error("[reports] Report submission failed", {
			name: error instanceof Error ? error.name : "UNKNOWN_ERROR",
		});
		return {status: "error", message: GENERIC_REPORT_ERROR};
	}
}
