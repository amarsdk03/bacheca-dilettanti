import {type Dispatch, type SetStateAction} from "react";

import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
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
};

export default function DataNascitaFields({
	idPrefix,
	giornoNascita,
	setGiornoNascita,
	meseNascita,
	setMeseNascita,
	annoNascita,
	setAnnoNascita,
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
		<Field>
			<FieldLabel>
				Data di nascita <OptionalLabel />
			</FieldLabel>
			<div className="grid grid-cols-3 gap-3">
				<Select
					value={annoNascita || ANNO_PLACEHOLDER}
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
					<SelectTrigger id={`${idPrefix}-anno-nascita`} className="w-full">
						<SelectValue placeholder="Anno" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ANNO_PLACEHOLDER}>Non specificare</SelectItem>
						{yearOptions.map((anno) => (
							<SelectItem key={anno} value={anno}>{anno}</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={meseNascita || MESE_PLACEHOLDER}
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
						<SelectItem value={MESE_PLACEHOLDER}>Non specificare</SelectItem>
						{monthOptions.map((mese) => (
							<SelectItem key={mese} value={mese}>{mese}</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={giornoNascita || GIORNO_PLACEHOLDER}
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
						<SelectItem value={GIORNO_PLACEHOLDER}>Non specificare</SelectItem>
						{dayOptions.map((giorno) => (
							<SelectItem key={giorno} value={giorno}>{giorno}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<FieldDescription>Devi avere almeno {MINIMUM_PROFILE_AGE} anni compiuti.</FieldDescription>
		</Field>
	);
}
