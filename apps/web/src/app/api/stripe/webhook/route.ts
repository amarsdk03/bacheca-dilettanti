import {revalidatePath} from "next/cache";
import {NextResponse} from "next/server";
import type Stripe from "stripe";

import {
	getStripeClient,
	isPriorityCheckoutSession,
	PRIORITY_CHECKOUT_ASYNC_PAYMENT_FAILED_STATUS,
	StripeCheckoutConfigurationError,
	StripeCheckoutMismatchError,
	syncPriorityCheckoutSession,
	syncPriorityRefund,
} from "@/features/pubblica-annuncio/server/stripe-checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
	const signature = request.headers.get("stripe-signature");
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!signature || !webhookSecret?.startsWith("whsec_")) {
		return NextResponse.json({error: "Webhook Stripe non configurato."}, {status: 503});
	}

	let event: Stripe.Event;
	try {
		const payload = await request.text();
		event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
	} catch (error) {
		const configurationError = error instanceof StripeCheckoutConfigurationError;
		console.error("[stripe-webhook] Signature verification failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return NextResponse.json(
			{error: configurationError ? "Configurazione Stripe non valida." : "Firma webhook non valida."},
			{status: configurationError ? 503 : 400},
		);
	}

	try {
		switch (event.type) {
			case "checkout.session.completed":
			case "checkout.session.async_payment_succeeded":
			case "checkout.session.async_payment_failed":
			case "checkout.session.expired": {
				const session = event.data.object;
				if (!isPriorityCheckoutSession(session)) break;
				const result = await syncPriorityCheckoutSession(session, {
					checkoutStatus: event.type === "checkout.session.async_payment_failed"
						? PRIORITY_CHECKOUT_ASYNC_PAYMENT_FAILED_STATUS
						: undefined,
				});
				if (result.paid && result.announcementAvailable) {
					revalidatePath("/il-tuo-profilo");
				}
				break;
			}
			case "refund.created":
			case "refund.updated":
			case "refund.failed":
				await syncPriorityRefund(event.data.object);
				revalidatePath("/il-tuo-profilo");
				break;
			default:
				break;
		}
	} catch (error) {
		const mismatch = error instanceof StripeCheckoutMismatchError;
		console.error("[stripe-webhook] Event processing failed", {
			type: event.type,
			cause: error instanceof Error ? error.name : "unknown",
		});
		return NextResponse.json(
			{error: mismatch ? "Evento non pertinente." : "Elaborazione webhook non riuscita."},
			{status: mismatch ? 400 : 500},
		);
	}

	return NextResponse.json({received: true});
}
