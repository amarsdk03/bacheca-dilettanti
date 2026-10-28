import "server-only";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/features/auth/server/queries";

/** Call from layout AND every page: layouts can persist across navigations. */
export async function requireAdminPageContext() {
  const context = await getAdminContext();
  if (context.status !== "admin") redirect("/accesso");
  return context;
}
