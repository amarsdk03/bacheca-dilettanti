import Image from "next/image";
import {DEFAULT_BANNER_PATH} from "@/const/defaultConstants";
import SiteAccessForm from "@/components/redirects/SiteAccessForm";

export default function AccessoRiservato({nextPath, available}: {nextPath: string; available: boolean}) {
	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5 py-10 font-home-body text-neutral-900 sm:px-8">
			<section className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
				<Image src={DEFAULT_BANNER_PATH} alt="Bacheca Dilettanti" width={200} height={100} priority className="mx-auto h-auto" />
				<p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-indigo">Bacheca Dilettanti</p>
				<h1 className="font-home-display mt-3 text-3xl font-semibold uppercase leading-none sm:text-4xl">Accesso riservato</h1>
				<p className="mx-auto mt-4 max-w-xs leading-7 text-neutral-600">Il sito è ad accesso riservato. Inserisci la password per continuare.</p>
				<SiteAccessForm nextPath={nextPath} available={available} />
			</section>
		</main>
	);
}
