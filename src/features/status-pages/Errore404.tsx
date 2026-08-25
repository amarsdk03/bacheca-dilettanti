import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import FrasiErrori from "@/features/status-pages/FrasiErrori";
import { buttonVariants } from "@/components/ui/button";

export default function Errore404() {
	return (
		<div className="flex min-h-screen flex-col bg-neutral-50">
			<Navbar />
			<main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-32">
				<div aria-hidden="true" className="absolute -left-24 top-10 size-72 rounded-full bg-fuchsia-200/50 blur-3xl" />
				<div aria-hidden="true" className="absolute -right-24 bottom-10 size-72 rounded-full bg-purple-200/50 blur-3xl" />
				<section className="relative mx-auto max-w-2xl text-center">
					<div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-fuchsia-200 bg-white text-fuchsia-600 shadow-sm">
						<SearchX className="size-8" aria-hidden="true" />
					</div>
					<p className="mt-7 text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-700">Errore 404</p>
					<h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">Pagina non trovata</h1>
					<FrasiErrori />
					<Link href="/" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-5 mt-12")}><ArrowLeft /> Torna alla home</Link>
				</section>
			</main>
			<Footer whiteBackground />
		</div>
	);
}