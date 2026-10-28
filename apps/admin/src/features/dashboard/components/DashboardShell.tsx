"use client";

import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExternalNavigationProvider } from "@/features/navigation/ExternalNavigation";
import { DashboardSidebar } from "./DashboardSidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return <TooltipProvider><ExternalNavigationProvider><SidebarProvider>
    <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:p-3 focus:ring-2 focus:ring-ring">Salta al contenuto</a>
    <DashboardSidebar />
    <SidebarInset className="min-w-0">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <SidebarTrigger /><span className="text-sm text-muted-foreground">Dashboard amministrativa</span>
      </header>
      <div id="dashboard-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-8 p-4 outline-none sm:p-6 lg:p-8">{children}</div>
    </SidebarInset>
  </SidebarProvider></ExternalNavigationProvider></TooltipProvider>;
}
