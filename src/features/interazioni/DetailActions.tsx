import DetailActionsClient from "@/features/segnalazioni/DetailActions";
import {getInteractionState} from "@/features/interazioni/server/queries";
import type {InteractionTarget} from "@/features/interazioni/interaction-model";

export default async function DetailActions({href, target, presentation = "default", shareOnly = false}: {href: string; target: InteractionTarget; presentation?: "default" | "profile" | "announcement"; shareOnly?: boolean}) {
	const interaction = shareOnly ? {status: "guest" as const} : await getInteractionState(target);
	return <DetailActionsClient href={href} target={target} interaction={interaction} presentation={presentation} shareOnly={shareOnly} />;
}
