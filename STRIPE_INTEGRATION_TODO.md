# Stripe integration TODO

This file is the single source of truth for the remaining Stripe setup for **Annuncio prioritario**.

## Values to Replace

The following server-side values must be configured before the hosted Checkout can be used.

**Files containing local placeholders:**

- [.env.local](.env.local)

| Field | Current Value | What to Set |
|-------|---------------|-------------|
| `STRIPE_SECRET_KEY` | Empty or test placeholder | A Stripe sandbox secret key for testing and the corresponding live secret key in production. Keep it server-only. |
| `STRIPE_WEBHOOK_SECRET` | Empty or `whsec_...` placeholder | The signing secret of the webhook endpoint for the current environment. |
| `STRIPE_ANNUNCIO_PRIORITARIO_PRICE_ID` | Empty or `price_...` placeholder | The one-time EUR Price ID for **Annuncio prioritario**, with a base amount of **7.90 EUR**. |
| `NEXT_PUBLIC_SITE_URL` | Local development origin or missing | The canonical origin of each deployment, without a path, for example `https://example.com`. |

`success_url` and `cancel_url` are built from `NEXT_PUBLIC_SITE_URL`; they are real application routes rather than placeholders. The Checkout mode is the configured one-time `payment` mode. A browser publishable key is no longer needed by Hosted Checkout.

## Configured Parameters

These parameters were configured in Checkout Studio and are already set in the Checkout Session creation call.

**Files containing these parameters:**

- [src/app/api/create-checkout-session/route.ts](src/app/api/create-checkout-session/route.ts)

| Parameter | Value |
|-----------|-------|
| `ui_mode` | `hosted_page` (Stripe Node SDK 22.6.2 is at least 21.0.0) |
| `mode` | `payment` |
| `billing_address_collection` | `auto` |
| `phone_number_collection.enabled` | `true` |
| `automatic_tax.enabled` | `false` |
| `allow_promotion_codes` | `true` |
| `submit_type` | `auto` |
| `consent_collection.promotions` | `auto` |
| `integration_identifier` | `hosted_web_0001` |
| `origin_context` | `web` |
| `success_url` | `/pubblica-annuncio/pagamento?id=<announcement>&result=success&session_id={CHECKOUT_SESSION_ID}` |
| `cancel_url` | `/pubblica-annuncio/pagamento?id=<announcement>&result=cancel` |
| `line_items` | One unit of `STRIPE_ANNUNCIO_PRIORITARIO_PRICE_ID` |

`payment_method_collection` is intentionally omitted because this is a one-time payment. `client_reference_id` and server-generated metadata associate every Session and webhook event with the owned announcement submission.

## Setup and next steps

1. In a Stripe sandbox, create the product **Annuncio prioritario** with a one-time Price whose base amount is **7.90 EUR**. Set its `price_...` ID in `STRIPE_ANNUNCIO_PRIORITARIO_PRICE_ID`.
2. Configure `NEXT_PUBLIC_SITE_URL`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` separately in local, preview, and production environments. Never expose the secret key through a `NEXT_PUBLIC_` variable.
3. Apply [supabase/migrations/20260911120000_priority_announcement_checkout.sql](supabase/migrations/20260911120000_priority_announcement_checkout.sql) before enabling priority announcements. It contains the private Checkout receipt, discounted totals, lifecycle trigger, and priority-expiry job.
4. Create a webhook endpoint at `https://<production-domain>/api/stripe/webhook` and subscribe it to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `refund.created`
   - `refund.updated`
   - `refund.failed`
5. For local webhook testing, forward Stripe CLI events to `http://localhost:3000/api/stripe/webhook` and use the temporary signing secret printed by the CLI.
6. Configure any promotion codes in the same Stripe account. The application verifies the 7.90 EUR subtotal and records the total after discounts.

## Project structure

- `src/app/api/create-checkout-session/route.ts`: creates or resumes an owned hosted Checkout Session and responds with an HTTP 303 redirect to Stripe.
- `src/app/api/complete-checkout-session/route.ts`: verifies Stripe's return against the announcement and stored Session.
- `src/app/api/stripe/webhook/route.ts`: verifies signatures and performs durable payment, failure, expiry, and refund synchronization.
- `src/app/pubblica-annuncio/pagamento/page.tsx`: hosts redirect, cancellation, processing, failure, and retry states.
- `src/features/pubblica-annuncio/components/PriorityCheckoutRedirect.tsx`: submits the redirect request and verifies the return without Stripe.js.
- `src/features/pubblica-annuncio/server/stripe-checkout.ts`: owns the server-only Stripe client and reconciliation checks.

## How the integration works

1. Publishing a priority announcement creates a private draft in `in_attesa_pagamento`.
2. The payment page posts the owned announcement ID to the server. The server creates and records a Checkout Session before redirecting the browser to Stripe.
3. Stripe handles immediate payment errors on its hosted page. Cancellation returns to the saved draft without treating it as a failed charge.
4. A successful return includes `{CHECKOUT_SESSION_ID}`. The server accepts it only when it matches the authenticated user's stored announcement receipt and Stripe metadata.
5. Signed webhooks remain the source of truth if the customer never returns to the site. A failed asynchronous payment is stored against the same announcement and produces a retry state.
6. After payment, the announcement enters review. Its seven priority days begin only when an administrator approves it.

## Testing

Use Stripe test mode and test Price IDs only. Useful test cards include:

- `4242 4242 4242 4242`: successful card payment.
- `4000 0000 0000 0002`: card declined; the error should remain on Stripe's hosted page.
- `4000 0025 0000 3155`: authentication required.

Use any future expiry date, any three-digit CVC, and a valid postal code. Also verify cancellation, page refresh, reuse of an open hosted Session, an expired Session, asynchronous failure, a partial discount, and a 100% discount. Confirm that an unrelated Session ID or announcement ID is rejected.

## Fulfillment, refunds, and order tracking

The private `announcement_submission` receipt stores the Checkout Session, PaymentIntent, Price, subtotal, charged total, statuses, timestamps, and refund state. Keep these rows for reconciliation.

If a paid announcement is rejected or deleted before priority starts, `refund_required_at` marks it for a manual full refund. Refund the **actual charged total** stored for that receipt, which can be lower than 7.90 EUR after a promotion. A fully discounted order requires no refund. The signed `refund.*` webhook records a refund as complete only when its amount matches the recorded charge.

Before going live, replace sandbox credentials with live credentials, use the live Price ID, register the live webhook endpoint, and complete one real low-value end-to-end payment and refund test. Add automated fulfillment monitoring or an administrative queue for rows with `refund_required_at` and no `refunded_at`.

## Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
