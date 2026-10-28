import "server-only";
import { redirect } from "next/navigation";
import type { HomeActivityResult, HomeSummaryResult } from "../contracts";
import { HomeKpis } from "../components/HomeKpis";
import { HomeActivity } from "../components/HomeActivity";
export async function HomeKpiSection({ result }: { result: Promise<HomeSummaryResult> }) {
  const initialResult = await result;
  if (initialResult.status === "denied") redirect("/accesso");
  return <HomeKpis initialResult={initialResult} />;
}
export async function HomeActivitySection({ result }: { result: Promise<HomeActivityResult> }) {
  const initialResult = await result;
  if (initialResult.status === "denied") redirect("/accesso");
  return <HomeActivity initialResult={initialResult} />;
}
