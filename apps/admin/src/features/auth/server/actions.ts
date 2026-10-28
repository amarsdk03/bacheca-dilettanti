"use server";

import { redirect } from "next/navigation";
import type { LoginState, LogoutState } from "../contracts";
import { createAdminAuthService } from "./index";

export async function loginAction(_previous: LoginState, form: FormData): Promise<LoginState> {
  const result = await createAdminAuthService().login(form);
  if (result.status === "authenticated") redirect("/");
  return result;
}

export async function logoutAction(): Promise<LogoutState> {
  const result = await createAdminAuthService().logout();
  if (result.cleanup !== "cleared") return { status: "cleanup_failed", correlationId: result.audit.correlationId };
  if (result.revocation !== "succeeded") redirect("/accesso?uscita=parziale");
  if (result.audit.status === "unavailable") redirect("/accesso?uscita=audit");
  redirect("/accesso");
}
