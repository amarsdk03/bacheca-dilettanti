import {SiInstagram, SiWhatsapp} from "@icons-pack/react-simple-icons";
import {MailIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {INSTAGRAM_URL, WHATSAPP_URL} from "@/const/contactConstants";
import type {LimitedRegistrationProfileType} from "@/features/auth/registration-profile";

interface LimitedProfileAvailabilityProps {
	type: LimitedRegistrationProfileType;
	contactEmail: string;
}

const CONTENT = {
	"professionisti-studi": {
		title: "Professionisti e studi",
		description: "Accettiamo fino a 3 professionisti o studi per ogni figura professionale e regione. Per esempio, possono essere attivi al massimo 3 nutrizionisti in Lombardia nello stesso periodo.",
	},
	creators: {
		title: "Creators",
		description: "Stiamo aprendo un numero limitato di profili Creator per mantenere alta la qualità della community.",
	},
} satisfies Record<LimitedRegistrationProfileType, {title: string; description: string}>;

export default function LimitedProfileAvailability({type, contactEmail}: LimitedProfileAvailabilityProps) {
	const content = CONTENT[type];
	const subject = `Richiesta disponibilità profilo ${content.title}`;
	const body = `Ciao, vorrei verificare la disponibilità e i prezzi per un profilo ${content.title}.`;
	const emailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<CardTitle className="text-base">{content.title}</CardTitle>
					<Badge variant="destructive">Posti limitati</Badge>
				</div>
				<CardDescription>{content.description}</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm font-medium">Contattaci per richiedere disponibilità e prezzi prima dell’attivazione.</p>
			</CardContent>
			<CardFooter className="flex flex-wrap gap-2">
				<Button variant="outline" render={<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
					<SiWhatsapp data-icon="inline-start" aria-hidden="true" />
					Tramite WhatsApp
				</Button>
				<Button variant="outline" render={<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
					<SiInstagram data-icon="inline-start" aria-hidden="true" />
					Tramite Instagram
				</Button>
				<Button variant="outline" render={<a href={emailHref} />} nativeButton={false}>
					<MailIcon data-icon="inline-start" aria-hidden="true" />
					Tramite email
				</Button>
			</CardFooter>
		</Card>
	);
}
