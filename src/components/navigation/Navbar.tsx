import Image from "next/image";
import Link from "next/link";
import {ArrowLeftIcon, ClipboardPenIcon, UserRoundIcon} from "lucide-react";

import UserAvatar from "@/components/navigation/UserAvatar";
import {Button} from "@/components/ui/button";
import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";
import {getCurrentViewer} from "@/features/auth/queries";

interface NavbarLink {
	label: string;
	href: string;
}

const navbarLinks: NavbarLink[] = [
	{label: "Sfoglia annunci", href: "/#"},
	{label: "Visibilità", href: "/visibilita"},
	{label: "Profili 🔥", href: "/#"},
	{label: "Aggiornamenti", href: "/aggiornamenti"},
	{label: "Contatti", href: "/contatti"},
];

interface NavbarProps {
	minimal?: boolean;
	backToHome?: boolean;
}

export default async function Navbar({minimal = false, backToHome = false}: NavbarProps) {
	const viewer = await getCurrentViewer();

	return (
		<header className="sticky top-0 z-50 border-b border-black/70 bg-black/90 backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link href="/" className="navbar-link">
					<Image
						src={DEFAULT_LOGO_TRANSPARENT_PATH}
						alt="Bacheca Dilettanti"
						width={90}
						height={90}
						className="navbar-logo"
						draggable={false}
						priority
						style={{filter: "invert(100%)"}}
					/>
				</Link>

				<nav aria-label="Principale" className="hidden items-center gap-8 md:flex" hidden={minimal}>
					{navbarLinks.map((link) => (
						<Link key={link.label} href={link.href} className="text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-100">
							{link.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-2 sm:gap-3">
					{
						backToHome ? (
							<Button
								render={<Link href="/" />}
								nativeButton={false}
								variant="outline"
								size="lg"
								className="hidden rounded-2xl sm:inline-flex"
							>
								<ArrowLeftIcon data-icon="inline-start" /> Torna alla Home
							</Button>
						) : viewer ? (
							<>
								<Button
									render={<Link href="/pubblica-annuncio" />}
									nativeButton={false}
									variant="outline"
									size="lg"
									className="hidden rounded-2xl sm:inline-flex"
								>
									<ClipboardPenIcon data-icon="inline-start" /> Pubblica annuncio
								</Button>
								<UserAvatar viewer={viewer} />
							</>
						) : (
							<Button
								render={<Link href="/effettua-accesso" />}
								nativeButton={false}
								variant="secondary"
								size="icon-lg"
								className="rounded-2xl"
							>
								<UserRoundIcon />
							</Button>
						)
					}
				</div>
			</div>
		</header>
	);
}
