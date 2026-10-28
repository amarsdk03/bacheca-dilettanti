"use client";
import { ContentError } from "@/features/dashboard/components/ContentError";

export default function DashboardError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ContentError retry={retry} />;
}
