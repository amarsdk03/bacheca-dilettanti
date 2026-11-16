"use client";

import {useEffect, useState} from "react";
import type {ProfileDashboardSection} from "./types";

function isDashboardSection(value: string | null): value is ProfileDashboardSection {
	return value === "profilo" || value === "annunci" || value === "salvati"
		|| value === "relazioni" || value === "impostazioni" || value === "info";
}

export function useProfileDashboardSection(initialSection: ProfileDashboardSection) {
	const [section, setSection] = useState(initialSection);

	useEffect(() => {
		const restoreSection = () => {
			const params = new URLSearchParams(window.location.search);
			const value = params.get("sezione");
			setSection(params.get("password") === "aggiornata" ? "impostazioni" : isDashboardSection(value) ? value : "profilo");
		};
		window.addEventListener("popstate", restoreSection);
		return () => window.removeEventListener("popstate", restoreSection);
	}, []);

	function changeSection(value: string | null) {
		if (!isDashboardSection(value) || value === section) return;
		const url = new URL(window.location.href);
		url.searchParams.set("sezione", value);
		if (url.searchParams.get("password") === "aggiornata") url.searchParams.delete("password");
		window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
		setSection(value);
	}

	return [section, changeSection] as const;
}
