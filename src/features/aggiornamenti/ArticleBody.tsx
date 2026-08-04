import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {getArticleCover} from "@/lib/articles";
import ArticleImage from "@/features/aggiornamenti/ArticleImage";

export default function ArticleBody({content}: {content: string}) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				h1: ({children}) => <h2 className="sr-only">{children}</h2>,
				h2: ({children}) => <h2 className="mt-12 scroll-mt-24 font-bold text-3xl tracking-tight text-neutral-900">{children}</h2>,
				h3: ({children}) => <h3 className="mt-9 scroll-mt-24 text-xl font-bold text-neutral-900">{children}</h3>,
				p: ({children}) => <p className="mt-5 text-[1.05rem] leading-8 text-neutral-700">{children}</p>,
				strong: ({children}) => <strong className="font-semibold text-neutral-950">{children}</strong>,
				em: ({children}) => <em className="text-neutral-600">{children}</em>,
				a: ({href = "", children}) => href.startsWith("/") ? (
					<Link href={href} className="font-semibold text-fuchsia-600 underline decoration-fuchsia-200 underline-offset-4 hover:decoration-fuchsia-600">{children}</Link>
				) : (
					<a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-fuchsia-600 underline decoration-fuchsia-200 underline-offset-4 hover:decoration-fuchsia-600">{children}</a>
				),
				ul: ({children}) => <ul className="mt-5 list-disc space-y-2 pl-6 text-[1.05rem] leading-8 text-neutral-700 marker:text-fuchsia-500">{children}</ul>,
				ol: ({children}) => <ol className="mt-5 list-decimal space-y-2 pl-6 text-[1.05rem] leading-8 text-neutral-700 marker:font-semibold marker:text-fuchsia-600">{children}</ol>,
				blockquote: ({children}) => <blockquote className="my-8 rounded-r-2xl border-l-4 border-fuchsia-400 bg-fuchsia-50 px-6 pt-1 pb-6 italic text-neutral-700">{children}</blockquote>,
				hr: () => <hr className="my-12 border-neutral-200" />,
				table: ({children}) => <div className="my-8 overflow-x-auto rounded-2xl border border-neutral-200"><table className="w-full min-w-xl border-collapse text-left text-sm">{children}</table></div>,
				th: ({children}) => <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold text-neutral-900">{children}</th>,
				td: ({children}) => <td className="border-b border-neutral-100 px-4 py-3 align-top leading-6 text-neutral-700">{children}</td>,
				img: ({src = "", alt = ""}) => (
					<span className="relative my-8 block aspect-video overflow-hidden rounded-3xl bg-neutral-100">
						<ArticleImage src={getArticleCover(typeof src === "string" ? src : "")} alt={alt} sizes="(max-width: 768px) 100vw, 768px" className="absolute inset-0 size-full object-cover" />
					</span>
				),
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
