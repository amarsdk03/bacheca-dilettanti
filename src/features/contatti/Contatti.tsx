import {ExternalLink, Mail, Send} from "lucide-react";
import {SiInstagram, SiWhatsapp} from "@icons-pack/react-simple-icons";

import {CONTACT_EMAIL, INSTAGRAM_URL, WHATSAPP_URL} from "@/const/contactConstants";

export default function Contatti() {
	return (
		<main className="bg-neutral-50 px-4 py-14 sm:px-6 lg:px-8 lg:py-24">
			<div className="mx-auto max-w-3xl">
				<header className="text-center">
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-700">Parliamone</p>
					<h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">Contatti</h1>
					<p className="mx-auto mt-4 max-w-xl leading-7 text-neutral-600">Hai una domanda, una proposta o vuoi segnalarci qualcosa? Scrivi direttamente allo staff.</p>
				</header>

				<section aria-labelledby="contact-channels-title" className="mt-10">
					<h2 id="contact-channels-title" className="sr-only">I nostri canali di contatto</h2>
					<div className="grid gap-4">
						<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-fuchsia-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700"><SiInstagram size={22} title="Instagram" /></span>
							<span className="min-w-0 flex-1"><span className="block font-semibold text-neutral-950">Seguici su Instagram</span><span className="mt-1 block text-sm text-neutral-600">Novità, annunci e contenuti dalla community.</span></span>
							<ExternalLink className="size-4 text-neutral-400 transition group-hover:text-fuchsia-600" />
						</a>
						<a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><SiWhatsapp size={22} title="WhatsApp" /></span>
							<span className="min-w-0 flex-1"><span className="block font-semibold text-neutral-950">Unisciti al canale WhatsApp</span><span className="mt-1 block text-sm text-neutral-600">Ricevi gli aggiornamenti senza perderti nulla.</span></span>
							<ExternalLink className="size-4 text-neutral-400 transition group-hover:text-emerald-600" />
						</a>
						<a href={`mailto:${CONTACT_EMAIL}`} className="group flex items-center gap-4 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
							<span className="flex size-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Mail size={22} aria-hidden="true" /></span>
							<span className="min-w-0 flex-1"><span className="block font-semibold text-neutral-950">Scrivici via email</span><span className="mt-1 block text-sm text-neutral-600">Per assistenza, richieste e segnalazioni. <span className="font-medium text-neutral-700">{CONTACT_EMAIL}</span></span></span>
							<Send className="size-4 text-neutral-400 transition group-hover:text-sky-600" />
						</a>
					</div>
				</section>
			</div>
		</main>
	);
}
