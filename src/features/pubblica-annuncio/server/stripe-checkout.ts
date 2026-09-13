import "server-only";

import Stripe from "stripe";

import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

export const PRIORITY_CHECKOUT_INTEGRATION_IDENTIFIER = "hosted_web_0001";
const LEGACY_PRIORITY_CHECKOUT_INTEGRATION_IDENTIFIER = "custom_embedded_web_0001";
export const PRIORITY_CHECKOUT_ASYNC_PAYMENT_FAILED_STATUS = "async_payment_failed";
export const PRIORITY_PRICE_EUR_CENTS = 799;
// export const PRIORITY_DURATION_DAYS = 7;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class StripeCheckoutConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StripeCheckoutConfigurationError";
	}
}

export class StripeCheckoutPriceError extends StripeCheckoutConfigurationError {
	constructor(message: string) {
		super(message);
		this.name = "StripeCheckoutPriceError";
	}
}

export class StripeCheckoutMismatchError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StripeCheckoutMismatchError";
	}
}

export interface PriorityCheckoutContext {
	announcementId: string;
	submissionId: string;
	checkoutSessionId: string | null;
	checkoutStatus: string | null;
	paymentStatus: string | null;
	checkoutAttempt: number;
	paidAt: string | null;
	refundRequiredAt: string | null;
	refundedAt: string | null;
	announcementStatus: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown) {
	return typeof value === "string" && value ? value : null;
}

export function isValidAnnouncementId(value: unknown): value is string {
	return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isValidCheckoutSessionId(value: unknown): value is string {
	return typeof value === "string" && /^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(value);
}

export function isPriorityCheckoutSession(session: Stripe.Checkout.Session) {
	return session.integration_identifier === PRIORITY_CHECKOUT_INTEGRATION_IDENTIFIER
		|| session.integration_identifier === LEGACY_PRIORITY_CHECKOUT_INTEGRATION_IDENTIFIER;
}

export function getStripeClient() {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey || (!secretKey.startsWith("sk_") && !secretKey.startsWith("rk_"))) {
		throw new StripeCheckoutConfigurationError("STRIPE_SECRET_KEY non è configurata con una chiave server Stripe valida.");
	}

	return new Stripe(secretKey);
}

export function getCheckoutSiteUrl() {
	const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
	try {
		const url = new URL(configuredUrl);
		if (url.protocol !== "http:" && url.protocol !== "https:") new Error("INVALID_PROTOCOL");
		return url.origin;
	} catch {
		throw new StripeCheckoutConfigurationError("NEXT_PUBLIC_SITE_URL non contiene un'origine HTTP valida.");
	}
}

export function getPriorityPriceId() {
	const priceId = process.env.STRIPE_ANNUNCIO_PRIORITARIO_PRICE_ID;
	if (!priceId || !priceId.startsWith("price_")) {
		throw new StripeCheckoutConfigurationError("STRIPE_ANNUNCIO_PRIORITARIO_PRICE_ID non è configurato.");
	}
	return priceId;
}

export async function validatePriorityPrice(stripe: Stripe, priceId: string) {
	const price = await stripe.prices.retrieve(priceId);
	if (
		!price.active
		|| price.type !== "one_time"
		|| price.currency.toLowerCase() !== "eur"
		|| price.unit_amount !== PRIORITY_PRICE_EUR_CENTS
	) {
		throw new StripeCheckoutPriceError(
			"Il Price Stripe di Annuncio prioritario deve essere attivo, una tantum e pari a 7,99 EUR.",
		);
	}
}

export async function getOwnedPriorityCheckoutContext(
	announcementId: string,
): Promise<PriorityCheckoutContext | null> {
	const supabase = await createClient();
	const {data, error} = await supabase.rpc("get_owned_priority_checkout_v1", {
		p_announcement_id: announcementId,
	});
	if (error) {
		console.error("[priority-checkout] Owner lookup failed", {code: error.code});
		throw new Error("PRIORITY_CHECKOUT_LOOKUP_FAILED");
	}
	if (!isRecord(data) || data.status !== "ready") return null;

	const resolvedAnnouncementId = optionalString(data.announcementId);
	const submissionId = optionalString(data.submissionId);
	const checkoutAttempt = typeof data.checkoutAttempt === "number" ? data.checkoutAttempt : 0;
	if (
		!resolvedAnnouncementId
		|| !isValidAnnouncementId(resolvedAnnouncementId)
		|| !submissionId
		|| !isValidAnnouncementId(submissionId)
		|| !Number.isInteger(checkoutAttempt)
		|| checkoutAttempt < 0
	) {
		throw new Error("PRIORITY_CHECKOUT_INVALID_RESPONSE");
	}

	return {
		announcementId: resolvedAnnouncementId,
		submissionId,
		checkoutSessionId: optionalString(data.checkoutSessionId),
		checkoutStatus: optionalString(data.checkoutStatus),
		paymentStatus: optionalString(data.paymentStatus),
		checkoutAttempt,
		paidAt: optionalString(data.paidAt),
		refundRequiredAt: optionalString(data.refundRequiredAt),
		refundedAt: optionalString(data.refundedAt),
		announcementStatus: optionalString(data.announcementStatus),
	};
}

export function assertPriorityCheckoutSession(
	session: Stripe.Checkout.Session,
	expected?: {announcementId: string; submissionId: string},
) {
	const priceId = getPriorityPriceId();
	const announcementId = session.metadata?.announcement_id;
	const submissionId = session.metadata?.submission_id;

	if (
		!isPriorityCheckoutSession(session)
		|| !isValidAnnouncementId(announcementId)
		|| !isValidAnnouncementId(submissionId)
		|| session.metadata?.price_id !== priceId
		|| session.client_reference_id !== submissionId
		|| session.mode !== "payment"
		|| session.currency?.toLowerCase() !== "eur"
		|| session.amount_subtotal !== PRIORITY_PRICE_EUR_CENTS
		|| session.amount_total === null
		|| session.amount_total < 0
		|| session.amount_total > PRIORITY_PRICE_EUR_CENTS
		|| (expected && (
			expected.announcementId !== announcementId
			|| expected.submissionId !== submissionId
		))
	) {
		throw new StripeCheckoutMismatchError("La Checkout Session non corrisponde all’annuncio prioritario atteso.");
	}

	return {
		announcementId,
		submissionId,
		priceId,
		amountSubtotal: session.amount_subtotal,
		amountTotal: session.amount_total,
	};
}

export async function recordPriorityCheckoutSession(
	context: PriorityCheckoutContext,
	session: Stripe.Checkout.Session,
	priceId: string,
	attempt: number,
) {
	const validated = assertPriorityCheckoutSession(session, context);
	if (validated.priceId !== priceId) {
		throw new StripeCheckoutMismatchError("Il Price Stripe non corrisponde all’annuncio prioritario atteso.");
	}
	const admin = createAdminClient();
	const {error} = await admin.rpc("record_priority_checkout_session_v1", {
		p_announcement_id: context.announcementId,
		p_submission_id: context.submissionId,
		p_session_id: session.id,
		p_price_id: priceId,
		p_amount_subtotal: validated.amountSubtotal,
		p_amount_total: validated.amountTotal,
		p_checkout_status: session.status ?? "open",
		p_payment_status: session.payment_status,
		p_attempt: attempt,
	});
	if (error) {
		console.error("[priority-checkout] Session receipt update failed", {code: error.code});
		throw new Error("PRIORITY_CHECKOUT_RECEIPT_FAILED");
	}
}

function paymentIntentId(session: Stripe.Checkout.Session) {
	if (typeof session.payment_intent === "string") return session.payment_intent;
	return session.payment_intent?.id ?? null;
}

export async function syncPriorityCheckoutSession(
	session: Stripe.Checkout.Session,
	options?: {
		expected?: {announcementId: string; submissionId: string};
		checkoutStatus?: typeof PRIORITY_CHECKOUT_ASYNC_PAYMENT_FAILED_STATUS;
	},
) {
	const {
		announcementId,
		submissionId,
		priceId,
		amountSubtotal,
		amountTotal,
	} = assertPriorityCheckoutSession(session, options?.expected);

	const paid = session.status === "complete" && session.payment_status === "paid";
	const admin = createAdminClient();
	const {data, error} = await admin.rpc("record_priority_checkout_event_v1", {
		p_announcement_id: announcementId,
		p_submission_id: submissionId,
		p_session_id: session.id,
		p_price_id: priceId,
		p_amount_subtotal: amountSubtotal,
		p_amount_total: amountTotal,
		p_checkout_status: options?.checkoutStatus ?? session.status ?? "open",
		p_payment_status: session.payment_status,
		p_payment_intent_id: paymentIntentId(session),
		p_paid: paid,
	});
	if (error) {
		console.error("[priority-checkout] Checkout event update failed", {code: error.code});
		throw new Error("PRIORITY_CHECKOUT_EVENT_FAILED");
	}

	const result = isRecord(data) ? data : {};
	return {
		ignored: result.status === "ignored",
		paid: result.paid === true,
		paymentFailed: result.paymentFailed === true,
		announcementAvailable: result.announcementAvailable === true,
		announcementId,
	};
}

export async function syncPriorityRefund(refund: Stripe.Refund) {
	const paymentIntentId = typeof refund.payment_intent === "string"
		? refund.payment_intent
		: refund.payment_intent?.id;
	if (
		!paymentIntentId
		|| !refund.status
		|| refund.amount <= 0
	) return;

	const {error} = await createAdminClient().rpc("record_priority_refund_v1", {
		p_payment_intent_id: paymentIntentId,
		p_refund_id: refund.id,
		p_refund_status: refund.status,
		p_amount: refund.amount,
		p_currency: refund.currency.toLowerCase(),
	});
	if (error) {
		console.error("[priority-checkout] Refund event update failed", {code: error.code});
		throw new Error("PRIORITY_REFUND_EVENT_FAILED");
	}
}
