import type {SVGProps} from "react";
import {ArrowUpRightIcon, LinkIcon} from "lucide-react";
import {SiFacebook, SiInstagram, SiYoutube} from "@icons-pack/react-simple-icons";

import {buttonVariants} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {PROFILE_SOCIAL_LINK_OPTIONS, type ProfileSocialLinks,} from "@/features/profilo/profile-social-links";

// LinkedIn is not included in the installed Simple Icons package.
function LinkedInBrandIcon(props: SVGProps<SVGSVGElement>) {
	return <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
		<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
	</svg>;
}

const SOCIAL_ICONS = {instagram: SiInstagram, facebook: SiFacebook, youtube: SiYoutube, linkedin: LinkedInBrandIcon};

export default function ProfileSocialLinksCard({socialLinks, presentation = "default"}: {socialLinks: ProfileSocialLinks; presentation?: "default" | "profile"}) {
	const links = PROFILE_SOCIAL_LINK_OPTIONS.flatMap(({platform, label}) => {
		const href = socialLinks[platform].trim();
		return href ? [{platform, label, href}] : [];
	});

	if (links.length === 0) return null;

	if (presentation === "profile") return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle><h2 className="flex items-center gap-2 font-home-display text-2xl uppercase"><LinkIcon className="profile-detail-accent size-5" aria-hidden="true" />Social</h2></CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="flex flex-col gap-1">
					{links.map(({platform, label, href}) => {
						const Icon = SOCIAL_ICONS[platform];
						return <li key={platform} className="min-w-0">
							<a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-start gap-3 rounded-lg px-2 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
								<Icon className="profile-detail-accent mt-0.5 size-4 shrink-0" aria-hidden="true" data-social-brand={platform} />
								<span className="grid min-w-0 flex-1 items-baseline gap-x-3 gap-y-1 sm:grid-cols-[5rem_minmax(0,1fr)]">
									<span className="font-semibold">{label}</span>
									<span className="min-w-0 text-sm text-muted-foreground underline decoration-border underline-offset-4 wrap-anywhere">{href.replace(/^https?:\/\//i, "")}</span>
								</span>
								<ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
								<span className="sr-only"> (si apre in una nuova scheda)</span>
							</a>
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
