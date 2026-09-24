import type {MetadataRoute} from "next";

import {getAllArticles, getArticleCover} from "@/lib/articles";
import {getSiteUrl} from "@/server/metadata";
import {loadSitemapAnnouncements, loadSitemapProfiles} from "@/server/sitemap-data";

export const revalidate = 3_600;

// Funzione helper per escapare i query parameter
function buildUrl(basePath: string, params: Record<string, string>): string {
	const searchParams = new URLSearchParams(params);
	// Sostituisce gli Ampersand '&' with '&amp;' per evitare errori di validazione XML
	return `${basePath}?${searchParams.toString().replace(/&/g, '&amp;')}`;
}

const STATIC_PAGES: Array<{
	path: string;
	changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
	priority: number;
}> = [
	{path: "/", changeFrequency: "daily", priority: 1},
	{path: "/annunci", changeFrequency: "daily", priority: 0.9},
	{path: "/profili", changeFrequency: "daily", priority: 0.9},
	{path: "/aggiornamenti", changeFrequency: "weekly", priority: 0.8},
	{path: "/pubblica-annuncio", changeFrequency: "monthly", priority: 0.8},
	{path: "/partner", changeFrequency: "monthly", priority: 0.6},
	{path: "/contatti", changeFrequency: "yearly", priority: 0.5},
	{path: "/termini-di-servizio", changeFrequency: "monthly", priority: 0.3},
	{path: "/privacy-policy", changeFrequency: "monthly", priority: 0.3},
	{path: "/cookie-policy", changeFrequency: "monthly", priority: 0.3},
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [profiles, announcements] = await Promise.all([
		loadSitemapProfiles(),
		loadSitemapAnnouncements(),
	]);
	const articles = getAllArticles();

	return [
		...STATIC_PAGES.map(({path, changeFrequency, priority}) => ({
			url: getSiteUrl(path),
			changeFrequency,
			priority,
		})),
		...articles.map((article) => ({
			url: getSiteUrl(`/aggiornamenti/${article.slug}`),
			lastModified: article.date,
			changeFrequency: "monthly" as const,
			priority: 0.7,
			images: [getSiteUrl(getArticleCover(article.coverImage))],
		})),
		...profiles.map((profile) => ({
			url: getSiteUrl(buildUrl("/dettagli-profilo", {id: profile.id, type: profile.type})),
			...(profile.updatedAt ? {lastModified: profile.updatedAt} : {}),
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
		...announcements.map((announcement) => ({
			url: getSiteUrl(buildUrl("/dettagli-annuncio", {id: announcement.id})),
			...(announcement.createdAt ? {lastModified: announcement.createdAt} : {}),
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
	];
}
