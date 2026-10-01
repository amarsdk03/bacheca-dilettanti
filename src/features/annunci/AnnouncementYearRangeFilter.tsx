"use client";

import {useState} from "react";
import {Field, FieldLabel} from "@/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ANNOUNCEMENT_FILTER_OPTIONS} from "./announcement-model";

export default function AnnouncementYearRangeFilter({from, to, idPrefix}: {from: string; to: string; idPrefix: string}) {
	const years = ANNOUNCEMENT_FILTER_OPTIONS.annate;
	const [selectedFrom, setSelectedFrom] = useState(from);
	const [selectedTo, setSelectedTo] = useState(from ? to || years[0] : "");
	const endYears = years.filter(year => Number(year) >= Number(selectedFrom));

	return <>
		<Field>
			<FieldLabel htmlFor={`${idPrefix}-anno-da`}>Annate dal</FieldLabel>
			<Select name="annoDa" value={selectedFrom || null} onValueChange={value => {
				const next = value ?? "";
				setSelectedFrom(next);
				setSelectedTo(next ? selectedTo && Number(selectedTo) >= Number(next) ? selectedTo : years[0] : "");
			}}>
				<SelectTrigger id={`${idPrefix}-anno-da`} className="w-full"><SelectValue placeholder="Qualsiasi" /></SelectTrigger>
				<SelectContent alignItemWithTrigger={false}><SelectGroup>
					<SelectItem value={null}>Qualsiasi</SelectItem>
					{years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
				</SelectGroup></SelectContent>
			</Select>
		</Field>
		<Field data-disabled={!selectedFrom}>
			<FieldLabel htmlFor={`${idPrefix}-anno-a`}>Annate al</FieldLabel>
			<Select name="annoA" value={selectedFrom ? selectedTo : null} onValueChange={value => setSelectedTo(value ?? years[0])} disabled={!selectedFrom}>
				<SelectTrigger id={`${idPrefix}-anno-a`} className="w-full"><SelectValue placeholder="Seleziona prima Annate dal" /></SelectTrigger>
				<SelectContent alignItemWithTrigger={false}><SelectGroup>
					{endYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
				</SelectGroup></SelectContent>
			</Select>
		</Field>
	</>;
}
