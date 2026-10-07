"use server";

import "server-only";
import {getAuthenticatedViewer} from "@/features/auth/server/queries";
import {INTEREST_CONSENT_VERSION, interestRpcResult, isInterestTarget, validateInterestForm, type InterestResult, type InterestTarget} from "@/features/interessi/interest-model";
import {createAdminClient} from "@/lib/supabase/admin";

export async function submitInterest(target: InterestTarget, form: FormData): Promise<InterestResult> {
	try {
		const account = await getAuthenticatedViewer();
		if (!account) return {status: "guest"};
		if (!account.utenteId || !account.registeredAt) return {status: "registration-required"};
		if (!isInterestTarget(target)) return {status: "error", message: "Il contenuto indicato non è valido."};
		const values = validateInterestForm(form);
		if (Object.keys(values.fieldErrors).length) return {status: "error", message: "Controlla i campi indicati.", fieldErrors: values.fieldErrors};
		const {data, error} = await createAdminClient().rpc("submit_manifestazione_interesse_v1", {
			p_sender_user_uuid: account.utenteId,
			p_sender_profile_type: values.profileType,
			p_target_kind: target.kind,
			p_target_uuid: target.id.toLowerCase(),
			p_target_profile_type: target.kind === "profilo" ? target.profileType : null,
			p_email: values.email,
			p_phone: values.phone,
			p_ownership_consent: values.ownershipConsent,
			p_sharing_consent: values.sharingConsent,
			p_consent_version: INTEREST_CONSENT_VERSION,
		});
		if (error) {
			console.error("[interests] Submission failed", {code: error.code});
			return interestRpcResult(null);
		}
		return interestRpcResult(data);
	} catch {
		console.error("[interests] Submission unavailable");
		return interestRpcResult(null);
	}
}
