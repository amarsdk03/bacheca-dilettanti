"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExternalNavigationProvider } from "@/features/navigation/ExternalNavigation";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardThemeProvider } from "./DashboardThemeProvider";
import { DashboardThemeToggle } from "./DashboardThemeToggle";
import { DashboardPageTransition } from "./DashboardPageTransition";
import { DASHBOARD_SECTIONS, isSectionActive } from "../sections";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentSection = DASHBOARD_SECTIONS.find((section) => isSectionActive(pathname, section.href));
  return <DashboardThemeProvider><MotionConfig reducedMotion="user"><TooltipProvider><ExternalNavigationProvider><SidebarProvider mobileBreakpoint={1024}>
    <a href="#dashboard-content" className="admin-skip-link sr-only focus:not-sr-only">Salta al contenuto</a>
    <DashboardSidebar />
    <SidebarInset className="min-w-0">
      <header className="admin-header">
        <div className="flex min-w-0 items-center gap-3"><SidebarTrigger /><span className="min-w-0 text-sm font-medium">{currentSection?.title ?? "Dashboard amministrativa"}</span></div>
        <DashboardThemeToggle />
      </header>
      <DashboardPageTransition>{children}</DashboardPageTransition>
    </SidebarInset>
  </SidebarProvider></ExternalNavigationProvider></TooltipProvider></MotionConfig></DashboardThemeProvider>;
}
