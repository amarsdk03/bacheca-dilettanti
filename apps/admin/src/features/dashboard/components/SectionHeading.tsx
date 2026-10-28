import type { DashboardSection } from "../sections";

export function SectionHeading({ section }: { section: DashboardSection }) {
  const Icon = section.icon;
  return <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
    {section.slug && <Icon className="size-7 shrink-0" aria-hidden="true" />}
    {section.slug ? section.title : "Bentornato, admin!"}
  </h1>;
}
