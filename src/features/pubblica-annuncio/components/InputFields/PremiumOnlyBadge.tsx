"use client";

import Link from "next/link";
import {ArrowUpRight, Check, Crown} from "lucide-react";

import {badgeVariants} from "@/components/ui/badge";
import {buttonVariants} from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	getPianiPubblicazione,
	isPianoPagamento,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {cn} from "@/lib/utils";

type PremiumOnlyBadgeProps = {
	tipologia: string;
	funzione: string;
};

export default function PremiumOnlyBadge({tipologia, funzione}: PremiumOnlyBadgeProps) {
	const piani = getPianiPubblicazione(tipologia).filter(isPianoPagamento);

	return (
		<Sheet>
			<SheetTrigger
				type="button"
				className={cn(
					badgeVariants({variant: "secondary"}),
					"cursor-pointer border border-purple-200 bg-purple-100 text-purple-900 hover:bg-purple-200"
				)}
				aria-label={`Scopri i piani disponibili per ${funzione}`}
			>
				<Crown /> Premium only
			</SheetTrigger>
			<SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
				<SheetHeader className="border-b pr-12">
					<SheetTitle className="flex items-center gap-4 text-lg/6 mb-2">
						<Crown className="size-6 text-purple-700" />
						<p>
							{funzione} è una funzione <span className="text-purple-700 font-semibold">Premium!</span>
						</p>
					</SheetTitle>
					<SheetDescription>
						Per pubblicare questo dato scegli uno dei piani a pagamento nello step Visibilità.
						Qui trovi prezzi e caratteristiche disponibili anche nella pagina Visibilità.
					</SheetDescription>
				</SheetHeader>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 mt-2">
					<div className="grid gap-3">
						{piani.map((piano) => (
							<article key={piano.valore} className="rounded-xl border bg-background p-4 shadow-xs">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div>
										<h3 className="font-semibold text-foreground">{piano.nome}</h3>
										{piano.durata && (
											<p className="text-xs text-muted-foreground">{piano.durata}</p>
										)}
									</div>
									<p className="font-semibold text-fuchsia-700">{piano.prezzo}</p>
								</div>
								<p className="mt-2 text-sm leading-5 text-muted-foreground">{piano.descrizione}</p>
								{piano.caratteristiche && piano.caratteristiche.length > 0 && (
									<ul className="mt-3 grid gap-1.5 text-sm">
										{piano.caratteristiche.map((caratteristica) => (
											<li key={caratteristica} className="flex gap-2">
												<Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
												<span>{caratteristica}</span>
											</li>
										))}
									</ul>
								)}
							</article>
						))}
					</div>

					<Link
						href="/visibilita"
						className={cn(buttonVariants({variant: "outline"}), "mt-5 w-full")}
					>
						Apri la pagina Visibilità <ArrowUpRight />
					</Link>
				</div>
			</SheetContent>
		</Sheet>
	);
}
