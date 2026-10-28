"use client";

import { Moon, Sun } from "lucide-react";
import { useAdminAppearance } from "@/components/ui/admin-appearance";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DashboardThemeToggle() {
  const appearance = useAdminAppearance();
  if (!appearance) return null;
  const label = appearance.theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro";
  const Icon = appearance.theme === "dark" ? Sun : Moon;

  return <Tooltip>
    <TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={label} onClick={appearance.toggleTheme}>
      <Icon aria-hidden="true" />
    </Button>} />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}
