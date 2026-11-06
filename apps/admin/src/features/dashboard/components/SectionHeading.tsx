import type {DashboardSection} from "../sections";

export function SectionHeading({ section }: { section: DashboardSection }) {
  return <h1 className="admin-section-heading">
    {section.slug ? section.title : "Panoramica della bacheca"}
  </h1>;
}
