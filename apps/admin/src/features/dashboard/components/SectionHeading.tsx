import type {ReactNode} from "react";
import type {DashboardSection} from "../sections";

export function SectionHeading({ section, actions }: { section: DashboardSection; actions?: ReactNode }) {
  const title = <h1 className="admin-section-heading">
    {section.slug ? section.title : "Panoramica della bacheca"}
  </h1>;
  return actions ? <header className="admin-page-heading">{title}<div className="admin-page-heading-actions">{actions}</div></header> : title;
}
