import DetailIdentifier from "@/components/data-info/DetailIdentifier";

export default function ProfileIdentifier({profileId}: {profileId: string}) {
	return <DetailIdentifier id={profileId} entity="profilo" />;
}
