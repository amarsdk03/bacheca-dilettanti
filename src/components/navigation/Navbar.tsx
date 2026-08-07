import Link from "next/link";
import Image from "next/image";

import {Button} from "@/components/ui/button";
import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";
import {ArrowLeftIcon, ClipboardPenIcon} from "lucide-react";

interface NavbarLink {
	label: string;
	href: string;
}

const navbarLinks: NavbarLink[] = [
	{
		label: "Sfoglia annunci",
		href: "#"
	},
	{
		label: "Visibilità",
		href: "/visibilita"
	},
	{
		label: "Profili 🔥",
		href: "#"
	},
	{
		label: "Aggiornamenti",
		href: "/aggiornamenti"
	},
	{
		label: "Contatti",
		href: "#"
	},
]

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
		<header className="sticky top-0 z-50 border-b border-black/70 bg-black/90 backdrop-blur">
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
						style={{filter: "invert(100%)"}}
					/>
				</Link>

				<nav aria-label="Principale" className="hidden items-center gap-8 md:flex" hidden={minimal}>
					{
						navbarLinks.map((link, index) => (
							<Link
								key={index}
								href={link.href}
								className="text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-100"
							>
								{link.label}
							</Link>
						))
					}
				</nav>

				<div className="flex items-center gap-3">
					{
						backToHome ? (
							<Link href={"/"}>
								<Button
									type={"button"}
									variant={"outline"}
									size={"lg"}
									className={"px-2.5 rounded-2xl"}
								>
									<div className={"flex items-center justify-center mx-2 gap-1"}>
										<ArrowLeftIcon data-icon="inline-start"/> Torna alla Home
									</div>
								</Button>
							</Link>
						) : (
							<Link href={"pubblica-annuncio"}>
								<Button
									type={"button"}
									variant={"outline"}
									size={"lg"}
									className={"px-2.5 rounded-2xl"}
								>
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