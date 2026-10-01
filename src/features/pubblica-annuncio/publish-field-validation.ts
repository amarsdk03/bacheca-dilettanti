const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MONEY_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

export const FACILITY_WEEKDAYS = [
	"lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica",
] as const;

export interface FacilityOpeningHour {
	giorno: typeof FACILITY_WEEKDAYS[number];
	attivo: boolean;
	dalle: string;
	alle: string;
}

export function isValidIsoDate(value: string): boolean {
	if (!ISO_DATE_PATTERN.test(value) || value.startsWith("0000-")) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: string): boolean {
	return TIME_PATTERN.test(value);
}

export function normalizeOptionalTime(value: unknown): string | null | undefined {
	if (value === null || value === undefined) return null;
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const incompleteHour = trimmed.match(/^([01]?\d|2[0-3])(?::(?:--)?)?$/);
	const normalized = incompleteHour
		? `${incompleteHour[1].padStart(2, "0")}:00`
		: trimmed;
	return isValidTime(normalized) ? normalized : undefined;
}

export function normalizeFacilityOpeningHours(value: unknown): FacilityOpeningHour[] | undefined {
	if (!Array.isArray(value) || value.length > FACILITY_WEEKDAYS.length) return undefined;
	const byDay = new Map<string, FacilityOpeningHour>();
	for (const entry of value) {
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) return undefined;
		const record = entry as Record<string, unknown>;
		if (Object.keys(record).some((key) => !["giorno", "attivo", "dalle", "alle"].includes(key))) return undefined;
		if (!(FACILITY_WEEKDAYS as readonly unknown[]).includes(record.giorno) || typeof record.attivo !== "boolean") return undefined;
		if (byDay.has(record.giorno as string)) return undefined;
		const from = record.attivo ? normalizeOptionalTime(record.dalle) : null;
		const to = record.attivo ? normalizeOptionalTime(record.alle) : null;
		if (from === undefined || to === undefined) return undefined;
		byDay.set(record.giorno as string, {
			giorno: record.giorno as FacilityOpeningHour["giorno"],
			attivo: record.attivo,
			dalle: from ?? "",
			alle: to ?? "",
		});
	}
	return FACILITY_WEEKDAYS.map((giorno) => byDay.get(giorno) ?? {giorno, attivo: false, dalle: "", alle: ""});
}

export function isValidPhone(value: string): boolean {
	const digits = value.replace(/\D/g, "");
	return value.length <= 40 && digits.length >= 6 && digits.length <= 20 && /^[+\d().\s-]+$/.test(value);
}

export function parseOptionalMoney(value: unknown): number | null | undefined {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value !== "number" && typeof value !== "string") return undefined;
	const normalized = String(value).trim().replace(",", ".");
	if (!normalized) return null;
	if (!MONEY_PATTERN.test(normalized)) return undefined;
	const amount = Number(normalized);
	return Number.isFinite(amount) && amount <= 99_999_999.99 ? amount : undefined;
}
