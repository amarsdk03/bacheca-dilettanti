import type {ReactNode} from "react";
import {ShirtIcon, TagsIcon} from "lucide-react";
import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	facts: [
		{label: "Tipologia calcio", icon: ShirtIcon},
		{label: "Categoria attuale", icon: TagsIcon},
	],
	narrativeFieldLabels: [],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloSquadra({profile, actions}: {profile: GenericProfileDetail<"squadra">; actions?: ReactNode}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} actions={actions} />;
}
