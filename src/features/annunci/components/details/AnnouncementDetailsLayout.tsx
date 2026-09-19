import type {AnnouncementDetail, AnnouncementPlayerRoles,} from "@/features/annunci/announcement-model";
import AnnouncementDetailsContacts from "./AnnouncementDetailsContacts";
import AnnouncementDetailsHeader from "./AnnouncementDetailsHeader";
import AnnouncementDetailsOverview from "./AnnouncementDetailsOverview";
import type {AnnouncementDetailPresentation} from "./announcement-detail-presentation";

export default function AnnouncementDetailsLayout({
	announcement,
	presentation,
	playerRoles,
}: {
	announcement: AnnouncementDetail;
	presentation: AnnouncementDetailPresentation;
	playerRoles?: AnnouncementPlayerRoles;
}) {
	return (
		<div className="flex flex-col gap-6 font-home-body">
			<AnnouncementDetailsHeader
				announcement={announcement}
				presentation={presentation}
				playerRoles={playerRoles}
			/>
			<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
				<AnnouncementDetailsOverview announcement={announcement} presentation={presentation} />
				<AnnouncementDetailsContacts
					contacts={announcement.contacts}
					unavailable={announcement.contactsUnavailable}
				/>
			</div>
		</div>
	);
}
