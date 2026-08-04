import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const articlesDirectory = path.join(process.cwd(), "public", "aggiornamenti");
const fallbackCoverImage = "/backgrounds/homepage-hero2.jpg";

export interface ArticleMetadata {
	title: string;
	slug: string;
	description: string;
	date: string;
	author: string;
	category: string;
	tags: string[];
	coverImage: string;
	readingTime?: string;
}

export interface Article extends ArticleMetadata {
	content: string;
}

function assertString(value: unknown, field: string, filename: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`Campo front matter "${field}" mancante in ${filename}`);
	}

	return value;
}

function readArticle(filename: string): Article {
	const source = fs.readFileSync(path.join(articlesDirectory, filename), "utf8");
	const {data, content} = matter(source);

	return {
		title: assertString(data.title, "title", filename),
		slug: assertString(data.slug, "slug", filename),
		description: assertString(data.description, "description", filename),
		date: assertString(data.date, "date", filename),
		author: assertString(data.author, "author", filename),
		category: assertString(data.category, "category", filename),
		tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
		coverImage: assertString(data.coverImage, "coverImage", filename),
		readingTime: typeof data.readingTime === "string" ? data.readingTime : undefined,
		content,
	};
}

export function getAllArticles(): Article[] {
	return fs
		.readdirSync(articlesDirectory)
		.filter((filename) => filename.endsWith(".md"))
		.map(readArticle)
		.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function getArticleBySlug(slug: string): Article | undefined {
	return getAllArticles().find((article) => article.slug === slug);
}

export function getArticleCover(coverImage: string): string {
	if (!coverImage) return fallbackCoverImage;
	if (!coverImage.startsWith("/")) return coverImage;

	return fs.existsSync(path.join(process.cwd(), "public", coverImage))
		? coverImage
		: fallbackCoverImage;
}

// TODO: implementare contatore articolo
export function getPlaceholderViews(slug: string): number {
	const hash = [...slug].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
	return 180 + (hash % 1800);
}

export function formatArticleDate(date: string): string {
	return new Intl.DateTimeFormat("it-IT", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "Europe/Rome",
	}).format(new Date(`${date}T12:00:00+02:00`));
}
