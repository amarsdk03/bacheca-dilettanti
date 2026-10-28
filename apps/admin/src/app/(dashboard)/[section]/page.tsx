import { notFound } from "next/navigation";
import { requireAdminPageContext } from "@/features/dashboard/server/guard";
import { findDashboardSection } from "@/features/dashboard/sections";
import { SectionHeading } from "@/features/dashboard/components/SectionHeading";
import { ComingSoon } from "@/features/dashboard/components/ContentStates";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireAdminPageContext();
  const section = findDashboardSection((await params).section);
  if (!section || !section.slug) notFound();
  return <section className="flex min-w-0 flex-col gap-8"><SectionHeading section={section} /><ComingSoon /></section>;
}
