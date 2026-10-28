import {categoryLabel} from "@/features/pubblica-annuncio/types/category-catalog";
import {teamCategoryLabel} from "./team-category-catalog";

export function isTournamentCategory(value: string | null | undefined) {
	return Boolean(value?.endsWith("::Tornei"));
}
export function currentCategoryLabel(category: string | null | undefined, tournament?: string | null) {
	if (!category) return "";
	if (isTournamentCategory(category) && tournament?.trim()) return tournament.trim();
	return teamCategoryLabel(category) || categoryLabel(category);
}

export interface CurrentPlayerTeam {
	disponibilita?: string | null;
	categoria_attuale?: string | null;
	squadra_attuale_id?: number | null;
	squadra_attuale_profilo_id?: string | null;
	squadra_attuale_nome?: string | null;
	squadra_attuale_categoria?: string | null;
	squadra_attuale_torneo?: string | null;
	squadra_attuale_dal?: string | null;
	storico_carriera?: unknown;
}

/** The managed current row is derived, never stored among editable past experiences. */
export function currentPlayerCareer(player: CurrentPlayerTeam): unknown[] {
	const history = Array.isArray(player.storico_carriera) ? player.storico_carriera : [];
	const name = player.squadra_attuale_nome?.trim();
	if (player.disponibilita === "svincolato" || !name) return history;
	const category = currentCategoryLabel(player.categoria_attuale, player.squadra_attuale_torneo);
	const matching = (entry: unknown) => {
		if (!entry || typeof entry !== "object") return false;
		const row = entry as Record<string, unknown>;
		return row.periodoA === "oggi" && row.titolo === name && row.ente === category;
	};
	return [{id: "current-team", titolo: name, ente: category, periodoDa: player.squadra_attuale_dal ?? "", periodoA: "oggi", stato: "in-corso", descrizione: "", squadraProfiloId: player.squadra_attuale_profilo_id ?? null, squadraIstanzaId: player.squadra_attuale_id ?? null}, ...history.filter(entry => !matching(entry))];
}
