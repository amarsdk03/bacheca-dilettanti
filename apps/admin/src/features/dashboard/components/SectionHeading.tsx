import type { DashboardSection } from "../sections";

export function SectionHeading({ section }: { section: DashboardSection }) {
  const Icon = section.icon;
  return <h1 className="admin-section-heading">
    {section.slug && <Icon className="size-7 shrink-0" aria-hidden="true" />}
    {section.slug ? section.title : "Bentornato, admin!"}
  </h1>;
}
