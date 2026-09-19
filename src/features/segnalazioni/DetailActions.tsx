"use client";

import {useActionState, useCallback, useEffect, useState} from "react";
import {FlagIcon, LoaderCircleIcon, Share2Icon,} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogDismissButton,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {Field, FieldError, FieldLabel} from "@/components/ui/field";
import {Textarea} from "@/components/ui/textarea";
import {toast} from "@/components/ui/toast";
import InteractionButton from "@/features/interazioni/InteractionButton";
import type {InteractionState} from "@/features/interazioni/interaction-model";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {
	INITIAL_REPORT_ACTION_STATE,
	REPORT_REASON_MAX_LENGTH,
	type ReportActionState,
	type ReportTarget,
} from "@/features/segnalazioni/report-model";
import {submitReport} from "@/features/segnalazioni/server/actions";

interface DetailActionsProps {
	href: string;
	target: ReportTarget;
	interaction: InteractionState;
}

async function copyText(value: string) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(value);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = value;
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.append(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	textarea.remove();
	if (!copied) throw new Error("COPY_FAILED");
}

function ReportForm({
	onComplete,
	onPendingChange,
	target,
}: {
	onComplete: (state: Extract<ReportActionState, {status: "success" | "rate_limited"}>) => void;
	onPendingChange: (pending: boolean) => void;
	target: ReportTarget;
}) {
	const reportAction = submitReport.bind(null, target);
	const [state, formAction, pending] = useActionState(reportAction, INITIAL_REPORT_ACTION_STATE);
	const [reason, setReason] = useState("");
	const reasonError = state.status === "error" ? state.reasonError : undefined;

	useEffect(() => {
		if (state.status === "success" || state.status === "rate_limited") {
			onComplete(state);
		}
	}, [onComplete, state]);

	useEffect(() => {
		onPendingChange(pending);
	}, [onPendingChange, pending]);

	return (
		<form action={formAction} className="flex flex-col gap-5">
			<Field data-invalid={Boolean(reasonError)}>
				<FieldLabel htmlFor="report-reason">
					Motivazione aggiuntiva <span className="font-normal text-muted-foreground">(opzionale)</span>
				</FieldLabel>
				<Textarea
					id="report-reason"
					name="reason"
					value={reason}
					onChange={(event) => setReason(event.target.value)}
					maxLength={REPORT_REASON_MAX_LENGTH}
					rows={8}
					placeholder="Aggiungi informazioni utili per valutare la segnalazione…"
					disabled={pending}
					aria-invalid={Boolean(reasonError)}
					aria-describedby="report-reason-count"
				/>
				<div className="flex items-start justify-between gap-3">
					<span id="report-reason-count" className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
						{reason.length}/{REPORT_REASON_MAX_LENGTH}
					</span>
				</div>
				<FieldError>{reasonError}</FieldError>
			</Field>

			{state.status === "error" && !reasonError ? (
				<p role="alert" className="text-sm text-destructive">{state.message}</p>
			) : null}

			<DialogFooter>
				<DialogClose type="button" disabled={pending}>Annulla</DialogClose>
				<Button type="submit" disabled={pending}>
					{pending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <FlagIcon data-icon="inline-start" aria-hidden="true" />}
					{pending ? "Invio…" : "Invia segnalazione"}
				</Button>
			</DialogFooter>
		</form>
	);
}

export default function DetailActions({href, target, interaction}: DetailActionsProps) {
	const [reportOpen, setReportOpen] = useState(false);
	const [reportPending, setReportPending] = useState(false);

	const handleReportComplete = useCallback((state: Extract<ReportActionState, {status: "success" | "rate_limited"}>) => {
		setReportPending(false);
		setReportOpen(false);
		toast.add({
			title: state.message,
			type: state.status === "success" ? "success" : "warning",
		});
	}, []);

	async function handleShare() {
		try {
			await copyText(new URL(href, window.location.origin).toString());
			toast.add({title: "Link copiato negli appunti", type: "success"});
		} catch {
			toast.add({title: "Non è stato possibile copiare il link", type: "error"});
		}
	}

	return (
		<div className="flex items-center gap-2" aria-label="Azioni">
			<Tooltip>
				<TooltipTrigger render={<Button type="button" variant="outline" size="icon" onClick={handleShare} aria-label="Condividi" />}>
					<Share2Icon aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent>Condividi</TooltipContent>
			</Tooltip>

			<InteractionButton target={target} state={interaction} href={href} />

			<Dialog
				open={reportOpen}
				onOpenChange={(open) => {
					if (!reportPending) setReportOpen(open);
				}}
			>
				<DialogTrigger render={<Button type="button" variant="outline" />}>
					<FlagIcon data-icon="inline-start" aria-hidden="true" />
					Segnala
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Segnala {target.kind === "annuncio" ? "questo annuncio" : "questo profilo"}</DialogTitle>
						<DialogDescription>
							La segnalazione verrà verificata dal team. Puoi aggiungere una breve motivazione per aiutarci a valutarla.
						</DialogDescription>
					</DialogHeader>
					<DialogDismissButton disabled={reportPending} />
					{reportOpen ? (
						<ReportForm
							target={target}
							onComplete={handleReportComplete}
							onPendingChange={setReportPending}
						/>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}
