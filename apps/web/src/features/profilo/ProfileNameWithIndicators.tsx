import ProfileAnonymityIndicator from "./ProfileAnonymityIndicator";
import {OfficialVerificationIcon} from "./ProfileVerificationStatus";

export default function ProfileNameWithIndicators({name, officialVerified = false, anonymousName = false, verificationClassName, anonymityClassName, white = false}: {
	name: string;
	officialVerified?: boolean;
	anonymousName?: boolean;
	verificationClassName?: string;
	anonymityClassName?: string;
	white?: boolean;
}) {
	if (!officialVerified && !anonymousName) return name;
	const words = name.trim().split(/\s+/);
	const lastWord = words.pop();
	return <>
		{words.length > 0 && `${words.join(" ")} `}
		<span className="inline-block whitespace-nowrap">
			{lastWord}
			{officialVerified && <> <OfficialVerificationIcon officialVerified className={verificationClassName} /></>}
			{anonymousName && <> <ProfileAnonymityIndicator anonymousName className={anonymityClassName} white={white} /></>}
		</span>
	</>;
}
