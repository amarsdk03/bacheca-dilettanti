import Image from "next/image";
import Link from "next/link";
import {ArrowUpRightIcon, CheckCircle2Icon, CircleAlertIcon, MapPinIcon, SparklesIcon} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import type {AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import AnnouncementPreviewCard from "@/features/pubblica-annuncio/components/AnnouncementPreviewCard";
import type {PublishConfirmationResult} from "@/features/pubblica-annuncio/server/confirmation";
import {cn} from "@/lib/utils";

function SuggestedAnnouncementCard({announcement}: {announcement: AnnouncementDirectoryItem}) {
	const href = `/dettagli-annuncio?id=${encodeURIComponent(announcement.id)}`;
	return (
		<Link href={href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-brand-indigo/45 focus-visible:ring-offset-2">
			<Card className="h-full transition duration-200 group-hover:-translate-y-1 group-hover:border-brand-indigo/35 group-hover:shadow-lg">
				<CardHeader>
					<span className="w-fit rounded-full bg-brand-indigo/10 px-2.5 py-1 text-xs font-semibold text-brand-indigo">{announcement.typeLabel}</span>
					<CardTitle className="mt-2 text-lg leading-snug">{announcement.title}</CardTitle>
					{announcement.description && <CardDescription className="line-clamp-3">{announcement.description}</CardDescription>}
				</CardHeader>
				<CardContent className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
					<span className="inline-flex items-center gap-1"><MapPinIcon className="size-4" />{announcement.location ?? "Italia"}</span>
					<ArrowUpRightIcon className="size-4 text-brand-indigo transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
				</CardContent>
			</Card>
		</Link>
	);
}

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
		<main className="min-h-screen bg-muted/30 py-12 sm:py-16">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{result.status !== "ok" ? <MissingConfirmation error={result.status === "error"} /> : (
					<>
						<section className="mx-auto max-w-3xl text-center">
							<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
								<CheckCircle2Icon className="size-8" />
							</div>
							<p className="mt-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-indigo">Invio completato</p>
							<h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Il tuo annuncio è stato inviato.</h1>
							<p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Puoi controllare qui i dati salvati e lo stato dell’approvazione.</p>
							<Link href="/il-tuo-profilo?sezione=annunci" className={cn(buttonVariants({size: "lg"}), "mt-7")}>Gestisci i tuoi annunci <ArrowUpRightIcon /></Link>
						</section>

						<section className="mx-auto mt-12 max-w-3xl" aria-label="Riepilogo annuncio">
							<AnnouncementPreviewCard preview={result.preview} />
						</section>

						<div className="mx-auto mt-12 flex max-w-4xl justify-center overflow-hidden rounded-xl border bg-white p-2">
							<Image src="/banner-pubblicita/placeholder.png" width={384} height={108} alt="Spazio pubblicitario per sponsor" className="h-auto w-full object-contain" />
						</div>

						{result.suggestions.length > 0 && (
							<section className="mt-16" aria-labelledby="suggested-announcements-title">
								<div className="flex items-center gap-2">
									<SparklesIcon className="size-5 text-brand-indigo" />
									<h2 id="suggested-announcements-title" className="text-2xl font-semibold tracking-tight">Ti potrebbe interessare...</h2>
								</div>
								<div className="mt-6 grid gap-5 md:grid-cols-3">
									{result.suggestions.map((announcement) => <SuggestedAnnouncementCard key={announcement.id} announcement={announcement} />)}
								</div>
							</section>
						)}
					</>
				)}
			</div>
		</main>
	);
}
