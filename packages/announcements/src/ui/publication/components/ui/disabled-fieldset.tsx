"use client";

import {createContext, useContext} from "react";

export const DisabledFieldsetContext = createContext(false);

export function useDisabledFieldset(disabled?: boolean) {
	const inherited = useContext(DisabledFieldsetContext);
	return inherited || Boolean(disabled);
}
