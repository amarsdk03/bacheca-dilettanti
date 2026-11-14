import {CircleDollarSign, ClipboardCheck, Megaphone, Users} from "lucide-react";
import type {HomeMetric} from "./contracts";

export const HOME_CARDS = [
  { metric: "users", title: "Utenti totali", description: "Account con registrazione completa", icon: Users },
  { metric: "announcements", title: "Annunci totali", description: "Tutti gli annunci, inclusi quelli nascosti", icon: Megaphone },
  { metric: "pending", title: "Annunci da approvare", description: "Annunci in attesa di revisione", icon: ClipboardCheck },
  { metric: "profits", title: "Profitti totali", description: "Presto in arrivo", icon: CircleDollarSign },
] as const satisfies readonly { metric: HomeMetric; title: string; description: string; icon: typeof Users }[];
export const homeCount = (value: number) => new Intl.NumberFormat("it-IT", { useGrouping: "always" }).format(value);
