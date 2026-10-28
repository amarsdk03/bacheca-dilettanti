import DetailIdentifier from "@/components/data-info/DetailIdentifier";

export default function ProfileIdentifier({profileId, name}: {profileId: string; name?: string}) {
	return <DetailIdentifier id={profileId} entity="profilo" entityLabel={name} />;
}
