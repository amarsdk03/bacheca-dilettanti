import {Building2Icon, CalendarDaysIcon, RouteIcon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import type {PublicProfileExperience} from "@/features/dettagli-profilo/profile-detail-model";
import TeamProfileLinks from "@/features/profilo/TeamProfileLinks";

export default function ProfileExperienceHistory({experiences}: {experiences: PublicProfileExperience[]}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle><h2 className="font-home-display text-2xl uppercase">Esperienze</h2></CardTitle>
			</CardHeader>
			<CardContent>
				{experiences.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon"><RouteIcon aria-hidden="true" /></EmptyMedia>
							<EmptyTitle>Nessuna esperienza inserita</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : <ol className="ml-2 border-l border-border">
					{experiences.map((experience) => {
						const period = [
							experience.from,
							experience.to ?? (experience.status === "in-corso" ? "In corso" : null),
						].filter(Boolean).join(" — ");
						return (
							<li key={experience.id} className="relative pb-8 pl-6 last:pb-0 sm:pl-8">
								<span aria-hidden="true" className="profile-detail-accent absolute top-2 -left-1.5 size-3 rounded-full bg-current ring-4 ring-card" />
								<article className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/40 p-4 sm:p-5">
									<div className="flex flex-wrap items-start justify-between gap-2">
										<h3 className="min-w-0 text-lg font-semibold wrap-anywhere">
											{experience.title}
										</h3>
										{experience.status && <Badge variant={experience.status === "in-corso" ? "default" : "secondary"}>{experience.status === "in-corso" ? "In corso" : "Conseguito"}</Badge>}
									</div>
									{experience.linkedTeam ? (
										<TeamProfileLinks teams={[experience.linkedTeam]} />
									) : experience.organization ? (
										<p className="flex items-start gap-2 text-sm"><Building2Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="wrap-anywhere">{experience.organization}</span></p>
									) : null}
									{period && <p className="flex items-start gap-2 text-sm text-muted-foreground"><CalendarDaysIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="wrap-anywhere">{period}</span></p>}
									{experience.description && <p className="text-sm leading-6 whitespace-pre-wrap wrap-anywhere">{experience.description}</p>}
								</article>
							</li>
						);
					})}
				</ol>}
			</CardContent>
		</Card>
	);
}
