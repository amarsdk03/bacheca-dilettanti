"use client";
import {useEffect, useLayoutEffect, useRef} from "react";
import {useSidebar} from "@/components/ui/sidebar";

/** Animate the finished layout with transforms, without resizing the page on every frame. */
export function SidebarAnimator() {
  const {state, isMobile} = useSidebar();
  const previous = useRef<{state: string; width: number} | null>(null);
  const animations = useRef<Animation[]>([]);
  useEffect(() => () => { animations.current.forEach(animation => animation.cancel()); }, []);
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-admin-scope="dashboard"]');
    const sidebar = root?.querySelector<HTMLElement>('[data-slot="sidebar-container"]');
    const inset = root?.querySelector<HTMLElement>('[data-slot="sidebar-inset"]');
    if (isMobile || !sidebar || !inset) { animations.current.forEach(animation => animation.cancel()); animations.current = []; previous.current = null; return; }
    const width = sidebar.getBoundingClientRect().width;
    const before = previous.current;
    previous.current = {state, width};
    if (!before || before.state === state || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const transform = getComputedStyle(inset).transform;
    const currentTranslation = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
    animations.current.forEach(animation => animation.cancel());
    const delta = before.width - width + currentTranslation;
    animations.current = [
      inset.animate([{transform: `translateX(${delta}px)`}, {transform: "translateX(0)"}], {duration: 200, easing: "ease-out"}),
      sidebar.animate([{opacity: 0.7}, {opacity: 1}], {duration: 160, easing: "ease-out"}),
    ];
  }, [state, isMobile]);
  return null;
}
