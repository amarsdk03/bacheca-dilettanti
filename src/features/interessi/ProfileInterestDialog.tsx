import type {ReactNode} from "react";
import {InterestDialogProvider} from "./InterestDialog";
import type {InterestTarget} from "./interest-model";
import {getInterestContext} from "./server/queries";

export default async function ProfileInterestDialog({target, href, children}: {
	target: InterestTarget;
	href: string;
	children: ReactNode;
}) {
	const context = await getInterestContext(target);
	return <InterestDialogProvider key={`${target.kind}:${target.id}:${target.kind === "profilo" ? target.profileType : ""}:${context.status}`} target={target} context={context} href={href}>{children}</InterestDialogProvider>;
}
