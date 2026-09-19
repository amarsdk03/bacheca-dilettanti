import {ArrowUpRightIcon, LinkIcon} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {PROFILE_SOCIAL_LINK_OPTIONS, type ProfileSocialLinks,} from "@/features/profilo/profile-social-links";

export default function ProfileSocialLinksCard({socialLinks}: {socialLinks: ProfileSocialLinks}) {
	const links = PROFILE_SOCIAL_LINK_OPTIONS.flatMap(({platform, label}) => {
		const href = socialLinks[platform].trim();
		return href ? [{platform, label, href}] : [];
	});

	if (links.length === 0) return null;

	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2"><LinkIcon aria-hidden="true" />Social</CardTitle>
				<CardDescription>Segui questo profilo sulle piattaforme indicate.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-2">
					{links.map(({platform, label, href}) => (
						<a
							key={platform}
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonVariants({variant: "outline", size: "sm"})}
						>
							{label}
							<ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
							<span className="sr-only"> (si apre in una nuova scheda)</span>
						</a>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
