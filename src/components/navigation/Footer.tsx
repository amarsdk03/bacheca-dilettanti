import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import Link from "next/link";
import Image from "next/image";

import {DEFAULT_BANNER_PATH} from "@/const/defaultConstants";
import {SiInstagram, SiWhatsapp} from "@icons-pack/react-simple-icons";
import {CONTACT_EMAIL, INSTAGRAM_URL, WHATSAPP_URL} from "@/const/contactConstants";
import {MailIcon} from "lucide-react";


interface FooterProps {
	minimal?: boolean;
	whiteBackground?: boolean;
}

export default function Footer(
	{
		minimal = false,
		whiteBackground = false,
	} : FooterProps
) {
	return (
		<footer className={`border-t border-neutral-200 ${whiteBackground ? 'bg-white' : 'bg-neutral-50'}`}>
			<div className="mx-auto max-w-6xl px-8 sm:px-6 pb-12">
				<div className="flex justify-center sm:ms-3 sm:mt-4 mb-2 sm:mb-0">
					<Link href={"/"} className={"navbar-link"}>
						<Image
							src={DEFAULT_BANNER_PATH}
							alt={"Logo torneo"}
							width={400}
							height={200}
							className={"navbar-logo"}
							draggable={false}
							loading={"eager"}
						/>
					</Link>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-10 sm:pt-4" hidden={minimal}>
					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Annunci
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="/annunci" className="hover:text-neutral-900">Sfoglia annunci</Link></li>
							<li><Link href="/pubblica-annuncio" className="hover:text-neutral-900">Pubblica annuncio</Link></li>
							<li><Link href="/visibilita" className="hover:text-neutral-900">Visibilità</Link></li>
						</ul>
					</div>

					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Profili
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="/profili" className="hover:text-neutral-900">Sfoglia profili</Link></li>
							<li><Link href="/registrati" className="hover:text-neutral-900">Registrati</Link></li>
							<li><Link href="/accedi" className="hover:text-neutral-900">Accedi</Link></li>
						</ul>
					</div>

					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Altro
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="/partner" className="hover:text-neutral-900">Partner</Link></li>
							<li><Link href="/aggiornamenti" className="hover:text-neutral-900">Aggiornamenti</Link></li>
							<li><Link href="/contatti" className="hover:text-neutral-900">Social e contatti</Link></li>
						</ul>
					</div>

					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Legale
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="/termini-di-servizio" className="hover:text-neutral-900">Termini di servizio</Link></li>
							<li><Link href="/privacy-policy" className="hover:text-neutral-900">Privacy policy</Link></li>
							<li><Link href="/cookie-policy" className="hover:text-neutral-900">Cookie policy</Link></li>
						</ul>
					</div>
				</div>

				<div className={"mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between"}>
					<p className="text-center text-sm sm:text-md text-neutral-500">
						La piattaforma italiana dedicata ad annunci, opportunità e visibilità nel calcio dilettantistico.
					</p>
					<div className="flex items-center gap-3">
						<Link
							href={`mailto:${CONTACT_EMAIL}`}
							target="_blank"
							aria-label="Email"
							className="inline-flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:-translate-y-0.5 hover:border-fuchsia-300 hover:text-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
						>
							<MailIcon size={20} />
						</Link>
						<ExternalLink
							href={WHATSAPP_URL}
							target="_blank"
							aria-label="Whatsapp"
							className="inline-flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:-translate-y-0.5 hover:border-fuchsia-300 hover:text-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
						>
							<SiWhatsapp title='Whatsapp' size={20} />
						</ExternalLink>
						<ExternalLink
							href={INSTAGRAM_URL}
							target="_blank"
							aria-label="Instagram"
							className="inline-flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:-translate-y-0.5 hover:border-fuchsia-300 hover:text-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
						>
							<SiInstagram title='Instagram' size={20} />
						</ExternalLink>
					</div>
				</div>

				{ /* TODO: aggiungere copyright quando confermato deposito marchio */ }
				<div className="mt-5 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
					Bacheca Dilettanti - 2026. Tutti i diritti riservati. Zaniboni Gabriele. Via Alessandro Volta, 56,
					38123, Trento, Italia. p.IVA: 02802870226.
				</div>
			</div>
		</footer>
	)
}
