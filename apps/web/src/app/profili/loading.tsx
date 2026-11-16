import {DirectoryPageSkeleton, NavbarSkeleton} from "@/components/loading/PageSkeletons";
import Footer from "@/components/navigation/Footer";
import ProfiliComingSoon from "@/features/profili/ProfiliComingSoon";
import {PROFILE_DIRECTORY_COMING_SOON} from "@/features/profili/profile-directory-availability";

export default function Loading() {
	if (PROFILE_DIRECTORY_COMING_SOON) return <><NavbarSkeleton /><ProfiliComingSoon /><Footer /></>;
	return <DirectoryPageSkeleton kind="profili" />;
}
