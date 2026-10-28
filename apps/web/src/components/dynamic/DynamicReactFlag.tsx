import {hasFlag} from "country-flag-icons";
import * as Flags from "country-flag-icons/react/3x2";
import type {ComponentType} from "react";

type FlagProps = {className?: string; "aria-hidden"?: boolean};

export default function DynamicReactFlag({code, className}: {code: string | null | undefined; className?: string}) {
	if (!code || !/^[A-Z]{2}$/.test(code) || !hasFlag(code)) return null;
	const Flag = (Flags as unknown as Record<string, ComponentType<FlagProps>>)[code];
	return Flag ? <Flag className={className} aria-hidden={true} /> : null;
}
