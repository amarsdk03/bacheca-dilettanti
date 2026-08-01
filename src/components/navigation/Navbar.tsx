import Link from "next/link";
import Image from "next/image";

import {Button} from "@/components/ui/button";
import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";
import {ArrowLeftIcon, ClipboardPenIcon} from "lucide-react";

interface NavbarProps {
	minimal?: boolean;
	backToHome?: boolean;
}

export default function Navbar(
	{
		minimal = false,
		backToHome = false,
	} : NavbarProps
) {
	return (
		<header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link href={"/"} className={"navbar-link"}>
					<Image
						src={DEFAULT_LOGO_TRANSPARENT_PATH}
						alt={"Logo torneo"}
						width={90}
						height={90}
						className={"navbar-logo"}
						draggable={false}
						loading={"eager"}
					/>
				</Link>

				<nav aria-label="Principale" className="hidden items-center gap-8 md:flex" hidden={minimal}>
					<Link href="#"
					   className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
						Sfoglia annunci
					</Link>
					<Link href="/visibilita"
					   className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
						Visibilità
					</Link>
					<Link href="#"
					   className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
						Profili
					</Link>
					<Link href="#"
					   className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
						Aggiornamenti
					</Link>
					<Link href="#"
					   className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
						Contatti
					</Link>
				</nav>

				<div className="flex items-center gap-3">
					{
						backToHome ? (
							<Link href={"/"}>
								<Button type={"button"} size={"lg"} className={"px-2.5 rounded-2xl"}>
									<div className={"flex items-center justify-center mx-2 gap-1"}>
										<ArrowLeftIcon data-icon="inline-start"/> Torna alla Home
									</div>
								</Button>
							</Link>
						) : (
							<Link href={"pubblica-annuncio"}>
								<Button type={"button"} size={"lg"} className={"px-2.5 rounded-2xl"}>
									<div className={"flex items-center justify-center mx-2 gap-1"}>
										<ClipboardPenIcon data-icon="inline-start"/> Pubblica annuncio
									</div>
								</Button>
							</Link>
						)
					}
				</div>
			</div>
		</header>
	)
}