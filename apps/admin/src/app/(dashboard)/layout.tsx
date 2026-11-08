import type {ReactNode} from "react";
import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {DashboardShell} from "@/features/dashboard/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const context = await requireAdminPageContext();
  return <DashboardShell actorId={context.authId!}>{children}</DashboardShell>;
}
