const countryNames = new Intl.DisplayNames(["it"], {type: "region"});
const NON_COUNTRY_CODES = new Set(["AC", "CP", "DG", "EA", "EU", "EZ", "IC", "QO", "TA", "UN", "XA", "XB", "ZZ"]);

export const PLAYER_NATIONALITIES = Array.from({length: 26 * 26}, (_, index) => {
	const code = String.fromCharCode(65 + Math.floor(index / 26), 65 + index % 26);
	return {code, label: countryNames.of(code) ?? code};
})
	.filter(({code, label}) => label !== code && !NON_COUNTRY_CODES.has(code))
	.sort((left, right) => left.label.localeCompare(right.label, "it"));

export function nationalityFlag(code: string): string {
	return /^[A-Z]{2}$/.test(code)
		? [...code].map((letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join("")
		: "";
}

export function nationalityLabel(code: string | null | undefined): string | null {
	return PLAYER_NATIONALITIES.find((item) => item.code === code)?.label ?? null;
}
