"use client";

import {CopyIcon, HandshakeIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogDismissButton,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {toast} from "@/components/ui/toast";

interface InviteFriendDialogProps {
	code: string;
	confirmedCount: number;
}

export default function InviteFriendDialog({code, confirmedCount}: InviteFriendDialogProps) {
	async function copy(value: string, label: string) {
		try {
			await navigator.clipboard.writeText(value);
			toast.add({title: `${label} copiato`, type: "success"});
		} catch {
			toast.add({title: "Copia non riuscita", description: "Riprova o copia il codice manualmente.", type: "error"});
		}
	}

	function invitationMessage() {
		const link = new URL("/registrati", window.location.origin);
		link.searchParams.set("codice-invito", code);
		return `Ciao! Ti invito a iscriverti a Bacheca Dilettanti: usa il mio codice ${code}.\n${link.toString()}`;
	}

	return (
		<Dialog>
			<DialogTrigger render={<Button type="button" variant="brand" className="min-h-11 px-5" />}>
				<HandshakeIcon data-icon="inline-start" aria-hidden="true" />
				Invita amico
			</DialogTrigger>
			<DialogContent>
				<DialogDismissButton />
				<DialogHeader>
					<DialogTitle>Invita un amico</DialogTitle>
					<DialogDescription>
						Condividi il tuo codice. L’invito sarà conteggiato quando il tuo amico completerà la registrazione e verificherà la sua email.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<span className="text-sm text-muted-foreground">Il tuo codice:</span>
						<div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
							<code className="min-w-0 flex-1 select-all break-all text-center text-lg font-semibold tracking-wider">{code}</code>
							<Button
								type="button"
								variant="outline"
								size="icon"
								aria-label="Copia codice"
								title="Copia codice"
								onClick={() => copy(code, "Codice")}
							>
								<CopyIcon aria-hidden="true" />
							</Button>
						</div>
						<span className="text-sm text-muted-foreground mt-1">Utenti invitati: <strong className="text-foreground">{confirmedCount}</strong></span>
					</div>
					<div className="flex justify-end items-center">
						<Button
							type="button"
							onClick={() => copy(invitationMessage(), "Messaggio")}
							className={"w-full md:w-1/2 py-4"}
						>
							<CopyIcon data-icon="inline-start" aria-hidden="true" /> Copia messaggio d&apos;invito
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
