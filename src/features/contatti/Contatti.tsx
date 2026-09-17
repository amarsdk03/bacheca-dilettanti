import {BellRingIcon, ExternalLink, Mail, Send} from "lucide-react";
import {SiInstagram, SiWhatsapp} from "@icons-pack/react-simple-icons";

import {CONTACT_EMAIL, INSTAGRAM_URL, WHATSAPP_URL} from "@/const/contactConstants";

export default function Contatti() {
	return (
		<main className="bg-neutral-50 px-4 py-14 sm:px-6 lg:px-8 lg:py-24">
			<div className="mx-auto max-w-3xl">
				<header className="text-center">
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-700">
						Siamo qui per aiutarti
					</p>
					<h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
						Contatti
					</h1>
					<p className="mx-auto mt-4 max-w-xl leading-7 text-neutral-600">
						Hai bisogno di aiuto o vuoi metterti in contatto con noi? Scegli il canale più adatto
					</p>
				</header>

				<section aria-labelledby="contact-channels-title" className="mt-10">
					<h2 id="contact-channels-title" className="sr-only">
						I nostri canali di contatto
					</h2>
					<div className="grid gap-4">
						<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><SiWhatsapp size={22} title="WhatsApp" /></span>
							<span className="min-w-0 flex-1">
								<span className="block font-semibold text-neutral-950">
									Hai bisogno di aiuto? Scrivici su Whatsapp
								</span>
								<span className="mt-1 block text-sm text-neutral-600">
									Dubbi sul funzionamento della piattaforma o su qualche passaggio? Scrivici e ti
									aiutiamo direttamente.
								</span>
							</span>
							<ExternalLink className="size-4 text-neutral-400 transition group-hover:text-emerald-600" />
						</a>
						<a href={"https://www.whatsapp.com/channel/0029Vb8lng43AzNSP0YlRL3V"} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><BellRingIcon size={22} /></span>
							<span className="min-w-0 flex-1">
								<span className="block font-semibold text-neutral-950">
									Unisciti al canale Whatsapp
								</span>
								<span className="mt-1 block text-sm text-neutral-600">
									Ricevi aggiornamenti, nuovi annunci e opportunità pubblicate sul sito Bacheca Dilettanti
								</span>
							</span>
							<ExternalLink className="size-4 text-neutral-400 transition group-hover:text-emerald-600" />
						</a>
						<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-fuchsia-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700"><SiInstagram size={22} title="Instagram" /></span>
							<span className="min-w-0 flex-1">
								<span className="block font-semibold text-neutral-950">
									Seguici su Instagram
								</span>
								<span className="mt-1 block text-sm text-neutral-600">
									Contenuti, novità, opportunità e aggiornamenti dalla community.
								</span>
							</span>
							<ExternalLink className="size-4 text-neutral-400 transition group-hover:text-fuchsia-600" />
						</a>
						<a href={`mailto:${CONTACT_EMAIL}`} className="group flex items-center gap-4 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Mail size={22} aria-hidden="true" /></span>
							<span className="min-w-0 flex-1">
								<span className="block font-semibold text-neutral-950">
									Scrivici via email
								</span>
								<span className="mt-1 block text-sm text-neutral-600">
									Per collaborazioni, proposte commerciali, partnership o segnalazioni:
									<br className={"mb-1.5"} />
									<span className="font-medium text-neutral-700">{CONTACT_EMAIL}</span>
								</span>
							</span>
							<Send className="size-4 text-neutral-400 transition group-hover:text-sky-600" />
						</a>
					</div>
				</section>
			</div>
		</main>
	);
}
