"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminAppearanceContext, type DashboardTheme } from "@/components/ui/admin-appearance";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bd-admin-theme";

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DashboardTheme>("dark");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLElement | null>(null);
  const colorFrame = useRef<number | null>(null);

  const applyTheme = useCallback((nextTheme: DashboardTheme) => {
    if (colorFrame.current !== null) cancelAnimationFrame(colorFrame.current);
    const roots = [shellRef.current, portalRef.current];
    for (const root of roots) {
      if (!root) continue;
      root.setAttribute("data-admin-theme-changing", "");
      root.dataset.adminTheme = nextTheme;
      root.classList.toggle("dark", nextTheme === "dark");
    }
    setTheme(nextTheme);
    colorFrame.current = requestAnimationFrame(() => {
      colorFrame.current = requestAnimationFrame(() => {
        for (const root of roots) root?.removeAttribute("data-admin-theme-changing");
        colorFrame.current = null;
      });
    });
  }, []);

  useLayoutEffect(() => {
    const host = document.createElement("div");
    host.id = "bd-admin-portal-root";
    host.dataset.adminScope = "portal";
    portalRef.current = host;
    document.body.appendChild(host);

    let savedTheme: DashboardTheme = "dark";
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") savedTheme = saved;
    } catch {
      savedTheme = "dark";
    }
    applyTheme(savedTheme);
    setPortalContainer(host);

    return () => {
      if (colorFrame.current !== null) cancelAnimationFrame(colorFrame.current);
      colorFrame.current = null;
      portalRef.current = null;
      host.remove();
    };
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      return;
    }
  }, [applyTheme, theme]);

  const appearance = useMemo(() => ({ theme, toggleTheme, portalContainer }), [theme, toggleTheme, portalContainer]);

  return <AdminAppearanceContext.Provider value={appearance}>
    <div ref={shellRef} data-admin-scope="dashboard" data-admin-theme={theme}
      className={cn("admin-dashboard", theme === "dark" && "dark")}>
      {children}
    </div>
  </AdminAppearanceContext.Provider>;
}
