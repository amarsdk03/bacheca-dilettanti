import Link from "next/link";
import {
	ArrowRightIcon,
	CheckIcon,
	ClipboardPenIcon,
	Clock3Icon,
	LogInIcon,
	UserPlusIcon,
} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import AuthBackground from "@/features/auth/AuthBackground";

const choices = [
	{
		badge: "Hai già un account",
		title: "Accedi",
		description: "Riprendi da dove avevi lasciato ed entra nel tuo profilo in pochi secondi.",
		href: "/accedi",
		cta: "Accedi al tuo account",
		icon: LogInIcon,
		featured: false,
		benefits: [
			"Riaccedi al tuo profilo personale",
			"Gestisci i tuoi annunci e i tuoi dati personali",
			"Effettua il login da qualunque dispositivo",
		],
	},
	{
		badge: "Scelta consigliata",
		title: "Registrati",
		description: "Crea gratuitamente il tuo spazio personale su Bacheca Dilettanti.",
		href: "/registrati",
		cta: "Crea un account gratuito",
		icon: UserPlusIcon,
		featured: true,
		benefits: [
			"Ottieni il tuo profilo personale",
			"Pubblica senza il limite degli ospiti",
			"Visualizza annunci e contenuti esclusivi",
		],
	},
	{
		badge: "Senza registrazione",
		title: "Continua come ospite",
		description: "Vuoi pubblicare subito? Puoi farlo gratuitamente anche senza un account.",
		href: "/pubblica-annuncio",
		cta: "Pubblica senza account",
		icon: ClipboardPenIcon,
		featured: false,
		benefits: [
			"Un annuncio gratuito ogni 24 ore",
			"Nessuna registrazione richiesta",
			"Potrai creare un account più avanti",
		],
	},
] as const;

export default function EffettuaAccesso() {
	return (
		<AuthBackground className="px-4 py-16 sm:px-6">
			<div className="relative mx-auto max-w-6xl">
				<div className="pb-16 pt-8">
					<section className="mx-auto max-w-3xl text-center" aria-labelledby="access-choice-title">
						<Badge variant="outline" className="border-fuchsia-200 bg-white/80 text-fuchsia-700">
							Scegli come continuare
						</Badge>
						<h1 id="access-choice-title" className="mt-5 text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl">
							Trova il percorso giusto per te
						</h1>
						<p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
							Accedi o registrati per sfruttare tutti i vantaggi della piattaforma, oppure pubblica subito
							un annuncio come ospite.
						</p>
					</section>

					<section aria-label="Modalità di accesso" className="mt-20 grid items-stretch gap-5 lg:grid-cols-3">
						{choices.map(({title, description, href, cta, icon: Icon, featured, benefits}) => (
							<article key={title} className={featured ? "lg:-translate-y-2" : ""}>
								<Card className={`h-full shadow-sm ${featured ? "bg-fuchsia-950 text-white ring-2 ring-fuchsia-500 shadow-fuchsia-200/60" : "bg-white/90"}`}>
									<CardHeader>
										<div className="flex items-center justify-between gap-3">
											<div className={`flex size-11 items-center justify-center rounded-xl ${featured ? "bg-white/10 text-fuchsia-100" : "bg-fuchsia-100 text-fuchsia-700"}`}>
												<Icon className="size-5" aria-hidden="true" />
											</div>
										</div>
										<CardTitle className="mt-4 text-2xl"><h2>{title}</h2></CardTitle>
										<CardDescription className={featured ? "text-fuchsia-100/80" : ""}>{description}</CardDescription>
									</CardHeader>
									{
										benefits.length > 0 && (
											<CardContent className="flex-1">
												<ul className="space-y-3">
													{benefits.map((benefit) => (
														<li key={benefit} className={`flex items-start gap-2.5 text-sm ${featured ? "text-fuchsia-50" : "text-neutral-700"}`}>
													<span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${featured ? "bg-fuchsia-400/20 text-fuchsia-200" : "bg-emerald-50 text-emerald-700"}`}>
														<CheckIcon className="size-3.5" aria-hidden="true" />
													</span>
															{benefit}
														</li>
													))}
												</ul>
											</CardContent>
										)
									}
									<CardFooter className={featured ? "border-white/10 bg-white/5" : ""}>
										<Button
											render={<Link href={href} />}
											nativeButton={false}
											variant={featured ? "secondary" : "outline"}
											size="lg"
											className={`w-full justify-between ${featured ? "bg-white text-fuchsia-950 hover:bg-fuchsia-50" : ""}`}
										>
											{cta}
											<ArrowRightIcon aria-hidden="true" />
										</Button>
									</CardFooter>
								</Card>
							</article>
						))}
					</section>

					<div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
						<Clock3Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<p>
							<strong>Pubblicazione anonima:</strong> puoi inserire anche il tuo indirizzo email, per
							associare poi a un tuo profilo registrato i tuoi annunci passati.
						</p>
					</div>
				</div>
			</div>
		</AuthBackground>
	);
}
