"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {CircleAlertIcon, LoaderCircleIcon, RotateCcwIcon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";

export type PriorityCheckoutResult = "success" | "cancel" | "processing" | "failed" | "error";

type CheckoutState = "redirecting" | "verifying" | "processing" | "cancelled" | "failed" | "error";
type CompletionState = "completed" | "failed" | "processing";

const ERROR_MESSAGES: Record<string, string> = {
	configuration: "Il pagamento non è ancora configurato. Consulta STRIPE_INTEGRATION_TODO.md.",
	database: "La ricevuta Stripe non può essere registrata finché non vengono applicate le migrazioni Supabase pendenti.",
	invalid: "Il collegamento non contiene un annuncio valido.",
	mismatch: "La sessione di pagamento non corrisponde a questa bozza.",
	"not-found": "La bozza prioritaria non è disponibile o non appartiene alla sessione attiva.",
	price: "Il prodotto Stripe non è configurato al prezzo previsto di 7,99 EUR.",
	refunded: "Il pagamento di questo annuncio è già stato rimborsato.",
	unavailable: "Questa bozza non è più in attesa di pagamento.",
	server: "Non è stato possibile preparare il pagamento. Riprova tra poco.",
};

async function completeCheckout(announcementId: string, sessionId: string) {
	const response = await fetch("/api/complete-checkout-session", {
		method: "POST",
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify({announcementId, sessionId}),
	});
	const result = await response.json() as {completed?: boolean; payment_failed?: boolean; error?: string};
	if (!response.ok) throw new Error(result.error ?? "Non è stato possibile verificare il pagamento.");
	if (result.completed === true) return "completed" satisfies CompletionState;
	if (result.payment_failed === true) return "failed" satisfies CompletionState;
	return "processing" satisfies CompletionState;
}

async function waitForCompletion(announcementId: string, sessionId: string) {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const status = await completeCheckout(announcementId, sessionId);
		if (status !== "processing") return status;
		await new Promise((resolve) => window.setTimeout(resolve, 1500));
	}
	return "processing" satisfies CompletionState;
}

function initialState(result: PriorityCheckoutResult | null, sessionId: string | null): CheckoutState {
	if (result === "success" || result === "processing") return sessionId ? "verifying" : "error";
	if (result === "cancel") return "cancelled";
	if (result === "failed") return "failed";
	if (result === "error") return "error";
	return "redirecting";
}

function CheckoutForm({announcementId, retry = false}: {announcementId: string; retry?: boolean}) {
	return (
		<form action="/api/create-checkout-session" method="post">
			<input type="hidden" name="announcementId" value={announcementId} />
			{retry && <input type="hidden" name="retry" value="1" />}
			<Button type="submit">
				{retry ? <RotateCcwIcon /> : null}
				{retry ? "Riprova il pagamento" : "Continua su Stripe"}
			</Button>
		</form>
	);
}

export default function PriorityCheckoutRedirect({
	announcementId,
	result,
	sessionId,
	errorReason,
}: {
	announcementId: string;
	result: PriorityCheckoutResult | null;
	sessionId: string | null;
	errorReason: string | null;
}) {
	const router = useRouter();
	const autoSubmitForm = useRef<HTMLFormElement>(null);
	const submitted = useRef(false);
	const [state, setState] = useState<CheckoutState>(() => initialState(result, sessionId));
	const [error, setError] = useState<string | null>(() => (
		result === "error"
			? ERROR_MESSAGES[errorReason ?? ""] ?? ERROR_MESSAGES.server
			: (result === "success" || result === "processing") && !sessionId
				? "Stripe non ha restituito un identificativo di sessione valido."
				: null
	));

	useEffect(() => {
		if (result !== null || submitted.current) return;
		submitted.current = true;
		autoSubmitForm.current?.requestSubmit();
	}, [result]);

	useEffect(() => {
		if (result !== "success" && result !== "processing") return;
		if (!sessionId) return;

		let cancelled = false;
		waitForCompletion(announcementId, sessionId)
			.then((completion) => {
				if (cancelled) return;
				if (completion === "completed") {
					router.replace(`/pubblica-annuncio/conferma?id=${encodeURIComponent(announcementId)}`);
					router.refresh();
					return;
				}
				setState(completion === "failed" ? "failed" : "processing");
			})
			.catch((completionError) => {
				if (cancelled) return;
				console.error("[priority-checkout] Hosted Checkout verification failed", {
					cause: completionError instanceof Error ? completionError.name : "unknown",
				});
				setError(completionError instanceof Error
					? completionError.message
					: "Non è stato possibile verificare il pagamento.");
				setState("error");
			});

		return () => {
			cancelled = true;
		};
	}, [announcementId, result, router, sessionId]);

	if (state === "redirecting") {
		return (
			<div className="grid justify-items-center gap-4">
				<Alert>
					<LoaderCircleIcon className="animate-spin" />
					<AlertTitle>Apertura del pagamento sicuro</AlertTitle>
					<AlertDescription>Stai per essere reindirizzato alla pagina Stripe.</AlertDescription>
				</Alert>
				<form ref={autoSubmitForm} action="/api/create-checkout-session" method="post">
					<input type="hidden" name="announcementId" value={announcementId} />
					<Button type="submit">Continua su Stripe</Button>
				</form>
			</div>
		);
	}

	if (state === "verifying" || state === "processing") {
		return (
			<Alert>
				<LoaderCircleIcon className="animate-spin" />
				<AlertTitle>{state === "verifying" ? "Verifica del pagamento" : "Pagamento in elaborazione"}</AlertTitle>
				<AlertDescription>
					{state === "verifying"
						? "Stiamo collegando la risposta di Stripe al tuo annuncio prioritario."
						: "Stripe sta ancora elaborando il pagamento. Puoi controllarne lo stato dai tuoi annunci."}
				</AlertDescription>
			</Alert>
		);
	}

	if (state === "cancelled") {
		return (
			<div className="grid justify-items-start gap-4">
				<Alert>
					<CircleAlertIcon />
					<AlertTitle>Pagamento annullato</AlertTitle>
					<AlertDescription>La bozza è stata conservata e non è ancora entrata in revisione.</AlertDescription>
				</Alert>
				<CheckoutForm announcementId={announcementId} retry />
			</div>
		);
	}

	if (state === "failed") {
		return (
			<div className="grid justify-items-start gap-4">
				<Alert variant="destructive">
					<CircleAlertIcon />
					<AlertTitle>Pagamento non riuscito</AlertTitle>
					<AlertDescription>Stripe ha segnalato un errore per il pagamento collegato a questo annuncio.</AlertDescription>
				</Alert>
				<CheckoutForm announcementId={announcementId} retry />
			</div>
		);
	}

	return (
		<div className="grid justify-items-start gap-4">
			<Alert variant="destructive">
				<CircleAlertIcon />
				<AlertTitle>Pagamento non disponibile</AlertTitle>
				<AlertDescription>{error ?? ERROR_MESSAGES.server}</AlertDescription>
			</Alert>
			<CheckoutForm announcementId={announcementId} retry />
		</div>
	);
}
