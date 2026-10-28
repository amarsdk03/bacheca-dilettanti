"use client";

import {type ReactNode, useEffect, useRef} from "react";
import {cn} from "@/lib/utils";

function revealTab(viewport: HTMLDivElement, tab: HTMLElement) {
	const viewportBounds = viewport.getBoundingClientRect();
	const tabBounds = tab.getBoundingClientRect();
	const inset = 6;

	// Scroll only the tab strip, without moving the page vertically.
	if (tabBounds.left < viewportBounds.left + inset) {
		viewport.scrollLeft += tabBounds.left - viewportBounds.left - inset;
	} else if (tabBounds.right > viewportBounds.right - inset) {
		viewport.scrollLeft += tabBounds.right - viewportBounds.right + inset;
	}
}

export default function ProfileSectionNavigation({activeValue, children, className}: {activeValue: string; children: ReactNode; className?: string}) {
	const viewportRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const revealActiveTab = () => {
			const tab = viewport.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
			if (tab) revealTab(viewport, tab);
		};
		revealActiveTab();
		const observer = new ResizeObserver(revealActiveTab);
		observer.observe(viewport);
		return () => observer.disconnect();
	}, [activeValue]);

	return <div ref={viewportRef} className={cn("profile-section-navigation min-w-0 overflow-x-auto", className)} onFocusCapture={(event) => {
		const tab = event.target.closest<HTMLElement>('[role="tab"]');
		if (tab) revealTab(event.currentTarget, tab);
	}}>{children}</div>;
}
