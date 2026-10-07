import {type Dispatch, type SetStateAction} from "react";

import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {
	birthMonthNumber,
	daysInBirthMonth,
	getMinimumBirthDate,
	MINIMUM_PROFILE_AGE,
} from "@/features/profilo/birth-date";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {DATA_NASCITA_PLACEHOLDERS, MESI_OPTIONS,} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

const {anno: ANNO_PLACEHOLDER, mese: MESE_PLACEHOLDER, giorno: GIORNO_PLACEHOLDER} = DATA_NASCITA_PLACEHOLDERS;

type DataNascitaFieldsProps = {
	idPrefix: string;
	giornoNascita: string;
	setGiornoNascita: Dispatch<SetStateAction<string>>;
	meseNascita: string;
	setMeseNascita: Dispatch<SetStateAction<string>>;
	annoNascita: string;
	setAnnoNascita: Dispatch<SetStateAction<string>>;
	yearRequired?: boolean;
	yearError?: string;
};

export default function DataNascitaFields({
	idPrefix,
	giornoNascita,
	setGiornoNascita,
	meseNascita,
	setMeseNascita,
	annoNascita,
	setAnnoNascita,
	yearRequired = false,
	yearError,
}: DataNascitaFieldsProps) {
	const cutoff = getMinimumBirthDate();
	const selectedYear = /^\d{4}$/.test(annoNascita) ? Number(annoNascita) : null;
	const selectedMonth = birthMonthNumber(meseNascita);
	const yearOptions = Array.from(
		{length: cutoff.year - 1900 + 1},
		(_, index) => String(cutoff.year - index),
	);
	const monthOptions = selectedYear === cutoff.year
		? MESI_OPTIONS.slice(0, cutoff.month)
		: MESI_OPTIONS;
	const maximumDay = selectedYear && selectedMonth
		? Math.min(
			daysInBirthMonth(selectedYear, selectedMonth),
			selectedYear === cutoff.year && selectedMonth === cutoff.month ? cutoff.day : 31,
		)
		: 0;
	const dayOptions = Array.from(
		{length: maximumDay},
		(_, index) => String(index + 1).padStart(2, "0"),
	);

	return (
		<Field data-invalid={Boolean(yearError)}>
			<FieldLabel>
				Data di nascita {yearRequired ? <span aria-hidden="true" className="text-destructive">*</span> : <OptionalLabel />}
			</FieldLabel>
			<FieldGroup className="grid grid-cols-3 gap-1 sm:gap-3">
				<Field data-invalid={Boolean(yearError)}>
				<Select
					value={annoNascita || (yearRequired ? null : ANNO_PLACEHOLDER)}
					onValueChange={(value) => {
						if (value === ANNO_PLACEHOLDER) {
							setAnnoNascita("");
							setMeseNascita("");
							setGiornoNascita("");
							return;
						}

						const nextYear = Number(value);
						setAnnoNascita(value ?? "");
						if (nextYear === cutoff.year && selectedMonth && selectedMonth > cutoff.month) {
							setMeseNascita("");
							setGiornoNascita("");
							return;
						}
						if (selectedMonth && giornoNascita) {
							const maxDay = Math.min(
								daysInBirthMonth(nextYear, selectedMonth),
								nextYear === cutoff.year && selectedMonth === cutoff.month ? cutoff.day : 31,
							);
							if (Number(giornoNascita) > maxDay) setGiornoNascita("");
						}
					}}
				>
					<SelectTrigger id={`${idPrefix}-anno-nascita`} className="w-full" aria-required={yearRequired} aria-invalid={Boolean(yearError)}>
						<SelectValue placeholder="Anno" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
						{!yearRequired && <SelectItem value={ANNO_PLACEHOLDER}>Non specificare</SelectItem>}
						{yearOptions.map((anno) => (
							<SelectItem key={anno} value={anno}>{anno}</SelectItem>
						))}
						</SelectGroup>
					</SelectContent>
				</Select>
				</Field>

				<Select
					value={meseNascita || (yearRequired ? null : MESE_PLACEHOLDER)}
					onValueChange={(value) => {
						if (value === MESE_PLACEHOLDER) {
							setMeseNascita("");
							setGiornoNascita("");
							return;
						}

						const nextMonth = birthMonthNumber(value);
						setMeseNascita(value ?? "");
						if (selectedYear && nextMonth && giornoNascita) {
							const maxDay = Math.min(
								daysInBirthMonth(selectedYear, nextMonth),
								selectedYear === cutoff.year && nextMonth === cutoff.month ? cutoff.day : 31,
							);
							if (Number(giornoNascita) > maxDay) setGiornoNascita("");
						}
					}}
				>
					<SelectTrigger
						id={`${idPrefix}-mese-nascita`}
						className="w-full"
						disabled={selectedYear === null}
					>
						<SelectValue placeholder="Mese" />
					</SelectTrigger>
				<SelectContent>
					<SelectGroup>
					{!yearRequired && <SelectItem value={MESE_PLACEHOLDER}>Non specificare</SelectItem>}
					{monthOptions.map((mese) => (
						<SelectItem key={mese} value={mese}>{mese}</SelectItem>
					))}
					</SelectGroup>
				</SelectContent>
				</Select>

				<Select
					value={giornoNascita || (yearRequired ? null : GIORNO_PLACEHOLDER)}
					onValueChange={(value) => setGiornoNascita(value === GIORNO_PLACEHOLDER ? "" : value ?? "")}
				>
					<SelectTrigger
						id={`${idPrefix}-giorno-nascita`}
						className="w-full"
						disabled={selectedYear === null || selectedMonth === null}
					>
						<SelectValue placeholder="Giorno" />
					</SelectTrigger>
				<SelectContent>
					<SelectGroup>
					{!yearRequired && <SelectItem value={GIORNO_PLACEHOLDER}>Non specificare</SelectItem>}
					{dayOptions.map((giorno) => (
						<SelectItem key={giorno} value={giorno}>{giorno}</SelectItem>
					))}
					</SelectGroup>
				</SelectContent>
				</Select>
			</FieldGroup>
			<FieldDescription>Per pubblicare, devi avere almeno {MINIMUM_PROFILE_AGE} anni compiuti. Nel profilo pubblico verrà mostrata solo l&apos;età e l&apos;anno di nascita.</FieldDescription>
			{yearError && <FieldError>{yearError}</FieldError>}
		</Field>
	);
}
