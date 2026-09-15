import {InfoIcon, MailIcon, PhoneIcon, TriangleAlertIcon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import type {AnnouncementContact} from "@/features/annunci/announcement-model";

export default function AnnouncementDetailsContacts({
	contacts,
	unavailable,
}: {
	contacts: AnnouncementContact[];
	unavailable: boolean;
}) {
	return (
		<aside aria-labelledby="announcement-contacts-title" className="xl:sticky xl:top-24">
			<Card>
				<CardHeader>
					<CardTitle><h2 id="announcement-contacts-title" className="font-home-display text-2xl uppercase">Contatta l’autore</h2></CardTitle>
					<CardDescription>Usa uno dei recapiti pubblicati insieme all’annuncio.</CardDescription>
				</CardHeader>
				<CardContent>
					{unavailable ? (
						<Alert variant="destructive">
							<TriangleAlertIcon aria-hidden="true" />
							<AlertTitle>Contatti temporaneamente non disponibili</AlertTitle>
							<AlertDescription>Riprova tra poco per consultare i recapiti pubblici dell’annuncio.</AlertDescription>
						</Alert>
					) : contacts.length === 0 ? (
						<Alert>
							<InfoIcon aria-hidden="true" />
							<AlertTitle>Contatti non disponibili</AlertTitle>
							<AlertDescription>L’autore non ha indicato metodi di contatto pubblici per questo annuncio.</AlertDescription>
						</Alert>
					) : (
						<ul className="flex flex-col gap-2">
							{contacts.map((contact, index) => {
								const Icon = contact.kind === "email" ? MailIcon : PhoneIcon;
								return (
									<li key={`${contact.kind}-${contact.value}`}>
										<Button
											render={<a href={contact.href} />}
											nativeButton={false}
											variant={index === 0 ? "default" : "outline"}
											className="w-full justify-start"
										>
											<Icon data-icon="inline-start" aria-hidden="true" />
											<span className="min-w-0 truncate">{contact.label}: {contact.value}</span>
										</Button>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
				{contacts.length > 0 && (
					<CardFooter className="items-start gap-2 text-xs text-muted-foreground">
						<InfoIcon className="mt-0.5" aria-hidden="true" />
						<span>I recapiti sono stati indicati dall’autore come contatti pubblici dell’annuncio.</span>
					</CardFooter>
				)}
			</Card>
		</aside>
	);
}
