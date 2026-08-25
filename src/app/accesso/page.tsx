import AccessForm from "./access-form";
import ComingSoon from "@/components/redirects/ComingSoon";

type AccessPageProps = {
	searchParams: Promise<{
		next?: string;
	}>;
};

export default async function AccessPage({
	                                         searchParams,
                                         }: AccessPageProps) {
	const {next} = await searchParams;

	// TODO: togliere prop next da ComingSoon
	return (
		<ComingSoon next={next} />
	);
}