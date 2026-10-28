"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createHomeSession, type HomeSession } from "../client/session";
const Context = createContext<HomeSession | null>(null);
export function useHomeSession() {
  const session = useContext(Context);
  if (!session) throw new Error("HOME_SESSION_PROVIDER_REQUIRED");
  return session;
}
export function HomeSessionProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => createHomeSession(() => window.location.replace("/accesso")));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
  useEffect(() => {
    const resume = (event: PageTransitionEvent) => { if (event.persisted) session.resume(); };
    window.addEventListener("pageshow", resume);
    return () => window.removeEventListener("pageshow", resume);
  }, [session]);
  return state.denied ? null : <Context.Provider value={session}>{children}</Context.Provider>;
}
