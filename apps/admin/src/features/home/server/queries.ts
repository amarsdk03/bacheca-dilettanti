import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { createHomeQueries } from "./service";
const queries = () => createHomeQueries({ getClient: createReadClient, log: (code, correlationId) => console.error("[admin-home]", { code, correlationId }) });
export const getAdminHomeSummary = () => queries().summary();
export const getAdminHomeChart = (metric: unknown) => queries().chart(metric);
export const getAdminHomeActivity = () => queries().activity();
