import Image from "next/image";
import Link from "next/link";
import {ArrowLeftIcon, ClipboardPenIcon, UserIcon} from "lucide-react";

import NavbarNavigation from "@/components/navigation/NavbarNavigation";
import UserAvatar from "@/components/navigation/UserAvatar";
import {Button, buttonVariants} from "@/components/ui/button";
import {DEFAULT_LOGO_PATH} from "@/const/defaultConstants";
import {getCurrentViewer} from "@/features/auth/server/queries";
import {cn} from "@/lib/utils";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

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
			<div className="mx-auto flex h-16 w-full max-w-370 items-center gap-4 ps-4 lg:px-8 lg:h-24 lg:gap-6">
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

				{!minimal && <NavbarNavigation authenticated={Boolean(viewer)} viewer={viewer} />}

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
					) : (
						<div className={"flex items-center gap-3"}>
							<div className={"hidden lg:block"}>
								<Link
									href="/pubblica-annuncio"
									aria-label="Pubblica un annuncio"
									className={cn(
										buttonVariants({variant: "outline", size: "lg"}),
										"text-black rounded-md",
									)}
								>
									<ClipboardPenIcon aria-hidden="true" />
									Pubblica annuncio
								</Link>
							</div>
							<div className="hidden lg:block">
								{viewer ? (
									<UserAvatar viewer={viewer} />
								) : (
									<Link
										href="/registrati"
										className={cn(
											buttonVariants({variant: "ghost", size: "icon-lg"}),
											"rounded-full"
										)}
									>
										<Avatar className="size-9">
											<AvatarFallback>
												<UserIcon className="size-5" aria-hidden="true" />
											</AvatarFallback>
										</Avatar>
									</Link>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
