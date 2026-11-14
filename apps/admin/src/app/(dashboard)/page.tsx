import {Suspense} from "react";
import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {getAdminHomeActivity, getAdminHomeSummary} from "@/features/home/server/queries";
import {HomeActivitySection, HomeKpiSection} from "@/features/home/server/blocks";
import {HomeSessionProvider} from "@/features/home/components/HomeSessionProvider";
import {HomeActivitySkeleton, HomeKpiSkeleton} from "@/features/home/components/HomeSkeletons";
import {HomeQuickActions} from "@/features/home/components/HomeQuickActions";
import {HomeChartPanel} from "@/features/home/components/HomeChartPanel";

export default async function AdminPage() {
  await requireAdminPageContext();
  // Start both reads after the guard, then stream each result independently.
  const summary = getAdminHomeSummary(), activity = getAdminHomeActivity();
  return (
    <HomeSessionProvider><section className="admin-home">
      <HomeChartPanel>
        <Suspense fallback={<HomeKpiSkeleton />}><HomeKpiSection result={summary} /></Suspense>
      </HomeChartPanel>
      <HomeQuickActions />
      <Suspense fallback={<HomeActivitySkeleton />}><HomeActivitySection result={activity} /></Suspense>
    </section></HomeSessionProvider>
  );
}
