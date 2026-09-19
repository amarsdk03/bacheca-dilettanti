import DetailActionsClient from "@/features/segnalazioni/DetailActions";
import {getInteractionState} from "@/features/interazioni/server/queries";
import type {InteractionTarget} from "@/features/interazioni/interaction-model";

export default async function DetailActions({href, target}: {href: string; target: InteractionTarget}) {
	const interaction = await getInteractionState(target);
	return <DetailActionsClient href={href} target={target} interaction={interaction} />;
}
