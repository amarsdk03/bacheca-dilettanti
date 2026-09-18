"use client";

import {useId} from "react";
import Link from "next/link";
import {
	ArrowRightIcon,
	CalendarDaysIcon,
	MegaphoneIcon,
	TriangleAlertIcon,
	type LucideIcon,
	FlameIcon
} from "lucide-react";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Badge} from "@/components/ui/badge";
import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import type {HomepageNotice} from "@/features/homepage/homepage-notices";
import {cn} from "@/lib/utils";

const NOTICE_APPEARANCE: Record<HomepageNotice["tipo"], {
	label: string;
	icon: LucideIcon;
	className: string;
}> = {
	notizia: {label: "Notizia", icon: MegaphoneIcon, className: "homepage-notices-news"},
	evento: {label: "Evento", icon: CalendarDaysIcon, className: "homepage-notices-event"},
	problema: {label: "Problema", icon: TriangleAlertIcon, className: "homepage-notices-problem"},
};

const noticeDateFormatter = new Intl.DateTimeFormat("it-IT", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

interface HomepageNoticesProps {
	notices: readonly HomepageNotice[];
}

export default function HomepageNotices({notices}: HomepageNoticesProps) {
	const titleId = useId();
	if (notices.length === 0) return null;

	return (
		<section aria-labelledby={titleId} className="mx-auto max-w-370 px-4 pb-7 sm:px-6 sm:pb-8 lg:px-8">
			<Card className="homepage-notices gap-0 py-0">
				<CardHeader className="homepage-notices-header relative flex flex-row items-center gap-4 overflow-hidden px-5 py-6 sm:px-6">
					<span className="homepage-notices-emblem relative flex size-12 shrink-0 items-center justify-center" aria-hidden="true">
						<FlameIcon className="size-6" />
					</span>
					<div className="relative min-w-0 flex-1">
						<CardTitle>
							<h2 id={titleId} className="font-home-display text-2xl font-medium uppercase leading-none sm:text-3xl">
								Da non perdere
							</h2>
						</CardTitle>
						<CardDescription className="mt-2">Comunicazioni da Bacheca Dilettanti</CardDescription>
					</div>
					<div className="homepage-notices-count relative hidden flex-col items-end gap-1 sm:flex" aria-hidden="true">
						<span className="font-home-display text-3xl leading-none">{notices.length} NOTIZIE</span>
						<span className="text-[0.65rem] font-bold uppercase tracking-[0.16em]">In bacheca</span>
					</div>
				</CardHeader>
				<CardContent className="px-0">
					<Accordion defaultValue={[notices[0].id]} multiple={false}>
						{notices.map((notice) => {
							const appearance = NOTICE_APPEARANCE[notice.tipo];
							const Icon = appearance.icon;

							return (
								<AccordionItem key={notice.id} value={notice.id} className={cn("homepage-notices-item", appearance.className)}>
									<AccordionTrigger className="homepage-notices-trigger items-center gap-3 rounded-none px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
										<span className="homepage-notices-icon flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11" aria-hidden="true">
											<Icon className="size-5" />
										</span>
										<span className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
											<span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
												<Badge variant="outline" className="homepage-notices-type text-md">{appearance.label}</Badge>
												<time dateTime={notice.data} className="text-sm font-normal text-muted-foreground">
													{noticeDateFormatter.format(new Date(`${notice.data}T12:00:00Z`))}
												</time>
											</span>
											<span className="font-home-display wrap-break-word text-lg sm:text-2xl font-normal uppercase leading-tight">
												{notice.titolo}
											</span>
										</span>
									</AccordionTrigger>
									<AccordionContent className="h-auto px-4 pb-5 sm:pr-16 sm:pl-21">
										<p className="max-w-2xl whitespace-pre-line wrap-break-word text-base leading-6 text-muted-foreground">
											{notice.testo}
										</p>
										{notice.azione && (
											<Link
												href={notice.azione.href}
												className={cn(buttonVariants({variant: "link", size: "lg"}), "homepage-notices-action text-base mt-3 min-h-11 max-w-full justify-start gap-2 px-0 whitespace-normal")}
											>
												{notice.azione.etichetta}
												<ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
											</Link>
										)}
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				</CardContent>
			</Card>
		</section>
	);
}
