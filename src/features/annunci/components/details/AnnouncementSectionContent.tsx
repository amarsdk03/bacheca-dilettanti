import {
	AwardIcon, Building2Icon, CalendarDaysIcon, CarIcon, CheckIcon, Clock3Icon,
	MapPinIcon, SparklesIcon, TagIcon, TargetIcon, TrophyIcon, UsersIcon,
} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import StructuredFieldList from "@/components/data-info/StructuredFieldList";
import {cn} from "@/lib/utils";
import type {AnnouncementDetailSection} from "@/features/annunci/announcement-model";
import {groupPublicProfileLocations} from "@/features/profilo/public-profile-locations";

function FieldIcon({id}: {id: string}) {
	const Icon = id === "car" || id === "travel" ? CarIcon
		: id === "hours" || id === "time" ? Clock3Icon
			: id === "company-type" || id === "field" ? Building2Icon
				: id === "team-group" || id === "figures" ? UsersIcon
					: id === "content-types" || id === "availability" ? SparklesIcon
						: id === "roles" || id === "specific-roles" ? TargetIcon
							: id === "football" || id === "field-types" ? TrophyIcon : CalendarDaysIcon;
	return <Icon aria-hidden="true" className="profile-detail-accent size-5 shrink-0" />;
}

function Prose({value, offer = false}: {value: string; offer?: boolean}) {
	const short = value.length <= 80 && !/[\r\n]/.test(value);
	return <div className={cn("min-w-0", offer && "rounded-xl bg-muted/50 p-4 sm:p-6")}>
		{offer && <TagIcon aria-hidden="true" className="profile-detail-accent mx-auto mb-3 size-6" />}
		<p className={cn("whitespace-pre-wrap wrap-anywhere", short
			? "text-center text-xl leading-relaxed font-medium lg:text-2xl"
			: "text-base leading-relaxed lg:text-lg")}>{value}</p>
	</div>;
}

function Locations({section}: {section: AnnouncementDetailSection}) {
	const groups = groupPublicProfileLocations(section.locations ?? []);
	return <div className="flex min-w-0 flex-col gap-4">
		{groups.length > 0 && <ul className={cn("grid gap-3", groups.length > 1 && "sm:grid-cols-2")}>
			{groups.map(group => <li key={group.region} className="flex min-w-0 items-start gap-3 rounded-xl bg-muted/40 p-4 sm:p-5">
				<MapPinIcon aria-hidden="true" className="profile-detail-accent mt-1 size-5 shrink-0" />
				<div className="min-w-0 flex-1 wrap-anywhere">
					{group.hasWholeRegion ? <>
						<p className="text-xl font-semibold lg:text-2xl">{group.region}</p>
						<p className="mt-1 text-sm text-muted-foreground">Intera regione</p>
					</> : <>
						<p className="text-xl font-semibold lg:text-2xl">{group.cities.join(", ")}</p>
						<p className="mt-1 text-sm text-muted-foreground">{group.region}</p>
					</>}
				</div>
			</li>)}
		</ul>}
		{section.value && <Prose value={section.value} />}
	</div>;
}

export default function AnnouncementSectionContent({section}: {section: AnnouncementDetailSection}) {
	const presentation = section.presentation;
	const groups = groupPublicProfileLocations(section.locations ?? []);
	const structuredContent = presentation && (
		presentation.kind === "metric"
		|| presentation.kind === "scalar" && Boolean(presentation.value)
		|| (presentation.kind === "schedule" || presentation.kind === "prizes" || presentation.kind === "history") && presentation.rows.length > 0
		|| presentation.kind === "checklist" && presentation.items.length > 0
	);
	if (!section.value && !section.items?.length && !groups.length && !structuredContent) {
		return <p className="py-2 text-center text-base text-muted-foreground">{section.emptyLabel}</p>;
	}
	if (presentation?.kind === "locations" || !presentation && groups.length > 0) return <Locations section={section} />;
	if (presentation?.kind === "metric") return <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/40 px-4 py-6 text-center wrap-anywhere">
		{presentation.qualifier && <p className="text-sm text-muted-foreground">{presentation.qualifier}</p>}
		<p className="max-w-full text-3xl leading-tight font-semibold tracking-tight tabular-nums lg:text-4xl">{presentation.amount}</p>
		{presentation.unit && <p className="text-base text-muted-foreground">{presentation.unit}</p>}
	</div>;
	if (presentation?.kind === "scalar") {
		const value = presentation.value ?? section.value ?? section.items?.join(", ") ?? "";
		return <div className="flex flex-col items-center gap-3 py-3 text-center">
			<FieldIcon id={section.id} />
			<p className={cn("max-w-full leading-snug font-semibold whitespace-pre-wrap wrap-anywhere", value.length <= 80 ? "text-2xl lg:text-3xl" : "text-lg lg:text-xl")}>{value}</p>
			{presentation.secondary && <p className="text-base text-muted-foreground">{presentation.secondary}</p>}
		</div>;
	}
	if (presentation?.kind === "choices" || presentation?.kind === "categories") {
		const items = section.items?.length ? section.items : section.value ? [section.value] : [];
		const categories = presentation.kind === "categories";
		const compact = items.length >= 4;
		return <ul className={cn("grid gap-3", !categories && items.length > 1 && "sm:grid-cols-2")}>
			{items.map((item, index) => <li key={`${item}-${index}`} className={cn("flex min-w-0 items-start gap-3 rounded-xl bg-muted/40 p-4", categories && "border-l-2 border-primary")}>
				{categories ? <TrophyIcon aria-hidden="true" className="profile-detail-accent mt-1 size-5 shrink-0" /> : <FieldIcon id={section.id} />}
				<p className={cn("min-w-0 flex-1 leading-relaxed font-medium wrap-anywhere", compact || categories ? "text-base lg:text-lg" : "text-lg lg:text-xl")}>{item}</p>
			</li>)}
		</ul>;
	}
	if (presentation?.kind === "schedule") return <dl className="flex flex-col gap-2">
		{presentation.rows.map(({day, from, to}) => <div key={day} className="grid min-w-0 gap-2 rounded-xl bg-muted/40 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center sm:gap-4">
			<dt className="flex min-w-0 items-center gap-2 font-medium"><Clock3Icon aria-hidden="true" className="profile-detail-accent size-4 shrink-0" />{day}</dt>
			<dd className={cn("min-w-0 wrap-anywhere sm:text-right", from || to ? "text-xl font-semibold tabular-nums lg:text-2xl" : "text-sm text-muted-foreground")}>
				{from && to ? `${from} – ${to}` : from ? `Dalle ${from}` : to ? `Fino alle ${to}` : "Orario da definire"}
			</dd>
		</div>)}
	</dl>;
	if (presentation?.kind === "prizes") return <ul className={cn("grid gap-3", presentation.rows.length > 1 && "sm:grid-cols-2")}>
		{presentation.rows.map(({place, title}, index) => <li key={index} className="flex min-w-0 flex-col items-center gap-3 rounded-xl bg-muted/40 p-5 text-center">
			<TrophyIcon aria-hidden="true" className="profile-detail-accent size-7" />
			{place && <p className="max-w-full text-sm font-medium text-muted-foreground wrap-anywhere">{place}</p>}
			<p className={cn("max-w-full leading-snug font-semibold wrap-anywhere", title.length <= 80 ? "text-xl lg:text-2xl" : "text-base lg:text-lg")}>{title}</p>
		</li>)}
	</ul>;
	if (presentation?.kind === "history") return <ol className="ml-2 flex flex-col gap-5 border-l border-border">
		{presentation.rows.map((row, index) => <li key={index} className="relative min-w-0 pl-5 sm:pl-6">
			<span aria-hidden="true" className="absolute top-5 -left-1.5 size-3 rounded-full bg-primary ring-4 ring-card" />
			<article className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/40 p-4 sm:p-5">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<h3 className="min-w-0 flex-1 text-lg leading-snug font-semibold wrap-anywhere lg:text-xl">{row.title}</h3>
					{row.status && <Badge variant={row.status === "in-corso" ? "default" : "secondary"}>{row.status === "in-corso" ? "In corso" : "Conseguito"}</Badge>}
				</div>
				{row.organization && <p className="flex items-start gap-2 text-base"><AwardIcon aria-hidden="true" className="mt-1 size-4 shrink-0" /><span className="min-w-0 wrap-anywhere">{row.organization}</span></p>}
				{row.period && <p className="flex items-start gap-2 text-sm text-muted-foreground"><CalendarDaysIcon aria-hidden="true" className="mt-1 size-4 shrink-0" /><span className="min-w-0 wrap-anywhere">{row.period}</span></p>}
				{row.description && <p className="text-base leading-relaxed whitespace-pre-wrap wrap-anywhere lg:text-lg">{row.description}</p>}
			</article>
		</li>)}
	</ol>;
	if (presentation?.kind === "checklist") return <ul className="grid gap-3 sm:grid-cols-2">
		{presentation.items.map((item, index) => <li key={index} className="flex min-w-0 items-start gap-3 rounded-xl bg-muted/40 p-4">
			<CheckIcon aria-hidden="true" className="profile-detail-accent mt-1 size-5 shrink-0" /><span className="min-w-0 text-base leading-relaxed wrap-anywhere lg:text-lg">{item}</span>
		</li>)}
	</ul>;
	return <div className="flex min-w-0 flex-col gap-4">
		{section.items?.length ? <StructuredFieldList items={section.items} style="rows" /> : section.value && <Prose value={section.value} offer={presentation?.kind === "offer"} />}
	</div>;
}
