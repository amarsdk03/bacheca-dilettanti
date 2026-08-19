"use client";

import {useFormStatus} from "react-dom";
import Link from "next/link";
import {ClipboardPenIcon, LoaderCircleIcon, LogOutIcon, UserIcon} from "lucide-react";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {signOut} from "@/features/auth/actions";
import type {ViewerDTO} from "@/features/auth/types";

function LogoutItem() {
	const {pending} = useFormStatus();
	return (
		<DropdownMenuItem render={<button type="submit" disabled={pending} className="w-full" />} nativeButton variant="destructive">
			{pending ? <LoaderCircleIcon className="animate-spin" /> : <LogOutIcon />}
			{pending ? "Uscita in corso…" : "Esci"}
		</DropdownMenuItem>
	);
}

export default function UserAvatar({viewer}: {viewer: ViewerDTO}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon" className="rounded-full" aria-label={`Apri il menu di ${viewer.fullName}`}>
						<Avatar>
							{viewer.avatarUrl && <AvatarImage src={viewer.avatarUrl} alt="" referrerPolicy="no-referrer" />}
							<AvatarFallback>{viewer.initials}</AvatarFallback>
						</Avatar>
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="mt-1 min-w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>
						<span className="block truncate text-sm font-semibold text-foreground">{viewer.fullName}</span>
						<span className="block truncate font-normal">{viewer.email}</span>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem render={<Link href="/profilo" />}>
						<UserIcon /> Profilo
					</DropdownMenuItem>
					<DropdownMenuItem render={<Link href="/pubblica-annuncio" />}>
						<ClipboardPenIcon /> Pubblica annuncio
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<form action={signOut}>
					<DropdownMenuGroup>
						<LogoutItem />
					</DropdownMenuGroup>
				</form>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
