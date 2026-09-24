import type {PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import ProfileLocationsCard from "@/features/dettagli-profilo/components/ProfileLocationsCard";

export default function AnnouncementLocationCard({locations}: {locations: PublicProfileLocation[]}) {
	return <ProfileLocationsCard locations={locations} />;
}
