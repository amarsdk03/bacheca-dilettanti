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
import {updatePassword} from "@/features/auth/actions";
import {INITIAL_AUTH_STATE} from "@/features/auth/types";

function SubmitButton() {
	const {pending} = useFormStatus();
	return <Button type="submit" disabled={pending} className="w-full">{pending ? "Aggiornamento in corso…" : "Aggiorna password"}</Button>;
}

export default function ReimpostaPassword() {
	const [state, formAction] = useActionState(updatePassword, INITIAL_AUTH_STATE);

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Link href="/" className="flex justify-center">
					<Image src={DEFAULT_LOGO_TRANSPARENT_PATH} alt="Bacheca Dilettanti" width={150} height={90} priority />
				</Link>
				<Card>
					<CardHeader className="text-center">
						<CardTitle className="text-xl">Scegli una nuova password</CardTitle>
						<CardDescription>Usa almeno 8 caratteri e non riutilizzare una password già compromessa.</CardDescription>
					</CardHeader>
					<CardContent>
						<form action={formAction}>
							<FieldGroup>
								<Field data-invalid={Boolean(state.fieldErrors?.password)}>
									<FieldLabel htmlFor="new-password">Nuova password</FieldLabel>
									<Input id="new-password" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required aria-invalid={Boolean(state.fieldErrors?.password)} />
									<FieldError>{state.fieldErrors?.password}</FieldError>
								</Field>
								<Field data-invalid={Boolean(state.fieldErrors?.confirmPassword)}>
									<FieldLabel htmlFor="confirm-new-password">Conferma nuova password</FieldLabel>
									<Input id="confirm-new-password" name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required aria-invalid={Boolean(state.fieldErrors?.confirmPassword)} />
									<FieldError>{state.fieldErrors?.confirmPassword}</FieldError>
								</Field>
								{state.message && <p role="alert" aria-live="polite" className="text-sm text-destructive">{state.message}</p>}
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
