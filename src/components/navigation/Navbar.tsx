import Image from "next/image";
import Link from "next/link";
import {ArrowLeftIcon, ClipboardPenIcon} from "lucide-react";

import NavbarNavigation from "@/components/navigation/NavbarNavigation";
import UserAvatar from "@/components/navigation/UserAvatar";
import {buttonVariants} from "@/components/ui/button";
import {DEFAULT_LOGO_PATH} from "@/const/defaultConstants";
import {getCurrentViewer} from "@/features/auth/server/queries";
import {cn} from "@/lib/utils";

interface NavbarProps {
	minimal?: boolean;
	backToHome?: boolean;
}

const inverseButtonClassName =
	"h-10 rounded-md px-4 font-bold uppercase";

export default async function Navbar({minimal = false, backToHome = false}: NavbarProps) {
	const viewer = await getCurrentViewer();

	return (
		<header className="font-home-body sticky top-0 z-50 border-b border-white/10 bg-[#050505] text-white">
			<div className="mx-auto flex h-20 w-full max-w-370 items-center gap-3 px-4 sm:px-6 lg:h-24 lg:gap-6 lg:px-8">
				<Link
					href="/"
					aria-label="Bacheca Dilettanti, torna alla homepage"
					className="shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-[#8e72ff]/70"
				>
					<Image
						src={DEFAULT_LOGO_PATH}
						alt="Bacheca Dilettanti"
						width={60}
						height={60}
						className="size-15 object-contain"
						draggable={false}
						priority
						style={{filter: "invert(100%)"}}
					/>
				</Link>

				{!minimal && <NavbarNavigation authenticated={Boolean(viewer)} />}

				<div className={cn("flex shrink-0 items-center gap-2", minimal ? "ml-auto" : "lg:ml-0")}>
					{backToHome ? (
						<Link
							href="/"
							className={cn(buttonVariants({variant: "inverse-outline", size: "lg"}), inverseButtonClassName)}
						>
							<ArrowLeftIcon data-icon="inline-start" aria-hidden="true" className="ms-2" />
							<span className="hidden sm:inline">Torna alla Home</span>
							<span className="sm:hidden">Home</span>
						</Link>
					) : viewer ? (
						<>
							<Link
								href="/pubblica-annuncio"
								className={cn(
									buttonVariants({variant: "inverse-outline", size: "lg"}),
									inverseButtonClassName,
									"hidden lg:inline-flex",
								)}
							>
								<ClipboardPenIcon data-icon="inline-start" aria-hidden="true" className="ms-2" />
								Pubblica annuncio
							</Link>
							<UserAvatar viewer={viewer} />
						</>
					) : (
						<div className="hidden items-center gap-2 lg:flex">
							<Link
								href="/accedi"
								className={cn(buttonVariants({variant: "inverse-outline", size: "lg"}), inverseButtonClassName)}
							>
								Accedi
							</Link>
							<Link
								href="/registrati"
								className={cn(
									buttonVariants({variant: "brand", size: "lg"}),
									"h-10 rounded-md px-5 font-bold text-white uppercase",
								)}
							>
								Registrati
							</Link>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
