import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, CalendarDays, Clock, Eye, UserRound} from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import ArticleBody from "@/features/aggiornamenti/ArticleBody";
import ShareButtons from "@/features/aggiornamenti/ShareButtons";
import {formatArticleDate, getAllArticles, getArticleBySlug, getArticleCover, getPlaceholderViews} from "@/lib/articles";
import {dynamicMetadata} from "@/server/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
	return getAllArticles().map(({slug}) => ({slug}));
}

export async function generateMetadata({params}: PageProps<"/aggiornamenti/[slug]">): Promise<Metadata> {
	const {slug} = await params;
	const article = getArticleBySlug(slug);
	if (!article) return {};

	const metadata = dynamicMetadata(article.title, article.description, `/aggiornamenti/${article.slug}`, getArticleCover(article.coverImage));
	return {
		...metadata,
		keywords: article.tags,
		authors: [{name: article.author}],
		category: article.category,
		openGraph: {
			...metadata.openGraph,
			type: "article",
			publishedTime: article.date,
			authors: [article.author],
			tags: article.tags,
		},
	};
}

export default async function ArticlePage({params}: PageProps<"/aggiornamenti/[slug]">) {
	const {slug} = await params;
	const article = getArticleBySlug(slug);
	if (!article) notFound();

	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
	const canonicalUrl = new URL(`/aggiornamenti/${article.slug}`, siteUrl).toString();
	const coverImage = getArticleCover(article.coverImage);

	const viewCount = getPlaceholderViews(article.slug).toLocaleString("it-IT");

	return (
		<>
			<Navbar />
			<main className="bg-white text-neutral-900">
				<header className="relative isolate overflow-hidden bg-neutral-950">
					<div
						className="absolute inset-0 -z-20 bg-cover bg-center"
						style={{backgroundImage: `url(${coverImage})`, filter: "blur(1px)"}}
					/>
					<div className="absolute inset-0 -z-10 bg-neutral-950/35" />
					<div className="absolute inset-0 -z-10 bg-linear-to-b from-transparent via-neutral-950/75 to-black" />
					<div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-16">
						<Link href="/aggiornamenti" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 transition hover:text-white"><ArrowLeft className="size-4" /> Tutti gli aggiornamenti</Link>
						<div className="mt-10">
							<div className="max-w-3xl">
								<span className="rounded-full bg-fuchsia-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fuchsia-300">{article.category}</span>
								<h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">{article.title}</h1>
								<p className="mt-5 max-w-3xl text-base leading-7 text-neutral-300 sm:text-lg">{article.description}</p>
								<div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-neutral-400">
									<span className="inline-flex items-center gap-2"><UserRound className="size-4" />{article.author}</span>
									<span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{formatArticleDate(article.date)}</span>
									{article.readingTime && <span className="inline-flex items-center gap-2"><Clock className="size-4" />{article.readingTime}</span>}
								</div>
							</div>
						</div>
					</div>
				</header>

				<div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:px-8 lg:py-20">
					<article className="min-w-0 max-w-3xl"><ArticleBody content={article.content} /></article>
					<aside className="lg:sticky lg:top-24 lg:self-start">
						<ShareButtons title={article.title} url={canonicalUrl} />
						<div className="mt-8 border-t border-neutral-200 pt-6">
							<p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Argomenti</p>
							<div className="mt-3 flex flex-wrap gap-2">{article.tags.map((tag) => <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600">#{tag}</span>)}</div>
						</div>
						<div className="mt-8 border-t border-neutral-200 pt-6">
							<div className="inline-flex items-center text-lg text-neutral-700 gap-1.5">
								<Eye className="size-5" />
								<span className={"font-medium"}>{viewCount}</span>
							</div>
							<p className="text-sm text-neutral-500 -translate-y-0.5">visualizzazioni</p>
						</div>
					</aside>
				</div>
			</main>
			<Footer />
		</>
	);
}
