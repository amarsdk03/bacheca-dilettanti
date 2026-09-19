import type {Metadata} from "next";
import Link from "next/link";
import {CrownIcon, ShieldCheckIcon} from "lucide-react";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import PriorityCheckoutRedirect, {
	type PriorityCheckoutResult,
} from "@/features/pubblica-annuncio/components/PriorityCheckoutRedirect";
import {isValidAnnouncementId, isValidCheckoutSessionId,} from "@/features/pubblica-annuncio/server/stripe-checkout";
import {cn} from "@/lib/utils";
import {dynamicMetadata} from "@/server/metadata";

export const metadata: Metadata = dynamicMetadata("Pagamento annuncio prioritario");
export const dynamic = "force-dynamic";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{
		id?: string | string[];
		result?: string | string[];
		session_id?: string | string[];
		reason?: string | string[];
	}>;
}) {
	const params = await searchParams;
	const announcementId = typeof params.id === "string" && isValidAnnouncementId(params.id)
		? params.id
		: null;
	const rawResult = typeof params.result === "string" ? params.result : null;
	const result = (["success", "cancel", "processing", "failed", "error"] as const)
		.includes(rawResult as PriorityCheckoutResult)
		? rawResult as PriorityCheckoutResult
		: null;
	const sessionId = typeof params.session_id === "string" && isValidCheckoutSessionId(params.session_id)
		? params.session_id
		: null;
	const errorReason = typeof params.reason === "string" ? params.reason : null;

	return (
		<>
			<Navbar minimal backToHome />
			<main className="min-h-screen bg-muted/30 py-12 sm:py-16">
				<div className="mx-auto grid max-w-3xl gap-6 px-4 sm:px-6">
					<div className="text-center">
						<div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-indigo/10 text-brand-indigo"><CrownIcon className="size-7" /></div>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Annuncio prioritario</h1>
						<p className="mt-2 text-muted-foreground">Completa il pagamento sicuro di 7,99 EUR.</p>
					</div>

					<Card>
						<CardHeader className="border-b">
							<CardTitle>Pagamento una tantum</CardTitle>
							<CardDescription>La priorità durerà 7 giorni e inizierà quando l’annuncio sarà approvato.</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							{announcementId ? (
								<PriorityCheckoutRedirect
									announcementId={announcementId}
									result={result}
									sessionId={sessionId}
									errorReason={errorReason}
								/>
							) : (
								<Alert variant="destructive">
									<AlertTitle>Bozza non valida</AlertTitle>
									<AlertDescription>Il link di pagamento non contiene un annuncio valido.</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>

					<Alert>
						<ShieldCheckIcon />
						<AlertTitle>Pagamento gestito da Stripe</AlertTitle>
						<AlertDescription>Il pagamento si apre sulla pagina ospitata da Stripe e i dati della carta non transitano sui server di Bacheca Dilettanti.</AlertDescription>
					</Alert>

					<div className="text-center">
						<Link href="/il-tuo-profilo?sezione=annunci" className={cn(buttonVariants({variant: "outline"}))}>Torna ai tuoi annunci</Link>
					</div>
				</div>
			</main>
			<Footer whiteBackground />
		</>
	);
}
