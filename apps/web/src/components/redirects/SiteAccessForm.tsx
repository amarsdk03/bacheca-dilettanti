"use client";

import {useActionState, useState} from "react";
import {EyeIcon, EyeOffIcon} from "lucide-react";
import {type SiteAccessState, unlockSite} from "@/app/accesso/actions";
import {Button} from "@/components/ui/button";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";

const initialState: SiteAccessState = {message: ""};

export default function SiteAccessForm({nextPath, available}: {nextPath: string; available: boolean}) {
	const [state, action, pending] = useActionState(unlockSite, initialState);
	const [showPassword, setShowPassword] = useState(false);
	return (
		<form action={action} className="mt-6 text-left" aria-busy={pending}>
			<input type="hidden" name="next" value={nextPath} />
			<FieldGroup>
				<Field data-invalid={state.passwordInvalid || undefined}>
					<FieldLabel htmlFor="site-access-password">Password</FieldLabel>
					<InputGroup className="min-h-11">
						<InputGroupInput
							id="site-access-password" name="password" type={showPassword ? "text" : "password"}
							autoComplete="current-password" required maxLength={1024}
							disabled={pending || !available}
							aria-invalid={state.passwordInvalid || undefined}
							aria-describedby="site-access-message"
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								type="button" size="icon-xs" disabled={pending || !available}
								aria-label={showPassword ? "Nascondi password" : "Mostra password"}
								aria-pressed={showPassword}
								title={showPassword ? "Nascondi password" : "Mostra password"}
								onClick={() => setShowPassword(visible => !visible)}
								className="me-1"
							>
								{showPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
							</InputGroupButton>
						</InputGroupAddon>
						</InputGroup>
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
