import type {GenericProfileDetail} from "../../profile-detail-model";
import ProfileDetailsLayout from "../ProfileDetailsLayout";
import type {ProfileDetailPresentation} from "../profile-detail-presentation";

const PRESENTATION = {
	intro: "Competenze professionali per lo sport",
	summary: "Servizi e specializzazioni",
	narrativeFieldLabels: ["Specializzazioni", "Presentazione", "Servizi offerti", "Storico esperienze"],
} satisfies ProfileDetailPresentation;

export default function DettagliProfiloProfessionistiStudi({profile}: {profile: GenericProfileDetail<"professionisti-studi">}) {
	return <ProfileDetailsLayout profile={profile} presentation={PRESENTATION} />;
}
