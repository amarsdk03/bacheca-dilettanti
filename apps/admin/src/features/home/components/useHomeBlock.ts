"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { HomeActivityResult, HomeSummaryResult } from "../contracts";
import { createHomeBlockController } from "../client/block-controller";
import { useHomeSession } from "./HomeSessionProvider";
export function useHomeBlock<T extends HomeSummaryResult | HomeActivityResult>(initial: T, request: (signal: AbortSignal) => Promise<T>, unavailable: () => T) {
  const session = useHomeSession();
  const [controller] = useState(() => createHomeBlockController(initial, { request, unavailable, session }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => {
    const disconnect = session.register(controller);
    if (controller.getSnapshot().result?.status === "denied") session.deny();
    return disconnect;
  }, [controller, session]);
  return { ...state, refresh: controller.refresh };
}
