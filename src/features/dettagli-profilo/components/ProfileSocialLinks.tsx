import {ExternalLink} from "@/components/navigation/ExternalNavigation";
import {ArrowUpRightIcon, LinkIcon} from "lucide-react";

import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import ContactAccessPrompt from "@/components/data-info/ContactAccessPrompt";
import {PROFILE_SOCIAL_LINK_OPTIONS, type ProfileSocialLinks,} from "@/features/profilo/profile-social-links";
import {PROFILE_SOCIAL_ICONS} from "@/features/profilo/profile-social-icons";

export default function ProfileSocialLinksCard({socialLinks, presentation = "default", authenticated = true, returnTo = "/"}: {socialLinks: ProfileSocialLinks; presentation?: "default" | "profile"; authenticated?: boolean; returnTo?: string}) {
	const links = PROFILE_SOCIAL_LINK_OPTIONS.flatMap(({platform, label}) => {
		const href = socialLinks[platform]?.trim() ?? "";
		return href ? [{platform, label, href}] : [];
	});

	if (links.length === 0) return null;
	if (presentation === "profile" && !authenticated) return <ContactAccessPrompt returnTo={returnTo} />;

	if (presentation === "profile") return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><LinkIcon className="profile-detail-accent size-5" aria-hidden="true" />Social</h2></CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="flex flex-col gap-1">
					{links.map(({platform, label, href}) => {
						const Icon = PROFILE_SOCIAL_ICONS[platform];
						return <li key={platform} className="min-w-0">
							<ExternalLink href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-start gap-3 rounded-lg px-2 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
								<Icon className="profile-detail-accent mt-0.5 size-4 shrink-0" aria-hidden="true" data-social-brand={platform} />
								<span className="grid min-w-0 flex-1 items-baseline gap-x-3 gap-y-1 sm:grid-cols-[5rem_minmax(0,1fr)]">
									<span className="font-semibold">{label}</span>
									<span className="min-w-0 text-sm text-muted-foreground underline decoration-border underline-offset-4 wrap-anywhere">{href.replace(/^https?:\/\//i, "")}</span>
								</span>
								<ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
								<span className="sr-only"> (si apre in una nuova scheda)</span>
							</ExternalLink>
						</li>;
					})}
				</ul>
			</CardContent>
		</Card>
	);

	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2"><LinkIcon aria-hidden="true" />Social</CardTitle>
				<CardDescription>Segui questo profilo sulle piattaforme indicate.</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-2">
					{links.map(({platform, label, href}) => (
						<ExternalLink
							key={platform}
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonVariants({variant: "outline", size: "sm"})}
						>
							{label}
							<ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
							<span className="sr-only"> (si apre in una nuova scheda)</span>
						</ExternalLink>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
