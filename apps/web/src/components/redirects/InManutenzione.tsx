import Image from "next/image";
import {SiInstagram, SiWhatsapp} from "@icons-pack/react-simple-icons";

import {INSTAGRAM_URL, WHATSAPP_URL} from "@/const/contactConstants";
import {DEFAULT_BANNER_PATH} from "@/const/defaultConstants";

export default function InManutenzione() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5 py-10 font-home-body text-neutral-900 sm:px-8">
			<section className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
				<Image
					src={DEFAULT_BANNER_PATH}
					alt="Bacheca Dilettanti"
					width={200}
					height={100}
					priority
					className="mx-auto h-auto"
				/>

				<p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-indigo">
					Bacheca Dilettanti
				</p>
				<h1 className="font-home-display mt-3 text-3xl font-semibold uppercase leading-none sm:text-4xl">
					Lavori in corso!
				</h1>
				<p className="mx-auto mt-4 max-w-xs leading-7 text-neutral-600">
					Il sito web è in manutenzione, torneremo presto operativi! Riprova tra qualche ora.
				</p>

				<div className="mt-8 border-t border-neutral-200 pt-6">
					<p className="text-sm font-medium text-neutral-700">
						Rimani aggiornato tramite i nostri social:
					</p>
					<div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
						<a
							href={WHATSAPP_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-500/35"
						>
							<SiWhatsapp className="size-4" title="WhatsApp" />
							Scrivici su WhatsApp
						</a>
						<a
							href={INSTAGRAM_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-fuchsia-200 bg-white px-4 text-sm font-medium text-fuchsia-800 shadow-sm transition hover:-translate-y-0.5 hover:border-fuchsia-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-fuchsia-500/35"
						>
							<SiInstagram className="size-4" title="Instagram" />
							Seguici su Instagram
						</a>
					</div>
				</div>
			</section>
		</main>
	);
}
