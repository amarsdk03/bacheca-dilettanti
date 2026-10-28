import type { SessionCleanupResult } from "../audit/contracts";

export type LoginState = {
  status: "idle" | "invalid" | "denied" | "unavailable";
  fieldErrors?: { email?: string; password?: string };
  correlationId?: string;
} & Partial<SessionCleanupResult>;
export type LogoutState = { status: "idle" | "cleanup_failed"; correlationId?: string };

export function readLoginCredentials(form: FormData) {
  const rawEmail = form.get("email"), rawPassword = form.get("password");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const fieldErrors: NonNullable<LoginState["fieldErrors"]> = {};
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Inserisci un indirizzo email valido.";
  if (!password || password.length > 4096) fieldErrors.password = "Inserisci una password valida.";
  if (Object.keys(fieldErrors).length) return { valid: false as const, fieldErrors };
  return { valid: true as const, email, password };
}
