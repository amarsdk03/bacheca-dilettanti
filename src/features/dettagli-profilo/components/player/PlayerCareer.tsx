import {AwardIcon, CalendarDaysIcon, RouteIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import type {PlayerCareerEntry} from "../../profile-detail-model";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";

export default function PlayerCareer({entries}: {entries: PlayerCareerEntry[]}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle><h2 className="font-home-display text-2xl uppercase">Carriera</h2></CardTitle>
			</CardHeader>
			<CardContent>
				{entries.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon"><RouteIcon aria-hidden="true" /></EmptyMedia>
							<EmptyTitle>Nessuna esperienza inserita</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					<ol className="ml-2 border-l border-border">
						{entries.map((entry) => {
							const period = [entry.from, entry.to ?? (entry.status === "in-corso" ? "In corso" : null)].filter(Boolean).join(" — ");
							return (
								<li key={entry.id} className="relative pb-8 pl-6 last:pb-0 sm:pl-8">
									<span aria-hidden="true" className="profile-detail-accent absolute top-2 -left-1.5 size-3 rounded-full bg-current ring-4 ring-card" />
									<article className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 sm:p-5">
										<div className="flex flex-wrap items-start justify-between gap-2">
										{entry.linkedTeam
											? <TeamProfileLinks teams={[entry.linkedTeam]} />
											: <h3 className="text-lg font-semibold wrap-anywhere">{entry.title}</h3>}
											{entry.status && <Badge variant={entry.status === "in-corso" ? "default" : "secondary"}>{entry.status === "in-corso" ? "In corso" : "Conseguito"}</Badge>}
										</div>
										{entry.organization && <p className="flex items-start gap-2 text-sm"><AwardIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="wrap-anywhere">{entry.organization}</span></p>}
										{period && <p className="flex items-start gap-2 text-sm text-muted-foreground"><CalendarDaysIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="wrap-anywhere">{period}</span></p>}
										{entry.description && <p className="text-sm leading-6 whitespace-pre-wrap wrap-anywhere">{entry.description}</p>}
									</article>
								</li>
							);
						})}
					</ol>
				)}
			</CardContent>
		</Card>
	);
}
