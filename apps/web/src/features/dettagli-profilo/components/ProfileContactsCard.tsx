import {MailIcon, PhoneIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import ContactAccessPrompt from "@/components/data-info/ContactAccessPrompt";
import type {GenericProfileDetail} from "../profile-detail-model";
import ProfileSectionHeading from "./ProfileSectionHeading";

export default function ProfileContactsCard({profile, authenticated, returnTo}: {
	profile: GenericProfileDetail;
	authenticated: boolean;
	returnTo: string;
}) {
	if (profile.type !== "servizi-consulenze" && profile.type !== "creators") return null;
	if (!authenticated) return <ContactAccessPrompt returnTo={returnTo} />;
	const {email, phone} = profile.contacts ?? {email: null, phone: null};
	if (!email && !phone) return null;
	return <Card>
		<CardHeader><CardTitle><ProfileSectionHeading icon={MailIcon}>Contatti</ProfileSectionHeading></CardTitle></CardHeader>
		<CardContent className="flex flex-col gap-3">
			{email && <a href={`mailto:${email}`} className="flex items-start gap-2 text-sm underline underline-offset-4 wrap-anywhere"><MailIcon className="size-4 shrink-0" aria-hidden="true" />{email}</a>}
			{phone && <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-2 text-sm underline underline-offset-4 wrap-anywhere"><PhoneIcon className="size-4 shrink-0" aria-hidden="true" />{phone}</a>}
		</CardContent>
	</Card>;
}
