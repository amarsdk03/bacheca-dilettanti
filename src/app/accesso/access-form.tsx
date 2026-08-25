"use client";

import {useActionState} from "react";

import {unlockSite} from "./actions";

export default function AccessForm({ next }: { next?: string }) {
	const [state, action, pending] = useActionState(unlockSite, {});

	return (
		<form action={action} className="flex w-full flex-col gap-4">
			<input
				type="hidden"
				name="next"
				value={next ?? "/"}
			/>

			<div className="flex flex-col gap-2">
				<label
					htmlFor="password"
					className="text-sm font-medium"
				>
					Password
				</label>

				<input
					id="password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					autoFocus
					placeholder="Inserisci la password"
					className="h-11 rounded-lg border px-3"
				/>
			</div>

			{state.error && (
				<p className="text-sm text-red-600">
					{state.error}
				</p>
			)}

			<button
				type="submit"
				disabled={pending}
				className="h-11 rounded-lg bg-black px-4 font-medium text-white disabled:opacity-50"
			>
				{pending ? "Verifica..." : "Accedi"}
			</button>
		</form>
	);
}