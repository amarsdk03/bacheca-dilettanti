import Link from "next/link";
import Image from "next/image";

import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";
import {SiInstagram, SiWhatsapp} from "@icons-pack/react-simple-icons";


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
							src={DEFAULT_LOGO_TRANSPARENT_PATH}
							alt={"Logo torneo"}
							width={200}
							height={200}
							className={"navbar-logo"}
							draggable={false}
							loading={"eager"}
						/>
					</Link>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-10 sm:pt-4">
					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Piattaforma
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="#" className="hover:text-neutral-900">Come funziona</Link></li>
							<li><Link href="#" className="hover:text-neutral-900">Categorie</Link></li>
							<li><Link href="#" className="hover:text-neutral-900">Annunci</Link></li>
						</ul>
					</div>

					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Per chi cerca
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="#" className="hover:text-neutral-900">Giocatori</Link></li>
							<li><Link href="#" className="hover:text-neutral-900">Squadre</Link></li>
							<li><Link href="#" className="hover:text-neutral-900">Staff tecnico</Link></li>
						</ul>
					</div>

					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Altro
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="#" className="hover:text-neutral-900">Chi siamo</Link></li>
							<li><Link href="/aggiornamenti" className="hover:text-neutral-900">Aggiornamenti</Link></li>
							<li><Link href="#" className="hover:text-neutral-900">Social e contatti</Link></li>
						</ul>
					</div>

					<div>
						<h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-neutral-400">
							Legale
						</h3>
						<ul className="mt-4 space-y-3 text-sm text-neutral-600">
							<li><Link href="#" className="hover:text-neutral-900">Termini di servizio</Link></li>
							<li><Link href="#" className="hover:text-neutral-900">Privacy</Link></li>
							<li><Link href="#" className="hover:text-neutral-900">Cookie</Link></li>
						</ul>
					</div>
				</div>

				<div className={"mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between"}>
					<p className="text-sm sm:text-md text-neutral-500">
						La piattaforma italiana dedicata ad annunci, opportunità e visibilità nel calcio dilettantistico.
					</p>
					<div className="flex items-center gap-3">
						<Link
							href="https://www.instagram.com/bachecadilettanti/"
							target="_blank"
							aria-label="Instagram"
							className="inline-flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
						>
							<SiInstagram title='Instagram' size={20} />
						</Link>
						<Link
							href="https://whatsapp.com/channel/0029Vb8lng43AzNSP0YlRL3V"
							target="_blank"
							aria-label="Whatsapp"
							className="inline-flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
						>
							<SiWhatsapp title='Whatsapp' size={20} />
						</Link>
					</div>
				</div>

				<div className="mt-5 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
					© 2026 Bacheca Dilettanti. Tutti i diritti riservati.
				</div>
			</div>
		</footer>
	)
}
