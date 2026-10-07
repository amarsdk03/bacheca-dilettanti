import DetailActionsClient from "@/features/segnalazioni/DetailActions";
import {getInteractionState} from "@/features/interazioni/server/queries";
import type {InteractionTarget} from "@/features/interazioni/interaction-model";
import {getInterestContext} from "@/features/interessi/server/queries";
import type {InterestTarget} from "@/features/interessi/interest-model";

export default async function DetailActions({href, target, interestTarget, presentation = "default", shareOnly = false}: {href: string; target: InteractionTarget; interestTarget?: InterestTarget; presentation?: "default" | "profile" | "announcement"; shareOnly?: boolean}) {
	const [interaction, interestContext] = await Promise.all([
		shareOnly ? {status: "guest" as const} : getInteractionState(target),
		!shareOnly && presentation !== "default" && interestTarget ? getInterestContext(interestTarget) : null,
	]);
	return <DetailActionsClient href={href} target={target} interaction={interaction} interestTarget={interestTarget} interestContext={interestContext} presentation={presentation} shareOnly={shareOnly} />;
}
