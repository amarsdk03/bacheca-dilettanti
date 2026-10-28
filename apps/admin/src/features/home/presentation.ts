import { Users, Megaphone, ClipboardCheck, CircleDollarSign } from "lucide-react";
import type { HomeMetric } from "./contracts";
export const HOME_CARDS = [
  { metric: "users", title: "Utenti totali", description: "Account Utente con registrazione completata.", icon: Users },
  { metric: "announcements", title: "Annunci totali", description: "Tutti gli stati, escluso il cestino.", icon: Megaphone },
  { metric: "pending", title: "Annunci da approvare", description: "In revisione, escluso il cestino.", icon: ClipboardCheck },
  { metric: "profits", title: "Profitti totali", description: "Dati economici non disponibili.", icon: CircleDollarSign },
] as const satisfies readonly { metric: HomeMetric; title: string; description: string; icon: typeof Users }[];
export const homeCount = (value: number) => new Intl.NumberFormat("it-IT", { useGrouping: "always" }).format(value);
