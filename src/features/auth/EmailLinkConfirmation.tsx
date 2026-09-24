"use client";

import {useActionState} from "react";
import {useFormStatus} from "react-dom";
import Image from "next/image";
import Link from "next/link";

import {Alert, AlertDescription} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Spinner} from "@/components/ui/spinner";
import {DEFAULT_LOGO_PATH} from "@/const/defaultConstants";
import {INITIAL_EMAIL_LINK_STATE, type EmailLinkCredential} from "@/features/auth/email-link";
import {completePasswordRecovery, completeSignupConfirmation} from "@/features/auth/server/email-link-actions";

type EmailLinkKind = "recovery" | "signup";

function SubmitButton({kind}: {kind: EmailLinkKind}) {
	const {pending} = useFormStatus();
	return (
		<Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
			{pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
			{pending ? "Verifica in corso…" : kind === "recovery" ? "Continua al cambio password" : "Conferma indirizzo email"}
		</Button>
	);
}

export default function EmailLinkConfirmation({kind, credential}: {kind: EmailLinkKind; credential: EmailLinkCredential | null}) {
	const [state, formAction] = useActionState(
		kind === "recovery" ? completePasswordRecovery : completeSignupConfirmation,
		INITIAL_EMAIL_LINK_STATE,
	);
	const recovery = kind === "recovery";

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Link href="/" className="flex justify-center">
					<Image src={DEFAULT_LOGO_PATH} alt="Bacheca Dilettanti" width={150} height={90} priority />
				</Link>
				<Card>
					<CardHeader className="text-center">
						<CardTitle><h1 className="text-xl">{recovery ? "Reimposta la password" : "Conferma la tua email"}</h1></CardTitle>
						<CardDescription>
							{recovery
								? "Continua per aprire la pagina in cui scegliere una nuova password."
								: "Continua per verificare il tuo indirizzo e completare la registrazione."}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{!credential ? (
							<Alert variant="destructive"><AlertDescription>Il link non è valido oppure è scaduto. Richiedine uno nuovo.</AlertDescription></Alert>
						) : (
							<form action={formAction} className="flex flex-col gap-4">
								<input type="hidden" name={credential.kind} value={credential.value} />
								{state.status === "error" && <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert>}
								<SubmitButton kind={kind} />
							</form>
						)}
						<Link href={recovery ? "/password-dimenticata" : "/accedi"} className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
							{recovery ? "Richiedi un nuovo link" : "Torna all’accesso"}
						</Link>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
