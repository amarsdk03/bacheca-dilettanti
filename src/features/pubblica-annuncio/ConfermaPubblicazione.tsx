import Link from "next/link";
import {ArrowUpRight, CheckCircle2, MapPin, Sparkles} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";

const annunciSuggeriti = [
	{
		slug: "portiere-lombardia",
		tipo: "Giocatore",
		titolo: "Portiere disponibile per nuova squadra",
		luogo: "Lombardia",
		descrizione: "Profilo senior con esperienza nei campionati regionali.",
	},
	{
		slug: "squadra-cerca-staff",
		tipo: "Squadra",
		titolo: "Società cerca preparatore atletico",
		luogo: "Emilia-Romagna",
		descrizione: "Collaborazione per la prossima stagione sportiva.",
	},
	{
		slug: "open-day-giovanile",
		tipo: "Evento",
		titolo: "Open day dedicato al settore giovanile",
		luogo: "Lazio",
		descrizione: "Giornata di allenamenti e selezioni aperta a più annate.",
	},
] as const;

export default function ConfermaPubblicazione() {
	return (
		<main className="min-h-screen bg-muted/30 py-12 sm:py-16">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<section className="mx-auto max-w-3xl text-center">
					<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
						<CheckCircle2 className="size-8" />
					</div>
					<p className="mt-5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-600">Invio completato</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">Il tuo annuncio è stato inviato.</h1>
					<p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">Grazie! Abbiamo ricevuto tutti i dati. Per ora la pubblicazione è simulata, ma puoi già vedere come apparirà il collegamento al tuo annuncio.</p>
					<Link href="#annuncio-demo" className={cn(buttonVariants({size: "lg"}), "mt-7")}>
						Visualizza l&apos;annuncio demo <ArrowUpRight />
					</Link>
				</section>

				<Card id="annuncio-demo" className="mx-auto mt-12 max-w-3xl scroll-mt-8 border-fuchsia-200 bg-white shadow-sm">
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">Il tuo annuncio · demo</span>
							<span className="inline-flex items-center gap-1 text-sm text-neutral-500"><MapPin className="size-4" /> Italia</span>
						</div>
						<CardTitle className="mt-3 text-2xl">Nuovo annuncio su Bacheca Dilettanti</CardTitle>
						<CardDescription>Questo è un contenuto segnaposto: il link definitivo verrà collegato alla pubblicazione reale.</CardDescription>
					</CardHeader>
				</Card>

				<section className="mt-16">
					<div className="flex items-center gap-2">
						<Sparkles className="size-5 text-fuchsia-600" />
						<h2 className="text-2xl font-semibold tracking-tight text-neutral-950">Ti potrebbe interessare:</h2>
					</div>

					<div className="mt-6 grid gap-5 md:grid-cols-3">
						{annunciSuggeriti.map((annuncio) => (
							<Link key={annuncio.slug} href={`#${annuncio.slug}`} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500">
								<Card id={annuncio.slug} className="h-full scroll-mt-8 transition duration-200 group-hover:-translate-y-1 group-hover:border-fuchsia-200 group-hover:shadow-lg">
									<CardHeader>
										<span className="w-fit rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">{annuncio.tipo}</span>
										<CardTitle className="mt-2 text-lg leading-snug">{annuncio.titolo}</CardTitle>
										<CardDescription>{annuncio.descrizione}</CardDescription>
									</CardHeader>
									<CardContent className="mt-auto flex items-center justify-between text-sm text-neutral-500">
										<span className="inline-flex items-center gap-1"><MapPin className="size-4" />{annuncio.luogo}</span>
										<ArrowUpRight className="size-4 text-fuchsia-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
