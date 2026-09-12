import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";

import {
	getOwnedPriorityCheckoutContext,
	getStripeClient,
	isValidAnnouncementId,
	isValidCheckoutSessionId,
	StripeCheckoutConfigurationError,
	syncPriorityCheckoutSession,
} from "@/features/pubblica-annuncio/server/stripe-checkout";

export const runtime = "nodejs";

function response(body: object, status = 200) {
	return NextResponse.json(body, {
		status,
		headers: {"Cache-Control": "no-store"},
	});
}

export async function POST(request: Request) {
	let announcementId: string | null = null;
	let sessionId: string | null = null;
	try {
		const body = await request.json() as {announcementId?: unknown; sessionId?: unknown};
		announcementId = isValidAnnouncementId(body.announcementId) ? body.announcementId : null;
		sessionId = isValidCheckoutSessionId(body.sessionId) ? body.sessionId : null;
	} catch {
		// The validation response below covers malformed JSON as well.
	}
	if (!announcementId || !sessionId) return response({error: "Ritorno Stripe non valido."}, 400);

	try {
		const context = await getOwnedPriorityCheckoutContext(announcementId);
		if (!context) return response({error: "Bozza prioritaria non trovata."}, 404);
		if (context.checkoutSessionId !== sessionId) {
			return response({error: "La sessione Stripe non corrisponde all’annuncio."}, 409);
		}
		if (context.paidAt && !context.refundedAt) {
			return response({completed: true, announcement_id: context.announcementId});
		}

		const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
		const result = await syncPriorityCheckoutSession(session, {expected: context});
		if (result.paid && result.announcementAvailable) {
			revalidatePath("/il-tuo-profilo");
			revalidatePath(`/pubblica-annuncio/conferma?id=${context.announcementId}`);
		}
		return response({
			completed: result.paid && result.announcementAvailable,
			payment_failed: result.paymentFailed,
			announcement_id: result.announcementId,
		});
	} catch (error) {
		if (error instanceof StripeCheckoutConfigurationError) {
			return response({error: "Il pagamento non è ancora configurato. Consulta STRIPE_INTEGRATION_TODO.md."}, 503);
		}
		console.error("[priority-checkout] Checkout completion failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return response({error: "Non è stato possibile verificare il pagamento."}, 500);
	}
}
