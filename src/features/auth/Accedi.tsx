"use client";

import {useActionState, useState} from "react";
import {useFormStatus} from "react-dom";
import Link from "next/link";
import {EyeIcon, EyeOffIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import GradientBackground from "@/components/styling/GradientBackground";
import {signInWithPassword} from "@/features/auth/actions";
import {INITIAL_AUTH_STATE} from "@/features/auth/types";

interface AccediProps {
	nextPath: string;
}

function SubmitButton() {
	const {pending} = useFormStatus();
	return (
		<Button type="submit" size="lg" disabled={pending} className="w-full">
			{pending ? "Accesso in corso…" : "Accedi"}
		</Button>
	);
}

export default function Accedi({nextPath}: AccediProps) {
	const [state, formAction] = useActionState(signInWithPassword, INITIAL_AUTH_STATE);
	const [showPassword, setShowPassword] = useState(false);

	return (
		<GradientBackground className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-6 py-10 md:px-10">
			<div className="relative flex w-full max-w-sm flex-col gap-2">
				<Card className="bg-card/95 shadow-xl backdrop-blur-sm">
					<CardHeader className="text-center">
						<CardTitle className="text-xl">Bentornato</CardTitle>
						<CardDescription>Inserisci la tua email e la password per continuare.</CardDescription>
					</CardHeader>
					<CardContent>
						<form action={formAction}>
							<input type="hidden" name="next" value={nextPath} />
							<FieldGroup>
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
												{showPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
											</InputGroupButton>
										</InputGroupAddon>
									</InputGroup>
									<FieldError>{state.fieldErrors?.password}</FieldError>
								</Field>
								{state.message && (
									<p role="alert" aria-live="polite" className="text-sm text-destructive">
										{state.message}
									</p>
								)}
								<Field className="mt-2">
									<SubmitButton />
									<FieldDescription className="text-center pt-2">
										Non hai un account? <Link href={`/registrati?next=${encodeURIComponent(nextPath)}`}>Registrati</Link>
									</FieldDescription>
								</Field>
							</FieldGroup>
						</form>
					</CardContent>
				</Card>
			</div>
		</GradientBackground>
	);
}
