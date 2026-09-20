import Link from "next/link";
import {ArrowLeftIcon, ArrowRightIcon} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import type {Article} from "@/lib/articles";
import {cn} from "@/lib/utils";

interface ArticleNavigationProps {
	articles: readonly Article[];
	currentSlug: string;
}

export default function ArticleNavigation({articles, currentSlug}: ArticleNavigationProps) {
	const currentIndex = articles.findIndex((article) => article.slug === currentSlug);
	if (articles.length < 2 || currentIndex < 0) return null;

	const previousArticle = articles[(currentIndex + 1) % articles.length];
	const nextArticle = articles[(currentIndex - 1 + articles.length) % articles.length];

	return (
		<nav aria-label="Navigazione tra gli articoli" className="mt-14 border-t border-neutral-200 pt-8 sm:mt-16">
			<div className="grid gap-3 sm:grid-cols-2">
				<Link
					href={`/aggiornamenti/${previousArticle.slug}`}
					className={cn(buttonVariants({variant: "outline", size: "lg"}), "group/article-navigation h-auto min-h-16 flex-col items-start gap-1 whitespace-normal py-5 text-left")}
				>
					<span className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover/article-navigation:text-fuchsia-600 px-4">
						<ArrowLeftIcon className="transition-transform duration-200 group-hover/article-navigation:-translate-x-0.5" data-icon="inline-start" aria-hidden="true" />
						Articolo prec.
					</span>
					<span className="line-clamp-2 font-semibold text-foreground px-4">{previousArticle.title}</span>
				</Link>

				<Link
					href={`/aggiornamenti/${nextArticle.slug}`}
					className={cn(buttonVariants({variant: "outline", size: "lg"}), "group/article-navigation h-auto min-h-16 flex-col items-end gap-1 whitespace-normal py-5 text-right")}
				>
					<span className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover/article-navigation:text-fuchsia-600 px-4">
						Articolo succ.
						<ArrowRightIcon className="transition-transform duration-200 group-hover/article-navigation:translate-x-0.5" data-icon="inline-end" aria-hidden="true" />
					</span>
					<span className="line-clamp-2 font-semibold text-foreground px-4">{nextArticle.title}</span>
				</Link>
			</div>
		</nav>
	);
}
