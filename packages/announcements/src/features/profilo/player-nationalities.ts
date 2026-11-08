const countryNames = new Intl.DisplayNames(["it"], {type: "region"});
const NON_COUNTRY_CODES = new Set([
	"AC", "CP", "DG", "EA", "EU", "EZ", "IC", "QO", "TA", "UN", "XA", "XB", "ZZ",
	"DY", "HV", "ZR", "AN", "FX", "DD", "BU", "UK", "SU", "CQ", "CS", "YU", "TP", "NH", "VD", "YD", "RH",
]);

export const PLAYER_NATIONALITIES = Array.from({length: 26 * 26}, (_, index) => {
	const code = String.fromCharCode(65 + Math.floor(index / 26), 65 + index % 26);
	return {code, label: countryNames.of(code) ?? code};
})
	.filter(({code, label}) => label !== code && !NON_COUNTRY_CODES.has(code))
	.sort((left, right) => left.label.localeCompare(right.label, "it"));

const PLAYER_NATIONALITY_CODES = new Set(PLAYER_NATIONALITIES.map(({code}) => code));

export function isPlayerNationalityCode(code: string | null | undefined): boolean {
	return typeof code === "string" && PLAYER_NATIONALITY_CODES.has(code);
}

export function nationalityLabel(code: string | null | undefined): string | null {
	return PLAYER_NATIONALITIES.find((item) => item.code === code)?.label ?? null;
}
