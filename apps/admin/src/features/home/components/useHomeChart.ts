"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createHomeChartController } from "../client/chart-controller";
import { readHomeChart } from "../client/chart-transport";
import { useHomeSession } from "./HomeSessionProvider";

export function useHomeChart() {
  const session = useHomeSession();
  const selected = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot).selected;
  const [controller] = useState(() => createHomeChartController(session, readHomeChart));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => {
    controller.sync();
    const unsubscribe = session.subscribe(controller.sync), unregister = session.register(controller);
    controller.start();
    return () => { unsubscribe(); unregister(); };
  }, [controller, session]);
  return { selected, pending: state.metric !== selected || state.pending, result: state.metric === selected ? state.result : null, refresh: controller.refresh };
}
