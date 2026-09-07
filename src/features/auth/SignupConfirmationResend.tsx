"use client";

import {useActionState} from "react";
import {useFormStatus} from "react-dom";
import {CircleAlertIcon, MailCheckIcon} from "lucide-react";

import {Alert, AlertDescription} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {resendSignupConfirmation} from "@/features/auth/server/signup-confirmation";
import {INITIAL_AUTH_STATE} from "@/features/auth/types";
import {cn} from "@/lib/utils";

interface SignupConfirmationResendProps {
	email: string;
	className?: string;
}

function ResendButton() {
	const {pending} = useFormStatus();

	return (
		<Button type="submit" variant="outline" disabled={pending}>
			{pending ? "Invio in corso…" : "Invia di nuovo l’email"}
		</Button>
	);
}

export default function SignupConfirmationResend({
	email,
	className,
}: SignupConfirmationResendProps) {
	const [state, formAction] = useActionState(resendSignupConfirmation, INITIAL_AUTH_STATE);

	return (
		<div className={cn("flex flex-col items-center gap-3", className)}>
			{state.message && (
				<Alert
					variant={state.status === "error" ? "destructive" : "default"}
					aria-live="polite"
					className="text-left"
				>
					{state.status === "error"
						? <CircleAlertIcon aria-hidden="true" />
						: <MailCheckIcon aria-hidden="true" />}
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}
			<form action={formAction}>
				<input type="hidden" name="email" value={email} />
				<ResendButton />
			</form>
		</div>
	);
}
