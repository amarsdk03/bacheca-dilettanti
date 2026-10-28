"use client";

import {useActionState} from "react";
import {unlockSite, type SiteAccessState} from "@/app/accesso/actions";
import {Button} from "@/components/ui/button";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";

const initialState: SiteAccessState = {message: ""};

export default function SiteAccessForm({nextPath, available}: {nextPath: string; available: boolean}) {
	const [state, action, pending] = useActionState(unlockSite, initialState);
	return (
		<form action={action} className="mt-6 text-left" aria-busy={pending}>
			<input type="hidden" name="next" value={nextPath} />
			<FieldGroup>
				<Field data-invalid={state.passwordInvalid || undefined}>
					<FieldLabel htmlFor="site-access-password">Password</FieldLabel>
					<Input
						id="site-access-password" name="password" type="password"
						autoComplete="current-password" required maxLength={1024}
						disabled={pending || !available} className="min-h-11"
						aria-invalid={state.passwordInvalid || undefined}
						aria-describedby="site-access-message"
					/>
					<div id="site-access-message" aria-live="polite" aria-atomic="true">
						{!available ? <FieldError>Accesso temporaneamente non disponibile. Riprova più tardi.</FieldError>
							: state.message ? <FieldError>{state.message}</FieldError> : null}
					</div>
				</Field>
				<Button type="submit" variant="brand" className="min-h-11 w-full" disabled={pending || !available}>
					{pending ? "Verifica in corso…" : "Accedi al sito"}
				</Button>
			</FieldGroup>
		</form>
	);
}
