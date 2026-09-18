"use client";

import {useState} from "react";
import Link from "next/link";
import {ConstructionIcon, XIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";

interface HomepageWorkInProgressNoticeProps {
	onNavbar?: boolean;
}

export default function HomepageWorkInProgressNotice({onNavbar = false}: HomepageWorkInProgressNoticeProps) {
	const [isVisible, setIsVisible] = useState(true);

	if (!isVisible) return null;

	if (onNavbar) {
		return (
			<section aria-label="Stato della piattaforma" className="w-full">
				<div className="relative flex min-h-9 w-full items-center justify-center overflow-hidden border-b border-[#d4b21f]/45 bg-[#fff9df] text-[#5e4c00]">
					<div className="homepage-navbar-notice-stripes" aria-hidden="true" />
					<p className="relative z-10 text-center text-xs leading-4 sm:text-sm">
						<span className="font-semibold uppercase">Sito in alpha</span>
						<span className="hidden sm:inline">: alcune funzionalità sono ancora in sviluppo - </span>
						<span className="inline sm:hidden">: </span>
						<Link href="/contatti" className="font-semibold underline underline-offset-2">
							segnalaci eventuali problemi.
						</Link>
					</p>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={() => setIsVisible(false)}
						aria-label="Chiudi avviso sullo stato della piattaforma"
						className="absolute right-1 top-1/2 z-20 -translate-y-1/2 text-[#6f5b00] hover:bg-[#d4b21f]/15 focus-visible:ring-[#8a6f00]/35"
					>
						<XIcon aria-hidden="true" />
					</Button>
				</div>
			</section>
		);
	}

	return (
		<section aria-label="Stato della piattaforma">
			<div className="mx-auto max-w-370 px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
				<Card className="gap-0 border border-[#d4b21f]/45 bg-[#fff9df] py-0 shadow-none ring-0">
					<CardContent className="relative flex items-center gap-4 px-4 py-5 pr-12 sm:px-5 sm:pr-14">
						<div className="homepage-notice-stripes" aria-hidden="true" />
						<span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#d4b21f]/15 text-[#8a6f00] sm:size-14">
							<ConstructionIcon className="size-5 sm:size-8" aria-hidden="true" />
						</span>
						<div className="relative z-10">
							<h2 className="font-home-display text-lg font-medium uppercase leading-tight text-[#5e4c00] sm:text-2xl">
								Sito ancora in lavorazione!
							</h2>
							<p className="mt-1 text-sm leading-5 text-[#6f5b00] sm:text-base">
								Alcune funzionalità sono ancora in fase di sviluppo e testing. Se riscontri errori o
								problemi, <Link href="/contatti" className="font-medium underline underline-offset-3">faccelo sapere!</Link>
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							onClick={() => setIsVisible(false)}
							aria-label="Chiudi avviso sullo stato della piattaforma"
							className="absolute right-3 top-3 z-20 text-[#6f5b00] hover:bg-[#d4b21f]/15 focus-visible:ring-[#8a6f00]/35 sm:right-4 sm:top-4"
						>
							<XIcon aria-hidden="true" />
						</Button>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
