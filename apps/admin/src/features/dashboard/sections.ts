import {
  House, Megaphone, Flag, Users, Contact, Ticket, CreditCard, BadgePercent,
  Send, ChartNoAxesCombined, ClipboardList, Plug, History, type LucideIcon,
} from "lucide-react";

type Section = { slug: string; href: string; title: string; icon: LucideIcon; group: string | null };
/** Public UI metadata only. This catalog never grants authorization. */
export const DASHBOARD_SECTIONS = [
  { slug: "", href: "/", title: "Home", icon: House, group: null },
  { slug: "annunci", href: "/annunci", title: "Annunci", icon: Megaphone, group: "Contenuti" },
  { slug: "segnalazioni", href: "/segnalazioni", title: "Segnalazioni", icon: Flag, group: "Contenuti" },
  { slug: "utenti", href: "/utenti", title: "Utenti", icon: Users, group: "Community" },
  { slug: "profili", href: "/profili", title: "Profili", icon: Contact, group: "Community" },
  { slug: "codici-invito", href: "/codici-invito", title: "Codici invito", icon: Ticket, group: "Community" },
  { slug: "pagamenti", href: "/pagamenti", title: "Pagamenti", icon: CreditCard, group: "Gestione" },
  { slug: "promo-e-crediti", href: "/promo-e-crediti", title: "Promo e crediti", icon: BadgePercent, group: "Gestione" },
  { slug: "distribuzione", href: "/distribuzione", title: "Distribuzione", icon: Send, group: "Gestione" },
  { slug: "statistiche", href: "/statistiche", title: "Statistiche", icon: ChartNoAxesCombined, group: "Analitiche" },
  { slug: "registro-attivita", href: "/registro-attivita", title: "Registro attività", icon: ClipboardList, group: "Analitiche" },
  { slug: "integrazioni", href: "/integrazioni", title: "Integrazioni", icon: Plug, group: "Analitiche" },
  { slug: "versioni-sito-web", href: "/versioni-sito-web", title: "Versioni sito web", icon: History, group: "Analitiche" },
] as const satisfies readonly Section[];

export type DashboardSection = typeof DASHBOARD_SECTIONS[number];
export const DASHBOARD_GROUPS = [null, "Contenuti", "Community", "Gestione", "Analitiche"] as const;
export function findDashboardSection(slug: string) { return DASHBOARD_SECTIONS.find((section) => section.slug === slug); }
export function isSectionActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}
