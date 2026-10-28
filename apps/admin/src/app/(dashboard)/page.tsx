import { Suspense } from "react";
import { requireAdminPageContext } from "@/features/dashboard/server/guard";
import { SectionHeading } from "@/features/dashboard/components/SectionHeading";
import { DASHBOARD_SECTIONS } from "@/features/dashboard/sections";
import { getAdminHomeSummary, getAdminHomeActivity } from "@/features/home/server/queries";
import { HomeKpiSection, HomeActivitySection } from "@/features/home/server/blocks";
import { HomeSessionProvider } from "@/features/home/components/HomeSessionProvider";
import { HomeKpiSkeleton, HomeActivitySkeleton } from "@/features/home/components/HomeSkeletons";
import { HomeQuickActions } from "@/features/home/components/HomeQuickActions";
import { HomeChartPanel } from "@/features/home/components/HomeChartPanel";

export default async function AdminPage() {
  await requireAdminPageContext();
  // Start both reads after the guard, then stream each result independently.
  const summary = getAdminHomeSummary(), activity = getAdminHomeActivity();
  return (
    <HomeSessionProvider><section className="admin-home">
      <SectionHeading section={DASHBOARD_SECTIONS[0]} />
      <Suspense fallback={<HomeKpiSkeleton />}><HomeKpiSection result={summary} /></Suspense>
      <HomeQuickActions />
      <HomeChartPanel />
      <Suspense fallback={<HomeActivitySkeleton />}><HomeActivitySection result={activity} /></Suspense>
    </section></HomeSessionProvider>
  );
}
