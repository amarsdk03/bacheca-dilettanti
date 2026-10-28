"use client";

import { useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAnimate, useReducedMotion } from "motion/react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const getServerReducedMotion = () => null;

export function DashboardPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const initialReducedMotion = useReducedMotion();
  const liveReducedMotion = useSyncExternalStore<boolean | null>(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);
  const reducedMotion = liveReducedMotion ?? initialReducedMotion ?? true;

  useLayoutEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    const element = scope.current;
    if (!element) return;
    element.style.opacity = "1";
    if (!changed || reducedMotion) return;
    const controls = animate(element, { opacity: [0, 1] }, { duration: 0.16, ease: [0.2, 0, 0, 1] });
    return () => {
      controls.stop();
      element.style.opacity = "1";
    };
  }, [animate, pathname, reducedMotion, scope]);

  return <div ref={scope} id="dashboard-content" tabIndex={-1} className="admin-content">{children}</div>;
}
