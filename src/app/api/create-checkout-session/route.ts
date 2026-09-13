import {NextResponse} from "next/server";
import type Stripe from "stripe";

import {
	getCheckoutSiteUrl,
	getOwnedPriorityCheckoutContext,
	getPriorityPriceId,
	getStripeClient,
	isValidAnnouncementId,
	PRIORITY_CHECKOUT_ASYNC_PAYMENT_FAILED_STATUS,
	PRIORITY_CHECKOUT_INTEGRATION_IDENTIFIER,
	recordPriorityCheckoutSession,
	StripeCheckoutConfigurationError,
	StripeCheckoutMismatchError,
	StripeCheckoutPriceError,
	syncPriorityCheckoutSession,
	validatePriorityPrice,
} from "@/features/pubblica-annuncio/server/stripe-checkout";

export const runtime = "nodejs";

function redirect(url: string | URL) {
	return NextResponse.redirect(url, {
		status: 303,
		headers: {"Cache-Control": "no-store"},
	});
}

async function readForm(request: Request) {
	try {
		const form = await request.formData();
		const announcementId = form.get("announcementId");
		return {
			announcementId: isValidAnnouncementId(announcementId) ? announcementId : null,
			retry: form.get("retry") === "1",
		};
	} catch {
		return {announcementId: null, retry: false};
	}
}

function paymentPageUrl(request: Request, announcementId: string | null, result: string, reason?: string) {
	const url = new URL("/pubblica-annuncio/pagamento", request.url);
	if (announcementId) url.searchParams.set("id", announcementId);
	url.searchParams.set("result", result);
	if (reason) url.searchParams.set("reason", reason);
	return url;
}

export async function POST(request: Request) {
	const {announcementId, retry} = await readForm(request);
	if (!announcementId) return redirect(paymentPageUrl(request, null, "error", "invalid"));

	try {
		const context = await getOwnedPriorityCheckoutContext(announcementId);
		if (!context) return redirect(paymentPageUrl(request, announcementId, "error", "not-found"));
		if (context.refundedAt) return redirect(paymentPageUrl(request, announcementId, "error", "refunded"));
		if (context.paidAt) {
			return redirect(new URL(
				`/pubblica-annuncio/conferma?id=${encodeURIComponent(context.announcementId)}`,
				getCheckoutSiteUrl(),
			));
		}
		if (context.checkoutStatus === PRIORITY_CHECKOUT_ASYNC_PAYMENT_FAILED_STATUS && !retry) {
			return redirect(paymentPageUrl(request, announcementId, "failed"));
		}

		const stripe = getStripeClient();
		const priceId = getPriorityPriceId();
		await validatePriorityPrice(stripe, priceId);

		if (
			context.checkoutSessionId
			&& context.checkoutStatus !== PRIORITY_CHECKOUT_ASYNC_PAYMENT_FAILED_STATUS
		) {
			const existingSession = await stripe.checkout.sessions.retrieve(context.checkoutSessionId);
			try {
				const syncResult = await syncPriorityCheckoutSession(existingSession, {expected: context});
				if (syncResult.paid) {
					return redirect(new URL(
						`/pubblica-annuncio/conferma?id=${encodeURIComponent(context.announcementId)}`,
						getCheckoutSiteUrl(),
					));
				}
				if (existingSession.status === "open" && existingSession.url) {
					return redirect(existingSession.url);
				}
				if (existingSession.status === "open") {
					await stripe.checkout.sessions.expire(existingSession.id);
				}
				if (existingSession.status === "complete") {
					const url = paymentPageUrl(request, announcementId, "processing");
					url.searchParams.set("session_id", existingSession.id);
					return redirect(url);
				}
			} catch (error) {
				if (!(error instanceof StripeCheckoutMismatchError) || existingSession.status !== "open") {
					throw error;
				}
				await stripe.checkout.sessions.expire(existingSession.id);
			}
		}

		const attempt = context.checkoutAttempt + 1;
		const siteUrl = getCheckoutSiteUrl();
		const successUrl = new URL("/pubblica-annuncio/pagamento", siteUrl);
		successUrl.searchParams.set("id", context.announcementId);
		successUrl.searchParams.set("result", "success");
		successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
		const successUrlWithSessionPlaceholder = successUrl.toString()
			.replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");
		const cancelUrl = new URL("/pubblica-annuncio/pagamento", siteUrl);
		cancelUrl.searchParams.set("id", context.announcementId);
		cancelUrl.searchParams.set("result", "cancel");
		const sessionParams: Stripe.Checkout.SessionCreateParams = {
			ui_mode: "hosted_page",
			mode: "payment",
			billing_address_collection: "auto",
			phone_number_collection: {enabled: true},
			automatic_tax: {enabled: false},
			allow_promotion_codes: true,
			submit_type: "auto",
			integration_identifier: PRIORITY_CHECKOUT_INTEGRATION_IDENTIFIER,
			origin_context: "web",
			success_url: successUrlWithSessionPlaceholder,
			cancel_url: cancelUrl.toString(),
			line_items: [{price: priceId, quantity: 1}],
			client_reference_id: context.submissionId,
			metadata: {
				announcement_id: context.announcementId,
				submission_id: context.submissionId,
				price_id: priceId,
			},
		};

		const session = await stripe.checkout.sessions.create(sessionParams, {
			idempotencyKey: `priority-announcement-hosted-v1-${context.submissionId}-${priceId}-${attempt}`,
		});
		if (!session.url) {
			throw new Error("CHECKOUT_URL_MISSING");
		}

		await recordPriorityCheckoutSession(context, session, priceId, attempt);
		return redirect(session.url);
	} catch (error) {
		if (error instanceof StripeCheckoutPriceError) {
			console.error("[priority-checkout] Stripe Price invalid", {message: error.message});
			return redirect(paymentPageUrl(request, announcementId, "error", "price"));
		}
		if (error instanceof StripeCheckoutConfigurationError) {
			console.error("[priority-checkout] Stripe configuration missing", {message: error.message});
			return redirect(paymentPageUrl(request, announcementId, "error", "configuration"));
		}
		if (error instanceof StripeCheckoutMismatchError) {
			console.error("[priority-checkout] Existing session mismatch", {message: error.message});
			return redirect(paymentPageUrl(request, announcementId, "error", "mismatch"));
		}
		console.error("[priority-checkout] Checkout Session creation failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return redirect(paymentPageUrl(request, announcementId, "error", "server"));
	}
}
