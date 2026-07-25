import Link from "next/link";
import Image from "next/image";

import {Button} from "@/components/ui/button";
import {DEFAULT_LOGO_TRANSPARENT_PATH} from "@/const/defaultConstants";
import {SquarePenIcon} from "lucide-react";

const navbarHeight = 64;

interface NavbarProps {
	backToHome?: boolean;
}

export default function Navbar(
	{
		backToHome = false,
	} : NavbarProps
) {
	return (
		<div className={"navbar-div w-full sticky top-0 z-50"}>
			<nav
				className={`navbar grid grid-cols-2 items-center px-1.5 sm:px-2`}
				style={{ height: navbarHeight }}
			>
				<div
					className={`flex justify-start items-center`}
					style={{ height: navbarHeight }}
				>
					<Link href={"/"} className={"navbar-link"}>
						<Image
							src={DEFAULT_LOGO_TRANSPARENT_PATH}
							alt={"Logo torneo"}
							width={navbarHeight*7/5}
							height={40}
							className={"navbar-logo"}
							draggable={false}
							loading={"eager"}
						/>
					</Link>
				</div>
				<div className="flex justify-end items-center gap-2">
					<Button type={"button"} size={"lg"} className={"px-2.5 rounded-2xl"}>
						<div className={"flex items-center justify-center mx-2 gap-1"}>
							<SquarePenIcon data-icon="inline-start" /> Pubblica annuncio
						</div>
					</Button>
				</div>
			</nav>
		</div>
	)
}