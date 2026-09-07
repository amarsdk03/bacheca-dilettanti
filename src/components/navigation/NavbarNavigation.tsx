"use client";

import {useState, type ReactNode} from "react";
import Link from "next/link";
import {usePathname, useSearchParams} from "next/navigation";
import {ChevronDownIcon, ClipboardPenIcon, MenuIcon, UserIcon, UserRoundIcon} from "lucide-react";

import {Button, buttonVariants} from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {ANNOUNCEMENT_DIRECTORY_OPTIONS} from "@/features/annunci/announcement-model";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";
import {cn} from "@/lib/utils";
import {ViewerDTO} from "@/features/auth/types";

interface NavbarNavigationProps {
	authenticated: boolean;
	viewer: ViewerDTO | null;
}

const desktopLinkClassName =
	"relative inline-flex h-11 items-center rounded-lg px-3 text-sm font-bold tracking-wide text-white/75 outline-none transition-colors hover:bg-white/8 hover:text-white focus-visible:ring-3 focus-visible:ring-[#8e72ff]/70";

function isPathActive(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

function profileOption(type: ProfileType) {
	return PROFILE_OPTIONS.find(({value}) => value === type);
}

function DesktopDropdown({
	label,
	rootHref,
	children,
}: {
	label: string;
	rootHref: string;
	children: ReactNode;
}) {
	const pathname = usePathname();
	const active = isPathActive(pathname, rootHref);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={(
					<Button
						variant="ghost"
						size="lg"
						className={cn(
							desktopLinkClassName,
							"gap-1.5 aria-expanded:bg-white/10 aria-expanded:text-white",
							active && "bg-white/8 text-white after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[#8e72ff]",
						)}
					/>
				)}
			>
				{label}
				<ChevronDownIcon className="size-3.5 transition-transform group-aria-expanded/button:rotate-180" aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				sideOffset={10}
				className="font-home-body w-72 rounded-xl border border-black/10 bg-white p-2 text-[#111111] shadow-xl"
			>
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MobileLink({
	href,
	children,
	active,
	onNavigate,
}: {
	href: string;
	children: ReactNode;
	active?: boolean;
	onNavigate: () => void;
}) {
	return (
		<Link
			href={href}
			onClick={onNavigate}
			aria-current={active ? "page" : undefined}
			className={cn(
				"flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-[#111111] outline-none transition-colors hover:bg-[#8e72ff]/12 focus-visible:ring-3 focus-visible:ring-[#8e72ff]/45",
				active && "bg-[#8e72ff]/16 text-black",
			)}
		>
			{children}
		</Link>
	);
}

export default function NavbarNavigation({authenticated, viewer}: NavbarNavigationProps) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const selectedTypes = searchParams.getAll("type");
	const announcementsRootActive = pathname === "/annunci" && selectedTypes.length === 0;
	const profilesRootActive = pathname === "/profili" && selectedTypes.length === 0;

	function announcementTypeActive(type: string) {
		if (pathname !== "/annunci") return false;
		if (type === "annuncio_squadra") {
			return selectedTypes.some((selected) =>
				selected === type || selected.startsWith("annuncio_squadra_cerca_"),
			);
		}
		return selectedTypes.includes(type);
	}

	function profileTypeActive(type: string) {
		return pathname === "/profili" && selectedTypes.includes(type);
	}

	return (
		<div className="ml-auto flex items-center lg:ml-3 lg:min-w-0 lg:flex-1">
			<nav aria-label="Navigazione principale" className="hidden items-center gap-1 lg:flex">
				<DesktopDropdown label="Sfoglia annunci" rootHref="/annunci">
					<DropdownMenuGroup>
						<DropdownMenuLabel className="px-2 pb-1 pt-1.5 font-bold uppercase tracking-[0.14em]">
							Esplora gli annunci
						</DropdownMenuLabel>
						<DropdownMenuItem
							render={<Link href="/annunci" />}
							aria-current={announcementsRootActive ? "page" : undefined}
							className={cn(
								"min-h-10 rounded-lg px-2.5 font-bold focus:bg-[#8e72ff]/12 focus:text-black",
								announcementsRootActive && "bg-[#8e72ff]/12 text-black",
							)}
						>
							Tutti gli annunci
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator className="my-1.5 bg-black/10" />
					<DropdownMenuGroup>
						{ANNOUNCEMENT_DIRECTORY_OPTIONS.map((option) => {
							const matchingProfile = profileOption(option.profileType);
							const Icon = matchingProfile?.icon ?? option.icon;
							return (
								<DropdownMenuItem
									key={option.value}
									render={<Link href={`/annunci?type=${option.value}`} />}
									aria-current={announcementTypeActive(option.value) ? "page" : undefined}
									className={cn(
										"min-h-10 rounded-lg px-2.5 focus:bg-[#8e72ff]/12 focus:text-black",
										announcementTypeActive(option.value) && "bg-[#8e72ff]/12 font-bold text-black",
									)}
								>
									<Icon className="text-[#8e72ff]" aria-hidden="true" />
									{matchingProfile?.label ?? option.label}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuGroup>
				</DesktopDropdown>

				<DesktopDropdown label="Profili" rootHref="/profili">
					<DropdownMenuGroup>
						<DropdownMenuLabel className="px-2 pb-1 pt-1.5 font-bold uppercase tracking-[0.14em]">
							Scopri i profili
						</DropdownMenuLabel>
						<DropdownMenuItem
							render={<Link href="/profili" />}
							aria-current={profilesRootActive ? "page" : undefined}
							className={cn(
								"min-h-10 rounded-lg px-2.5 font-bold focus:bg-[#8e72ff]/12 focus:text-black",
								profilesRootActive && "bg-[#8e72ff]/12 text-black",
							)}
						>
							Tutti i profili
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator className="my-1.5 bg-black/10" />
					<DropdownMenuGroup>
						{PROFILE_OPTIONS.map((option) => {
							const Icon = option.icon;
							return (
								<DropdownMenuItem
									key={option.value}
									render={<Link href={`/profili?type=${option.value}`} />}
									aria-current={profileTypeActive(option.value) ? "page" : undefined}
									className={cn(
										"min-h-10 rounded-lg px-2.5 focus:bg-[#8e72ff]/12 focus:text-black",
										profileTypeActive(option.value) && "bg-[#8e72ff]/12 font-bold text-black",
									)}
								>
									<Icon className="text-[#8e72ff]" aria-hidden="true" />
									{option.label}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuGroup>
				</DesktopDropdown>

				<Link
					href="/aggiornamenti"
					aria-current={isPathActive(pathname, "/aggiornamenti") ? "page" : undefined}
					className={cn(
						desktopLinkClassName,
						isPathActive(pathname, "/aggiornamenti") && "bg-white/8 text-white after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[#8e72ff]",
					)}
				>
					Aggiornamenti
				</Link>
				<Link
					href="/contatti"
					aria-current={isPathActive(pathname, "/contatti") ? "page" : undefined}
					className={cn(
						desktopLinkClassName,
						isPathActive(pathname, "/contatti") && "bg-white/8 text-white after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[#8e72ff]",
					)}
				>
					Contatti
				</Link>
			</nav>

			<div className={"block lg:hidden"}>
				<Link
					href="/pubblica-annuncio"
					aria-label="Pubblica un annuncio"
					className={cn(
						buttonVariants({variant: "outline", size: "lg"}),
						"text-black rounded-md",
					)}
				>
					<ClipboardPenIcon aria-hidden="true" />
					<span className="block sm:hidden">Pubblica</span>
					<span className="hidden sm:block">Pubblica annuncio</span>
				</Link>
			</div>

			<Sheet open={mobileMenuOpen} onOpenChange={(open) => setMobileMenuOpen(open)}>
				<SheetTrigger
					render={(
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							className="size-11 ms-1 rounded-xl text-white hover:bg-white/10 hover:text-white focus-visible:ring-[#8e72ff]/70 lg:hidden"
						/>
					)}
					aria-label="Apri il menu di navigazione"
				>
					<MenuIcon className="size-5" aria-hidden="true" />
				</SheetTrigger>
				<SheetContent className="font-home-body w-[min(90vw,25rem)] gap-0 border-black/10 bg-[#fbfaff] text-[#111111]">
					<SheetHeader className="border-b border-black/10 px-5 py-5 pr-14">
						<SheetTitle className="font-home-display text-2xl font-bold uppercase text-[#111111]">
							Menu
						</SheetTitle>
						<SheetDescription className="text-[#111111]/65">
							Esplora Bacheca Dilettanti
						</SheetDescription>
					</SheetHeader>

					<nav aria-label="Navigazione mobile" className="flex-1 overflow-y-auto px-4 py-5">
						<p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#111111]/50">Annunci</p>
						<MobileLink href="/annunci" active={announcementsRootActive} onNavigate={() => setMobileMenuOpen(false)}>
							Tutti gli annunci
						</MobileLink>
						{ANNOUNCEMENT_DIRECTORY_OPTIONS.map((option) => {
							const matchingProfile = profileOption(option.profileType);
							const Icon = matchingProfile?.icon ?? option.icon;
							return (
								<MobileLink
									key={option.value}
									href={`/annunci?type=${option.value}`}
									active={announcementTypeActive(option.value)}
									onNavigate={() => setMobileMenuOpen(false)}
								>
									<Icon className="size-4 text-[#8e72ff]" aria-hidden="true" />
									{matchingProfile?.label ?? option.label}
								</MobileLink>
							);
						})}

						<div className="my-4 h-px bg-black/10" />
						<p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#111111]/50">Profili</p>
						<MobileLink href="/profili" active={profilesRootActive} onNavigate={() => setMobileMenuOpen(false)}>
							Tutti i profili
						</MobileLink>
						{PROFILE_OPTIONS.map((option) => {
							const Icon = option.icon;
							return (
								<MobileLink
									key={option.value}
									href={`/profili?type=${option.value}`}
									active={profileTypeActive(option.value)}
									onNavigate={() => setMobileMenuOpen(false)}
								>
									<Icon className="size-4 text-[#8e72ff]" aria-hidden="true" />
									{option.label}
								</MobileLink>
							);
						})}

						<div className="my-4 h-px bg-black/10" />
						<MobileLink href="/aggiornamenti" active={isPathActive(pathname, "/aggiornamenti")} onNavigate={() => setMobileMenuOpen(false)}>
							Aggiornamenti
						</MobileLink>
						<MobileLink href="/contatti" active={isPathActive(pathname, "/contatti")} onNavigate={() => setMobileMenuOpen(false)}>
							Contatti
						</MobileLink>
					</nav>

					<SheetFooter className="border-t border-black/10 bg-white p-4">
						{authenticated ? (
							<>
								<Link
									href="/il-tuo-profilo?sezione=profilo"
									onClick={() => setMobileMenuOpen(false)}
									className={cn(buttonVariants({variant: "outline", size: "lg"}), "h-11 w-full rounded-xl border-black/20 font-bold")}
								>
									<UserRoundIcon data-icon="inline-start" aria-hidden="true" />
									Il tuo profilo
								</Link>
								<Link
									href="/registrati"
									onClick={() => setMobileMenuOpen(false)}
									className={cn(
										buttonVariants({variant: "brand", size: "lg"}),
										"h-11 w-full rounded-xl text-white font-bold",
									)}
								>
									<ClipboardPenIcon data-icon="inline-start" aria-hidden="true" />
									Pubblica annuncio
								</Link>
							</>
						) : (
							<>
								<Link
									href="/registrati"
									onClick={() => setMobileMenuOpen(false)}
									className={cn(
										buttonVariants({variant: "brand", size: "lg"}),
										"h-11 w-full rounded-xl text-white font-bold",
									)}
								>
									Registrati
								</Link>
								<Link
									href="/accedi"
									onClick={() => setMobileMenuOpen(false)}
									className={cn(buttonVariants({variant: "outline", size: "lg"}), "h-11 w-full rounded-xl border-black/20 font-bold")}
								>
									Accedi
								</Link>
							</>
						)}
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</div>
	);
}
