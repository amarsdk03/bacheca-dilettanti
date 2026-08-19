"use client";

import {useActionState} from "react";
import {useFormStatus} from "react-dom";
import Image from "next/image";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";
import {requestPasswordReset} from "@/features/auth/actions";
import {INITIAL_AUTH_STATE} from "@/features/auth/types";

function SubmitButton() {
	const {pending} = useFormStatus();
	return <Button type="submit" disabled={pending} className="w-full">{pending ? "Invio in corso…" : "Invia il link"}</Button>;
}

export default function PasswordDimenticata({invalidLink = false}: {invalidLink?: boolean}) {
	const [state, formAction] = useActionState(requestPasswordReset, INITIAL_AUTH_STATE);

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Link href="/" className="flex justify-center">
					<Image src={DEFAULT_LOGO_TRANSPARENT_PATH} alt="Bacheca Dilettanti" width={150} height={90} priority />
				</Link>
				<Card>
					<CardHeader className="text-center">
						<CardTitle className="text-xl">Recupera la password</CardTitle>
						<CardDescription>Riceverai un link sicuro per scegliere una nuova password.</CardDescription>
					</CardHeader>
					<CardContent>
						{invalidLink && (
							<p role="alert" className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
								Il link non è valido oppure è scaduto. Richiedine uno nuovo.
							</p>
						)}
						<form action={formAction}>
							<FieldGroup>
								<Field data-invalid={Boolean(state.fieldErrors?.email)}>
									<FieldLabel htmlFor="reset-email">Email</FieldLabel>
									<Input id="reset-email" name="email" type="email" maxLength={254} placeholder="nome@esempio.it" autoComplete="email" required aria-invalid={Boolean(state.fieldErrors?.email)} />
									<FieldError>{state.fieldErrors?.email}</FieldError>
								</Field>
								{state.message && (
									<p role="status" aria-live="polite" className={state.status === "success" ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
										{state.message}
									</p>
								)}
								<SubmitButton />
								<FieldDescription className="text-center"><Link href="/accedi">Torna all&apos;accesso</Link></FieldDescription>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
