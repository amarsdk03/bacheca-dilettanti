import type {MetadataRoute} from "next";

import {getAllArticles, getArticleCover} from "@/lib/articles";
import {getSiteUrl} from "@/server/metadata";
import {loadSitemapAnnouncements, loadSitemapProfiles} from "@/server/sitemap-data";

export const revalidate = 3_600;

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
	{path: "/visibilita", changeFrequency: "monthly", priority: 0.7},
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
			url: getSiteUrl(`/dettagli-profilo?${new URLSearchParams({id: profile.id, type: profile.type}).toString()}`),
			...(profile.updatedAt ? {lastModified: profile.updatedAt} : {}),
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
		...announcements.map((announcement) => ({
			url: getSiteUrl(`/dettagli-annuncio?${new URLSearchParams({id: announcement.id}).toString()}`),
			...(announcement.createdAt ? {lastModified: announcement.createdAt} : {}),
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
	];
}
