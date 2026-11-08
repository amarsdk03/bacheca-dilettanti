"use client";

import {InfoIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog";

const STEPS = [
	{title: "Ricevi il codice", description: "Chiedi a un amico già registrato di condividere il suo codice invito."},
	{title: "Inseriscilo qui", description: "Scrivi o incolla il codice nel campo Codice invito prima di completare la registrazione (il campo è facoltativo)."},
	{title: "Completa la registrazione", description: "Dopo la registrazione e la verifica della tua email, l’invito verrà conteggiato al tuo amico."},
];

export default function InvitationCodeInfoDialog() {
	return <Dialog>
		<DialogTrigger render={<Button type="button" variant="ghost" size="icon-xs" />} aria-label="Come funziona il codice invito">
			<InfoIcon aria-hidden="true" />
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>
					Come funziona il codice invito
				</DialogTitle>
				<DialogDescription>
					Il codice collega la tua iscrizione all’amico che ti ha fatto conoscere Bacheca Dilettanti!
				</DialogDescription>
			</DialogHeader>
			<ol className="flex flex-col gap-5">
				{STEPS.map(({title, description}, index) => <li key={title} className="flex items-start gap-3">
					<span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{index + 1}</span>
					<div className="flex flex-col gap-1"><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>
				</li>)}
			</ol>
		</DialogContent>
	</Dialog>;
}
