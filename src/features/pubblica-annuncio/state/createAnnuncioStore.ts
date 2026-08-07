import type {SetStateAction} from "react";
import {create} from "zustand";

export type AnnuncioStore<T extends object> = T & {
	setField: <K extends keyof T>(field: K, value: SetStateAction<T[K]>) => void;
	reset: () => void;
};

export function createAnnuncioStore<T extends object>(createInitialState: () => T) {
	return create<AnnuncioStore<T>>()((set) => ({
		...createInitialState(),
		setField: (field, value) =>
			set((state) => {
				const currentValue = state[field] as T[typeof field];
				const nextValue =
					typeof value === "function"
						? (value as (previousValue: T[typeof field]) => T[typeof field])(currentValue)
						: value;

				return {[field]: nextValue} as unknown as Partial<AnnuncioStore<T>>;
			}),
		reset: () => set(createInitialState() as Partial<AnnuncioStore<T>>),
	}));
}
