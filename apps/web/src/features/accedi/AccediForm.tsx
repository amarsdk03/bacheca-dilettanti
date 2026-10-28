"use client";

import {useActionState, useState} from "react";
import {useFormStatus} from "react-dom";
import Link from "next/link";
import {CircleAlertIcon, EyeIcon, EyeOffIcon} from "lucide-react";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import SignupConfirmationResend from "@/features/auth/SignupConfirmationResend";
import {signInWithPassword} from "@/features/auth/server/actions";
import {INITIAL_AUTH_STATE} from "@/features/auth/types";
import {cn} from "@/lib/utils";

interface AccediFormProps extends Omit<React.ComponentProps<"form">, "action"> {
	nextPath: string;
	invalidConfirmationLink?: boolean;
}

function SubmitButton() {
	const {pending} = useFormStatus();

	return (
		<Button type="submit" size="lg" disabled={pending} aria-busy={pending} className="w-full">
			{pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
			{pending ? "Accesso in corso…" : "Accedi"}
		</Button>
	);
}

export default function AccediForm({
	nextPath,
	invalidConfirmationLink = false,
	className,
	...props
}: AccediFormProps) {
	const [state, formAction] = useActionState(signInWithPassword, INITIAL_AUTH_STATE);
	const [showPassword, setShowPassword] = useState(false);

	return (
		<div className="flex flex-col gap-6">
			<form {...props} action={formAction} className={cn("flex flex-col gap-6", className)}>
				<input type="hidden" name="next" value={nextPath} />
				<FieldGroup>
					<div className="flex flex-col items-center gap-1 text-center">
						<h1 className="text-2xl font-bold">Bentornato</h1>
						<p className="text-sm text-balance text-muted-foreground">
							Inserisci la tua email e la tua password per continuare.
						</p>
					</div>

					{invalidConfirmationLink && (
						<Alert variant="destructive">
							<CircleAlertIcon aria-hidden="true" />
							<AlertTitle>Verifica email non riuscita</AlertTitle>
							<AlertDescription>
								Il link di verifica non è valido, è scaduto oppure è già stato utilizzato.
								 Se hai già verificato l’email, prova ad accedere.
							</AlertDescription>
						</Alert>
					)}

					<Field data-invalid={Boolean(state.fieldErrors?.email)}>
						<FieldLabel htmlFor="login-email">Email</FieldLabel>
						<Input
							id="login-email"
							name="email"
							type="email"
							maxLength={254}
							placeholder="nome@esempio.it"
							autoComplete="email"
							aria-invalid={Boolean(state.fieldErrors?.email)}
							required
						/>
						<FieldError>{state.fieldErrors?.email}</FieldError>
					</Field>

					<Field data-invalid={Boolean(state.fieldErrors?.password)}>
						<div className="flex items-center">
							<FieldLabel htmlFor="login-password">Password</FieldLabel>
							<Link href="/password-dimenticata" className="ml-auto text-sm underline-offset-4 hover:underline">
								Password dimenticata?
							</Link>
						</div>
						<InputGroup>
							<InputGroupInput
								id="login-password"
								name="password"
								type={showPassword ? "text" : "password"}
								maxLength={128}
								autoComplete="current-password"
								aria-invalid={Boolean(state.fieldErrors?.password)}
								required
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									type="button"
									size="icon-xs"
									aria-label={showPassword ? "Nascondi password" : "Mostra password"}
									aria-pressed={showPassword}
									title={showPassword ? "Nascondi password" : "Mostra password"}
									onClick={() => setShowPassword((visible) => !visible)}
								>
									{showPassword
										? <EyeOffIcon aria-hidden="true" />
										: <EyeIcon aria-hidden="true" />}
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						<FieldError>{state.fieldErrors?.password}</FieldError>
					</Field>

					{state.message && (
						<Alert variant="destructive" aria-live="polite">
							<CircleAlertIcon aria-hidden="true" />
							<AlertTitle>Accesso non riuscito</AlertTitle>
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}

					<Field className="mt-2">
						<SubmitButton />
						<FieldDescription className="pt-2 text-center">
							Non hai un account? <Link href={`/registrati?next=${encodeURIComponent(nextPath)}`}>Registrati</Link>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>

			{state.reason === "email_not_confirmed" && state.email && (
				<SignupConfirmationResend email={state.email} />
			)}
		</div>
	);
}
