import type { ReactNode } from "react";
import { requireAdminPageContext } from "@/features/dashboard/server/guard";
import { DashboardShell } from "@/features/dashboard/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAdminPageContext();
  return <DashboardShell>{children}</DashboardShell>;
}
