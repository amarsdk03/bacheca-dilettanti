import {Card, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";

const DIRECTORY_DESCRIPTIONS: Record<ProfileType, string> = {
	giocatore: "Profili dei giocatori e delle loro esperienze sportive.",
	squadra: "Società e squadre del calcio dilettantistico.",
	"staff-sportivo": "Allenatori e figure dello staff tecnico e sportivo.",
	arbitro: "Arbitri per partite ed eventi sportivi.",
	"torneo-evento": "Tornei, eventi e manifestazioni sportive.",
	"campi-impianti-sportivi": "Strutture e spazi dedicati alla pratica del calcio.",
	"servizi-consulenze": "Professionisti e aziende al servizio del mondo del calcio.",
	creators: "Creatori di contenuti dedicati al calcio e alla community.",
};

// Vista informativa temporanea: la directory completa rimane in Profili.tsx.
export default function ProfiliComingSoon() {
	return (
		<main id="main-content" className="bg-background px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
			<section className="mx-auto flex max-w-6xl flex-col gap-10" aria-labelledby="profiles-coming-soon-title">
				<header className="mx-auto flex max-w-2xl flex-col gap-4 text-center">
					<p className="text-sm font-semibold text-brand-indigo">Presto in arrivo...</p>
					<h1 id="profiles-coming-soon-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
						Ricerca Profili
					</h1>
					<p className="text-base leading-7 text-muted-foreground sm:text-lg">
						Stiamo preparando le directory dedicate al mondo del calcio dilettantistico: la ricerca dei
						profili delle directory varie tornerà disponibile a breve...
					</p>
				</header>
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{PROFILE_OPTIONS.map(({value, label, icon: Icon}) => (
						<li key={value}>
							<Card className="h-full">
								<CardHeader className="gap-3">
									<Icon className="size-7 text-brand-indigo" aria-hidden="true" />
									<CardTitle><h2>{label}</h2></CardTitle>
									<CardDescription className="leading-6">{DIRECTORY_DESCRIPTIONS[value]}</CardDescription>
								</CardHeader>
							</Card>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
