import Image from "next/image";
import Link from "next/link";
import {ArrowUpRightIcon, CheckCircle2Icon, CircleAlertIcon, CrownIcon, SparklesIcon} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import AnnouncementCard from "@/features/annunci/components/cards/AnnouncementCard";
import AnnouncementPreviewCard from "@/features/pubblica-annuncio/components/AnnouncementPreviewCard";
import type {PublishConfirmationResult} from "@/features/pubblica-annuncio/server/confirmation";
import {cn} from "@/lib/utils";

function MissingConfirmation({error}: {error: boolean}) {
	return (
		<Empty className="mx-auto max-w-3xl border bg-card py-16">
			<EmptyHeader>
				<EmptyMedia variant="icon"><CircleAlertIcon /></EmptyMedia>
				<EmptyTitle>{error ? "Conferma non disponibile" : "Annuncio non trovato"}</EmptyTitle>
				<EmptyDescription>
					{error
						? "Non è stato possibile caricare il riepilogo. Riprova tra poco."
						: "Il link non è valido oppure l’annuncio non appartiene alla sessione attiva."}
				</EmptyDescription>
			</EmptyHeader>
			<Link href="/il-tuo-profilo?sezione=annunci" className={buttonVariants({variant: "outline"})}>Apri i tuoi annunci</Link>
		</Empty>
	);
}

export default function ConfermaPubblicazione({result}: {result: PublishConfirmationResult}) {
	return (
		<main className="min-h-screen bg-brand-paper py-12 font-home-body text-brand-ink sm:py-16">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{result.status !== "ok" ? <MissingConfirmation error={result.status === "error"} /> : (
					<>
						<section className="mx-auto max-w-3xl text-center">
							<div className={cn("mx-auto flex size-16 items-center justify-center rounded-full", result.awaitingPayment ? "bg-brand-indigo/10 text-brand-indigo" : "bg-emerald-100 text-emerald-700")}>
								{result.awaitingPayment ? <CrownIcon className="size-8" /> : <CheckCircle2Icon className="size-8" />}
							</div>
							<p className="mt-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-indigo">{result.awaitingPayment ? "Bozza salvata" : "Invio completato"}</p>
							<h1 className="mt-3 font-home-display text-3xl uppercase tracking-tight sm:text-5xl">{result.awaitingPayment ? "Completa il pagamento." : "Il tuo annuncio è stato inviato."}</h1>
							<p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
								{result.awaitingPayment
									? "L’annuncio resta privato e non entra in revisione finché il pagamento non è confermato."
									: "Puoi controllare qui i dati salvati e lo stato dell’approvazione."}
							</p>
							<Link
								href={result.awaitingPayment ? `/pubblica-annuncio/pagamento?id=${encodeURIComponent(result.preview.id ?? "")}` : "/il-tuo-profilo?sezione=annunci"}
								className={cn(buttonVariants({size: "lg"}), "mt-7")}
							>
								{result.awaitingPayment ? "Vai al pagamento" : "Gestisci i tuoi annunci"} <ArrowUpRightIcon />
							</Link>
						</section>

						<section className="mx-auto mt-12 max-w-3xl" aria-label="Riepilogo annuncio">
							<AnnouncementPreviewCard preview={result.preview} />
						</section>

						<div className="mx-auto mt-12 flex max-w-4xl justify-center overflow-hidden rounded-xl border border-black/8 bg-white p-2">
							<Image src="/banner-pubblicita/placeholder.png" width={384} height={108} alt="Spazio pubblicitario per sponsor" className="h-auto w-full object-contain" />
						</div>

						{result.suggestions.length > 0 && (
							<section className="mt-16" aria-labelledby="suggested-announcements-title">
								<div className="flex items-center gap-2">
									<SparklesIcon className="size-5 text-brand-indigo" />
									<h2 id="suggested-announcements-title" className="text-2xl font-semibold tracking-tight">Ti potrebbe interessare...</h2>
								</div>
								<div className="mt-6 grid gap-5 md:grid-cols-3">
									{result.suggestions.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} />)}
								</div>
							</section>
						)}
					</>
				)}
			</div>
		</main>
	);
}
