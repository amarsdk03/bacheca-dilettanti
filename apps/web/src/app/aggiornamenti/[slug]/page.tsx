import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {cache} from "react";
import {ArrowLeft, CalendarDays, Clock, Eye, UserRound} from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import ArticleBody from "@/features/aggiornamenti/ArticleBody";
import ArticleNavigation from "@/features/aggiornamenti/ArticleNavigation";
import ShareButtons from "@/features/aggiornamenti/ShareButtons";
import JsonLd from "@/components/seo/JsonLd";
import {formatArticleDate, getAllArticles, getArticleCover, getPlaceholderViews} from "@/lib/articles";
import {dynamicMetadata, getSiteUrl} from "@/server/metadata";
import {articleStructuredData} from "@/server/structured-data";

export const dynamicParams = false;

const loadArticles = cache(getAllArticles);
const loadArticle = cache((slug: string) => loadArticles().find((article) => article.slug === slug));

export function generateStaticParams() {
	return getAllArticles().map(({slug}) => ({slug}));
}

export async function generateMetadata({params}: PageProps<"/aggiornamenti/[slug]">): Promise<Metadata> {
	const {slug} = await params;
	const article = loadArticle(slug);
	if (!article) return dynamicMetadata({
		title: "Articolo non disponibile",
		canonicalPath: `/aggiornamenti/${slug}`,
		index: false,
		follow: false,
	});

	const coverImage = getArticleCover(article.coverImage);
	const metadata = dynamicMetadata({
		title: article.title,
		description: article.description,
		canonicalPath: `/aggiornamenti/${article.slug}`,
		image: {url: coverImage, alt: `Copertina dell’articolo “${article.title}”`},
		openGraphType: "article",
		keywords: article.tags,
	});
	return {
		...metadata,
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
	const articles = loadArticles();
	const article = articles.find((item) => item.slug === slug);
	if (!article) notFound();

	const path = `/aggiornamenti/${article.slug}`;
	const canonicalUrl = getSiteUrl(path);
	const coverImage = getArticleCover(article.coverImage);

	const viewCount = getPlaceholderViews(article.slug).toLocaleString("it-IT");

	return (
		<>
			<JsonLd data={articleStructuredData(article, path, coverImage)} />
			<Navbar />
			<main className="bg-white text-neutral-900">
				<header className="relative isolate overflow-hidden bg-neutral-950">
					<div
						className="absolute inset-0 -z-20 bg-cover bg-center"
						style={{backgroundImage: `url(${coverImage})`}}
					/>
					<div className="absolute inset-0 -z-10 bg-neutral-950/25" />
					<div className="absolute inset-0 -z-10 bg-linear-to-b from-transparent via-neutral-950/75 to-black/80" />
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
					<article className="min-w-0 max-w-3xl">
						<ArticleBody content={article.content} />
						<ArticleNavigation articles={articles} currentSlug={article.slug} />
					</article>
					<aside className="lg:sticky lg:top-24 lg:self-start py-10">
						<ShareButtons title={article.title} url={canonicalUrl} />
						<div className="mt-6 border-t border-neutral-200 pt-6">
							<p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Argomenti</p>
							<div className="mt-3 flex flex-wrap gap-2">{article.tags.map((tag) => <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600">#{tag}</span>)}</div>
						</div>
						<div className="mt-8 border-t border-neutral-200 pt-6" hidden>
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
