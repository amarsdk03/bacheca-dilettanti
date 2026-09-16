import {HandshakeIcon, SparklesIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import GradientBackground from "@/components/styling/GradientBackground";
import Link from "next/link";

export default function Partner() {
	return (
		<GradientBackground id="main-content" className="bg-[radial-gradient(circle_at_50%_0%,rgba(142,114,255,0.16),transparent_34rem)] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
			<section className="mx-auto flex max-w-2xl flex-col items-center text-center" aria-labelledby="partner-title">
				<Badge variant="secondary" className="h-auto gap-1.5 px-3 py-1 text-brand-indigo">
					<SparklesIcon aria-hidden="true" /> Coming soon
				</Badge>
				<h1 id="partner-title" className="mt-5 font-home-display text-4xl font-medium uppercase tracking-tight sm:text-5xl">
					Partner e sponsor
				</h1>
				<p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
					Stiamo preparando uno spazio dedicato ai brand e alle realtà che sostengono il calcio dilettantistico.
				</p>

				<Card className="mt-10 w-full max-w-lg border-brand-indigo/20 bg-background/85 py-0 shadow-sm">
					<CardHeader className="flex flex-col items-center px-6 pb-2">
						<span className="flex size-14 mt-6 items-center justify-center rounded-full bg-brand-indigo/10 text-brand-indigo">
							<HandshakeIcon className="size-8" aria-hidden="true" />
						</span>
						<CardTitle className="mt-3 font-home-display text-2xl uppercase">CONTATTACI!</CardTitle>
					</CardHeader>
					<CardContent className="px-6 pb-7 text-base tracking-wide leading-6 text-muted-foreground">
						<Link href={"/contatti"}>
							Vuoi far parte del nostro progetto supportandoci? Contattaci ora per scoprire le possibilità di
							collaborazione e pubblicizzazione, presto in arrivo!
						</Link>
					</CardContent>
				</Card>
			</section>
		</GradientBackground>
	);
}
