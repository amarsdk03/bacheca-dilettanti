"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Eye, EyeOff, Key } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { loginAction } from "../server/actions";
import type { LoginState } from "../contracts";
import { LogoutForm } from "./LogoutForm";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [visible, setVisible] = useState(false);
  const message = state.status === "unavailable" ? "Accesso temporaneamente non disponibile. Riprova tra poco." :
    state.status === "denied" ? "Questo account non dispone dell’accesso amministrativo." :
    "Indirizzo o password non validi, oppure accesso non consentito.";
  return (
    <><form action={action} aria-busy={pending} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.email} data-disabled={pending}>
          <FieldLabel htmlFor="admin-email">Indirizzo admin</FieldLabel>
          <Input id="admin-email" name="email" type="email" autoComplete="username" maxLength={320}
            required disabled={pending} aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={state.fieldErrors?.email ? "admin-email-error" : undefined} />
          {state.fieldErrors?.email && <FieldError id="admin-email-error">{state.fieldErrors.email}</FieldError>}
        </Field>
        <Field data-invalid={!!state.fieldErrors?.password} data-disabled={pending}>
          <FieldLabel htmlFor="admin-password">Password</FieldLabel>
          <InputGroup>
            <InputGroupInput id="admin-password" name="password" type={visible ? "text" : "password"}
              autoComplete="current-password" required maxLength={4096} disabled={pending}
              aria-invalid={!!state.fieldErrors?.password}
              aria-describedby={state.fieldErrors?.password ? "admin-password-error" : undefined} />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="button" size="icon-sm" disabled={pending} aria-controls="admin-password"
                aria-label={visible ? "Nascondi password" : "Mostra password"} aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}>
                {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {state.fieldErrors?.password && <FieldError id="admin-password-error">{state.fieldErrors.password}</FieldError>}
        </Field>
      </FieldGroup>
      {state.status !== "idle" && !state.fieldErrors && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Accesso non completato</AlertTitle>
          <AlertDescription>
            <p>{message}</p>
            {state.cleanup === "failed" && <p>Non è stato possibile rimuovere completamente la sessione locale. Riprova a uscire.</p>}
            {state.revocation === "failed" && <p>Non è stato possibile confermare la revoca remota della sessione.</p>}
            {state.correlationId && <p>Riferimento: {state.correlationId}</p>}
          </AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : <Key data-icon="inline-start" aria-hidden="true" />}
        {pending ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>{state.cleanup === "failed" && <LogoutForm />}</>
  );
}
