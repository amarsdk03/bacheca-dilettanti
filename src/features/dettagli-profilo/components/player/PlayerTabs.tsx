import type {ReactNode} from "react";
import ProfileTabs from "../ProfileTabs";

export default function PlayerTabs({overview, career, announcements, similarProfiles}: {
	overview: ReactNode;
	career: ReactNode;
	announcements: ReactNode;
	similarProfiles: ReactNode;
}) {
	return <ProfileTabs label="Informazioni del giocatore" overview={overview} career={career} announcements={announcements} similarProfiles={similarProfiles} presentation="profile" />;
}
