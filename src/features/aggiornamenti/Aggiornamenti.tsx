import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight, CalendarDays, Clock} from "lucide-react";

import {formatArticleDate, getAllArticles, getArticleCover} from "@/lib/articles";
import ArticleImage from "@/features/aggiornamenti/ArticleImage";

export default function Aggiornamenti() {
	const articles = getAllArticles();

	return (
		<main className="bg-neutral-50 text-neutral-900">
			<section className="relative overflow-hidden border-b border-neutral-200 bg-neutral-950">
				<Image src="/backgrounds/homepage-hero2.jpg" alt="" fill priority className="object-cover opacity-25 blur-[2px]" />
				<div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
					<p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-300">Dal mondo dilettantistico</p>
					<h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">Aggiornamenti, guide e storie dal campo.</h1>
					<p className="mt-6 max-w-2xl text-base leading-7 text-neutral-200 sm:text-lg">Consigli pratici e approfondimenti per giocatori, staff, squadre e società sportive.</p>
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{articles.map((article, index) => (
						<article key={article.slug} className={`group overflow-hidden rounded-3xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "md:col-span-2 lg:col-span-2" : ""}`}>
							<Link href={`/aggiornamenti/${article.slug}`} className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fuchsia-500">
								<div className={`relative overflow-hidden bg-neutral-200 ${index === 0 ? "aspect-16/8" : "aspect-16/10"}`}>
									<ArticleImage src={getArticleCover(article.coverImage)} alt="" sizes={index === 0 ? "(max-width: 1024px) 100vw, 760px" : "(max-width: 768px) 100vw, 380px"} className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" />
									<div className="absolute inset-0 bg-linear-to-t from-black/35 to-transparent" />
									<span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-fuchsia-700 backdrop-blur">{article.category}</span>
								</div>
								<div className="flex flex-1 flex-col p-6">
									<div className="flex flex-wrap gap-4 text-xs text-neutral-500">
										<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{formatArticleDate(article.date)}</span>
										{article.readingTime && <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{article.readingTime} di lettura</span>}
									</div>
									<h2 className={`mt-4 font-bold leading-tight tracking-tight ${index === 0 ? "text-2xl sm:text-3xl" : "text-xl"}`}>{article.title}</h2>
									<p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{article.description}</p>
									<span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-fuchsia-600">Leggi l&apos;articolo <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
								</div>
							</Link>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}
