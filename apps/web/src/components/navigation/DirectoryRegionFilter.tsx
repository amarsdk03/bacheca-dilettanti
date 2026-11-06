"use client";

import {useEffect, useState, useTransition} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {FieldLegend, FieldSet} from "@/components/ui/field";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Spinner} from "@/components/ui/spinner";
import {REGIONI_ITALIANE} from "@/const/defaultConstants";

export default function DirectoryRegionFilter({action, entries, selected, counts, countsPromise}: {
	action: string;
	entries: Array<[string, string]>;
	selected: string[];
	counts?: Record<string, number>;
	countsPromise?: Promise<Record<string, number> | undefined>;
}) {
	const [loadedCounts, setLoadedCounts] = useState<Record<string, number>>();
	useEffect(() => {
		let active = true;
		countsPromise?.then(next => {if (active) setLoadedCounts(next);}, () => {});
		return () => {active = false;};
	}, [countsPromise]);
	const regionCounts = counts ?? loadedCounts;
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(selected);
	const [pending, startTransition] = useTransition();
	function apply(regions: string[]) {
		const params = new URLSearchParams(entries.filter(([key]) => key !== "regione" && key !== "page"));
		regions.forEach(region => params.append("regione", region));
		startTransition(() => router.push(params.size ? `${action}?${params}` : action));
		setOpen(false);
	}
	return <Sheet open={open} onOpenChange={next => {setDraft(selected); setOpen(next);}}>
		<SheetTrigger render={<Button type="button" variant="outline" size="lg" className="h-12 shrink-0" />} aria-label={`Apri le regioni, ${selected.length} selezionate`}>
			<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="m8 2 5 2 3-1 1 5 4 3-3 4 1 4-5 1-3 2-3-4-5-1 1-5-2-3 4-3Z" /></svg>
			<span className="hidden sm:inline">Regioni</span>
			{selected.length > 0 && <Badge variant="secondary" className="hidden sm:inline-flex">{selected.length}</Badge>}
		</SheetTrigger>
		<SheetContent side="left">
			<SheetHeader><SheetTitle>Seleziona le regioni</SheetTitle><SheetDescription>Scegli una o più regioni. Senza selezioni la ricerca comprende tutta Italia.</SheetDescription></SheetHeader>
			<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
				{(["Nord", "Centro", "Sud"] as const).map(area => <FieldSet key={area}>
					<FieldLegend>{area}</FieldLegend>
					<ToggleGroup multiple variant="outline" spacing={2} value={draft} onValueChange={next => {
						const other = draft.filter(name => !REGIONI_ITALIANE.some(region => region.area === area && region.nome === name));
						setDraft([...other, ...next.filter(name => REGIONI_ITALIANE.some(region => region.area === area && region.nome === name))]);
					}} aria-label={`Regioni del ${area}`} className="flex flex-wrap justify-start gap-2">
						{REGIONI_ITALIANE.filter(region => region.area === area).map(({nome}) => <ToggleGroupItem key={nome} value={nome} className="rounded-lg px-3">
							{nome}{regionCounts && <span className="tabular-nums text-muted-foreground">{regionCounts[nome] ?? 0}</span>}
						</ToggleGroupItem>)}
					</ToggleGroup>
				</FieldSet>)}
			</div>
			<div className="flex shrink-0 gap-2 border-t p-4">
				<Button type="button" disabled={pending} onClick={() => apply(draft)} className="flex-1">{pending && <Spinner data-icon="inline-start" />}Conferma scelte</Button>
				<Button type="button" variant="outline" disabled={pending} onClick={() => apply([])}>Azzera</Button>
			</div>
		</SheetContent>
	</Sheet>;
}
