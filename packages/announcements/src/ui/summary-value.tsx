import type {ElementType} from "react";
import type {AnnouncementDetailSection} from "../features/annunci/announcement-model.ts";
import {summaryLocationGroups} from "../features/annunci/announcement-summary.ts";
export function createAnnouncementSummaryValue({Badge}: {Badge: ElementType}) {
return function AnnouncementSummaryValue({section, compact = false}: {section: AnnouncementDetailSection; compact?: boolean}) {
	const presentation = section.presentation;
	const listClass = compact ? "flex min-w-0 flex-col gap-1" : "flex min-w-0 flex-col gap-2";
	if (section.locations?.length) return <div className={listClass}>
		<ul className={listClass}>{summaryLocationGroups(section.locations).map(({region, cities}) => <li key={region}>
			<span className="font-medium">{region}:</span> {cities.length ? cities.join(", ") : "tutta la regione"}
		</li>)}</ul>
		{section.value && <p>{section.value}</p>}
	</div>;
	if (presentation?.kind === "metric") return <span className="tabular-nums">{[presentation.qualifier, presentation.amount, presentation.unit].filter(Boolean).join(" ")}</span>;
	if (presentation?.kind === "scalar" && presentation.value) return <>{presentation.value}{presentation.secondary && <span className="block text-muted-foreground">{presentation.secondary}</span>}</>;
	if (presentation?.kind === "schedule" && presentation.rows.length) return <ul className={listClass}>
		{presentation.rows.map(({day, from, to}) => <li key={day} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
			<span className="font-medium">{day}</span><span className="tabular-nums">{from && to ? `${from} – ${to}` : from ? `Dalle ${from}` : to ? `Fino alle ${to}` : "Orario da definire"}</span>
		</li>)}
	</ul>;
	if (presentation?.kind === "prizes" && presentation.rows.length) return <ul className={listClass}>
		{presentation.rows.map(({place, title}, index) => <li key={index}>{place && <span className="font-medium">{place}: </span>}{title}</li>)}
	</ul>;
	if (presentation?.kind === "history" && presentation.rows.length) return <ul className="flex min-w-0 flex-col gap-4">
		{presentation.rows.map((row, index) => <li key={index} className="flex min-w-0 flex-col gap-1.5">
			<div className="flex flex-wrap items-center gap-2"><span className="font-medium">{row.title}</span>{row.status && <Badge variant="secondary">{row.status === "in-corso" ? "In corso" : "Conseguito"}</Badge>}</div>
			{row.organization && <p>{row.organization}</p>}
			{row.period && <p className="text-muted-foreground">{row.period}</p>}
			{row.description && <p>{row.description}</p>}
		</li>)}
	</ul>;
	if (presentation?.kind === "player-career" && presentation.rows.length) return <ul className="flex min-w-0 flex-col gap-4">
		{presentation.rows.map((row, index) => <li key={index} className="flex flex-col gap-1.5">
			<p>{[row.category, row.team].filter(Boolean).join(" · ") || "Categoria non specificata"}</p>{row.period && <p className="text-muted-foreground">{row.period}</p>}
		</li>)}
	</ul>;
	const items = presentation?.kind === "checklist" ? presentation.items : section.items;
	if (items?.length) return <ul className={listClass}>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>;
	return <>{section.value ?? (section.locations ? "Nessuna località indicata" : section.emptyLabel)}</>;
}

}
