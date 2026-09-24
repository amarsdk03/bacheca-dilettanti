const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MONEY_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;

export function isValidIsoDate(value: string): boolean {
	if (!ISO_DATE_PATTERN.test(value) || value.startsWith("0000-")) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: string): boolean {
	return TIME_PATTERN.test(value);
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
