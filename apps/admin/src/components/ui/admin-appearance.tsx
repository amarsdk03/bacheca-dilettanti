"use client";

import { createContext, useContext } from "react";

export type DashboardTheme = "dark" | "light";

export interface AdminAppearance {
  theme: DashboardTheme;
  toggleTheme: () => void;
  portalContainer: HTMLElement | null;
}

export const AdminAppearanceContext = createContext<AdminAppearance | undefined>(undefined);

export function useAdminAppearance() {
  return useContext(AdminAppearanceContext);
}
