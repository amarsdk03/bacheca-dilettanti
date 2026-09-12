export const MINIMUM_PROFILE_AGE = 14;

export const BIRTH_MONTHS = [
	"Gennaio",
	"Febbraio",
	"Marzo",
	"Aprile",
	"Maggio",
	"Giugno",
	"Luglio",
	"Agosto",
	"Settembre",
	"Ottobre",
	"Novembre",
	"Dicembre",
] as const;

export interface BirthDateValue {
	day: string | null | undefined;
	month: string | null | undefined;
	year: string | null | undefined;
}

export interface CalendarDateParts {
	day: number;
	month: number;
	year: number;
}

const ITALY_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
	day: "numeric",
	month: "numeric",
	timeZone: "Europe/Rome",
	year: "numeric",
});

function trimmed(value: string | null | undefined) {
	return value?.trim() ?? "";
}

export function getItalyDateParts(now = new Date()): CalendarDateParts {
	const parts = Object.fromEntries(
		ITALY_DATE_FORMATTER.formatToParts(now).map(({type, value}) => [type, value]),
	);
	return {
		day: Number(parts.day),
		month: Number(parts.month),
		year: Number(parts.year),
	};
}

export function getMinimumBirthDate(now = new Date()): CalendarDateParts {
	const today = getItalyDateParts(now);
	return {...today, year: today.year - MINIMUM_PROFILE_AGE};
}

export function birthMonthNumber(month: string | null | undefined) {
	const index = BIRTH_MONTHS.indexOf(trimmed(month) as typeof BIRTH_MONTHS[number]);
	return index >= 0 ? index + 1 : null;
}

export function daysInBirthMonth(year: number, month: number) {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getBirthDateError(value: BirthDateValue, now = new Date()): string | null {
	const dayText = trimmed(value.day);
	const monthText = trimmed(value.month);
	const yearText = trimmed(value.year);

	if (!dayText && !monthText && !yearText) return null;
	if (!/^\d{4}$/.test(yearText)) return "La data di nascita inserita non è valida.";

	const year = Number(yearText);
	const cutoff = getMinimumBirthDate(now);
	if (year < 1900) return "La data di nascita inserita non è valida.";
	if (year > cutoff.year) return `Devi avere almeno ${MINIMUM_PROFILE_AGE} anni compiuti.`;

	const month = monthText ? birthMonthNumber(monthText) : null;
	if (monthText && month === null) return "La data di nascita inserita non è valida.";
	if (dayText && month === null) return "La data di nascita inserita non è valida.";

	let day: number | null = null;
	if (dayText) {
		if (!/^\d{1,2}$/.test(dayText)) return "La data di nascita inserita non è valida.";
		day = Number(dayText);
		if (month === null || day < 1 || day > daysInBirthMonth(year, month)) {
			return "La data di nascita inserita non è valida.";
		}
	}

	if (year < cutoff.year) return null;
	if (month === null || month > cutoff.month) {
		return `Devi avere almeno ${MINIMUM_PROFILE_AGE} anni compiuti.`;
	}
	if (month < cutoff.month) return null;
	if (day === null || day > cutoff.day) {
		return `Devi avere almeno ${MINIMUM_PROFILE_AGE} anni compiuti.`;
	}

	return null;
}

export function isCompleteValidBirthDate(value: BirthDateValue, now = new Date()) {
	return Boolean(trimmed(value.day) && trimmed(value.month) && trimmed(value.year))
		&& getBirthDateError(value, now) === null;
}
